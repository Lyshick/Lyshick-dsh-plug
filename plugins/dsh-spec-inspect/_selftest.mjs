/**
 * Offline checks for the parts of dsh-spec-inspect that can be tested without
 * a Harness process: index normalization, document decoding, and prompt shape.
 *
 *   node plugins/dsh-spec-inspect/_selftest.mjs
 */
import assert from 'node:assert/strict'
import { normalizeIndex, documentText, buildPrompt } from './index.js'

function zipStore(files) {
  const locals = []
  const centrals = []
  let offset = 0
  for (const [name, text] of Object.entries(files)) {
    const nameBytes = Buffer.from(name, 'utf8')
    const data = Buffer.from(text, 'utf8')
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(0x0800, 6)
    local.writeUInt16LE(0, 8)
    local.writeUInt32LE(0, 10)
    local.writeUInt32LE(0, 14)
    local.writeUInt32LE(data.length, 18)
    local.writeUInt32LE(data.length, 22)
    local.writeUInt16LE(nameBytes.length, 26)
    local.writeUInt16LE(0, 28)
    locals.push(local, nameBytes, data)
    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(20, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt16LE(0x0800, 8)
    central.writeUInt16LE(0, 10)
    central.writeUInt32LE(0, 12)
    central.writeUInt32LE(0, 16)
    central.writeUInt32LE(data.length, 20)
    central.writeUInt32LE(data.length, 24)
    central.writeUInt16LE(nameBytes.length, 28)
    central.writeUInt16LE(0, 30)
    central.writeUInt16LE(0, 32)
    central.writeUInt16LE(0, 34)
    central.writeUInt16LE(0, 36)
    central.writeUInt32LE(0, 38)
    central.writeUInt32LE(offset, 42)
    centrals.push(central, nameBytes)
    offset += local.length + nameBytes.length + data.length
  }
  const centralStart = offset
  const centralBytes = Buffer.concat(centrals)
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0)
  eocd.writeUInt16LE(0, 4)
  eocd.writeUInt16LE(0, 6)
  eocd.writeUInt16LE(Object.keys(files).length, 8)
  eocd.writeUInt16LE(Object.keys(files).length, 10)
  eocd.writeUInt32LE(centralBytes.length, 12)
  eocd.writeUInt32LE(centralStart, 16)
  eocd.writeUInt16LE(0, 20)
  return { buffer: Buffer.concat([...locals, centralBytes, eocd]), size: centralStart }
}

let passed = 0
function check(name, fn) {
  fn()
  passed++
  console.log(`ok - ${name}`)
}

check('canonical channels + relative document URL', () => {
  const index = normalizeIndex({
    channels: [{
      id: 'web',
      name: 'Web 渠道',
      docs: [{ id: 'html-style', title: 'HTML 编写规范', url: './default-skill.md' }],
    }],
  }, 'https://spec.example.com/index.json')
  assert.equal(index.channels.length, 1)
  assert.equal(index.channels[0].id, 'web')
  assert.equal(index.channels[0].docs[0].url, 'https://spec.example.com/default-skill.md')
  assert.equal(index.channels[0].docs[0].type, 'md')
})

check('top-level document array becomes a default channel', () => {
  const index = normalizeIndex([
    'https://spec.example.com/a.md',
    { title: 'Word 规范', url: 'https://spec.example.com/b.doc' },
  ], 'https://spec.example.com/index.json')
  assert.equal(index.channels.length, 1)
  assert.equal(index.channels[0].name, '默认渠道')
  assert.equal(index.channels[0].docs.length, 2)
  assert.equal(index.channels[0].docs[1].type, 'doc')
})

check('channels object map is accepted', () => {
  const index = normalizeIndex({
    channels: {
      web: { name: 'Web', documents: [{ title: '规范', path: '/specs/web.md' }] },
      app: { name: 'App', files: [{ title: '规范', href: 'https://spec.example.com/app.docx' }] },
    },
  }, 'https://spec.example.com/index.json')
  assert.deepEqual(index.channels.map((channel) => channel.name), ['Web', 'App'])
  assert.equal(index.channels[0].docs[0].url, 'https://spec.example.com/specs/web.md')
  assert.equal(index.channels[1].docs[0].type, 'docx')
})

check('markdown and HTML become readable text', () => {
  assert.match(documentText(Buffer.from('# 标题\n正文'), 'md'), /# 标题/)
  const html = documentText(Buffer.from('<html><body><h1>标题</h1><script>x()</script><p>正文 &amp; 说明</p></body></html>'), 'html')
  assert.match(html, /标题/)
  assert.match(html, /正文 & 说明/)
  assert.doesNotMatch(html, /<h1>/)
})

check('docx paragraphs are extracted from a zip', () => {
  const xml = '<w:document><w:body><w:p><w:r><w:t>第一段</w:t></w:r></w:p><w:p><w:r><w:t>第二段</w:t></w:r></w:p></w:body></w:document>'
  const zip = zipStore({ 'word/document.xml': xml })
  const text = documentText(zip.buffer, 'docx')
  assert.equal(text, '第一段\n第二段')
})

check('prompt carries the document and the P0-P5 contract', () => {
  const prompt = buildPrompt({
    channel: 'Web 渠道',
    doc: { id: 'html-style', title: 'HTML 编写规范', url: 'https://spec.example.com/html-style.md' },
    text: 'P0 阻断问题；P5 建议。',
  })
  assert.match(prompt, /HTML 编写规范/)
  assert.match(prompt, /P0-P5/)
  assert.match(prompt, /只做检视，不修改任何文件/)
  assert.match(prompt, /规范依据/)
})

console.log(`\n${passed} checks passed`)
