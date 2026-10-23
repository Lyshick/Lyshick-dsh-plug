/**
 * dsh-spec-inspect — browser half.
 *
 * Two surfaces registered from this one plain-JS module:
 *
 *   conversation.session.header.utilities  the icon beside the right-Sidebar
 *                                          toggle in the conversation header
 *   sidebar.right.pane.tab                 the picker page that icon opens
 *
 * The page talks to the Host half through `/spec-inspect` HTTP routes. It never
 * imports a Harness Client package, so a moved installation or a stale profile
 * junction cannot blank the entry; React comes from the host's `require`.
 *
 * Styles use only `--dsw-alias-*` theme tokens, so light and dark both work.
 */
window.__ModuleLoader__.load({
  id: 'dsh-spec-inspect',
  factory: (require) => {
    const React = require('react')
    const h = React.createElement

    /** Package name: the client module id. */
    const PKG_NAME = 'dsh-spec-inspect'
    /** Right-Sidebar tab type id (also the body slot key). */
    const TAB_ID = `${PKG_NAME}/picker`
    /** Page kind opened through `ctx.sidebarRight.openTab`. */
    const TAB_KIND = 'spec-inspect'
    /** Locale namespace owned by this plugin. */
    const NS = 'specInspect.ui'
    /** HTTP surface owned by the Host half. */
    const ENDPOINT = '/spec-inspect'

    const CSS = `
.dsi-page { display: flex; flex-direction: column; gap: 12px; height: 100%; min-height: 0; overflow-y: auto; padding: 14px 14px 18px; color: var(--dsw-alias-label-primary); }
.dsi-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.dsi-title { margin: 0; font-size: 15px; font-weight: 600; line-height: 1.4; }
.dsi-sub { margin: 4px 0 0; font-size: 12px; line-height: 1.5; color: var(--dsw-alias-label-secondary); }
.dsi-headerbtn { flex: none; display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; padding: 0; border: 0; border-radius: 8px; background: transparent; color: var(--dsw-alias-label-secondary); cursor: pointer; }
.dsi-headerbtn:hover { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); }
.dsi-card { border: 1px solid var(--dsw-alias-border-l1); border-radius: 12px; background: var(--dsw-alias-bg-layer-1); padding: 12px; }
.dsi-label { display: block; margin: 0 0 6px; font-size: 12.5px; font-weight: 600; }
.dsi-input { box-sizing: border-box; width: 100%; border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); padding: 8px 10px; font-size: 13px; }
.dsi-input:focus { outline: none; border-color: var(--dsw-alias-brand-primary); }
.dsi-hint { margin: 6px 0 0; font-size: 11.5px; line-height: 1.5; color: var(--dsw-alias-label-secondary); }
.dsi-row { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
.dsi-btn { border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); padding: 6px 12px; font-size: 12.5px; cursor: pointer; }
.dsi-btn:hover:not(:disabled) { border-color: var(--dsw-alias-border-l2); }
.dsi-btn:disabled { opacity: 0.55; cursor: default; }
.dsi-btnprimary { border-color: var(--dsw-alias-brand-primary); background: var(--dsw-alias-brand-primary); color: #fff; font-weight: 600; }
.dsi-btnprimary:hover:not(:disabled) { border-color: var(--dsw-alias-brand-primary); }
.dsi-tabs { display: flex; flex-wrap: wrap; gap: 6px; }
.dsi-tab { border: 1px solid var(--dsw-alias-border-l1); border-radius: 999px; background: transparent; color: var(--dsw-alias-label-secondary); padding: 4px 12px; font-size: 12px; cursor: pointer; }
.dsi-tab:hover { border-color: var(--dsw-alias-border-l2); }
.dsi-tabactive { border-color: var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); font-weight: 600; }
.dsi-docs { display: flex; flex-direction: column; gap: 6px; margin: 0; padding: 0; list-style: none; }
.dsi-doc { border: 1px solid var(--dsw-alias-border-l1); border-radius: 10px; background: var(--dsw-alias-bg-layer-1); }
.dsi-docactive { border-color: var(--dsw-alias-brand-primary); }
.dsi-docbtn { display: flex; align-items: flex-start; gap: 8px; width: 100%; border: 0; border-radius: 10px; background: transparent; color: var(--dsw-alias-label-primary); padding: 9px 11px; font-size: 13px; text-align: left; cursor: pointer; }
.dsi-docbtn:hover { background: var(--dsw-alias-bg-layer-2); }
.dsi-type { flex: none; border: 1px solid var(--dsw-alias-border-l1); border-radius: 6px; padding: 1px 5px; font-size: 10px; font-weight: 600; letter-spacing: 0.03em; text-transform: uppercase; color: var(--dsw-alias-label-secondary); }
.dsi-docmain { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
.dsi-doctitle { font-weight: 500; word-break: break-word; }
.dsi-docdesc { font-size: 11.5px; line-height: 1.45; color: var(--dsw-alias-label-secondary); word-break: break-word; }
.dsi-dot { flex: none; width: 7px; height: 7px; margin-top: 5px; border-radius: 50%; background: var(--dsw-alias-brand-primary); }
.dsi-empty { margin: 0; font-size: 12.5px; line-height: 1.55; color: var(--dsw-alias-label-secondary); }
.dsi-msg { margin: 8px 0 0; font-size: 12px; line-height: 1.5; }
.dsi-msgok { color: var(--dsw-alias-state-success-primary); }
.dsi-msgerr { color: var(--dsw-alias-state-error-primary); }
.dsi-warn { margin: 8px 0 0; padding: 8px 10px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; background: var(--dsw-alias-bg-layer-2); font-size: 11.5px; line-height: 1.5; color: var(--dsw-alias-state-warn-primary); }
.dsi-footer { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin-top: auto; padding-top: 4px; }
.dsi-footer .dsi-hint { margin: 0; }
.dsi-code { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 10.5px; line-height: 1.55; white-space: pre-wrap; word-break: break-all; color: var(--dsw-alias-label-secondary); }
.dsi-kv { margin-top: 6px; font-size: 11px; line-height: 1.5; color: var(--dsw-alias-label-secondary); word-break: break-all; }
`

    /** Insert the scoped stylesheet once; the effect cleanup removes it. */
    function installStyles() {
      const style = document.createElement('style')
      style.setAttribute('data-dsh-spec-inspect', '')
      style.textContent = CSS
      document.head.appendChild(style)
      return () => {
        style.remove()
      }
    }

    const zh = {
      panel: '规范检视',
      'page.title': '业务规范检视',
      'page.subtitle': '选择渠道与规范文档，AI 按文档要求检索当前工作区代码，问题按文档定义的 P0-P5 分级罗列。',
      'settings.show': '设置',
      'settings.hide': '收起设置',
      'settings.indexUrl': '索引源 URL',
      'settings.placeholder': 'https://spec.example.com/index.json',
      'settings.hint': '一个完整的 JSON 索引表：{ "channels": [{ "id": "web", "name": "Web 渠道", "docs": [{ "id": "html-style", "title": "HTML 编写规范", "url": "http://…/default-skill.md" }] }] }。文档支持 md / doc / docx。',
      'settings.path': '保存位置',
      'settings.save': '保存并加载',
      'settings.saving': '保存中…',
      'settings.reload': '重新加载索引',
      'settings.saved': '已保存，正在重新加载索引。',
      'settings.badUrl': '索引源必须是 http(s) URL。',
      'picker.loading': '正在读取索引…',
      'picker.loadFailed': '索引读取失败',
      'picker.noIndex': '还没有配置索引源。请在“设置”里填写索引 JSON 的地址。',
      'picker.noIndexShort': '未配置索引源',
      'picker.noDocs': '这个渠道下没有可用的文档。',
      'picker.warnings': '索引提示',
      'picker.retry': '重试',
      'picker.channelOnly': '当前渠道',
      'start.begin': '开始检视',
      'start.starting': '正在发起检视…',
      'start.ok': '已发送到本会话，AI 正在检索工作区。',
      'start.failed': '发起检视失败',
      'start.needSession': '请先打开一个会话。',
      'start.hint': '检视只读：不会修改代码。结果按规范文档定义的 P0-P5 罗列。',
      'start.result': '已发送',
      'start.levels': '结果等级：按文档定义的 P0-P5',
      'service.unavailable': '右侧边栏不可用，无法打开规范检视。',
    }

    const en = {
      panel: 'Spec Inspect',
      'page.title': 'Business Spec Inspect',
      'page.subtitle': 'Pick a channel and a spec document. The AI inspects this workspace against it and lists findings under the document\'s P0-P5 levels.',
      'settings.show': 'Settings',
      'settings.hide': 'Hide settings',
      'settings.indexUrl': 'Index source URL',
      'settings.placeholder': 'https://spec.example.com/index.json',
      'settings.hint': 'A complete JSON index: { "channels": [{ "id": "web", "name": "Web", "docs": [{ "id": "html-style", "title": "HTML Style Guide", "url": "http://…/default-skill.md" }] }] }. Documents may be md / doc / docx.',
      'settings.path': 'Saved at',
      'settings.save': 'Save and load',
      'settings.saving': 'Saving…',
      'settings.reload': 'Reload index',
      'settings.saved': 'Saved; reloading the index.',
      'settings.badUrl': 'The index source must be an http(s) URL.',
      'picker.loading': 'Loading index…',
      'picker.loadFailed': 'Could not load the index',
      'picker.noIndex': 'No index source is configured. Fill in the index JSON URL under Settings.',
      'picker.noIndexShort': 'No index source',
      'picker.noDocs': 'This channel lists no usable documents.',
      'picker.warnings': 'Index notes',
      'picker.retry': 'Retry',
      'picker.channelOnly': 'Current channel',
      'start.begin': 'Start inspection',
      'start.starting': 'Starting…',
      'start.ok': 'Sent to this session; the AI is inspecting the workspace.',
      'start.failed': 'Could not start the inspection',
      'start.needSession': 'Open a session first.',
      'start.hint': 'Read-only: no files are modified. Findings follow the document\'s P0-P5 levels.',
      'start.result': 'Sent',
      'start.levels': 'Levels: the document\'s own P0-P5',
      'service.unavailable': 'The right Sidebar is unavailable, so the picker cannot open.',
    }

    function describe(error) {
      if (error === undefined || error === null) return 'unknown error'
      return error instanceof Error ? error.message : String(error)
    }

    /** Read one Cordis service without assuming it exists. */
    function service(ctx, name) {
      try {
        const direct = ctx?.[name]
        if (direct !== undefined && direct !== null) return direct
      } catch {
        /* not a reachable property */
      }
      try {
        return ctx?.get?.(name)
      } catch {
        return undefined
      }
    }

    /** Call one Host route and unwrap `{ ok, value }`. */
    async function call(path, init) {
      const headers = { ...(init?.headers ?? {}) }
      if (init?.body !== undefined) headers['content-type'] = 'application/json'
      let response
      try {
        response = await fetch(`${ENDPOINT}${path}`, { ...init, headers })
      } catch (error) {
        throw new Error(`无法连接插件服务：${describe(error)}`)
      }
      let payload
      try {
        payload = await response.json()
      } catch {
        throw new Error(`插件服务返回了非 JSON 响应（HTTP ${response.status}）`)
      }
      if (!response.ok || payload?.ok !== true) {
        throw new Error(payload?.error?.message ?? `HTTP ${response.status}`)
      }
      return payload.value
    }

    const api = {
      status: () => call('/status'),
      index: (refresh) => call(`/index${refresh ? '?refresh=1' : ''}`),
      save: (indexUrl) => call('/settings', { method: 'POST', body: JSON.stringify({ indexUrl }) }),
      start: (docId, sessionId) => call('/start', { method: 'POST', body: JSON.stringify({ docId, sessionId }) }),
    }

    // -- Header entry ---------------------------------------------------------

    function TriggerGlyph() {
      return h('svg', {
        viewBox: '0 0 24 24',
        width: 18,
        height: 18,
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.8,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': true,
        style: { display: 'block' },
      }, [
        h('path', { key: 'doc', d: 'M6.5 3.5h7l4 4v11a1.5 1.5 0 0 1-1.5 1.5h-9a1.5 1.5 0 0 1-1.5-1.5v-13a1.5 1.5 0 0 1 1.5-1.5Z' }),
        h('path', { key: 'fold', d: 'M13.5 3.5v4h4' }),
        h('path', { key: 'l1', d: 'M9 11h6' }),
        h('path', { key: 'l2', d: 'M9 14h3.5' }),
        h('path', { key: 'check', d: 'M14.2 17.1l1.5 1.5 3-3.2' }),
      ])
    }

    function HeaderTrigger(props) {
      const t = props.t ?? ((key) => zh[key] ?? key)
      return h('button', {
        type: 'button',
        className: 'dsi-headerbtn',
        title: t('panel'),
        'aria-label': t('panel'),
        onClick: () => props.open?.(),
      }, h(TriggerGlyph))
    }

    /** Open the picker in the current Session's right Sidebar. */
    function openPicker(ctx) {
      const attempt = (remaining) => {
        const sidebar = service(ctx, 'sidebarRight')
        try {
          if (sidebar !== undefined && typeof sidebar.openTab === 'function') {
            sidebar.openTab(TAB_KIND)
            return
          }
        } catch {
          /* the tab type may still be registering; retry below */
        }
        if (remaining > 0) setTimeout(() => attempt(remaining - 1), 140)
      }
      attempt(4)
    }

    // -- Picker page ----------------------------------------------------------

    function Picker(props) {
      const t = props.t ?? ((key) => zh[key] ?? key)
      const sessionId = typeof props.sessionId === 'string' ? props.sessionId : ''
      const [phase, setPhase] = React.useState('loading')
      const [error, setError] = React.useState('')
      const [indexUrl, setIndexUrl] = React.useState('')
      const [draftUrl, setDraftUrl] = React.useState('')
      const [settingsPathValue, setSettingsPathValue] = React.useState('')
      const [settingsOpen, setSettingsOpen] = React.useState(false)
      const [saving, setSaving] = React.useState(false)
      const [settingsMsg, setSettingsMsg] = React.useState(null)
      const [channels, setChannels] = React.useState([])
      const [warnings, setWarnings] = React.useState([])
      const [channelId, setChannelId] = React.useState('')
      const [docId, setDocId] = React.useState('')
      const [starting, setStarting] = React.useState(false)
      const [startMsg, setStartMsg] = React.useState(null)
      const [reloadToken, setReloadToken] = React.useState(0)

      const load = React.useCallback(async (force) => {
        setPhase('loading')
        setError('')
        try {
          const status = await api.status()
          setIndexUrl(status.indexUrl ?? '')
          setSettingsPathValue(status.settingsPath ?? '')
          setDraftUrl((current) => (current.length === 0 ? status.indexUrl ?? '' : current))
          if (typeof status.indexUrl !== 'string' || status.indexUrl.length === 0) {
            setChannels([])
            setWarnings([])
            setPhase('empty')
            setSettingsOpen(true)
            return
          }
          const index = await api.index(force)
          const nextChannels = Array.isArray(index.channels) ? index.channels : []
          setChannels(nextChannels)
          setWarnings(Array.isArray(index.warnings) ? index.warnings : [])
          const nextChannel = nextChannels[0]
          setChannelId((current) => (nextChannels.some((channel) => channel.id === current) ? current : nextChannel?.id ?? ''))
          setDocId((current) => {
            const channel = nextChannels.find((item) => item.id === channelId) ?? nextChannel
            const docs = channel?.docs ?? []
            return docs.some((doc) => doc.id === current) ? current : docs[0]?.id ?? ''
          })
          setPhase('ready')
        } catch (loadError) {
          setError(describe(loadError))
          setPhase('error')
        }
      }, [channelId])

      React.useEffect(() => {
        load(false).catch(() => {})
        // A reload token re-runs the same load; the two deps are intentional.
      }, [reloadToken]) // eslint-disable-line react-hooks/exhaustive-deps

      const channelsList = channels
      const channel = channelsList.find((item) => item.id === channelId) ?? channelsList[0]
      const docs = channel?.docs ?? []
      const selectedDoc = docs.find((doc) => doc.id === docId) ?? docs[0]

      const chooseChannel = (id) => {
        setChannelId(id)
        const next = channelsList.find((item) => item.id === id)
        setDocId(next?.docs?.[0]?.id ?? '')
      }

      const saveSettings = async () => {
        const value = draftUrl.trim()
        if (value.length > 0 && !/^https?:\/\//i.test(value)) {
          setSettingsMsg({ ok: false, text: t('settings.badUrl') })
          return
        }
        setSaving(true)
        setSettingsMsg(null)
        try {
          await api.save(value)
          setIndexUrl(value)
          setSettingsMsg({ ok: true, text: t('settings.saved') })
          setSettingsOpen(false)
          setPhase('loading')
          setReloadToken((token) => token + 1)
        } catch (saveError) {
          setSettingsMsg({ ok: false, text: describe(saveError) })
        } finally {
          setSaving(false)
        }
      }

      const startInspection = async () => {
        if (selectedDoc === undefined || sessionId.length === 0 || starting) return
        setStarting(true)
        setStartMsg(null)
        try {
          const result = await api.start(selectedDoc.id, sessionId)
          setStartMsg({ ok: true, text: `${t('start.ok')}《${result.title}》` })
        } catch (startError) {
          setStartMsg({ ok: false, text: `${t('start.failed')}：${describe(startError)}` })
        } finally {
          setStarting(false)
        }
      }

      const typeLabel = (doc) => {
        const value = String(doc.type ?? '').toLowerCase()
        if (value === 'markdown') return 'md'
        if (value.length === 0) return 'doc'
        return value
      }

      return h('div', { className: 'dsi-page' }, [
        h('header', { className: 'dsi-head', key: 'head' }, [
          h('div', { key: 'titles' }, [
            h('h1', { className: 'dsi-title', key: 'title' }, t('page.title')),
            h('p', { className: 'dsi-sub', key: 'sub' }, t('page.subtitle')),
          ]),
          h('button', {
            type: 'button',
            className: 'dsi-btn',
            key: 'toggle',
            onClick: () => {
              setSettingsMsg(null)
              setSettingsOpen((open) => !open)
            },
          }, settingsOpen ? t('settings.hide') : t('settings.show')),
        ]),

        settingsOpen && h('section', { className: 'dsi-card', key: 'settings' }, [
          h('label', { className: 'dsi-label', key: 'label', htmlFor: 'dsi-index-url' }, t('settings.indexUrl')),
          h('input', {
            id: 'dsi-index-url',
            key: 'input',
            className: 'dsi-input',
            type: 'url',
            spellCheck: false,
            placeholder: t('settings.placeholder'),
            value: draftUrl,
            onChange: (event) => setDraftUrl(event?.target?.value ?? ''),
          }),
          h('p', { className: 'dsi-hint', key: 'hint' }, t('settings.hint')),
          settingsPathValue.length > 0 && h('p', { className: 'dsi-kv', key: 'path' }, `${t('settings.path')}：${settingsPathValue}`),
          h('div', { className: 'dsi-row', key: 'row' }, [
            h('button', {
              type: 'button',
              className: 'dsi-btn dsi-btnprimary',
              key: 'save',
              disabled: saving,
              onClick: saveSettings,
            }, saving ? t('settings.saving') : t('settings.save')),
            h('button', {
              type: 'button',
              className: 'dsi-btn',
              key: 'reload',
              disabled: saving,
              onClick: () => setReloadToken((token) => token + 1),
            }, t('settings.reload')),
          ]),
          settingsMsg !== null && h('p', {
            key: 'msg',
            className: settingsMsg.ok ? 'dsi-msg dsi-msgok' : 'dsi-msg dsi-msgerr',
          }, settingsMsg.text),
        ]),

        h('section', { className: 'dsi-card', key: 'picker', style: { flex: 1, minHeight: 0, overflowY: 'auto' } }, [
          phase === 'loading' && h('p', { className: 'dsi-empty', key: 'loading' }, t('picker.loading')),
          phase === 'empty' && h('p', { className: 'dsi-empty', key: 'empty' }, t('picker.noIndex')),
          phase === 'error' && h('div', { key: 'error' }, [
            h('p', { className: 'dsi-msg dsi-msgerr', key: 'text' }, `${t('picker.loadFailed')}：${error}`),
            h('button', {
              type: 'button',
              className: 'dsi-btn',
              key: 'retry',
              onClick: () => setReloadToken((token) => token + 1),
            }, t('picker.retry')),
          ]),

          phase === 'ready' && channelsList.length > 0 && h('div', { key: 'channels' }, [
            channelsList.length > 1
              ? h('nav', { className: 'dsi-tabs', key: 'tabs' },
                  channelsList.map((item) => h('button', {
                    type: 'button',
                    key: item.id,
                    className: item.id === channel?.id ? 'dsi-tab dsi-tabactive' : 'dsi-tab',
                    onClick: () => chooseChannel(item.id),
                  }, item.name)))
              : channel !== undefined && h('p', { className: 'dsi-kv', key: 'only' }, `${t('picker.channelOnly')}：${channel.name}`),
            h('ul', { className: 'dsi-docs', key: 'docs', style: { marginTop: 10 } },
              docs.map((doc) => h('li', {
                key: doc.id,
                className: doc.id === selectedDoc?.id ? 'dsi-doc dsi-docactive' : 'dsi-doc',
              }, h('button', {
                type: 'button',
                className: 'dsi-docbtn',
                onClick: () => setDocId(doc.id),
              }, [
                doc.id === selectedDoc?.id && h('span', { className: 'dsi-dot', key: 'dot' }),
                h('span', { className: 'dsi-type', key: 'type' }, typeLabel(doc)),
                h('span', { className: 'dsi-docmain', key: 'main' }, [
                  h('span', { className: 'dsi-doctitle', key: 'title' }, doc.title),
                  doc.description && h('span', { className: 'dsi-docdesc', key: 'desc' }, doc.description),
                ]),
              ]))),
            ),
            docs.length === 0 && h('p', { className: 'dsi-empty', key: 'nodocs', style: { marginTop: 10 } }, t('picker.noDocs')),
          ]),

          warnings.length > 0 && h('div', { className: 'dsi-warn', key: 'warnings' }, [
            h('strong', { key: 'title' }, `${t('picker.warnings')}：`),
            ...warnings.slice(0, 4).map((warning, index) => h('div', { key: `w${index}` }, warning)),
          ]),
        ]),

        h('footer', { className: 'dsi-footer', key: 'footer' }, [
          h('button', {
            type: 'button',
            className: 'dsi-btn dsi-btnprimary',
            key: 'start',
            disabled: selectedDoc === undefined || starting || sessionId.length === 0,
            onClick: startInspection,
          }, starting ? t('start.starting') : t('start.begin')),
          h('span', { className: 'dsi-hint', key: 'hint' }, sessionId.length === 0 ? t('start.needSession') : t('start.levels')),
        ]),
        startMsg !== null && h('p', {
          key: 'startmsg',
          className: startMsg.ok ? 'dsi-msg dsi-msgok' : 'dsi-msg dsi-msgerr',
        }, startMsg.text),
        h('p', { className: 'dsi-hint', key: 'readonly' }, t('start.hint')),
      ])
    }

    // -- Apply ---------------------------------------------------------------

    const inject = ['slots', 'locale']

    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-spec-inspect: dictionaries')
      ctx.effect(() => installStyles(), 'dsh-spec-inspect: styles')
      const t = ctx.locale.bind(NS)

      // Icon beside the right-Sidebar toggle (utilities are right-aligned;
      // order 10 keeps this entry at their right edge).
      ctx.slots.inject('conversation.session.header.utilities', () =>
        ctx.slots.register({
          name: 'conversation.session.header.utilities',
          id: 'spec-inspect-trigger',
          order: 10,
          locale: NS,
          inject: () => ({
            open: () => openPicker(ctx),
          }),
        }, HeaderTrigger))

      // The tab type must exist before `openTab(kind)` can land. The service
      // is provided through `ctx.reflect` rather than the curated list, so
      // prefer a direct lookup and fall back to Cordis injection.
      const tabs = service(ctx, 'sidebarRightTabs')
      if (tabs !== undefined && typeof tabs.register === 'function') {
        ctx.effect(() => tabs.register({
          id: TAB_ID,
          kind: TAB_KIND,
          priority: 'extension',
          title: () => t('panel'),
        }), 'dsh-spec-inspect: tab type')
      } else {
        ctx.inject(['sidebarRightTabs'], (sctx) => {
          sctx.effect(() => sctx.sidebarRightTabs.register({
            id: TAB_ID,
            kind: TAB_KIND,
            priority: 'extension',
            title: () => t('panel'),
          }), 'dsh-spec-inspect: tab type')
        })
      }

      // The tab body, keyed by the type id.
      ctx.slots.inject('sidebar.right.pane.tab', () =>
        ctx.slots.register({
          name: 'sidebar.right.pane.tab',
          key: TAB_ID,
          locale: NS,
          inject: () => ({ api }),
        }, Picker))
    }

    return {
      inject,
      apply,
      // Exported for diagnostics and future composition; not used by the host.
      TAB_ID,
      TAB_KIND,
      dictionaries: { zh, en },
    }
  },
})
