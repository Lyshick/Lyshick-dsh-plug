/**
 * dsh-spec-inspect — Host half.
 *
 * The browser half only draws the picker. Everything that needs Node lives
 * here:
 *
 *   GET  /spec-inspect/status           current index source + settings path
 *   GET  /spec-inspect/index?refresh=1  fetch and normalize the index JSON
 *   POST /spec-inspect/settings         persist a new index source URL
 *   POST /spec-inspect/start            fetch one spec, compose the inspection
 *                                       prompt, and wake the calling Session
 *
 * Why plain HTTP routes instead of generated Remote methods: the profile's
 * `@deepseek-ai/*` junctions can go stale when the desktop app moves (the same
 * reason `dsh-web-search-ark` is import-free), and a plain prefix route keeps
 * the whole plugin loadable on any harness build. The only Node imports here
 * are built-ins.
 *
 * Index shape (canonical; several looser shapes are also accepted):
 *
 *   {
 *     "channels": [
 *       {
 *         "id": "web",
 *         "name": "Web 渠道",
 *         "docs": [
 *           { "id": "html-style", "title": "HTML 编写规范",
 *             "url": "https://spec.internal/web/html-style.md" }
 *         ]
 *       }
 *     ]
 *   }
 *
 * Documents may be .md / .markdown / .txt / .html / .doc / .docx. Legacy
 * binary .doc files are parsed in-process (OLE compound file + Word piece
 * table), so no converter binary or npm dependency is required.
 */

import { inflateRawSync } from 'node:zlib'
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

/** Loader diagnostic name; must match the bundle row id. */
export const name = 'spec-inspect'

/** Package version shown by the page. */
export const VERSION = '0.1.0'

/** HTTP prefix owned by this plugin. */
export const ROUTE_PREFIX = '/spec-inspect'

const INDEX_BYTES_CAP = 4 * 1024 * 1024
const DOC_BYTES_CAP = 16 * 1024 * 1024
const TEXT_CAP = 200_000
const INDEX_TIMEOUT_MS = 20_000
const DOC_TIMEOUT_MS = 30_000
const INDEX_CACHE_MS = 60_000

// ---------------------------------------------------------------------------
// Errors and small utilities
// ---------------------------------------------------------------------------

class SpecError extends Error {
  constructor(code, message, options) {
    super(message)
    this.name = 'SpecError'
    this.code = code
    if (options?.cause !== undefined) this.cause = options.cause
  }
}

function describe(error) {
  if (error === undefined || error === null) return '未知错误'
  return error instanceof Error ? error.message : String(error)
}

function readRow(config, key) {
  const value = config?.[key]
  return typeof value?.get === 'function' ? value.get() : value
}

function isHttpUrl(value) {
  try {
    const url = new URL(String(value))
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function extensionOf(url) {
  try {
    const path = new URL(url).pathname
    const base = path.split('/').pop() ?? ''
    const dot = base.lastIndexOf('.')
    return dot >= 0 ? base.slice(dot + 1).toLowerCase() : ''
  } catch {
    const base = String(url).split(/[?#]/)[0].split('/').pop() ?? ''
    const dot = base.lastIndexOf('.')
    return dot >= 0 ? base.slice(dot + 1).toLowerCase() : ''
  }
}

function normalizeType(type, url) {
  let value = String(type ?? '').trim().toLowerCase().replace(/^\./, '')
  if (value === 'markdown' || value === 'mdown') value = 'md'
  if (value === 'text' || value === 'plain') value = 'txt'
  if (value === 'htm') value = 'html'
  if (value === 'word') value = 'doc'
  if (value.length === 0) value = extensionOf(url)
  if (value === 'markdown') value = 'md'
  return value
}

function decodeXmlEntities(text) {
  return String(text)
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number.parseInt(dec, 10)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
}

function trimText(text) {
  return String(text).replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
}

// ---------------------------------------------------------------------------
// HTTP reads
// ---------------------------------------------------------------------------

async function httpGet(url, maxBytes, timeoutMs, label) {
  let response
  try {
    response = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        accept: 'application/json, text/markdown, text/plain, application/octet-stream, */*',
        'user-agent': `dsh-spec-inspect/${VERSION}`,
        'cache-control': 'no-cache',
      },
    })
  } catch (error) {
    throw new SpecError('fetch_failed', `${label}请求失败：${url}（${describe(error)}）`, { cause: error })
  }
  if (!response.ok) {
    throw new SpecError('http_status', `${label}返回 HTTP ${response.status} ${response.statusText}：${url}`)
  }
  const buffer = Buffer.from(await response.arrayBuffer())
  if (buffer.length > maxBytes) {
    throw new SpecError('too_large', `${label}超过 ${Math.round(maxBytes / 1024 / 1024)} MB 上限：${url}`)
  }
  return buffer
}

// ---------------------------------------------------------------------------
// Index normalization
// ---------------------------------------------------------------------------

/**
 * Normalize the many reasonable index shapes into
 * `{ channels: [{ id, name, docs: [{ id, title, url, type }] }], warnings }`.
 *
 * @param raw index bytes, JSON text, or an already-parsed object.
 * @param baseUrl index URL, used to resolve relative document links.
 */
export function normalizeIndex(raw, baseUrl = '') {
  let data = raw
  if (typeof data === 'string' || data instanceof Uint8Array) {
    const text = typeof data === 'string' ? data : Buffer.from(data).toString('utf8')
    try {
      data = JSON.parse(text)
    } catch (error) {
      throw new SpecError('bad_index_json', `索引 JSON 解析失败（${describe(error)}）`, { cause: error })
    }
  }
  if (data === null || typeof data !== 'object') {
    throw new SpecError('bad_index_shape', '索引顶层必须是 JSON 对象或数组')
  }

  const warnings = []
  const channels = []
  const channelIds = new Set()

  const resolveUrl = (value) => {
    const text = String(value ?? '').trim()
    if (text.length === 0) return undefined
    try {
      const resolved = new URL(text, baseUrl || undefined)
      if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') {
        warnings.push(`跳过非 HTTP(S) 文档链接：${text}`)
        return undefined
      }
      return resolved.href
    } catch {
      warnings.push(`跳过无法解析的文档链接：${text}`)
      return undefined
    }
  }

  const readDocs = (value, channelLabel) => {
    let list
    if (Array.isArray(value)) list = value
    else if (value !== null && typeof value === 'object') {
      if (Array.isArray(value.docs)) list = value.docs
      else if (Array.isArray(value.documents)) list = value.documents
      else if (Array.isArray(value.files)) list = value.files
      else if (Array.isArray(value.items)) list = value.items
      else if (value.url !== undefined || value.href !== undefined || value.link !== undefined || value.path !== undefined) list = [value]
    }
    if (list === undefined) return undefined

    const docs = []
    const docIds = new Set()
    for (const item of list) {
      let url
      let title
      let id
      let type
      let description
      if (typeof item === 'string') {
        url = resolveUrl(item)
        title = item
        id = ''
        type = undefined
        description = ''
      } else if (item !== null && typeof item === 'object') {
        url = resolveUrl(item.url ?? item.href ?? item.link ?? item.path)
        title = String(item.title ?? item.name ?? item.label ?? '').trim()
        id = item.id !== undefined && item.id !== null ? String(item.id).trim() : ''
        type = item.type ?? item.format
        description = String(item.description ?? item.desc ?? '').trim()
      } else {
        continue
      }
      if (url === undefined) continue
      if (title.length === 0) {
        const base = url.split(/[?#]/)[0].split('/').pop() ?? url
        title = decodeURIComponent(base) || url
      }
      if (id.length === 0) {
        const base = title.toLowerCase().replace(/[^\p{L}\p{N}._-]+/gu, '-').replace(/^-+|-+$/g, '')
        id = base.length > 0 ? base : `doc-${docs.length + 1}`
      }
      while (docIds.has(id)) id = `${id}-${docs.length + 1}`
      docIds.add(id)
      docs.push({
        id,
        title,
        url,
        type: normalizeType(type, url),
        ...(description.length > 0 ? { description } : {}),
      })
    }
    if (docs.length === 0 && list.length > 0) {
      warnings.push(`渠道「${channelLabel}」没有可用的 HTTP(S) 文档`)
    }
    return docs
  }

  const pushChannel = (id, name, docs) => {
    if (!Array.isArray(docs) || docs.length === 0) return
    let channelId = String(id ?? '').trim()
    if (channelId.length === 0) channelId = `channel-${channels.length + 1}`
    while (channelIds.has(channelId)) channelId = `${channelId}-${channels.length + 1}`
    channelIds.add(channelId)
    channels.push({ id: channelId, name: String(name ?? channelId).trim() || channelId, docs })
  }

  const readChannel = (rawChannel, fallbackId, index) => {
    if (rawChannel === null || typeof rawChannel !== 'object' || Array.isArray(rawChannel)) {
      const docs = readDocs(rawChannel, fallbackId)
      if (docs !== undefined) pushChannel(fallbackId, fallbackId, docs)
      return
    }
    const docs = readDocs(rawChannel, fallbackId)
    if (docs === undefined) return
    const name = String(rawChannel.name ?? rawChannel.title ?? rawChannel.label ?? fallbackId).trim()
    const id = rawChannel.id !== undefined && rawChannel.id !== null ? rawChannel.id : fallbackId
    pushChannel(id, name || `渠道 ${index + 1}`, docs)
  }

  if (Array.isArray(data)) {
    pushChannel('default', '默认渠道', readDocs(data, '默认渠道') ?? [])
  } else if (Array.isArray(data.channels)) {
    data.channels.forEach((channel, index) => readChannel(channel, `channel-${index + 1}`, index))
  } else if (Array.isArray(data.groups)) {
    data.groups.forEach((channel, index) => readChannel(channel, `channel-${index + 1}`, index))
  } else if (data.channels !== null && typeof data.channels === 'object') {
    Object.entries(data.channels).forEach(([key, channel], index) => readChannel(channel, key, index))
  } else {
    const topLevel = readDocs(data, '默认渠道')
    if (topLevel !== undefined && topLevel.length > 0) {
      pushChannel('default', String(data.name ?? data.title ?? '默认渠道'), topLevel)
    } else {
      Object.entries(data).forEach(([key, value], index) => {
        if (key === 'name' || key === 'title' || key === 'version') return
        readChannel(value, key, index)
      })
    }
  }

  if (channels.length === 0) {
    throw new SpecError('empty_index', '索引里没有识别出任何渠道或文档')
  }
  return { channels, warnings }
}

// ---------------------------------------------------------------------------
// Document readers
// ---------------------------------------------------------------------------

/** Read one entry of a zip container (stored + deflate), enough for .docx. */
function readZipEntry(buffer, wanted) {
  let eocd = -1
  const floor = Math.max(0, buffer.length - 65_558)
  for (let i = buffer.length - 22; i >= floor; i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocd = i
      break
    }
  }
  if (eocd < 0) throw new SpecError('bad_zip', '不是有效的 zip 容器（找不到中央目录）')
  const count = buffer.readUInt16LE(eocd + 10)
  let pointer = buffer.readUInt32LE(eocd + 16)
  for (let n = 0; n < count; n++) {
    if (pointer + 46 > buffer.length || buffer.readUInt32LE(pointer) !== 0x02014b50) {
      throw new SpecError('bad_zip', 'zip 中央目录损坏')
    }
    const method = buffer.readUInt16LE(pointer + 10)
    const compressedSize = buffer.readUInt32LE(pointer + 20)
    const nameLength = buffer.readUInt16LE(pointer + 28)
    const extraLength = buffer.readUInt16LE(pointer + 30)
    const commentLength = buffer.readUInt16LE(pointer + 32)
    const localOffset = buffer.readUInt32LE(pointer + 42)
    const entryName = buffer.toString('utf8', pointer + 46, pointer + 46 + nameLength)
    pointer += 46 + nameLength + extraLength + commentLength
    if (entryName !== wanted) continue
    if (compressedSize === 0xffffffff) throw new SpecError('zip64', `条目 ${wanted} 使用 zip64，暂不支持`)
    if (buffer.readUInt32LE(localOffset) !== 0x04034b50) throw new SpecError('bad_zip', 'zip 局部文件头损坏')
    const localNameLength = buffer.readUInt16LE(localOffset + 26)
    const localExtraLength = buffer.readUInt16LE(localOffset + 28)
    const dataStart = localOffset + 30 + localNameLength + localExtraLength
    const data = buffer.subarray(dataStart, dataStart + compressedSize)
    if (method === 0) return Buffer.from(data)
    if (method === 8) {
      try {
        return inflateRawSync(data)
      } catch (error) {
        throw new SpecError('bad_zip', `条目 ${wanted} 解压失败（${describe(error)}）`, { cause: error })
      }
    }
    throw new SpecError('bad_zip', `不支持的 zip 压缩方式 ${method}`)
  }
  throw new SpecError('bad_zip', `压缩包内找不到 ${wanted}`)
}

/** Extract the running text of a WordprocessingML document. */
function docxToText(buffer) {
  const xml = readZipEntry(buffer, 'word/document.xml').toString('utf8')
  const paragraphs = []
  for (const chunk of xml.split(/<w:p[ >]/).slice(1)) {
    const texts = []
    for (const match of chunk.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)) {
      texts.push(decodeXmlEntities(match[1]))
    }
    const line = texts.join('').replace(/<w:tab\s*\/>/g, '\t').trim()
    if (line.length > 0) paragraphs.push(line)
  }
  if (paragraphs.length === 0) throw new SpecError('empty_docx', 'word/document.xml 中没有提取到文本')
  return paragraphs.join('\n')
}

// --- Legacy .doc (OLE compound file + Word 97-2003 piece table) -------------

const CFB_END = 0xfffffffe
const CFB_FREE = 0xffffffff

function parseCfbStreams(buffer) {
  if (buffer.length < 512) throw new SpecError('bad_doc', '文件太小，不是有效的 Word 文档')
  if (buffer.readUInt32LE(0) !== 0xe011cfd0 || buffer.readUInt32LE(4) !== 0xe11ab1a1) {
    throw new SpecError('bad_doc', '不是 OLE 复合文档（Word 97-2003 .doc）')
  }
  const sectorSize = 1 << buffer.readUInt16LE(0x1e)
  const miniSectorSize = 1 << buffer.readUInt16LE(0x20)
  const numFatSectors = buffer.readUInt32LE(0x2c)
  const firstDirSector = buffer.readUInt32LE(0x30)
  const miniCutoff = buffer.readUInt32LE(0x38)
  const firstMiniFatSector = buffer.readUInt32LE(0x3c)
  const firstDifatSector = buffer.readUInt32LE(0x44)
  const numDifatSectors = buffer.readUInt32LE(0x48)

  const fatSectorIds = []
  for (let i = 0; i < 109; i++) {
    const id = buffer.readUInt32LE(0x4c + i * 4)
    if (id !== CFB_FREE) fatSectorIds.push(id)
  }
  let difat = firstDifatSector
  for (let n = 0; n < numDifatSectors && difat !== CFB_FREE && difat !== CFB_END; n++) {
    const off = (difat + 1) * sectorSize
    const per = sectorSize / 4 - 1
    for (let i = 0; i < per; i++) {
      const id = buffer.readUInt32LE(off + i * 4)
      if (id !== CFB_FREE) fatSectorIds.push(id)
    }
    difat = buffer.readUInt32LE(off + per * 4)
  }
  const fat = []
  for (const id of numFatSectors === 0 ? fatSectorIds : fatSectorIds.slice(0, numFatSectors)) {
    const off = (id + 1) * sectorSize
    if (off + sectorSize > buffer.length) continue
    for (let i = 0; i < sectorSize; i += 4) fat.push(buffer.readUInt32LE(off + i))
  }

  const readSector = (id) => buffer.subarray((id + 1) * sectorSize, (id + 2) * sectorSize)
  const chain = (start, table) => {
    const ids = []
    const seen = new Set()
    let cur = start
    while (cur !== CFB_END && cur !== CFB_FREE && cur < table.length) {
      if (seen.has(cur)) throw new SpecError('bad_doc', '复合文档扇区链成环')
      seen.add(cur)
      ids.push(cur)
      cur = table[cur]
    }
    return ids
  }
  const readChain = (start, table) => Buffer.concat(chain(start, table).map(readSector))

  const dirBuf = readChain(firstDirSector, fat)
  const entries = []
  for (let off = 0; off + 128 <= dirBuf.length; off += 128) {
    const nameLen = dirBuf.readUInt16LE(off + 0x40)
    if (nameLen < 2 || nameLen > 64) continue
    const type = dirBuf[off + 0x42]
    if (type !== 1 && type !== 2 && type !== 5) continue
    entries.push({
      name: dirBuf.toString('utf16le', off, off + nameLen - 2),
      type,
      start: dirBuf.readUInt32LE(off + 0x74),
      size: Number(dirBuf.readBigUInt64LE(off + 0x78)),
    })
  }
  const root = entries.find((entry) => entry.type === 5)
  if (root === undefined) throw new SpecError('bad_doc', '复合文档缺少根目录项')

  const miniFat = []
  if (firstMiniFatSector !== CFB_FREE && firstMiniFatSector !== CFB_END) {
    const miniFatBuf = readChain(firstMiniFatSector, fat)
    for (let i = 0; i + 4 <= miniFatBuf.length; i += 4) miniFat.push(miniFatBuf.readUInt32LE(i))
  }
  const miniStream = root.size > 0 ? readChain(root.start, fat) : Buffer.alloc(0)
  const readMiniChain = (start) => {
    const chunks = []
    for (const id of chain(start, miniFat)) {
      const off = id * miniSectorSize
      chunks.push(miniStream.subarray(off, off + miniSectorSize))
    }
    return Buffer.concat(chunks)
  }
  const readStream = (entry) => {
    if (entry.size === 0) return Buffer.alloc(0)
    const data = entry.size < miniCutoff && entry.type !== 5
      ? readMiniChain(entry.start)
      : readChain(entry.start, fat)
    return data.subarray(0, Math.min(entry.size, data.length))
  }
  return new Map(entries.filter((entry) => entry.type === 2).map((entry) => [entry.name, readStream(entry)]))
}

function wordDocToText(buffer) {
  const streams = parseCfbStreams(buffer)
  const wd = streams.get('WordDocument')
  if (wd === undefined) throw new SpecError('bad_doc', '复合文档缺少 WordDocument 流')
  if (wd.length < 0x01aa) throw new SpecError('bad_doc', 'WordDocument 流过短')
  if (wd.readUInt16LE(0) !== 0xa5ec) throw new SpecError('bad_doc', 'WordDocument 标识不匹配（不是 Word 97-2003 文档）')
  const flags = wd.readUInt16LE(0x0a)
  const tableName = (flags & 0x0200) !== 0 ? '1Table' : '0Table'
  const table = streams.get(tableName)
  if (table === undefined) throw new SpecError('bad_doc', `缺少 ${tableName} 流`)
  const fcClx = wd.readUInt32LE(0x01a2)
  const lcbClx = wd.readUInt32LE(0x01a6)
  if (lcbClx === 0 || fcClx === 0 || fcClx + lcbClx > table.length) {
    throw new SpecError('bad_doc', 'CLX 片段表位置无效')
  }

  let offset = fcClx
  const end = fcClx + lcbClx
  let plcStart = -1
  let plcSize = 0
  while (offset < end) {
    const tag = table[offset]
    if (tag === 0x01) {
      offset += 3 + table.readUInt16LE(offset + 1)
    } else if (tag === 0x02) {
      plcSize = table.readUInt32LE(offset + 1)
      plcStart = offset + 5
      break
    } else {
      break
    }
  }
  if (plcStart < 0 || plcSize < 4 || plcStart + plcSize > table.length) {
    throw new SpecError('bad_doc', '找不到有效的 Word 片段表')
  }
  const count = (plcSize - 4) / 12
  if (!Number.isInteger(count) || count <= 0) throw new SpecError('bad_doc', 'Word 片段表条目数无效')

  const cpBase = plcStart
  const pcdBase = plcStart + 4 * (count + 1)
  const decoder = new TextDecoder('windows-1252')
  const chunks = []
  for (let i = 0; i < count; i++) {
    const cpStart = table.readUInt32LE(cpBase + i * 4)
    const cpEnd = table.readUInt32LE(cpBase + (i + 1) * 4)
    if (cpEnd <= cpStart) continue
    const fcRaw = table.readUInt32LE(pcdBase + i * 8 + 2)
    const compressed = (fcRaw & 0x40000000) !== 0
    const fc = compressed ? (fcRaw & 0x3fffffff) / 2 : fcRaw
    const length = compressed ? cpEnd - cpStart : (cpEnd - cpStart) * 2
    if (fc + length > wd.length) continue
    const bytes = wd.subarray(fc, fc + length)
    chunks.push(compressed ? decoder.decode(bytes) : bytes.toString('utf16le'))
  }

  const raw = chunks.join('')
  let field = 0
  let out = ''
  for (const char of raw) {
    const code = char.charCodeAt(0)
    if (code === 0x13) {
      field++
      continue
    }
    if (code === 0x14 || code === 0x15) {
      if (field > 0) field--
      continue
    }
    if (field > 0) continue
    if (code === 0x0d || code === 0x0b || code === 0x0c) out += '\n'
    else if (code === 0x07) out += '\t'
    else if (code === 0x1e) out += '-'
    else if (code === 0x00) continue
    else if (code < 0x20 && code !== 0x09) out += ' '
    else out += char
  }
  return trimText(out)
}

/** Very small RTF text reader for mislabeled `.doc` files. */
function rtfToText(buffer) {
  const source = buffer.toString('latin1')
  let text = ''
  for (let i = 0; i < source.length; i++) {
    const char = source[i]
    if (char === '\\') {
      const next = source[i + 1]
      if (next === "'") {
        const hex = source.slice(i + 2, i + 4)
        const value = Number.parseInt(hex, 16)
        if (Number.isInteger(value)) text += String.fromCharCode(value)
        i += 3
        continue
      }
      if (next === 'u') {
        const match = /^\\u(-?\d+)\s?/.exec(source.slice(i))
        if (match !== null) {
          let code = Number.parseInt(match[1], 10)
          if (code < 0) code += 65536
          text += String.fromCharCode(code)
          i += match[0].length - 1
          continue
        }
      }
      if (next === '\\' || next === '{' || next === '}') {
        text += next
        i++
        continue
      }
      const word = /^\\([a-zA-Z]+)(-?\d+)?\s?/.exec(source.slice(i))
      if (word !== null) {
        if (word[1] === 'par' || word[1] === 'line') text += '\n'
        else if (word[1] === 'tab') text += '\t'
        i += word[0].length - 1
        continue
      }
      i++
      continue
    }
    if (char === '{' || char === '}') continue
    if (char === '\r' || char === '\n') continue
    text += char
  }
  return trimText(text)
}

function htmlToText(source) {
  const stripped = String(source)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<(?:br|hr)\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|div|li|tr|h[1-6]|section|article|blockquote)>/gi, '\n')
    .replace(/<\/(?:td|th)>/gi, '\t')
    .replace(/<[^>]+>/g, '')
  return trimText(decodeXmlEntities(stripped))
}

function looksLikeHtml(text) {
  return /<!doctype\s+html|<html[\s>]|<head[\s>]|<body[\s>]/i.test(text.slice(0, 4096))
}

function isMostlyText(buffer) {
  const sample = buffer.subarray(0, Math.min(buffer.length, 8192))
  let control = 0
  for (const byte of sample) {
    if (byte === 0) return false
    if (byte < 0x09 || (byte > 0x0d && byte < 0x20)) control++
  }
  return control / Math.max(1, sample.length) < 0.02
}

/**
 * Turn one fetched document into plain text.
 * @param buffer raw bytes.
 * @param type normalized document type.
 * @param url source URL, used only in error messages.
 */
export function documentText(buffer, type, url = '') {
  const kind = normalizeType(type, url)
  const isZip = buffer.length >= 4 && buffer.readUInt32LE(0) === 0x04034b50
  try {
    if (kind === 'docx' || (kind === 'doc' && isZip)) return docxToText(buffer)
    if (kind === 'doc') {
      if (buffer.length >= 4 && buffer.readUInt32LE(0) === 0xe011cfd0) return wordDocToText(buffer)
      if (buffer.subarray(0, 5).toString() === '{\\rtf') return rtfToText(buffer)
      const text = buffer.toString('utf8')
      if (looksLikeHtml(text)) return htmlToText(text)
      if (isMostlyText(buffer)) return trimText(text.replace(/^\uFEFF/, ''))
      throw new SpecError('bad_doc', '无法解析该 .doc：既不是 OLE Word 文档，也不是可读文本/RTF/HTML')
    }
    if (kind === 'html' || kind === 'htm') return htmlToText(buffer.toString('utf8'))
    if (kind === 'md' || kind === 'markdown' || kind === 'txt' || kind === 'text' || kind.length === 0) {
      const text = buffer.toString('utf8').replace(/^\uFEFF/, '')
      if (text.includes('\u0000')) throw new SpecError('binary_doc', `无法识别的文档格式（${kind || '未知'}）：${url}`)
      if (looksLikeHtml(text) && (kind === 'html' || kind === 'htm')) return htmlToText(text)
      return text
    }
    if (kind === 'pdf') throw new SpecError('unsupported_type', '暂不支持直接解析 PDF，请把规范文档转存为 md/doc/docx')
    if (kind === 'xls' || kind === 'xlsx' || kind === 'ppt' || kind === 'pptx') {
      throw new SpecError('unsupported_type', `暂不支持解析 ${kind}，请把规范文档转存为 md/doc/docx`)
    }
    if (isMostlyText(buffer)) return trimText(buffer.toString('utf8'))
    throw new SpecError('unsupported_type', `无法识别的文档格式（${kind}）：${url}`)
  } catch (error) {
    if (error instanceof SpecError) throw error
    throw new SpecError('doc_parse_failed', `解析文档失败：${url}（${describe(error)}）`, { cause: error })
  }
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export function settingsPath() {
  const home = typeof process.env.DSH_HOME === 'string' && process.env.DSH_HOME.trim().length > 0
    ? process.env.DSH_HOME.trim()
    : join(homedir(), '.dsh')
  return join(home, 'spec-inspect.json')
}

function readSettingsFile() {
  try {
    const parsed = JSON.parse(readFileSync(settingsPath(), 'utf8'))
    return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function writeSettingsFile(patch) {
  const target = settingsPath()
  const next = { ...readSettingsFile(), ...patch }
  mkdirSync(dirname(target), { recursive: true })
  const tmp = `${target}.${process.pid}.tmp`
  writeFileSync(tmp, `${JSON.stringify(next, null, 2)}\n`, 'utf8')
  renameSync(tmp, target)
  return next
}

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

export function buildPrompt({ channel, doc, text }) {
  const body = text.length > TEXT_CAP
    ? `${text.slice(0, TEXT_CAP)}\n\n[文档过长，已截断到 ${TEXT_CAP} 字符；请基于以上内容检视]`
    : text
  return [
    '请对公司内部业务规范做一次代码检视。',
    '',
    `规范渠道：${channel}`,
    `规范文档：${doc.title}`,
    `文档地址：${doc.url}`,
    '',
    '一、规范文档全文',
    '—— 规范文档开始 ——',
    body,
    '—— 规范文档结束 ——',
    '',
    '二、检视对象',
    '当前会话工作区中的前端相关代码：HTML、CSS、JS/TS、Vue/React/小程序页面与组件、样式文件、接口调用、埋点与活动页逻辑。以本会话环境中的工作区路径为准。',
    '',
    '三、执行要求',
    '1. 先通读规范，提炼成可逐条核对的检查项，并记录每条检查项在文档中的原文依据。',
    '2. 使用 glob / grep / read 等工具先了解目录结构，再按规范涉及的页面、组件、接口与样式逐条检索核对，不要凭经验臆测。',
    '3. 每条问题必须有真实代码证据：文件路径 + 行号（尽量精确）+ 关键代码片段、函数名或状态字段。',
    '4. 严重级别严格采用文档定义的 P0-P5：文档定义了哪些级别就只使用哪些，不得自行新增、改名、合并或拆分级别；若文档定义了 P0-P5 的全部级别，则按 P0 到 P5 分组；若文档只定义了部分级别，只输出已定义的级别；若文档完全没有定义 P 级，则使用 P0（阻断）、P1（严重）、P2（一般）。',
    '5. 只做检视，不修改任何文件，不执行修复；只输出检视报告。',
    '6. 没有发现问题的级别写“无”，不要为了凑格式编造问题；无法从代码确认的疑点放入“待确认”。',
    '7. 用中文输出；标题名称保持下面的格式。',
    '',
    '四、输出格式',
    '## 检视结论',
    '用 1-3 句话概括最重要的结论，先点出高优先级问题。',
    '',
    '## 检视范围',
    '说明实际检索了哪些目录/文件类型，以及依据的规范渠道与文档标题。',
    '',
    '## P0 问题',
    '……（按文档定义的级别依次输出 P0、P1、P2、P3、P4、P5；未定义的级别不要输出）',
    '',
    '每条问题严格使用以下格式：',
    '- **位置**：`path:line`',
    '- **问题**：……',
    '- **规范依据**：……（引用文档原文）',
    '- **风险**：……',
    '- **修复建议**：……',
    '',
    '## 级别汇总',
    '| 级别 | 数量 |',
    '| --- | --- |',
    '| P0 | … |',
    '',
    '## 待确认',
    '没有则写“无”。',
  ].join('\n')
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

function json(res, status, payload) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  })
  res.end(JSON.stringify(payload))
}

async function readJsonBody(req) {
  const chunks = []
  let total = 0
  for await (const chunk of req) {
    total += chunk.length
    if (total > 128 * 1024) throw new SpecError('body_too_large', '请求体过大')
    chunks.push(chunk)
  }
  if (chunks.length === 0) return {}
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch (error) {
    throw new SpecError('bad_json', `请求体不是有效 JSON（${describe(error)}）`, { cause: error })
  }
}

function findDoc(index, wanted) {
  const value = String(wanted ?? '').trim()
  for (const channel of index.channels) {
    for (const doc of channel.docs) {
      if (doc.id === value || doc.title === value) return { channel, doc }
    }
  }
  return undefined
}

/** Start one inspection on the calling Session's live Agent. */
function startInspection(ctx, request) {
  const docId = typeof request?.docId === 'string' ? request.docId.trim() : ''
  const sessionId = typeof request?.sessionId === 'string' ? request.sessionId.trim() : ''
  if (docId.length === 0) throw new SpecError('missing_doc', '缺少 docId 参数')
  if (sessionId.length === 0) throw new SpecError('missing_session', '缺少 sessionId 参数')
  const agents = ctx.get('agents')
  const agent = agents?.get?.(sessionId)
  if (agent === undefined || typeof agent.followup !== 'function') {
    throw new SpecError('no_session', '未找到目标会话：请先打开一个会话再点击“开始检视”')
  }
  return { agent, docId, sessionId }
}

function registerRoutes(ctx, state, readIndex) {
  ctx.inject(['webServer'], (sctx) => {
    sctx.effect(
      () => sctx.webServer.register({
        kind: 'prefix',
        path: ROUTE_PREFIX,
        handler: async (req, res) => {
          const pathname = new URL(req.url ?? '/', 'http://x').pathname
          try {
            if (pathname === `${ROUTE_PREFIX}/status` && req.method === 'GET') {
              return json(res, 200, {
                ok: true,
                value: {
                  indexUrl: state.currentIndexUrl(),
                  settingsPath: settingsPath(),
                  version: VERSION,
                  hasIndexUrl: state.currentIndexUrl().length > 0,
                },
              })
            }
            if (pathname === `${ROUTE_PREFIX}/index` && req.method === 'GET') {
              const force = new URL(req.url ?? '/', 'http://x').searchParams.get('refresh') === '1'
              try {
                const index = await readIndex(force)
                return json(res, 200, {
                  ok: true,
                  value: {
                    indexUrl: state.currentIndexUrl(),
                    channels: index.channels,
                    warnings: index.warnings,
                    fetchedAt: new Date().toISOString(),
                  },
                })
              } catch (error) {
                return json(res, 200, {
                  ok: false,
                  error: { code: error?.code ?? 'index_failed', message: describe(error) },
                })
              }
            }
            if (pathname === `${ROUTE_PREFIX}/settings` && req.method === 'POST') {
              const body = await readJsonBody(req)
              if (body === null || typeof body !== 'object' || typeof body.indexUrl !== 'string') {
                throw new SpecError('bad_request', '缺少 indexUrl')
              }
              const indexUrl = body.indexUrl.trim()
              if (indexUrl.length > 0 && !isHttpUrl(indexUrl)) {
                throw new SpecError('bad_url', '索引源必须是 http(s) URL')
              }
              if (indexUrl.length === 0) writeSettingsFile({ indexUrl: '' })
              else writeSettingsFile({ indexUrl })
              state.indexUrl = indexUrl
              return json(res, 200, {
                ok: true,
                value: { indexUrl: state.currentIndexUrl(), settingsPath: settingsPath() },
              })
            }
            if (pathname === `${ROUTE_PREFIX}/start` && req.method === 'POST') {
              const body = await readJsonBody(req)
              const { agent, docId } = startInspection(ctx, body)
              let index = await readIndex(false)
              let found = findDoc(index, docId)
              if (found === undefined) {
                index = await readIndex(true)
                found = findDoc(index, docId)
              }
              if (found === undefined) throw new SpecError('doc_not_found', `索引中找不到文档「${docId}」`)
              const bytes = await httpGet(found.doc.url, DOC_BYTES_CAP, DOC_TIMEOUT_MS, '规范文档')
              const text = documentText(bytes, found.doc.type, found.doc.url)
              if (text.trim().length === 0) throw new SpecError('empty_doc', `文档没有可读文本：${found.doc.url}`)
              const prompt = buildPrompt({ channel: found.channel.name, doc: found.doc, text })
              agent.followup({
                content: [{ type: 'text', text: prompt }],
                source: { kind: 'user' },
              })
              return json(res, 200, {
                ok: true,
                value: {
                  title: found.doc.title,
                  channel: found.channel.name,
                  docId: found.doc.id,
                  chars: text.length,
                },
              })
            }
            return json(res, 404, { ok: false, error: { code: 'not_found', message: 'not found' } })
          } catch (error) {
            return json(res, 200, {
              ok: false,
              error: { code: error?.code ?? 'failed', message: describe(error) },
            })
          }
        },
      }),
      'dsh-spec-inspect: routes',
    )
  })
}

// ---------------------------------------------------------------------------
// Apply
// ---------------------------------------------------------------------------

/**
 * @param ctx Cordis context.
 * @param config the loader row config; `indexUrl` is the first-run fallback
 *   when the plugin's own settings file has no value.
 */
export function apply(ctx, config) {
  const fileSettings = readSettingsFile()
  const rowIndexUrl = typeof readRow(config, 'indexUrl') === 'string' ? String(readRow(config, 'indexUrl')).trim() : ''
  const state = {
    indexUrl: typeof fileSettings.indexUrl === 'string' ? fileSettings.indexUrl.trim() : '',
    rowIndexUrl,
    currentIndexUrl() {
      return this.indexUrl.length > 0 ? this.indexUrl : this.rowIndexUrl
    },
  }

  let cache = { url: '', at: 0, data: null }
  const readIndex = async (force = false) => {
    const indexUrl = state.currentIndexUrl()
    if (indexUrl.length === 0) throw new SpecError('no_index_url', '尚未配置索引源 URL')
    if (!force && cache.data !== null && cache.url === indexUrl && Date.now() - cache.at < INDEX_CACHE_MS) {
      return cache.data
    }
    const bytes = await httpGet(indexUrl, INDEX_BYTES_CAP, INDEX_TIMEOUT_MS, '索引源')
    const normalized = normalizeIndex(bytes, indexUrl)
    cache = { url: indexUrl, at: Date.now(), data: normalized }
    return normalized
  }

  registerRoutes(ctx, state, readIndex)
}
