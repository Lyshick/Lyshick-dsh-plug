/**
 * Volcengine Ark (火山方舟) web-search provider for the DeepSeek Harness
 * `ctx.web` capability seam.
 *
 * Ark exposes its official 联网内容插件 (web search plugin) only through the
 * native Responses API, as an OpenAI-style tool:
 *
 *   POST {baseURL}/responses
 *   { model, input, tools: [{ type: 'web_search', max_keyword: N }] }
 *
 * The model runs the searches server-side and returns `web_search_call` items
 * plus `url_citation` annotations carrying title / url / site_name /
 * publish_time / summary. This provider maps those annotations onto the seam's
 * `sources[]` shape and registers under the id `ark-official`.
 *
 * DESIGN NOTE — zero package imports on purpose. Plugin packages under
 * `~/.dsh/profiles/node_modules` resolve `@deepseek-ai/*` through junctions
 * that pnpm created against the *installing* runtime path; after the desktop
 * app moves, those junctions dangle and any such import fails at load time.
 * Depending only on Node built-ins keeps this provider loadable regardless.
 * The wheel-reinvention below (a coded Error, a ref normalizer) is the price.
 *
 * @module dsh-web-search-ark
 */
import { appendFileSync, readdirSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { effectiveSettings, registerRoutes } from './lib/routes.js'

/** Stable provider id this plugin registers under. */
export const SEARCH_PROVIDER_ID = 'ark-official'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'web-search-ark'

/** The web seam this provider registers into. */
export const inject = ['web']

/**
 * Audit file (JSONL under ~/.dsh) recording each search attempt.
 *
 * `DSH_WEB_SEARCH_ARK_AUDIT_FILE` overrides the path (self-test isolation).
 *
 * Deliberately NOT a session event: `Session.append(type, data, opts)` ignores
 * any `ignorable` option (its opts only carry `surfaceOp` / `sourceEventSeqs`),
 * so a custom type lands in the log unmarked — and a harness build that does
 * not know the type then refuses the whole session unless the event carries
 * the envelope `ignorable: true` marker. The official escape hatch
 * (`appendPluginRecord`, `plugin:`-prefixed types) is not reachable without
 * importing `@deepseek-ai/dsh-session`, which this package avoids by design.
 */
const AUDIT_FILE = process.env.DSH_WEB_SEARCH_ARK_AUDIT_FILE ?? join(homedir(), '.dsh', 'web-search-ark.audit.jsonl')

/** Default Ark Responses-API base. `/responses` is appended. */
const DEFAULT_BASE_URL = 'https://ark.cn-beijing.volces.com/api/plan/v3'

/** Default model that runs the search sub-task on this deployment. */
const DEFAULT_MODEL = 'deepseek-v4-1-flash-261017'

/**
 * Credential references tried in order (credentials service first, then the
 * launching environment); the first resolvable wins. `ARK_API_KEY` is the name
 * Volcengine's own docs use; `HUOSHAN_API_KEY` covers deployments where the
 * Ark key is shared with the chat route; `ATEST_API_KEY` keeps 1.1.0 setups
 * working. Override with a comma-separated `apiKeyEnv` in the config.
 */
const DEFAULT_API_KEY_ENVS = ['ARK_API_KEY', 'HUOSHAN_API_KEY', 'ATEST_API_KEY']

/** Default upper bound on keyword searches per round (Ark allows 1-50). */
const DEFAULT_MAX_KEYWORD = 5

/** Default per-search timeout in milliseconds. */
const DEFAULT_TIMEOUT_MS = 120_000

/** Attribution header sent on every request. */
const USER_AGENT = 'dsh-web-search-ark/1.0.0'

/**
 * Error carrying the seam's machine-routable `code`. `@deepseek-ai/dsh-web`'s
 * `WebError` is a `HarnessError` whose only contract the seam consumes is
 * `(message, code)`; reproducing that shape avoids importing the package.
 */
class ArkSearchError extends Error {
  constructor(message, code, options) {
    super(message)
    this.name = 'WebError'
    this.code = code
    if (options?.cause !== undefined) this.cause = options.cause
  }
}

/** Read one config field from either a reactive row config or a plain object. */
function read(config, key) {
  const value = config?.[key]
  return typeof value?.get === 'function' ? value.get() : value
}

/** Normalize a credential reference (an env-var name) to its canonical form. */
function credentialRef(value) {
  return String(value ?? '').trim()
}

/** Normalize a string ("A,B") or array credential reference into a list. */
function credentialRefs(value) {
  const list = Array.isArray(value) ? value : String(value ?? '').split(',')
  const refs = list.map(credentialRef).filter((ref) => ref.length > 0)
  return refs.length > 0 ? refs : [...DEFAULT_API_KEY_ENVS]
}

/** Strip trailing slashes so a base URL can be joined with a path suffix. */
function trimSlash(value) {
  return String(value ?? '').trim().replace(/\/+$/u, '')
}

/** Whether a string is a usable absolute HTTP(S) URL. */
function isHttpUrl(value) {
  try {
    const url = new URL(String(value))
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

/** Whether a value is a positive integer within Ark's keyword range. */
function isKeywordCount(value) {
  return Number.isInteger(value) && value >= 1 && value <= 50
}

/** Coerce one config section into fully-defaulted options. */
function normalizeOptions(config) {
  const maxKeyword = Number(read(config, 'maxKeyword'))
  const timeoutMs = Number(read(config, 'timeoutMs'))
  return {
    apiKey: read(config, 'apiKey'),
    apiKeyEnvs: credentialRefs(read(config, 'apiKeyEnv')),
    baseURL: String(read(config, 'baseURL') ?? '').trim() || DEFAULT_BASE_URL,
    model: String(read(config, 'model') ?? '').trim() || DEFAULT_MODEL,
    maxKeyword: Number.isInteger(maxKeyword) && maxKeyword >= 1 && maxKeyword <= 50 ? maxKeyword : DEFAULT_MAX_KEYWORD,
    timeoutMs: Number.isInteger(timeoutMs) && timeoutMs >= 1000 ? timeoutMs : DEFAULT_TIMEOUT_MS,
  }
}

/**
 * Build the normalized source list from one Ark Responses payload.
 *
 * `web_search_call.action.sources` is present only when the deployment returns
 * it; `include` asks for it, but the authoritative citation carrier is the
 * `url_citation` annotation list on each `output_text` block. Both are read and
 * deduplicated by URL. The annotation wins because it carries `summary`, the
 * long excerpt Ark recommends for LLM consumption (its `snippet` equivalent is
 * documented as unsuitable for models).
 *
 * @param payload - parsed Responses body.
 * @returns deduplicated sources in first-seen order.
 */
export function mapArkResponse(payload) {
  const sources = []
  const seen = new Set()

  const push = (url, title, snippet, publishedAt, siteName) => {
    if (typeof url !== 'string' || !/^https?:\/\//iu.test(url)) return
    if (seen.has(url)) return
    seen.add(url)
    const heading =
      typeof title === 'string' && title.length > 0
        ? title
        : typeof siteName === 'string' && siteName.length > 0
          ? siteName
          : undefined
    // Ark emits the epoch as its "no date" placeholder; surfacing 1970 would
    // rank stale pages as fresh in the tool result.
    const dated =
      typeof publishedAt === 'string' && publishedAt.length > 0 && !publishedAt.startsWith('1970-01-01')
        ? publishedAt
        : undefined
    sources.push({
      url,
      ...(heading !== undefined ? { title: heading } : {}),
      ...(typeof snippet === 'string' && snippet.length > 0 ? { snippet } : {}),
      ...(dated !== undefined ? { publishedAt: dated } : {}),
    })
  }

  for (const item of payload?.output ?? []) {
    if (item?.type === 'message') {
      for (const block of item.content ?? []) {
        if (block?.type !== 'output_text') continue
        for (const annotation of block.annotations ?? []) {
          if (annotation?.type != null && annotation.type !== 'url_citation') continue
          push(
            annotation.url,
            annotation.title,
            annotation.summary,
            annotation.publish_time ?? annotation.published_at,
            annotation.site_name,
          )
        }
      }
      continue
    }
    if (item?.type === 'web_search_call') {
      for (const source of item.action?.sources ?? []) {
        push(
          source?.url,
          source?.title,
          source?.summary ?? source?.snippet,
          source?.publish_time ?? source?.published_at,
          source?.site_name,
        )
      }
    }
  }

  if (sources.length === 0) {
    throw new ArkSearchError(
      'Ark returned no web-search citations. Confirm the 联网内容插件 (web search plugin) is enabled for this account and that the configured model supports the web_search tool.',
      'WEB_PROVIDER_ERROR',
    )
  }
  return { sources, truncated: false }
}

/**
 * Resolve the Ark API key from the literal, the credentials service, or the
 * launching environment. Each candidate reference is checked against both
 * sources in turn so a mixed setup (one ref stored, another exported) works.
 */
async function resolveApiKey(ctx, options) {
  if (typeof options.apiKey === 'string' && options.apiKey.trim().length > 0) return options.apiKey.trim()
  // Defensively normalize: callers may hand over a raw config snapshot whose
  // `apiKeyEnvs` was never run through `normalizeOptions`.
  const refs =
    Array.isArray(options.apiKeyEnvs) && options.apiKeyEnvs.length > 0
      ? options.apiKeyEnvs.map(credentialRef).filter((ref) => ref.length > 0)
      : credentialRefs(options.apiKeyEnv)
  for (const ref of refs.length > 0 ? refs : DEFAULT_API_KEY_ENVS) {
    let stored
    try {
      stored = await ctx.get('credentials')?.resolve(ref)
    } catch {
      stored = undefined
    }
    if (typeof stored?.value === 'string' && stored.value.trim().length > 0) return stored.value.trim()
    const ambient = process.env[ref]
    if (typeof ambient === 'string' && ambient.trim().length > 0) return ambient.trim()
  }
  throw new ArkSearchError(
    `Ark search has no API key. Tried credential refs [${refs.join(', ')}] against the credentials service and the launching environment. ` +
      `Store one in ~/.dsh/.credentials.yaml (under refs:), export it in the launching environment, or set a literal "apiKey" / a comma-separated "apiKeyEnv" in the web-search-ark config.`,
    'WEB_PROVIDER_CREDENTIAL_MISSING',
  )
}

/** The Ark-backed search provider. */
export class ArkSearchProvider {
  id = SEARCH_PROVIDER_ID

  /**
   * @param ctx - plugin context supplying `credentials` and `agents`.
   * @param getConfig - thunk returning the options for the NEXT operation, so a
   *   config change never mixes two snapshots inside one search.
   */
  constructor(ctx, getConfig) {
    this.ctx = ctx
    this.getConfig = getConfig
  }

  available() {
    const options = this.getConfig()
    return isHttpUrl(options.baseURL) && isKeywordCount(options.maxKeyword)
  }

  /**
   * Run one search. Every attempt — success or failure — appends exactly one
   * audit line written in `finally`, so "no audit line ⇒ the provider was not
   * selected" is a reliable diagnostic and credential failures leave a trace.
   */
  async search(request, signal) {
    const options = this.getConfig()
    const startedAt = Date.now()
    const endpoint = `${trimSlash(options.baseURL)}/responses`
    let outcome = { ok: false, code: 'WEB_PROVIDER_ERROR' }
    try {
      const result = await this.#run(endpoint, options, request, signal, outcome)
      return result
    } catch (error) {
      if (typeof error?.code === 'string' && error.code.length > 0) {
        outcome = { ok: false, code: error.code }
      }
      throw error
    } finally {
      this.record(endpoint, options, outcome, startedAt)
    }
  }

  /** The actual search body; mutates `outcome` on the paths that reach it. */
  async #run(endpoint, options, request, signal, outcome) {
    if (!isHttpUrl(options.baseURL)) {
      outcome.code = 'WEB_PROVIDER_CONFIGURED_UNAVAILABLE'
      throw new ArkSearchError(
        `Ark search baseURL ${JSON.stringify(options.baseURL)} is not an absolute HTTP(S) URL`,
        'WEB_PROVIDER_CONFIGURED_UNAVAILABLE',
      )
    }
    const apiKey = await resolveApiKey(this.ctx, options)
    if (signal?.aborted === true) throw new ArkSearchError('Ark search aborted', 'WEB_ABORTED')

    const body = {
      model: options.model,
      input: `Search the web for: ${request.query}`,
      tools: [{ type: 'web_search', max_keyword: options.maxKeyword }],
      include: ['web_search_call.action.sources'],
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => {
      controller.abort(new Error(`Ark search timed out after ${options.timeoutMs}ms`))
    }, options.timeoutMs)
    const onAbort = () => controller.abort(signal?.reason)
    signal?.addEventListener('abort', onAbort, { once: true })

    let response
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        redirect: 'error',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          authorization: `Bearer ${apiKey}`,
          'user-agent': USER_AGENT,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
    } catch (error) {
      if (signal?.aborted === true) throw new ArkSearchError('Ark search aborted', 'WEB_ABORTED', { cause: error })
      throw new ArkSearchError(
        `Ark search request to ${JSON.stringify(endpoint)} failed: ${String(error)}`,
        'WEB_PROVIDER_ERROR',
        { cause: error },
      )
    } finally {
      clearTimeout(timeout)
      signal?.removeEventListener('abort', onAbort)
    }

    if (!response.ok) {
      let detail = ''
      try {
        const parsed = await response.json()
        detail = parsed?.error?.message ?? parsed?.error ?? parsed?.message ?? ''
      } catch {
        // A non-JSON error body is still reported by the status below.
      }
      throw new ArkSearchError(
        `Ark search endpoint ${JSON.stringify(endpoint)} returned HTTP ${response.status}${typeof detail === 'string' && detail.length > 0 ? `: ${detail}` : ''}. Check that "${options.model}" exists on this Ark endpoint and that the API key can reach the Responses API.`,
        'WEB_PROVIDER_ERROR',
      )
    }

    let payload
    try {
      payload = await response.json()
    } catch (error) {
      throw new ArkSearchError('Ark search returned an unprocessable response body', 'WEB_PROVIDER_ERROR', {
        cause: error,
      })
    }
    const result = mapArkResponse(payload)
    outcome.ok = true
    outcome.code = 'OK'
    outcome.sources = result.sources.length
    return result
  }

  /** Append one audit line per attempt; a logging failure must never fail the search. */
  record(endpoint, options, outcome, startedAt) {
    try {
      const line = JSON.stringify({
        time: Date.now(),
        endpoint,
        model: options.model,
        maxKeyword: options.maxKeyword,
        ok: outcome.ok,
        code: outcome.code,
        ...(typeof outcome.sources === 'number' ? { sources: outcome.sources } : {}),
        elapsedMs: Date.now() - startedAt,
      })
      appendFileSync(AUDIT_FILE, `${line}\n`, { encoding: 'utf8' })
    } catch {
      // Audit-only: never block a search on the audit file.
    }
  }
}

/** Read the deployment row config into a plain object. */
function readRowConfig(config) {
  return {
    apiKey: read(config, 'apiKey'),
    apiKeyEnv: read(config, 'apiKeyEnv'),
    baseURL: read(config, 'baseURL'),
    model: read(config, 'model'),
    maxKeyword: read(config, 'maxKeyword'),
    timeoutMs: read(config, 'timeoutMs'),
  }
}

/**
 * Defensively read the web seam's current search-provider selection.
 *
 * `@deepseek-ai/dsh-web` (0.2.x) ships no observation API, but the service
 * instance keeps the selection state as plain public fields: `config.
 * searchProvider` (reactive), `searchProviderEnv`, and the `searchProviders`
 * registry Map. This reads them duck-typed and returns `null`s on any shape
 * change, so a future harness rename degrades to "unknown", never to a crash.
 */
export function readSeamSelection(seam) {
  try {
    const configured = seam?.config?.searchProvider
    const configuredId = typeof configured?.get === 'function' ? configured.get() : undefined
    const envId = typeof seam?.searchProviderEnv === 'string' && seam.searchProviderEnv.length > 0 ? seam.searchProviderEnv : undefined
    const registeredIds = seam?.searchProviders instanceof Map ? [...seam.searchProviders.keys()] : null
    return { configuredId: configuredId ?? envId ?? null, registeredIds }
  } catch {
    return { configuredId: null, registeredIds: null }
  }
}

/**
 * Whether `ark-official` is (or will be) the provider the seam resolves for a
 * search. `null` means unknowable: the id is unset and other providers are (or
 * may be) registered, so auto-selection depends on their runtime availability.
 */
export function computeSelected(configuredId, registeredIds, selfAvailable) {
  if (typeof configuredId === 'string' && configuredId.length > 0) return configuredId === SEARCH_PROVIDER_ID
  if (registeredIds === null || !selfAvailable) return registeredIds !== null ? false : null
  return registeredIds.length === 1 ? true : null
}

/**
 * Locate profile `cordis.patch.yml` candidates so the activation snippet can
 * name an exact file. A read-only or unusual home simply yields an empty list.
 */
export function findProfilePatchFiles(home = homedir()) {
  const profilesDir = join(home, '.dsh', 'profiles')
  try {
    return readdirSync(profilesDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => join(profilesDir, entry.name, 'cordis.patch.yml'))
      .filter((path) => existsSync(path))
  } catch {
    return []
  }
}

/**
 * Register the Ark search provider with `ctx.web`, plus the Plugins-card HTTP
 * surface. Options are re-resolved on every search so saving from the card
 * takes effect immediately (no Host restart).
 *
 * Also logs a loud warning when the seam's selection does not (yet) point at
 * this provider: mounting is not activation, and 1.1.0 kept that invisible.
 */
export function apply(ctx, config) {
  const getOptions = () => normalizeOptions(effectiveSettings(readRowConfig(config)))
  const provider = new ArkSearchProvider(ctx, getOptions)
  ctx.web.registerSearchProvider(provider)

  const warn = (message) => {
    try {
      ctx.logger?.warn?.(message)
    } catch {
      // A missing logger must not break registration.
    }
  }
  const { configuredId, registeredIds } = readSeamSelection(ctx.web)
  if (configuredId === null) {
    warn(
      `dsh-web-search-ark mounted but web.searchProvider is unset — searches use Ark only if it is the single usable provider. Add "config: { searchProvider: ark-official }" to the web row to activate.`,
    )
  } else if (configuredId !== SEARCH_PROVIDER_ID) {
    warn(
      `dsh-web-search-ark mounted but web.searchProvider is "${configuredId}" — searches will NOT use Ark until selected. See the plugin README ("激活").`,
    )
  } else if (registeredIds !== null && !provider.available()) {
    warn(`web.searchProvider selects ${SEARCH_PROVIDER_ID} but the provider is currently unavailable — check the Ark credentials or baseURL config.`)
  }

  const checkKey = async () => {
    try {
      await resolveApiKey(ctx, getOptions())
      return { ok: true }
    } catch (error) {
      return { ok: false, reason: String(error?.message ?? error) }
    }
  }
  const getStatus = () => {
    const options = getOptions()
    const selection = readSeamSelection(ctx.web)
    return {
      mounted: true,
      providerId: SEARCH_PROVIDER_ID,
      configuredSearchProvider: selection.configuredId,
      registeredSearchProviders: selection.registeredIds,
      selected: computeSelected(selection.configuredId, selection.registeredIds, provider.available()),
      available: provider.available(),
      patchFiles: findProfilePatchFiles(),
    }
  }
  registerRoutes(ctx, {
    getConfig: getOptions,
    checkKey,
    getStatus,
    probe: (query) => provider.search({ query, maxResults: 3 }),
  })
}
