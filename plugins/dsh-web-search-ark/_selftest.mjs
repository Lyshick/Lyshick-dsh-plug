import { appendFileSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const LOG = process.env.TEMP + '\\ark_selftest.log'
writeFileSync(LOG, '')
const log = (label, value) => {
  appendFileSync(LOG, `${label}: ${typeof value === 'string' ? value : JSON.stringify(value)}\n`)
}

let failures = 0
/** Assert-like check: logs PASS/FAIL and counts failures. */
function check(label, condition, detail) {
  if (condition) {
    log(`PASS ${label}`, detail ?? 'ok')
  } else {
    failures++
    log(`FAIL ${label}`, detail ?? 'mismatch')
  }
}

// Isolate the audit file before importing the module (it reads the env at load).
const AUDIT_TMP = join(process.env.TEMP, `ark_selftest_audit_${process.pid}.jsonl`)
rmSync(AUDIT_TMP, { force: true })
process.env.DSH_WEB_SEARCH_ARK_AUDIT_FILE = AUDIT_TMP

try {
  const mod = await import('./index.js')
  log('exports', Object.keys(mod))

  // ---- credentialRefs / default chain (P1-2) -------------------------------
  check('default chain', mod.ArkSearchProvider !== undefined)
  const baseCfg = {
    baseURL: 'https://ark.cn-beijing.volces.com/api/plan/v3',
    model: 'deepseek-v4-1-flash-261017',
    maxKeyword: 5,
    timeoutMs: 120000,
  }

  // Case 1: no refs configured → default chain, second candidate resolves.
  const credentials1 = { resolve: async (ref) => (ref === 'HUOSHAN_API_KEY' ? { value: 'k-huoshan' } : undefined) }
  const ctx1 = { get: () => credentials1 }

  // resolveApiKey is module-private, so exercise it through search(): a found
  // key lets the flow continue past credentials and fail later at the abort
  // check (fetch never runs); a missing key throws CREDENTIAL_MISSING.
  async function keyOf(cfg, ctx) {
    const provider = new mod.ArkSearchProvider(ctx, () => cfg)
    const controller = new AbortController()
    controller.abort()
    try {
      await provider.search({ query: 'x' }, controller.signal)
      return 'resolved'
    } catch (error) {
      return error
    }
  }

  const hit2 = await keyOf(baseCfg, ctx1)
  check('second candidate resolves (aborts past credentials)', hit2 === 'resolved' || hit2?.code !== 'WEB_PROVIDER_CREDENTIAL_MISSING', String(hit2?.code ?? hit2))

  // Case 2: nothing resolves → error lists all attempted candidates.
  const ctxEmpty = { get: () => ({ resolve: async () => undefined }) }
  const miss = await keyOf(baseCfg, ctxEmpty)
  check('missing code', miss?.code === 'WEB_PROVIDER_CREDENTIAL_MISSING', String(miss?.code ?? miss))
  check('missing message lists default chain', typeof miss?.message === 'string' && miss.message.includes('ARK_API_KEY') && miss.message.includes('HUOSHAN_API_KEY') && miss.message.includes('ATEST_API_KEY'), miss?.message)

  // Case 3: custom comma-separated chain.
  const ctxCustom = { get: () => ({ resolve: async (ref) => (ref === 'MY_KEY' ? { value: 'k-my' } : undefined) }) }
  const hitCustom = await keyOf({ ...baseCfg, apiKeyEnv: 'OTHER_KEY, MY_KEY' }, ctxCustom)
  check('custom comma chain resolves', hitCustom === 'resolved' || hitCustom?.code !== 'WEB_PROVIDER_CREDENTIAL_MISSING', String(hitCustom?.code ?? hitCustom))

  // Case 4: literal apiKey wins over the chain.
  const ctxLiteral = { get: () => ({ resolve: async () => undefined }) }
  const hitLiteral = await keyOf({ ...baseCfg, apiKey: 'k-literal' }, ctxLiteral)
  check('literal key resolves', hitLiteral === 'resolved' || hitLiteral?.code !== 'WEB_PROVIDER_CREDENTIAL_MISSING', String(hitLiteral?.code ?? hitLiteral))

  // ---- audit covers failure paths (P1-3) ------------------------------------
  const lines = readFileSync(AUDIT_TMP, 'utf8').trim().split('\n')
  check('audit lines == attempts', lines.length === 4, String(lines.length))
  const missLine = JSON.parse(lines[1])
  check('audit records credential failure', missLine.ok === false && missLine.code === 'WEB_PROVIDER_CREDENTIAL_MISSING', missLine)

  // ---- selection duck-read & computation (P0-1) -----------------------------
  const reactive = (value) => ({ get: () => value })
  const seamArk = { config: { searchProvider: reactive('ark-official') }, searchProviderEnv: undefined, searchProviders: new Map([['ark-official', {}]]) }
  const selectionArk = mod.readSeamSelection(seamArk)
  check('selection reads configured id', selectionArk.configuredId === 'ark-official', selectionArk)
  check('selected when configured', mod.computeSelected('ark-official', ['ark-official'], true) === true)

  const seamOther = { config: { searchProvider: reactive('deepseek-official') }, searchProviders: new Map([['deepseek-official', {}]]) }
  check('not selected when another id', mod.computeSelected('deepseek-official', ['deepseek-official'], true) === false)
  const selOther = mod.readSeamSelection(seamOther)
  check('selection reads other id', selOther.configuredId === 'deepseek-official', selOther)

  const seamUnset = { config: { searchProvider: reactive(undefined) }, searchProviders: new Map([['ark-official', {}], ['deepseek-official', {}]]) }
  check('unset + multiple providers → unknown', mod.computeSelected(null, ['ark-official', 'deepseek-official'], true) === null)
  check('unset + single provider → selected', mod.computeSelected(null, ['ark-official'], true) === true)
  check('unset + unknown registry → unknown', mod.computeSelected(null, null, true) === null)
  const selUnset = mod.readSeamSelection(seamUnset)
  check('selection reads unset + registry', selUnset.configuredId === null && selUnset.registeredIds.length === 2, selUnset)

  const selWeird = mod.readSeamSelection({ config: {} })
  check('weird seam degrades to nulls', selWeird.configuredId === null && selWeird.registeredIds === null, selWeird)

  // ---- profile patch discovery (P0-1) ---------------------------------------
  const patchFiles = mod.findProfilePatchFiles(homedir())
  log('profile patch files', patchFiles)

  // ---- response mapping regression ------------------------------------------
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
  check('sources deduped', result.sources.length === 2, result.sources)
  check('truncated flag', result.truncated === false)

  try {
    mod.mapArkResponse({ output: [] })
    check('empty case throws', false, 'no throw')
  } catch (error) {
    check('empty case code', error.code === 'WEB_PROVIDER_ERROR', error.code)
  }

  log('FAILURES', String(failures))
  log('DONE', failures === 0 ? 'ok' : 'with failures')
} catch (error) {
  failures++
  log('FATAL', String(error && error.stack ? error.stack : error))
}
process.exitCode = failures === 0 ? 0 : 1
