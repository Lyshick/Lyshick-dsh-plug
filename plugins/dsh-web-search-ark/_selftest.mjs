import { appendFileSync, writeFileSync } from 'node:fs'

const LOG = process.env.TEMP + '\\ark_selftest.log'
writeFileSync(LOG, '')
const log = (label, value) => {
  appendFileSync(LOG, `${label}: ${typeof value === 'string' ? value : JSON.stringify(value)}\n`)
}

try {
  const mod = await import('./index.js')
  log('exports', Object.keys(mod))

  const cfg = {
    apiKey: 'x',
    apiKeyEnv: 'ATEST_API_KEY',
    baseURL: 'https://ark.cn-beijing.volces.com/api/plan/v3',
    model: 'deepseek-v4-1-flash-261017',
    maxKeyword: 5,
    timeoutMs: 120000,
  }
  const provider = new mod.ArkSearchProvider({ get: () => undefined }, () => cfg)
  log('provider id', provider.id)
  log('available', String(provider.available()))

  const payload = {
    output: [
      { type: 'reasoning', summary: [] },
      { type: 'web_search_call', action: { query: 'python', type: 'search' }, status: 'completed' },
      {
        type: 'message',
        role: 'assistant',
        content: [
          {
            type: 'output_text',
            text: 'answer',
            annotations: [
              { type: 'url_citation', title: 'Python 3.14', url: 'https://python.org/a', site_name: 'python.org', publish_time: '2026-10-01T00:00:00+08:00', summary: 'long excerpt A' },
              { type: 'url_citation', title: 'Dup', url: 'https://python.org/a', summary: 'duplicate' },
              { type: 'url_citation', title: 'B', url: 'https://example.com/b', summary: 'excerpt B' },
              { type: 'url_citation', title: 'no-url' },
            ],
          },
        ],
      },
    ],
  }
  const result = mod.mapArkResponse(payload)
  log('sources', result.sources)
  log('truncated', String(result.truncated))

  try {
    mod.mapArkResponse({ output: [] })
    log('empty case', 'FAILED no throw')
  } catch (error) {
    log('empty case code', error.code)
  }
  log('DONE', 'ok')
} catch (error) {
  log('FATAL', String(error && error.stack ? error.stack : error))
}
