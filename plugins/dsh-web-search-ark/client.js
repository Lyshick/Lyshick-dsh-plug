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
  summary: 'OpenAI Responses 风格的联网搜索后端（火山方舟 / 千问 Token Plan / 自定义兼容端点）。模型、端点与关键词上限均可在本页调整。',
  title: '联网搜索（Responses web_search）',
  intro: 'DSH 内置的 web_search 通过后端的 Responses API 原生 web_search 工具检索。切换预设即可更换后端，保存后对下一次搜索立即生效，不需要重启。',
  groupCore: '连接',
  preset: '后端预设',
  presetHint: 'Ark / 千问 / 自定义 OpenAI 兼容端点；切换后自动填入该后端的默认地址与模型',
  presetArk: '火山方舟 Ark',
  presetQwen: '千问 Token Plan',
  presetCustom: '自定义（OpenAI 兼容）',
  apiKeyEnv: '凭证名',
  apiKeyEnvHint: '在 ~/.dsh/.credentials.yaml 或启动环境里定义的变量名',
  apiKey: '直接密钥（覆盖凭证名）',
  apiKeyHint: '留空则使用上面的凭证名',
  baseURL: '接口地址',
  baseURLHint: '方舟套餐 key 用 /api/plan/v3，标准 key 用 /api/v3；千问用 compatible-mode/v1',
  groupSearch: '检索',
  model: '执行搜索的模型',
  modelHint: '必须支持 web_search 工具',
  maxKeyword: '单轮关键词上限',
  maxKeywordHint: '方舟允许 1–50，直接影响计费次数',
  maxKeywordUnsupported: '当前后端没有关键词参数，此项不生效',
  groupEnrich: '来源标题补全',
  enrichTitles: '抓取来源网页标题',
  enrichTitlesHint: '部分后端（如千问）只返回链接不给标题。开启后对前 N 条各抓一次网页 <title>，每次搜索会多一些耗时',
  enrichTitleLimit: '补全条数',
  enrichTitleLimitHint: '1–10，越大越慢；抓取失败会自动保留域名',
  enabled: '已开启',
  disabledLabel: '已关闭',
  timeoutMs: '超时（毫秒）',
  statusChecking: '正在检查启用状态…',
  statusOn: '已启用：web.searchProvider → ark-official',
  statusOnPreset: '已启用：web.searchProvider → ark-official（后端：{label}）',
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
  summary: 'OpenAI Responses-style web-search backend (Volcengine Ark / Qwen Token Plan / custom compatible endpoint). Model, endpoint and keyword bound are editable here.',
  title: 'Web search (Responses web_search)',
  intro: 'The built-in web_search runs through the backend’s native Responses API web_search tool. Switch the preset to change backends; saving takes effect on the next search — no restart.',
  groupCore: 'Connection',
  preset: 'Backend preset',
  presetHint: 'Ark / Qwen / a custom OpenAI-compatible endpoint; switching fills in that backend’s default URL and model',
  presetArk: 'Volcengine Ark',
  presetQwen: 'Qwen Token Plan',
  presetCustom: 'Custom (OpenAI-compatible)',
  apiKeyEnv: 'Credential name',
  apiKeyEnvHint: 'A variable name defined in ~/.dsh/.credentials.yaml or the launching environment',
  apiKey: 'Literal key (overrides the credential)',
  apiKeyHint: 'Leave empty to use the credential name above',
  baseURL: 'Base URL',
  baseURLHint: 'Ark plan keys use /api/plan/v3, standard keys /api/v3; Qwen uses compatible-mode/v1',
  groupSearch: 'Retrieval',
  model: 'Search model',
  modelHint: 'Must support the web_search tool',
  maxKeyword: 'Max keywords per round',
  maxKeywordHint: 'Ark allows 1–50; drives billing',
  maxKeywordUnsupported: 'This backend has no keyword parameter — ignored here',
  groupEnrich: 'Source titles',
  enrichTitles: 'Fetch page titles',
  enrichTitlesHint: 'Some backends (e.g. Qwen) return links without titles. When on, the first N sources each get one <title> fetch, adding some latency per search',
  enrichTitleLimit: 'How many sources',
  enrichTitleLimitHint: '1–10; higher is slower. A failed fetch keeps the hostname',
  enabled: 'Enabled',
  disabledLabel: 'Disabled',
  timeoutMs: 'Timeout (ms)',
  statusChecking: 'Checking activation…',
  statusOn: 'Enabled: web.searchProvider → ark-official',
  statusOnPreset: 'Enabled: web.searchProvider → ark-official (backend: {label})',
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
  preset: 'ark',
  apiKeyEnv: '',
  apiKey: '',
  baseURL: '',
  model: '',
  maxKeyword: 5,
  timeoutMs: 120000,
  enrichTitles: false,
  enrichTitleLimit: 5,
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
      ? status.presetLabel
        ? format(t('statusOnPreset'), { label: status.presetLabel })
        : t('statusOn')
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
    preset: config?.preset ?? 'ark',
    apiKeyEnv: config?.apiKeyEnv ?? '',
    apiKey: '',
    baseURL: config?.baseURL ?? '',
    model: config?.model ?? '',
    maxKeyword: Number(config?.maxKeyword ?? 5),
    timeoutMs: Number(config?.timeoutMs ?? 120000),
    enrichTitles: config?.enrichTitles === true,
    enrichTitleLimit: Number(config?.enrichTitleLimit ?? 5),
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

  const presets = Array.isArray(status?.presets) ? status.presets : []
  const activePreset = presets.find((entry) => entry.id === draft.preset)
  const supportsMaxKeyword = activePreset ? activePreset.supportsMaxKeyword !== false : true

  /**
   * Switch preset, carrying over a base URL / model only when the current value
   * is empty or still matches another preset's default (i.e. not hand-edited).
   */
  const changePreset = (id) => {
    const target = presets.find((entry) => entry.id === id)
    setDraft((previous) => {
      const next = { ...previous, preset: id }
      if (!target) return next
      const isDefaultish = (key) =>
        !String(previous[key] ?? '').trim() ||
        presets.some((entry) => entry.id !== id && entry[key] && entry[key] === previous[key])
      if (isDefaultish('baseURL')) next.baseURL = target.baseURL ?? ''
      if (isDefaultish('model')) next.model = target.model ?? ''
      return next
    })
  }

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
    h(Field, { key: 'f0', label: t('preset'), hint: t('presetHint') },
      h('select', {
        style: { ...inputStyle, cursor: 'pointer' },
        value: draft.preset,
        disabled: loading,
        onChange: (event) => changePreset(event.target.value),
      }, presets.length > 0
        ? presets.map((entry) => h('option', { key: entry.id, value: entry.id }, entry.label))
        : [h('option', { key: 'ark', value: 'ark' }, t('presetArk'))])),
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
      h(Field, { key: 'f5', label: t('maxKeyword'), hint: supportsMaxKeyword ? t('maxKeywordHint') : t('maxKeywordUnsupported') },
        h('input', {
          style: { ...inputStyle, opacity: supportsMaxKeyword ? 1 : 0.5 },
          type: 'number',
          min: 1,
          max: 50,
          value: draft.maxKeyword,
          disabled: loading || !supportsMaxKeyword,
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

    h(GroupTitle, { key: 'g3' }, t('groupEnrich')),
    h('div', { key: 'row2', style: { display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)', gap: 12, alignItems: 'start' } }, [
      h(Field, { key: 'f7', label: t('enrichTitles'), hint: t('enrichTitlesHint') },
        h('label', { style: { display: 'flex', alignItems: 'center', gap: 8, height: 36, cursor: loading ? 'default' : 'pointer' } }, [
          h('input', {
            key: 'c',
            type: 'checkbox',
            checked: draft.enrichTitles === true,
            disabled: loading,
            style: { width: 16, height: 16, margin: 0, cursor: loading ? 'default' : 'pointer' },
            onChange: (event) => patch('enrichTitles', event.target.checked === true),
          }),
          h('span', {
            key: 's',
            style: { fontSize: 13, lineHeight: '18px', color: 'var(--dsw-alias-label-primary)' },
          }, draft.enrichTitles === true ? t('enabled') : t('disabledLabel')),
        ])),
      h(Field, { key: 'f8', label: t('enrichTitleLimit'), hint: t('enrichTitleLimitHint') },
        h('input', {
          style: { ...inputStyle, opacity: draft.enrichTitles === true ? 1 : 0.5 },
          type: 'number',
          min: 1,
          max: 10,
          value: draft.enrichTitleLimit,
          disabled: loading || draft.enrichTitles !== true,
          onChange: (event) => patch('enrichTitleLimit', Number(event.target.value)),
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
