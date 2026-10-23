// dsh-web-search-ark client bundle — hand-written in the __ModuleLoader__ format.
//
// Registers a row-config page for the `web-search-ark` row. The card talks to
// the Host through the plugin's own `/ark-search` routes (see lib/routes.js),
// so it does not depend on the SettingsForms protocol or on any
// `@deepseek-ai/*` client package — same zero-dependency stance as the Host
// half. React and the JSX runtime come from the host's `require`.
window.__ModuleLoader__.load({
	id: "dsh-web-search-ark",
	factory: (require) => {
		var __modules = {
"./index.js": function (require, module, exports) {
const React = require('react')
const h = React.createElement
const { useCallback, useEffect, useState } = React

const NS = 'arkSearch'
const ENDPOINT = '/ark-search'

const zh = {
  summary: '火山方舟联网内容插件（豆包搜索）。模型、端点与关键词上限均可在本页调整。',
  title: '方舟联网搜索',
  intro: 'dsl 内置的 web_search 通过方舟 Responses API 的原生 web_search 工具检索，底层执行的就是豆包搜索。保存后对下一次搜索立即生效，不需要重启。',
  groupCore: '连接',
  apiKeyEnv: '凭证名',
  apiKeyEnvHint: '在 ~/.dsh/.credentials.yaml 或启动环境里定义的变量名',
  apiKey: '直接密钥（覆盖凭证名）',
  apiKeyHint: '留空则使用上面的凭证名',
  baseURL: '接口地址',
  baseURLHint: '套餐 key 用 /api/plan/v3，标准 key 用 /api/v3',
  groupSearch: '检索',
  model: '执行搜索的模型',
  modelHint: '必须支持 web_search 工具',
  maxKeyword: '单轮关键词上限',
  maxKeywordHint: '方舟允许 1–50，直接影响计费次数',
  timeoutMs: '超时（毫秒）',
  statusChecking: '正在检查启用状态…',
  statusOn: '已启用：web.searchProvider → ark-official',
  statusOffConfigured: '未启用：当前 web.searchProvider 是 “{id}”，搜索不会经过方舟',
  statusOffUnset: '未启用：web.searchProvider 未设置，且存在多个搜索 provider，无法自动选中',
  statusUnknown: '无法确定启用状态（当前 Host 未暴露 selection）；若搜索仍走旧 provider，请检查 web 行 selection',
  activateTitle: '激活步骤（必做，否则插件不会生效）',
  activateBody: '把下面这段追加到 profile 的 cordis.patch.yml（与 bundles 同级），然后重启 DeepSeek Harness：',
  activatePath: '目标文件：{path}',
  activatePathGeneric: '目标文件：~/.dsh/profiles/<你的 profile>/cordis.patch.yml（桌面版通常为 desktop）',
  copy: '复制 YAML',
  copied: '已复制',
  copyFail: '复制失败，请手动选择文本复制',
  keyMissing: '凭证未就绪：{reason}',
  keyOk: '凭证就绪',
  save: '保存',
  saving: '保存中…',
  saved: '已保存，下次搜索生效',
  test: '测试一次搜索',
  testing: '搜索中…',
  testOk: '成功：{count} 条来源，耗时 {ms} ms',
  testFail: '失败：{message}',
  loadFail: '读取配置失败：{message}',
  fileLayer: '当前配置来自 {path}',
  reset: '撤销更改',
}

const en = {
  summary: 'Volcengine Ark web search (Doubao). Model, endpoint and keyword bound are editable here.',
  title: 'Ark web search',
  intro: 'The built-in web_search runs through Ark Responses API native web_search, backed by Doubao search. Saving takes effect on the next search — no restart.',
  groupCore: 'Connection',
  apiKeyEnv: 'Credential name',
  apiKeyEnvHint: 'A variable name defined in ~/.dsh/.credentials.yaml or the launching environment',
  apiKey: 'Literal key (overrides the credential)',
  apiKeyHint: 'Leave empty to use the credential name above',
  baseURL: 'Base URL',
  baseURLHint: 'Plan keys use /api/plan/v3, standard keys use /api/v3',
  groupSearch: 'Retrieval',
  model: 'Search model',
  modelHint: 'Must support the web_search tool',
  maxKeyword: 'Max keywords per round',
  maxKeywordHint: 'Ark allows 1–50; drives billing',
  timeoutMs: 'Timeout (ms)',
  statusChecking: 'Checking activation…',
  statusOn: 'Enabled: web.searchProvider → ark-official',
  statusOffConfigured: 'Not enabled: web.searchProvider is “{id}” — searches bypass Ark',
  statusOffUnset: 'Not enabled: web.searchProvider is unset and several search providers exist, so none is auto-selected',
  statusUnknown: 'Activation unknown (this Host does not expose the selection); if searches still use the old provider, check the web row selection',
  activateTitle: 'Activation steps (required — the plugin does nothing without them)',
  activateBody: 'Append this to the profile’s cordis.patch.yml (sibling of bundles), then restart DeepSeek Harness:',
  activatePath: 'Target file: {path}',
  activatePathGeneric: 'Target file: ~/.dsh/profiles/<your profile>/cordis.patch.yml (usually desktop)',
  copy: 'Copy YAML',
  copied: 'Copied',
  copyFail: 'Copy failed — select the text manually',
  keyMissing: 'Credential not resolved: {reason}',
  keyOk: 'Credential ready',
  save: 'Save',
  saving: 'Saving…',
  saved: 'Saved — applies to the next search',
  test: 'Test a search',
  testing: 'Searching…',
  testOk: 'OK: {count} sources in {ms} ms',
  testFail: 'Failed: {message}',
  loadFail: 'Could not read settings: {message}',
  fileLayer: 'Settings file: {path}',
  reset: 'Discard changes',
}

function format(template, values) {
  return String(template).replace(/\{(\w+)\}/g, (whole, key) =>
    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : whole,
  )
}

async function call(path, init) {
  const response = await fetch(ENDPOINT + path, init)
  let payload = {}
  try {
    payload = await response.json()
  } catch {
    payload = {}
  }
  if (payload.ok !== true) {
    const message = payload?.error?.message ?? payload?.error?.code ?? `HTTP ${response.status}`
    const error = new Error(message)
    error.code = payload?.error?.code
    throw error
  }
  return payload.value
}

const inputStyle = {
  boxSizing: 'border-box',
  width: '100%',
  height: 36,
  border: '1px solid var(--dsw-alias-border-l2)',
  borderRadius: 8,
  background: 'var(--dsw-alias-bg-base)',
  color: 'var(--dsw-alias-label-primary)',
  padding: '0 12px',
  font: 'inherit',
  fontSize: 14,
  lineHeight: '22px',
  outline: 'none',
}

function Field({ label, hint, children }) {
  return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 } }, [
    h('span', { key: 'l', style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 12, fontWeight: 500, lineHeight: '18px' } }, label),
    children,
    hint
      ? h('span', { key: 'h', style: { color: 'var(--dsw-alias-label-caption)', fontSize: 12, lineHeight: '18px' } }, hint)
      : null,
  ])
}

function GroupTitle({ children }) {
  return h(
    'h4',
    { style: { margin: '4px 0 0', color: 'var(--dsw-alias-label-caption)', fontSize: 12, fontWeight: 500, lineHeight: '18px' } },
    children,
  )
}

const EMPTY_DRAFT = {
  apiKeyEnv: '',
  apiKey: '',
  baseURL: '',
  model: '',
  maxKeyword: 5,
  timeoutMs: 120000,
}

// Activation selection snippet — the exact text the card copies for the user.
const ACTIVATE_YAML = [
  '- id: web',
  '  name: "@deepseek-ai/dsh-web"',
  '  config:',
  '    searchProvider: ark-official',
  '    fetchProvider: http',
].join('\n')

/** Copy text to the clipboard with a textarea fallback for older webviews. */
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const area = document.createElement('textarea')
      area.value = text
      area.style.position = 'fixed'
      area.style.opacity = '0'
      document.body.appendChild(area)
      area.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(area)
      return ok
    } catch {
      return false
    }
  }
}

function StatusBadge({ t, status, loading }) {
  if (loading) return h('div', { style: badgeStyle('var(--dsw-alias-label-caption)') }, t('statusChecking'))
  if (!status) return h('div', { style: badgeStyle('var(--dsw-alias-state-error-primary)') }, t('statusUnknown'))
  const color =
    status.selected === true
      ? 'var(--dsw-alias-state-success-primary)'
      : status.selected === false
        ? 'var(--dsw-alias-state-error-primary)'
        : 'var(--dsw-alias-label-caption)'
  const text =
    status.selected === true
      ? t('statusOn')
      : status.selected === false
        ? status.configuredSearchProvider
          ? format(t('statusOffConfigured'), { id: status.configuredSearchProvider })
          : t('statusOffUnset')
        : t('statusUnknown')
  return h('div', { style: badgeStyle(color) }, text)
}

function badgeStyle(color) {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    padding: '4px 10px',
    borderRadius: 999,
    fontSize: 12,
    lineHeight: '18px',
    fontWeight: 500,
    color,
    border: `1px solid ${color}`,
    background: 'transparent',
  }
}

function ActivatePanel({ t, status }) {
  const [copied, setCopied] = useState('')
  const patchFiles = Array.isArray(status?.patchFiles) ? status.patchFiles : []
  const target = patchFiles.length === 1 ? format(t('activatePath'), { path: patchFiles[0] }) : t('activatePathGeneric')
  const copy = async () => {
    const ok = await copyText(ACTIVATE_YAML)
    setCopied(ok ? 'ok' : 'fail')
  }
  return h('div', {
    style: {
      padding: 12,
      border: '1px solid var(--dsw-alias-state-error-primary)',
      borderRadius: 8,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    },
  }, [
    h('strong', { key: 't', style: { fontSize: 13, lineHeight: '20px', color: 'var(--dsw-alias-state-error-primary)' } }, t('activateTitle')),
    h('p', { key: 'b', style: { margin: 0, fontSize: 13, lineHeight: '20px', color: 'var(--dsw-alias-label-primary)' } }, t('activateBody')),
    h('pre', {
      key: 'code',
      style: {
        margin: 0,
        padding: 10,
        borderRadius: 6,
        overflow: 'auto',
        background: 'var(--dsw-alias-bg-base)',
        border: '1px solid var(--dsw-alias-border-l2)',
        font: '12px/18px ui-monospace, Consolas, monospace',
        color: 'var(--dsw-alias-label-primary)',
      },
    }, ACTIVATE_YAML),
    h('p', { key: 'p', style: { margin: 0, fontSize: 12, lineHeight: '18px', color: 'var(--dsw-alias-label-caption)' } }, target),
    h('div', { key: 'actions', style: { display: 'flex', alignItems: 'center', gap: 8 } }, [
      h('button', {
        key: 'copy',
        type: 'button',
        onClick: copy,
        style: {
          height: 28,
          borderRadius: 14,
          padding: '0 12px',
          border: '1px solid var(--dsw-alias-border-l2)',
          background: 'transparent',
          color: 'var(--dsw-alias-label-primary)',
          font: 'inherit',
          fontSize: 12,
          cursor: 'pointer',
        },
      }, copied === 'ok' ? t('copied') : t('copy')),
      copied === 'fail' ? h('span', { key: 'fail', style: { fontSize: 12, color: 'var(--dsw-alias-state-error-primary)' } }, t('copyFail')) : null,
    ]),
  ])
}

function draftOf(config) {
  return {
    apiKeyEnv: config?.apiKeyEnv ?? '',
    apiKey: '',
    baseURL: config?.baseURL ?? '',
    model: config?.model ?? '',
    maxKeyword: Number(config?.maxKeyword ?? 5),
    timeoutMs: Number(config?.timeoutMs ?? 120000),
  }
}

function ArkSearchForm({ t, view }) {
  const [draft, setDraft] = useState(EMPTY_DRAFT)
  const [file, setFile] = useState({})
  const [path, setPath] = useState('')
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [note, setNote] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [value, statusValue] = await Promise.all([call('/settings'), call('/status')])
      setDraft(draftOf(value.config))
      setFile(value.file ?? {})
      setPath(value.path ?? '')
      setStatus(statusValue ?? null)
      setNote(null)
    } catch (error) {
      setNote({ kind: 'err', text: format(t('loadFail'), { message: String(error?.message ?? error) }) })
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    if (view === 'summary') return undefined
    void load()
    return undefined
  }, [load, view])

  if (view === 'summary') return t('summary')

  const patch = (key, value) => setDraft((previous) => ({ ...previous, [key]: value }))

  const save = async () => {
    setBusy('save')
    setNote(null)
    try {
      const payload = { ...draft }
      if (!String(payload.apiKey ?? '').trim()) delete payload.apiKey
      const value = await call('/settings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ config: payload }),
      })
      setDraft(draftOf(value.config))
      setFile(value.file ?? {})
      setNote({ kind: 'ok', text: t('saved') })
    } catch (error) {
      setNote({ kind: 'err', text: format(t('testFail'), { message: String(error?.message ?? error) }) })
    } finally {
      setBusy('')
    }
  }

  const test = async () => {
    setBusy('test')
    setNote({ kind: 'info', text: t('testing') })
    try {
      const value = await call('/test', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query: 'Volcengine Ark 联网内容插件' }),
      })
      setNote({ kind: 'ok', text: format(t('testOk'), { count: value.count, ms: value.elapsedMs }) })
    } catch (error) {
      setNote({ kind: 'err', text: format(t('testFail'), { message: String(error?.message ?? error) }) })
    } finally {
      setBusy('')
    }
  }

  const dirty = JSON.stringify(draftOf(file)) !== JSON.stringify({ ...draft, apiKey: '' })

  const noteColor =
    note?.kind === 'ok'
      ? 'var(--dsw-alias-state-success-primary)'
      : note?.kind === 'err'
        ? 'var(--dsw-alias-state-error-primary)'
        : 'var(--dsw-alias-label-caption)'

  return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 760 } }, [
    h('h3', { key: 'title', style: { margin: 0, fontSize: 16, fontWeight: 500, lineHeight: '24px', color: 'var(--dsw-alias-label-primary)' } }, t('title')),
    h('p', { key: 'intro', style: { margin: 0, fontSize: 14, lineHeight: '22px', color: 'var(--dsw-alias-label-tertiary)' } }, t('intro')),

    h(StatusBadge, { key: 'badge', t, status, loading }),

    status?.keyResolved && status.keyResolved.ok === false
      ? h('p', { key: 'key', style: { margin: 0, fontSize: 12, lineHeight: '18px', color: 'var(--dsw-alias-state-error-primary)' } }, format(t('keyMissing'), { reason: String(status.keyResolved.reason ?? '') }))
      : status?.keyResolved?.ok === true
        ? h('p', { key: 'key', style: { margin: 0, fontSize: 12, lineHeight: '18px', color: 'var(--dsw-alias-state-success-primary)' } }, t('keyOk'))
        : null,

    status != null && status.selected !== true && !loading
      ? h(ActivatePanel, { key: 'activate', t, status })
      : null,

    h(GroupTitle, { key: 'g1' }, t('groupCore')),
    h(Field, { key: 'f1', label: t('apiKeyEnv'), hint: t('apiKeyEnvHint') },
      h('input', {
        style: inputStyle,
        value: draft.apiKeyEnv,
        disabled: loading,
        spellCheck: false,
        onChange: (event) => patch('apiKeyEnv', event.target.value),
      })),
    h(Field, { key: 'f2', label: t('apiKey'), hint: t('apiKeyHint') },
      h('input', {
        style: inputStyle,
        type: 'password',
        value: draft.apiKey,
        disabled: loading,
        placeholder: file.apiKey ? '••••••••' : '',
        onChange: (event) => patch('apiKey', event.target.value),
      })),
    h(Field, { key: 'f3', label: t('baseURL'), hint: t('baseURLHint') },
      h('input', {
        style: inputStyle,
        value: draft.baseURL,
        disabled: loading,
        spellCheck: false,
        onChange: (event) => patch('baseURL', event.target.value),
      })),

    h(GroupTitle, { key: 'g2' }, t('groupSearch')),
    h(Field, { key: 'f4', label: t('model'), hint: t('modelHint') },
      h('input', {
        style: inputStyle,
        value: draft.model,
        disabled: loading,
        spellCheck: false,
        onChange: (event) => patch('model', event.target.value),
      })),
    h('div', { key: 'row', style: { display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 12 } }, [
      h(Field, { key: 'f5', label: t('maxKeyword'), hint: t('maxKeywordHint') },
        h('input', {
          style: inputStyle,
          type: 'number',
          min: 1,
          max: 50,
          value: draft.maxKeyword,
          disabled: loading,
          onChange: (event) => patch('maxKeyword', Number(event.target.value)),
        })),
      h(Field, { key: 'f6', label: t('timeoutMs') },
        h('input', {
          style: inputStyle,
          type: 'number',
          min: 1000,
          step: 1000,
          value: draft.timeoutMs,
          disabled: loading,
          onChange: (event) => patch('timeoutMs', Number(event.target.value)),
        })),
    ]),

    path ? h('p', { key: 'path', style: { margin: 0, fontSize: 12, lineHeight: '18px', color: 'var(--dsw-alias-label-caption)' } }, format(t('fileLayer'), { path })) : null,

    h('div', { key: 'actions', style: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, minHeight: 36 } }, [
      note
        ? h('span', { key: 'note', style: { marginRight: 'auto', fontSize: 12, lineHeight: '18px', color: noteColor } }, note.text)
        : h('span', { key: 'note' }),
      h('button', {
        key: 'test',
        type: 'button',
        disabled: busy !== '' || loading,
        onClick: test,
        style: {
          boxSizing: 'border-box',
          height: 36,
          borderRadius: 18,
          padding: '0 14px',
          border: '1px solid var(--dsw-alias-border-l2)',
          background: 'transparent',
          color: 'var(--dsw-alias-label-primary)',
          font: 'inherit',
          fontSize: 14,
          cursor: busy !== '' || loading ? 'default' : 'pointer',
          opacity: busy !== '' || loading ? 0.5 : 1,
        },
      }, busy === 'test' ? t('testing') : t('test')),
      h('button', {
        key: 'reset',
        type: 'button',
        disabled: busy !== '' || loading || !dirty,
        onClick: () => setDraft(draftOf({ ...draftOf(file) })),
        style: {
          boxSizing: 'border-box',
          height: 36,
          borderRadius: 18,
          padding: '0 14px',
          border: '1px solid var(--dsw-alias-border-l2)',
          background: 'transparent',
          color: 'var(--dsw-alias-label-primary)',
          font: 'inherit',
          fontSize: 14,
          cursor: 'pointer',
          opacity: busy !== '' || loading || !dirty ? 0.5 : 1,
        },
      }, t('reset')),
      h('button', {
        key: 'save',
        type: 'button',
        disabled: busy !== '' || loading,
        onClick: save,
        style: {
          boxSizing: 'border-box',
          height: 36,
          borderRadius: 18,
          padding: '0 16px',
          border: 0,
          background: 'var(--dsw-alias-button-primary-fill)',
          color: 'var(--dsw-alias-label-primary-foreground)',
          font: 'inherit',
          fontSize: 14,
          cursor: busy !== '' || loading ? 'default' : 'pointer',
          opacity: busy !== '' || loading ? 0.5 : 1,
        },
      }, busy === 'save' ? t('saving') : t('save')),
    ]),
  ])
}

const inject = ['slots', 'locale']

/**
 * Report client-half progress to the Host so a missing card can be diagnosed
 * from `~/.dsh/web-search-ark.client.log` instead of the browser console.
 * Never throws: diagnostics must not be able to break the plugin.
 */
function report(payload) {
  try {
    fetch(ENDPOINT + '/client-ready', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {})
  } catch (error) {
    void error
  }
}

function apply(ctx) {
  report({ phase: 'apply-start' })
  try {
    ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-web-search-ark: dictionaries')
    const t = ctx.locale.bind(NS)
    ctx.slots.inject('plugins.row.config', () => {
      report({ phase: 'slot-appeared' })
      const dispose = ctx.slots.register(
        {
          name: 'plugins.row.config',
          key: 'dsh-web-search-ark#web-search-ark',
          locale: NS,
        },
        (props) => h(ArkSearchForm, { t, view: props?.view }),
      )
      report({ phase: 'slot-registered', key: 'dsh-web-search-ark#web-search-ark' })
      return dispose
    })
    report({ phase: 'apply-ok' })
  } catch (error) {
    report({ phase: 'apply-error', message: String((error && error.message) || error) })
    throw error
  }
}

exports.apply = apply
exports.inject = inject
exports.views = { ArkSearchForm }

}
		};
		var __cache = {};
		var __require = (spec) => {
			if (spec.startsWith(".")) {
				var cached = __cache[spec];
				if (cached !== undefined) return cached.exports;
				var factory = __modules[spec];
				if (factory === undefined) throw new Error("dsh-web-search-ark" + ": unresolved module " + spec);
				var module = { exports: {} };
				__cache[spec] = module;
				factory(__require, module, module.exports);
				return module.exports;
			}
			return require(spec);
		};
		return __require("./index.js");
	}
});
