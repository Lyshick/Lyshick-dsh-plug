/**
 * Settings storage and HTTP routes for dsh-web-search-ark.
 *
 * The effective configuration is layered:
 *
 *   1. row config from the profile's `cordis.patch.yml` (the deployment default)
 *   2. `~/.dsh/web-search-ark.json` (what the sidebar Plugins card writes)
 *
 * The file layer wins, so the card is the primary editing surface while the
 * row config still documents and seeds the deployment defaults. The provider
 * re-reads this on every search, so saving in the card takes effect on the next
 * search without restarting the Host.
 *
 * Zero package imports on purpose — see the note in `../index.js`.
 */
import { appendFileSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

/** Fields the card may write. Keeping this list tight prevents junk keys. */
export const EDITABLE_FIELDS = ['apiKey', 'apiKeyEnv', 'baseURL', 'model', 'maxKeyword', 'timeoutMs']

/** Absolute path of the JSON layer. */
export function settingsFile() {
  return join(process.env.USERPROFILE ?? process.env.HOME ?? '.', '.dsh', 'web-search-ark.json')
}

/** Read the JSON layer; an absent or corrupt file contributes nothing. */
export function readFileConfig() {
  try {
    const parsed = JSON.parse(readFileSync(settingsFile(), 'utf8'))
    return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

/** Normalize one candidate object down to the editable fields. */
export function pickSettings(source) {
  const out = {}
  if (source === null || typeof source !== 'object') return out
  for (const key of EDITABLE_FIELDS) {
    const value = source[key]
    if (value === undefined || value === null) continue
    if (key === 'maxKeyword' || key === 'timeoutMs') {
      const numeric = Number(value)
      if (Number.isInteger(numeric) && numeric > 0) out[key] = numeric
      continue
    }
    const text = String(value).trim()
    if (text.length > 0) out[key] = text
  }
  return out
}

/** Write the JSON layer atomically (temp file + rename). */
export function writeFileConfig(patch) {
  const target = settingsFile()
  const next = { ...readFileConfig(), ...pickSettings(patch) }
  mkdirSync(dirname(target), { recursive: true })
  const tmp = `${target}.${process.pid}.tmp`
  writeFileSync(tmp, JSON.stringify(next, null, 2) + '\n', 'utf8')
  renameSync(tmp, target)
  return next
}

/** Merge the deployment row config with the JSON layer (file wins). */
export function effectiveSettings(rowConfig) {
  return { ...pickSettings(rowConfig), ...readFileConfig() }
}

function json(res, status, payload) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(JSON.stringify(payload))
}

async function readJsonBody(req) {
  const chunks = []
  let total = 0
  for await (const chunk of req) {
    total += chunk.length
    if (total > 64 * 1024) throw new Error('request body too large')
    chunks.push(chunk)
  }
  if (chunks.length === 0) return {}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

/**
 * Register the settings card's HTTP surface under `/ark-search`.
 *
 * `ctx.inject(['webServer'])` keeps the plugin loadable on hosts without a web
 * server (TUI/headless): the provider still registers, only the card is absent.
 *
 * @param ctx - plugin context.
 * @param deps - `getConfig` returns the effective options; `probe` runs a live search.
 */
export function registerRoutes(ctx, deps) {
  ctx.inject(['webServer'], (sctx) => {
    sctx.effect(
      () =>
        sctx.webServer.register({
          kind: 'prefix',
          path: '/ark-search',
          handler: async (req, res) => {
            const pathname = new URL(req.url ?? '/', 'http://x').pathname
            try {
              if (pathname === '/ark-search/client-ready' && req.method === 'POST') {
                const body = await readJsonBody(req)
                try {
                  appendFileSync(
                    join(dirname(settingsFile()), 'web-search-ark.client.log'),
                    JSON.stringify({ at: new Date().toISOString(), ...body }) + '\n',
                    'utf8',
                  )
                } catch {
                  // A read-only home must not break the browser half.
                }
                return json(res, 200, { ok: true, value: { logged: true } })
              }
              if (pathname === '/ark-search/settings' && req.method === 'GET') {
                return json(res, 200, {
                  ok: true,
                  value: { config: deps.getConfig(), file: readFileConfig(), path: settingsFile() },
                })
              }
              if (pathname === '/ark-search/settings' && req.method === 'POST') {
                const body = await readJsonBody(req)
                const saved = writeFileConfig(body?.config ?? {})
                return json(res, 200, { ok: true, value: { config: deps.getConfig(), file: saved } })
              }
              if (pathname === '/ark-search/test' && req.method === 'POST') {
                const startedAt = Date.now()
                const body = await readJsonBody(req)
                const query = String(body?.query ?? '').trim() || 'Volcengine Ark web search'
                try {
                  const result = await deps.probe(query)
                  return json(res, 200, {
                    ok: true,
                    value: {
                      count: result.sources.length,
                      elapsedMs: Date.now() - startedAt,
                      sources: result.sources.slice(0, 3),
                    },
                  })
                } catch (error) {
                  return json(res, 200, {
                    ok: false,
                    error: {
                      code: error?.code ?? 'test-failed',
                      message: String(error?.message ?? error),
                      elapsedMs: Date.now() - startedAt,
                    },
                  })
                }
              }
              return json(res, 404, { ok: false, error: { code: 'not-found', message: 'not found' } })
            } catch (error) {
              return json(res, 400, {
                ok: false,
                error: { code: 'bad-request', message: String(error?.message ?? error) },
              })
            }
          },
        }),
      'dsh-web-search-ark: settings routes',
    )
  })
}
