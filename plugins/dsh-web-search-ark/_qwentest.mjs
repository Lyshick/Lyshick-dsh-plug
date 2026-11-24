// Live end-to-end check: drive the provider with preset "qwen" against the real
// API. Requires QWEN_KEY in the environment; skipped when absent.
//
//   ENRICH=1 [ENRICH_LIMIT=5] turns the title enrichment on, so the printed
//   titles show whether real <title> values replaced the hostname fallback.
import { join } from 'node:path'

const key = process.env.QWEN_KEY
if (!key) {
  console.log('SKIP: QWEN_KEY not set')
  process.exit(0)
}

const enrich = process.env.ENRICH === '1'
const envelopLimit = Number(process.env.ENRICH_LIMIT ?? 5)

const audit = join(process.env.TEMP, `ark_qwen_e2e_${process.pid}.jsonl`)
process.env.DSH_WEB_SEARCH_ARK_AUDIT_FILE = audit

const mod = await import('./index.js')
const preset = mod.PRESETS.qwen

const provider = new mod.ArkSearchProvider({ get: () => undefined }, () => ({
  preset: 'qwen',
  supportsMaxKeyword: preset.supportsMaxKeyword,
  includeSources: preset.includeSources,
  apiKey: key,
  apiKeyEnvs: [],
  baseURL: preset.baseURL,
  model: preset.model,
  maxKeyword: 5,
  timeoutMs: 120_000,
  enrichTitles: enrich,
  enrichTitleLimit: envelopLimit,
}))

console.log('available():', provider.available())
console.log('baseURL:', preset.baseURL)
console.log('model:', preset.model)
console.log('max_keyword sent:', preset.supportsMaxKeyword, '| include sent:', preset.includeSources)
console.log('title enrichment:', enrich ? `ON (limit ${envelopLimit})` : 'OFF')

const started = Date.now()
try {
  const result = await provider.search({ query: '杭州今天天气', maxResults: 5 })
  console.log(`OK: ${result.sources.length} sources in ${Date.now() - started}ms`)
  for (const source of result.sources.slice(0, 5)) console.log('  -', source.title, '|', source.url)
} catch (error) {
  console.log('FAILED:', error?.code, String(error?.message ?? error))
  process.exitCode = 1
}