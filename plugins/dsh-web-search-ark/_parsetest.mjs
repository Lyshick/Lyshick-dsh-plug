import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { mapArkResponse } from './index.js'

const LOG = join(process.env.TEMP, 'ark_parse.log')
const raw = readFileSync(join(process.env.TEMP, 'ark_full.json'), 'utf8').replace(/^\uFEFF/u, '')
const payload = JSON.parse(raw)
const result = mapArkResponse(payload)

const lines = []
lines.push(`rawBytes: ${raw.length}`)
lines.push(`model: ${payload.model}`)
lines.push(`outputTypes: ${payload.output.map((o) => o.type).join(',')}`)
lines.push(`usage.web_search: ${JSON.stringify(payload.usage?.tool_usage ?? null)}`)
lines.push(`sourceCount: ${result.sources.length}`)
for (const [i, s] of result.sources.entries()) {
  lines.push(`[${i + 1}] ${s.url}`)
  lines.push(`     title=${s.title ?? '-'}`)
  lines.push(`     publishedAt=${s.publishedAt ?? '-'}  snippetLen=${(s.snippet ?? '').length}`)
  lines.push(`     snippetHead=${(s.snippet ?? '').slice(0, 80)}`)
}
writeFileSync(LOG, lines.join('\n') + '\n')
