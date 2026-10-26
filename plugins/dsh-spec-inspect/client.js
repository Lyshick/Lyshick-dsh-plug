/**
 * dsh-spec-inspect — browser half.
 *
 * Three surfaces registered from this one plain-JS module:
 *
 *   conversation.session.header.utilities  the icon beside the right-Sidebar
 *                                          toggle, shown once a Session has content
 *   conversation.hero.options              the same icon on a blank (new) Session,
 *                                          where the header utilities are hidden
 *                                          by the host's `hideChrome` rule
 *   sidebar.right.pane.tab                 the picker page both icons open
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
.dsi-actions { flex: none; display: inline-flex; align-items: center; gap: 6px; }
.dsi-headerbtn { flex: none; display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; padding: 0; border: 0; border-radius: 8px; background: transparent; color: var(--dsw-alias-label-secondary); cursor: pointer; }
.dsi-headerbtn:hover { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); }
.dsi-herotrigger { position: fixed; z-index: 30; display: inline-flex; }
.dsi-iconbtn { flex: none; display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; padding: 0; border: 1px solid transparent; border-radius: 8px; background: transparent; color: var(--dsw-alias-label-secondary); cursor: pointer; }
.dsi-iconbtn:hover:not(:disabled) { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); }
.dsi-iconbtn:disabled { opacity: 0.55; cursor: default; }
.dsi-spin { display: inline-flex; animation: dsi-spin 0.9s linear infinite; }
@keyframes dsi-spin { to { transform: rotate(360deg); } }
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
.dsi-field { margin-top: 12px; }
.dsi-field:first-child { margin-top: 0; }
.dsi-fieldlabel { display: block; margin: 0 0 5px; font-size: 11.5px; font-weight: 600; letter-spacing: 0.02em; color: var(--dsw-alias-label-secondary); }
.dsi-select { position: relative; min-width: 0; }
.dsi-selectbtn { box-sizing: border-box; display: flex; align-items: center; gap: 8px; width: 100%; min-height: 34px; padding: 6px 10px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 9px; background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); font-size: 13px; line-height: 1.4; text-align: left; cursor: pointer; }
.dsi-selectbtn:hover:not(:disabled) { border-color: var(--dsw-alias-border-l2); }
.dsi-selectbtn:disabled { cursor: default; opacity: 0.7; }
.dsi-selectvalue { flex: 1; min-width: 0; display: flex; align-items: center; gap: 6px; }
.dsi-selecttext { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dsi-selectplaceholder { color: var(--dsw-alias-label-tertiary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dsi-chevron { flex: none; display: inline-flex; color: var(--dsw-alias-label-tertiary); transition: transform 0.15s ease; }
.dsi-chevronopen { transform: rotate(180deg); }
.dsi-menu { position: fixed; z-index: 60; box-sizing: border-box; display: flex; flex-direction: column; gap: 1px; padding: 4px; border: 1px solid var(--dsw-alias-border-l2); border-radius: 10px; background: var(--dsw-alias-bg-layer-1); box-shadow: 0 10px 30px rgba(0, 0, 0, 0.22); overflow-y: auto; overscroll-behavior: contain; }
.dsi-menuitem { display: flex; align-items: flex-start; gap: 6px; width: 100%; padding: 7px 8px; border: 0; border-radius: 7px; background: transparent; color: var(--dsw-alias-label-primary); font-size: 12.5px; line-height: 1.45; text-align: left; cursor: pointer; }
.dsi-menuitem:hover { background: var(--dsw-alias-bg-layer-2); }
.dsi-menuitemactive { background: var(--dsw-alias-bg-layer-2); }
.dsi-menucheck { flex: none; width: 14px; height: 14px; margin-top: 1px; color: var(--dsw-alias-brand-primary); visibility: hidden; }
.dsi-menucheckon { visibility: visible; }
.dsi-menutext { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.dsi-menutitle { font-weight: 500; word-break: break-word; }
.dsi-menudesc { font-size: 11px; font-weight: 400; line-height: 1.4; color: var(--dsw-alias-label-secondary); word-break: break-word; }
.dsi-menuempty { padding: 8px; font-size: 12px; color: var(--dsw-alias-label-secondary); }
.dsi-type { flex: none; border: 1px solid var(--dsw-alias-border-l1); border-radius: 6px; padding: 1px 5px; font-size: 10px; font-weight: 600; letter-spacing: 0.03em; text-transform: uppercase; color: var(--dsw-alias-label-secondary); }
.dsi-docdesc { margin: 8px 0 0; font-size: 11.5px; line-height: 1.5; color: var(--dsw-alias-label-secondary); word-break: break-word; }
.dsi-empty { margin: 0; font-size: 12.5px; line-height: 1.55; color: var(--dsw-alias-label-secondary); }
.dsi-msg { margin: 8px 0 0; font-size: 12px; line-height: 1.5; }
.dsi-msgok { color: var(--dsw-alias-state-success-primary); }
.dsi-msgerr { color: var(--dsw-alias-state-error-primary); }
.dsi-warn { margin: 8px 0 0; padding: 8px 10px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; background: var(--dsw-alias-bg-layer-2); font-size: 11.5px; line-height: 1.5; color: var(--dsw-alias-state-warn-primary); }
.dsi-footer { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin-top: auto; padding-top: 4px; }
.dsi-footer .dsi-hint { margin: 0; }
.dsi-report { display: flex; flex-direction: column; gap: 10px; margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--dsw-alias-border-l1); }
.dsi-reporthead { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.dsi-reporttitle { font-size: 12.5px; font-weight: 600; }
.dsi-pending { display: flex; align-items: center; gap: 8px; margin: 0; font-size: 11.5px; line-height: 1.5; color: var(--dsw-alias-label-secondary); }
.dsi-conclusion { margin: 0; font-size: 12px; line-height: 1.55; color: var(--dsw-alias-label-primary); }
.dsi-group { display: flex; flex-direction: column; gap: 8px; }
.dsi-group + .dsi-group { margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--dsw-alias-border-l2); }
.dsi-groupname { display: flex; align-items: center; gap: 8px; margin: 0; padding: 5px 9px; border: 1px solid var(--dsw-alias-border-l1); border-left-width: 3px; border-left-color: var(--dsw-alias-border-l2); border-radius: 7px; background: var(--dsw-alias-bg-layer-2); font-size: 12px; font-weight: 600; color: var(--dsw-alias-label-secondary); }
.dsi-groupname-p0 { border-left-color: var(--dsw-alias-state-error-primary); }
.dsi-groupname-p1 { border-left-color: var(--dsw-alias-state-warn-primary); }
.dsi-level { display: inline-flex; align-items: center; justify-content: center; min-width: 26px; padding: 1px 6px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 6px; font-size: 10.5px; font-weight: 700; letter-spacing: 0.03em; }
.dsi-level-p0 { color: var(--dsw-alias-state-error-primary); border-color: color-mix(in srgb, var(--dsw-alias-state-error-primary) 45%, transparent); }
.dsi-level-p1 { color: var(--dsw-alias-state-warn-primary); border-color: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 45%, transparent); }
.dsi-issue { border: 1px solid var(--dsw-alias-border-l1); border-radius: 9px; background: var(--dsw-alias-bg-layer-1); transition: border-color 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease; }
.dsi-issue:hover { border-color: var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-2); box-shadow: 0 1px 4px rgba(0, 0, 0, 0.07); }
.dsi-issueopen { border-color: var(--dsw-alias-border-l2); }
.dsi-issue:hover .dsi-textbtn:not(:disabled) { border-color: var(--dsw-alias-border-l2); color: var(--dsw-alias-label-primary); }
.dsi-issuehead { display: flex; align-items: flex-start; gap: 4px; padding: 6px 6px 6px 9px; }
.dsi-issuetoggle { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; padding: 2px 0; border: 0; background: transparent; color: var(--dsw-alias-label-primary); text-align: left; cursor: pointer; }
.dsi-issueloc { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 11px; color: var(--dsw-alias-brand-primary); word-break: break-all; }
.dsi-issuebrief { display: -webkit-box; overflow: hidden; font-size: 11.5px; line-height: 1.45; color: var(--dsw-alias-label-secondary); -webkit-line-clamp: 2; -webkit-box-orient: vertical; word-break: break-word; }
.dsi-issueactions { flex: none; display: inline-flex; align-items: center; gap: 4px; }
.dsi-textbtn { flex: none; display: inline-flex; align-items: center; justify-content: center; gap: 4px; padding: 2px 7px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 6px; background: transparent; color: var(--dsw-alias-label-secondary); font-size: 11px; line-height: 1.5; white-space: nowrap; cursor: pointer; }
.dsi-textbtn:hover:not(:disabled) { border-color: var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); }
.dsi-textbtn:disabled { opacity: 0.45; cursor: default; }
.dsi-done { display: inline-flex; align-items: center; gap: 3px; padding: 2px 7px; border: 1px solid color-mix(in srgb, var(--dsw-alias-state-success-primary) 38%, transparent); border-radius: 6px; background: color-mix(in srgb, var(--dsw-alias-state-success-primary) 12%, transparent); color: var(--dsw-alias-state-success-primary); font-size: 11px; font-weight: 600; line-height: 1.5; white-space: nowrap; }
.dsi-doneicon { display: inline-flex; }
.dsi-sentfix { display: flex; flex-direction: column; gap: 5px; padding: 8px 9px; border: 1px solid color-mix(in srgb, var(--dsw-alias-state-success-primary) 30%, transparent); border-radius: 8px; background: color-mix(in srgb, var(--dsw-alias-state-success-primary) 8%, transparent); }
.dsi-sentfixhead { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.dsi-sentfixtag { flex: none; font-size: 11px; font-weight: 600; color: var(--dsw-alias-state-success-primary); }
.dsi-sentfixloc { flex: 1; min-width: 0; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 11px; color: var(--dsw-alias-label-primary); word-break: break-all; }
.dsi-sentfixbody { margin: 0; max-height: 220px; overflow: auto; padding: 8px; border-radius: 6px; background: var(--dsw-alias-bg-layer-1); font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 11px; line-height: 1.55; white-space: pre-wrap; word-break: break-word; color: var(--dsw-alias-label-secondary); }
.dsi-issuedetail { display: flex; flex-direction: column; gap: 5px; margin-top: 2px; border-top: 1px solid var(--dsw-alias-border-l1); padding: 8px 9px 9px; font-size: 11.5px; line-height: 1.5; }
.dsi-detailrow { display: flex; gap: 6px; }
.dsi-detailkey { flex: none; width: 54px; color: var(--dsw-alias-label-secondary); }
.dsi-detailval { flex: 1; min-width: 0; color: var(--dsw-alias-label-primary); word-break: break-word; }
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
      'picker.noChannels': '索引里没有可用渠道。',
      'picker.channelLabel': '渠道',
      'picker.docLabel': '规范文档',
      'picker.refresh': '刷新索引',
      'picker.refreshing': '正在刷新索引…',
      'picker.warnings': '索引提示',
      'picker.retry': '重试',
      'start.begin': '开始检视',
      'start.starting': '正在发起检视…',
      'start.ok': '已发送到本会话，AI 正在检索工作区。',
      'start.failed': '发起检视失败',
      'start.needSession': '请先打开一个会话。',
      'start.hint': '检视只读：不会修改代码。结果按规范文档定义的 P0-P5 罗列。',
      'start.result': '已发送',
      'start.levels': '结果等级：按文档定义的 P0-P5',
      'report.title': '检视结果',
      'report.idle': '开始检视后，P0-P5 问题会按级别列在这里。',
      'report.running': '正在检索工作区，报告生成后会自动出现…',
      'report.failed': '读取检视结果失败',
      'report.reload': '重新读取结果',
      'report.none': '无',
      'report.count': '条',
      'report.empty': '本次检视没有发现问题。',
      'report.locate': '定位',
      'report.locateTitle': '定位到代码',
      'report.apply': '应用修复',
      'report.applyTitle': '应用修复建议',
      'report.applying': '正在发送修复请求…',
      'report.applyingShort': '发送中…',
      'report.done': '已修复',
      'report.sent': '已发送修复请求',
      'report.viewSent': '查看指令',
      'report.hideSent': '收起指令',
      'report.applyFailed': '应用修复失败',
      'report.detailIssue': '问题',
      'report.detailReason': '原因',
      'report.detailBasis': '规范依据',
      'report.detailRisk': '风险',
      'report.detailFix': '修复建议',
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
      'picker.noChannels': 'The index lists no usable channels.',
      'picker.channelLabel': 'Channel',
      'picker.docLabel': 'Document',
      'picker.refresh': 'Refresh index',
      'picker.refreshing': 'Refreshing the index…',
      'picker.warnings': 'Index notes',
      'picker.retry': 'Retry',
      'start.begin': 'Start inspection',
      'start.starting': 'Starting…',
      'start.ok': 'Sent to this session; the AI is inspecting the workspace.',
      'start.failed': 'Could not start the inspection',
      'start.needSession': 'Open a session first.',
      'start.hint': 'Read-only: no files are modified. Findings follow the document\'s P0-P5 levels.',
      'start.result': 'Sent',
      'start.levels': 'Levels: the document\'s own P0-P5',
      'report.title': 'Findings',
      'report.idle': 'Start an inspection to list its P0-P5 findings by level here.',
      'report.running': 'Inspecting the workspace; the report appears here automatically…',
      'report.failed': 'Could not read the inspection report',
      'report.reload': 'Read the report again',
      'report.none': 'None',
      'report.count': 'item(s)',
      'report.empty': 'This inspection found no problems.',
      'report.locate': 'Reveal',
      'report.locateTitle': 'Reveal in the file preview',
      'report.apply': 'Apply fix',
      'report.applyTitle': 'Apply the fix suggestion',
      'report.applying': 'Sending the fix request…',
      'report.applyingShort': 'Sending…',
      'report.done': 'Fixed',
      'report.sent': 'Fix request sent',
      'report.viewSent': 'View message',
      'report.hideSent': 'Hide message',
      'report.applyFailed': 'Could not apply the fix',
      'report.detailIssue': 'Problem',
      'report.detailReason': 'Cause',
      'report.detailBasis': 'Spec basis',
      'report.detailRisk': 'Risk',
      'report.detailFix': 'Fix suggestion',
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
      report: (sessionId, sinceSeq) => call(`/report?sessionId=${encodeURIComponent(sessionId)}${sinceSeq !== undefined ? `&sinceSeq=${sinceSeq}` : ''}`),
      apply: (sessionId, item) => call('/apply', { method: 'POST', body: JSON.stringify({ sessionId, item }) }),
    }

    // -- Shared glyphs --------------------------------------------------------

    const GLYPHS = {
      entry: [
        ['doc', 'M6.5 3.5h7l4 4v11a1.5 1.5 0 0 1-1.5 1.5h-9a1.5 1.5 0 0 1-1.5-1.5v-13a1.5 1.5 0 0 1 1.5-1.5Z'],
        ['fold', 'M13.5 3.5v4h4'],
        ['l1', 'M9 11h6'],
        ['l2', 'M9 14h3.5'],
        ['check', 'M14.2 17.1l1.5 1.5 3-3.2'],
      ],
      refresh: [
        ['arc', 'M20 12a8 8 0 1 1-2.34-5.66'],
        ['head', 'M20 4v5h-5'],
      ],
      chevron: [['path', 'M6 9l6 6 6-6']],
      check: [['path', 'M5 12.5l4.5 4.5L19 7']],
    }

    function glyph(name, size) {
      return h('svg', {
        viewBox: '0 0 24 24',
        width: size ?? 18,
        height: size ?? 18,
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.8,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': true,
        style: { display: 'block' },
      }, GLYPHS[name].map(([key, d]) => h('path', { key, d })))
    }

    // -- Header / hero entry --------------------------------------------------

    function EntryTrigger(props) {
      const t = props.t ?? ((key) => zh[key] ?? key)
      return h('button', {
        type: 'button',
        className: 'dsi-headerbtn',
        title: t('panel'),
        'aria-label': t('panel'),
        onClick: () => props.open?.(),
      }, glyph('entry'))
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

    // -- File locations -------------------------------------------------------

    /** The host's `dsh-resource://file/session/<id>/<path>` address grammar. */
    function fileAddress(sessionId, path) {
      const normalized = String(path).replace(/\\/g, '/').replace(/^(?:\.\/)+/, '')
      const encoded = normalized
        .split('/')
        .map((segment) => encodeURIComponent(segment).replace(/%3A/gi, ':'))
        .join('/')
      return `dsh-resource://file/session/${encodeURIComponent(sessionId)}/${encoded}`
    }

    /** Open one file in the reporter's panel and reveal its line. */
    function locateInSidebar(ctx, sessionId, path, line) {
      const sidebar = service(ctx, 'sidebarRight')
      if (sidebar === undefined) throw new Error('右侧边栏不可用，无法定位文件')
      if (typeof path !== 'string' || path.trim().length === 0) throw new Error('该问题没有可定位的文件路径')
      const address = fileAddress(sessionId, path.trim())
      const params = Number.isFinite(line) && line > 0 ? { line } : undefined
      if (typeof sidebar.openResourceIn === 'function') {
        sidebar.openResourceIn(sessionId, address, { params })
        return
      }
      if (typeof sidebar.openResource === 'function') {
        sidebar.openResource(address, { params })
        return
      }
      throw new Error('当前宿主不支持文件预览定位')
    }

    /**
     * Blank-Session entry. The host renders `conversation.hero.options` in the
     * hero row (inside the composer width), but the expected place is the top
     * right, left of the right-Sidebar toggle. So this seat renders a fixed
     * button and aligns it to the host's own header corner element, which is
     * the right-Sidebar toggle. The seat still provides the blank-only
     * lifetime: it disappears as soon as the Session gets its first message.
     */
    function HeroTrigger(props) {
      const t = props.t ?? ((key) => zh[key] ?? key)
      const anchor = React.useRef(null)

      React.useLayoutEffect(() => {
        const node = anchor.current
        if (node === null) return undefined
        let frame = 0
        const place = () => {
          const corner = document.querySelector('[data-conversation-header-corner]')
          const box = corner?.getBoundingClientRect()
          const size = 28
          if (box === undefined || !Number.isFinite(box.left) || box.left < size + 6) {
            node.style.left = 'auto'
            node.style.right = '62px'
            node.style.top = '12px'
            return
          }
          node.style.right = 'auto'
          node.style.left = `${Math.round(box.left - size - 6)}px`
          node.style.top = `${Math.round(box.height > 0 ? box.top + Math.max(0, (box.height - size) / 2) : 12)}px`
        }
        const schedule = () => {
          cancelAnimationFrame(frame)
          frame = requestAnimationFrame(place)
        }
        schedule()
        window.addEventListener('resize', schedule)
        const header = document.querySelector('[data-conversation-header-corner]')?.parentElement ?? null
        const observer = header !== null && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(schedule) : null
        observer?.observe(header)
        return () => {
          cancelAnimationFrame(frame)
          window.removeEventListener('resize', schedule)
          observer?.disconnect()
        }
      }, [])

      return h('div', { ref: anchor, className: 'dsi-herotrigger' }, h('button', {
        type: 'button',
        className: 'dsi-headerbtn',
        title: t('panel'),
        'aria-label': t('panel'),
        onClick: () => props.open?.(),
      }, glyph('entry')))
    }

    // -- Dropdown -------------------------------------------------------------

    /**
     * One dropdown that renders its menu with `position: fixed`, so a narrow
     * scroller (the right Sidebar) can never clip the list. The menu flips up
     * when there is more room above the trigger, and closes on outside press,
     * Escape, resize, or any scroll.
     */
    function Dropdown(props) {
      const {
        id,
        label,
        placeholder,
        value,
        items,
        disabled,
        onSelect,
      } = props
      const [open, setOpen] = React.useState(false)
      const [rect, setRect] = React.useState(null)
      const triggerRef = React.useRef(null)
      const menuRef = React.useRef(null)
      const current = items.find((item) => item.id === value)

      const close = React.useCallback(() => setOpen(false), [])

      const toggle = () => {
        if (open) {
          close()
          return
        }
        const node = triggerRef.current
        if (node === null) return
        const box = node.getBoundingClientRect()
        const gap = 6
        const spaceBelow = window.innerHeight - box.bottom - gap - 8
        const spaceAbove = box.top - gap - 8
        const openUp = spaceBelow < 200 && spaceAbove > spaceBelow
        setRect({
          left: box.left,
          width: box.width,
          top: box.bottom + gap,
          bottom: window.innerHeight - box.top + gap,
          openUp,
          maxHeight: Math.max(160, Math.min(340, openUp ? spaceAbove : spaceBelow)),
        })
        setOpen(true)
      }

      React.useEffect(() => {
        if (!open) return undefined
        const onPointerDown = (event) => {
          const target = event.target
          if (triggerRef.current?.contains(target)) return
          if (menuRef.current?.contains(target)) return
          setOpen(false)
        }
        const onKeyDown = (event) => {
          if (event.key === 'Escape') setOpen(false)
        }
        const onViewportChange = () => setOpen(false)
        document.addEventListener('mousedown', onPointerDown, true)
        document.addEventListener('keydown', onKeyDown)
        window.addEventListener('resize', onViewportChange)
        window.addEventListener('scroll', onViewportChange, true)
        return () => {
          document.removeEventListener('mousedown', onPointerDown, true)
          document.removeEventListener('keydown', onKeyDown)
          window.removeEventListener('resize', onViewportChange)
          window.removeEventListener('scroll', onViewportChange, true)
        }
      }, [open])

      const choose = (item) => {
        setOpen(false)
        onSelect(item.id)
      }

      const menu = open && rect !== null && h('div', {
        ref: menuRef,
        className: 'dsi-menu',
        role: 'listbox',
        'aria-labelledby': `${id}-label`,
        style: {
          left: `${rect.left}px`,
          width: `${rect.width}px`,
          maxHeight: `${rect.maxHeight}px`,
          ...(rect.openUp ? { bottom: `${rect.bottom}px` } : { top: `${rect.top}px` }),
        },
      }, items.length === 0
        ? h('div', { className: 'dsi-menuempty' }, placeholder)
        : items.map((item) => h('button', {
            type: 'button',
            key: item.id,
            role: 'option',
            'aria-selected': item.id === value,
            className: item.id === value ? 'dsi-menuitem dsi-menuitemactive' : 'dsi-menuitem',
            onClick: () => choose(item),
          }, [
            h('span', {
              key: 'check',
              className: item.id === value ? 'dsi-menucheck dsi-menucheckon' : 'dsi-menucheck',
              'aria-hidden': true,
            }, glyph('check', 14)),
            h('span', { key: 'text', className: 'dsi-menutext' }, [
              h('span', { key: 'title', className: 'dsi-menutitle' }, item.title),
              item.description ? h('span', { key: 'desc', className: 'dsi-menudesc' }, item.description) : null,
            ]),
            item.badge ? h('span', { key: 'badge', className: 'dsi-type' }, item.badge) : null,
          ])))

      return h('div', { className: 'dsi-select' }, [
        h('label', { id: `${id}-label`, key: 'label', className: 'dsi-fieldlabel', htmlFor: id }, label),
        h('button', {
          ref: triggerRef,
          id,
          key: 'trigger',
          type: 'button',
          className: 'dsi-selectbtn',
          disabled,
          'aria-haspopup': 'listbox',
          'aria-expanded': open,
          'aria-labelledby': `${id}-label`,
          onClick: toggle,
        }, [
          h('span', { key: 'value', className: 'dsi-selectvalue' }, current === undefined
            ? h('span', { key: 'empty', className: 'dsi-selectplaceholder' }, placeholder)
            : [
                current.badge ? h('span', { key: 'badge', className: 'dsi-type' }, current.badge) : null,
                h('span', { key: 'title', className: 'dsi-selecttext' }, current.title),
              ]),
          h('span', {
            key: 'chevron',
            className: open ? 'dsi-chevron dsi-chevronopen' : 'dsi-chevron',
            'aria-hidden': true,
          }, glyph('chevron', 14)),
        ]),
        menu,
      ])
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
      const [refreshing, setRefreshing] = React.useState(false)
      const [channels, setChannels] = React.useState([])
      const [warnings, setWarnings] = React.useState([])
      const [channelId, setChannelId] = React.useState('')
      const [docId, setDocId] = React.useState('')
      const [starting, setStarting] = React.useState(false)
      const [startMsg, setStartMsg] = React.useState(null)
      const [reloadToken, setReloadToken] = React.useState(0)
      const [report, setReport] = React.useState(null)
      const [reportState, setReportState] = React.useState('idle')
      const [reportError, setReportError] = React.useState('')
      const [reportMsg, setReportMsg] = React.useState(null)
      const [sentFix, setSentFix] = React.useState(null)
      const [sentFixOpen, setSentFixOpen] = React.useState(false)
      const [expandedIssue, setExpandedIssue] = React.useState('')
      const [fixingIssue, setFixingIssue] = React.useState('')
      const [appliedIssues, setAppliedIssues] = React.useState({})
      const pollFromRef = React.useRef(0)

      // Kept in refs so a reload can preserve the current pick without
      // re-creating the load callback on every selection change.
      const channelIdRef = React.useRef(channelId)
      const docIdRef = React.useRef(docId)
      channelIdRef.current = channelId
      docIdRef.current = docId

      const load = React.useCallback(async (force, silent) => {
        if (!silent) setPhase('loading')
        setError('')
        try {
          const status = await api.status()
          const url = typeof status.indexUrl === 'string' ? status.indexUrl : ''
          setIndexUrl(url)
          setSettingsPathValue(status.settingsPath ?? '')
          setDraftUrl((current) => (current.length === 0 ? url : current))
          if (url.length === 0) {
            setChannels([])
            setWarnings([])
            setChannelId('')
            setDocId('')
            setPhase('empty')
            setSettingsOpen(true)
            return
          }
          const index = await api.index(force)
          const nextChannels = Array.isArray(index.channels) ? index.channels : []
          setChannels(nextChannels)
          setWarnings(Array.isArray(index.warnings) ? index.warnings : [])
          const nextChannel = nextChannels.find((item) => item.id === channelIdRef.current) ?? nextChannels[0]
          const nextDocs = nextChannel?.docs ?? []
          setChannelId(nextChannel?.id ?? '')
          setDocId(nextDocs.some((doc) => doc.id === docIdRef.current) ? docIdRef.current : nextDocs[0]?.id ?? '')
          setPhase('ready')
        } catch (loadError) {
          setError(describe(loadError))
          setPhase('error')
        }
      }, [])

      React.useEffect(() => {
        load(false, false).catch(() => {})
        // A reload token re-runs the same load; the two deps are intentional.
      }, [reloadToken]) // eslint-disable-line react-hooks/exhaustive-deps

      // Show the latest report already present in this Session, if any.
      React.useEffect(() => {
        if (sessionId.length === 0) return undefined
        let cancelled = false
        api.report(sessionId).then((value) => {
          if (cancelled || value.state !== 'ready') return
          setReport(value)
          setReportState('ready')
        }).catch(() => {})
        return () => {
          cancelled = true
        }
      }, [sessionId])

      // Poll for the report of a just-started inspection.
      React.useEffect(() => {
        if (reportState !== 'polling' || sessionId.length === 0) return undefined
        let cancelled = false
        let timer
        let attempts = 0
        const tick = async () => {
          if (cancelled) return
          attempts += 1
          if (attempts > 240) {
            setReportError('检视耗时过长；可以稍后点“重新读取结果”重试')
            setReportState('error')
            return
          }
          try {
            const value = await api.report(sessionId, pollFromRef.current)
            if (cancelled) return
            if (value.state === 'ready') {
              setReport(value)
              setReportState('ready')
              return
            }
            timer = setTimeout(tick, 2500)
          } catch (error) {
            if (cancelled) return
            setReportError(describe(error))
            setReportState('error')
          }
        }
        tick()
        return () => {
          cancelled = true
          if (timer !== undefined) clearTimeout(timer)
        }
      }, [reportState, sessionId])

      const channelsList = channels
      const channel = channelsList.find((item) => item.id === channelId) ?? channelsList[0]
      const docs = channel?.docs ?? []
      const selectedDoc = docs.find((doc) => doc.id === docId) ?? docs[0]

      const chooseChannel = (id) => {
        setChannelId(id)
        const next = channelsList.find((item) => item.id === id)
        setDocId(next?.docs?.[0]?.id ?? '')
      }

      /** Re-fetch the index, keeping the current pick and the current list visible. */
      const refresh = async () => {
        if (refreshing) return
        setRefreshing(true)
        setStartMsg(null)
        try {
          await load(true, channelsList.length > 0)
        } finally {
          setRefreshing(false)
        }
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
          setReport(null)
          setReportMsg(null)
          setAppliedIssues({})
          setReportError('')
          pollFromRef.current = typeof result.startSeq === 'number' ? result.startSeq : 0
          setReportState('polling')
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

      const issueLocation = (item) => {
        if (typeof item.path !== 'string' || item.path.length === 0) return item.locationRaw ?? ''
        return Number.isFinite(item.endLine) && item.endLine > item.line
          ? `${item.path}:${item.line}-${item.endLine}`
          : `${item.path}:${item.line}`
      }

      const detailRow = (label, value) => (typeof value === 'string' && value.trim().length > 0
        ? h('div', { className: 'dsi-detailrow', key: label }, [
            h('span', { className: 'dsi-detailkey', key: 'key' }, label),
            h('span', { className: 'dsi-detailval', key: 'value' }, value),
          ])
        : null)

      const applyIssue = async (item, key) => {
        if (fixingIssue !== '' || appliedIssues[key] === true) return
        setFixingIssue(key)
        setReportMsg(null)
        try {
          const value = await api.apply(sessionId, item)
          setAppliedIssues((current) => ({ ...current, [key]: true }))
          setSentFix({
            path: item.path,
            line: item.line,
            endLine: item.endLine,
            prompt: typeof value?.prompt === 'string' ? value.prompt : '',
          })
          setSentFixOpen(false)
          setReportMsg(null)
        } catch (error) {
          setReportMsg({ ok: false, text: `${t('report.applyFailed')}：${describe(error)}` })
        } finally {
          setFixingIssue('')
        }
      }

      const renderIssue = (item, key) => {
        const expanded = expandedIssue === key
        const applied = appliedIssues[key] === true || item.applied === true
        const canLocate = typeof item.path === 'string' && item.path.length > 0 && Number.isFinite(item.line)
        const canFix = typeof item.fix === 'string' && item.fix.trim().length > 0
        return h('article', { className: expanded ? 'dsi-issue dsi-issueopen' : 'dsi-issue', key }, [
          h('div', { className: 'dsi-issuehead', key: 'head' }, [
            h('button', {
              type: 'button',
              className: 'dsi-issuetoggle',
              key: 'toggle',
              'aria-expanded': expanded,
              onClick: () => setExpandedIssue(expanded ? '' : key),
            }, [
              h('span', { className: 'dsi-issueloc', key: 'loc' }, issueLocation(item)),
              h('span', { className: 'dsi-issuebrief', key: 'brief' }, item.issue ?? item.basis ?? ''),
            ]),
            h('div', { className: 'dsi-issueactions', key: 'actions' }, [
              h('button', {
                type: 'button',
                className: 'dsi-textbtn',
                key: 'locate',
                title: t('report.locateTitle'),
                'aria-label': t('report.locateTitle'),
                disabled: !canLocate,
                onClick: () => {
                  try {
                    props.locate?.(sessionId, item.path, item.line)
                  } catch (error) {
                    setReportMsg({ ok: false, text: describe(error) })
                  }
                },
              }, t('report.locate')),
              applied
                ? h('span', { className: 'dsi-done', key: 'fix' }, [
                    h('span', { className: 'dsi-doneicon', key: 'icon' }, glyph('check', 11)),
                    h('span', { key: 'text' }, t('report.done')),
                  ])
                : h('button', {
                    type: 'button',
                    className: 'dsi-textbtn',
                    key: 'fix',
                    title: t('report.applyTitle'),
                    'aria-label': t('report.applyTitle'),
                    disabled: !canFix || fixingIssue === key,
                    onClick: () => applyIssue(item, key),
                  }, fixingIssue === key ? t('report.applyingShort') : t('report.apply')),
            ]),
          ]),
          expanded && h('div', { className: 'dsi-issuedetail', key: 'detail' }, [
            detailRow(t('report.detailIssue'), item.issue),
            detailRow(t('report.detailReason'), item.reason),
            detailRow(t('report.detailBasis'), item.basis),
            detailRow(t('report.detailRisk'), item.risk),
            detailRow(t('report.detailFix'), item.fix),
          ]),
        ])
      }

      const reportSection = phase === 'ready' && h('div', { className: 'dsi-report', key: 'report' }, [
        h('div', { className: 'dsi-reporthead', key: 'head' }, [
          h('span', { className: 'dsi-reporttitle', key: 'title' }, t('report.title')),
          h('button', {
            type: 'button',
            className: 'dsi-iconbtn',
            key: 'reload',
            title: t('report.reload'),
            'aria-label': t('report.reload'),
            disabled: reportState === 'polling' || sessionId.length === 0,
            onClick: () => {
              pollFromRef.current = 0
              setReportMsg(null)
              setReportError('')
              setReportState('polling')
            },
          }, h('span', { className: reportState === 'polling' ? 'dsi-spin' : undefined }, glyph('refresh', 14))),
        ]),
        reportMsg !== null && h('p', {
          key: 'msg',
          className: reportMsg.ok ? 'dsi-msg dsi-msgok' : 'dsi-msg dsi-msgerr',
        }, reportMsg.text),
        sentFix !== null && h('div', { className: 'dsi-sentfix', key: 'sentfix' }, [
          h('div', { className: 'dsi-sentfixhead', key: 'head' }, [
            h('span', { className: 'dsi-sentfixtag', key: 'tag' }, `✓ ${t('report.sent')}`),
            h('span', { className: 'dsi-sentfixloc', key: 'loc' }, issueLocation(sentFix)),
            sentFix.prompt.length > 0 && h('button', {
              type: 'button',
              className: 'dsi-textbtn',
              key: 'toggle',
              onClick: () => setSentFixOpen((open) => !open),
            }, sentFixOpen ? t('report.hideSent') : t('report.viewSent')),
          ]),
          sentFixOpen && h('pre', { className: 'dsi-sentfixbody', key: 'body' }, sentFix.prompt),
        ]),
        reportState === 'polling' && h('p', { className: 'dsi-pending', key: 'pending' }, [
          h('span', { className: 'dsi-spin', key: 'spin' }, glyph('refresh', 13)),
          h('span', { key: 'text' }, t('report.running')),
        ]),
        reportState === 'error' && h('p', { className: 'dsi-msg dsi-msgerr', key: 'error' }, `${t('report.failed')}：${reportError}`),
        reportState === 'idle' && h('p', { className: 'dsi-empty', key: 'idle' }, t('report.idle')),
        report !== null && reportState !== 'error' && h('div', { key: 'body' }, [
          typeof report.conclusion === 'string' && report.conclusion.length > 0
            ? h('p', { className: 'dsi-conclusion', key: 'conclusion' }, report.conclusion)
            : null,
          report.groups.length === 0 ? h('p', { className: 'dsi-empty', key: 'empty' }, t('report.empty')) : null,
          ...report.groups.map((group) => h('section', { className: 'dsi-group', key: group.level }, [
            h('h3', { className: `dsi-groupname dsi-groupname-${group.level.toLowerCase()}`, key: 'name' }, [
              h('span', { className: `dsi-level dsi-level-${group.level.toLowerCase()}`, key: 'level' }, group.level),
              h('span', { key: 'count' }, `${group.items.length} ${t('report.count')}`),
            ]),
            group.items.length === 0
              ? h('p', { className: 'dsi-empty', key: 'none' }, t('report.none'))
              : group.items.map((item, index) => renderIssue(item, `${group.level}-${index}`)),
          ])),
        ]),
      ])

      const channelItems = channelsList.map((item) => ({
        id: item.id,
        title: item.name,
      }))
      const docItems = docs.map((doc) => ({
        id: doc.id,
        title: doc.title,
        description: doc.description,
        badge: typeLabel(doc),
      }))

      return h('div', { className: 'dsi-page' }, [
        h('header', { className: 'dsi-head', key: 'head' }, [
          h('div', { key: 'titles' }, [
            h('h1', { className: 'dsi-title', key: 'title' }, t('page.title')),
            h('p', { className: 'dsi-sub', key: 'sub' }, t('page.subtitle')),
          ]),
          h('div', { className: 'dsi-actions', key: 'actions' }, [
            h('button', {
              type: 'button',
              className: 'dsi-iconbtn',
              key: 'refresh',
              title: refreshing ? t('picker.refreshing') : t('picker.refresh'),
              'aria-label': refreshing ? t('picker.refreshing') : t('picker.refresh'),
              disabled: refreshing,
              onClick: refresh,
            }, h('span', { className: refreshing ? 'dsi-spin' : undefined }, glyph('refresh', 16))),
            h('button', {
              type: 'button',
              className: 'dsi-btn',
              key: 'settings',
              onClick: () => {
                setSettingsMsg(null)
                setSettingsOpen((open) => !open)
              },
            }, settingsOpen ? t('settings.hide') : t('settings.show')),
          ]),
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
              disabled: saving || refreshing,
              onClick: refresh,
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
              onClick: refresh,
            }, t('picker.retry')),
          ]),

          phase === 'ready' && channelsList.length === 0 && h('p', { className: 'dsi-empty', key: 'nochannels' }, t('picker.noChannels')),

          phase === 'ready' && channelsList.length > 0 && h('div', { key: 'selects' }, [
            h('div', { className: 'dsi-field', key: 'channel' }, h(Dropdown, {
              id: 'dsi-channel',
              label: t('picker.channelLabel'),
              placeholder: t('picker.noChannels'),
              value: channel?.id ?? '',
              items: channelItems,
              disabled: channelsList.length <= 1,
              onSelect: chooseChannel,
            })),
            h('div', { className: 'dsi-field', key: 'doc' }, h(Dropdown, {
              id: 'dsi-doc',
              label: t('picker.docLabel'),
              placeholder: docs.length === 0 ? t('picker.noDocs') : '',
              value: selectedDoc?.id ?? '',
              items: docItems,
              disabled: docs.length === 0,
              onSelect: setDocId,
            })),
            selectedDoc?.description ? h('p', { className: 'dsi-docdesc', key: 'desc' }, selectedDoc.description) : null,
            docs.length === 0 && h('p', { className: 'dsi-empty', key: 'nodocs', style: { marginTop: 10 } }, t('picker.noDocs')),
          ]),

          warnings.length > 0 && h('div', { className: 'dsi-warn', key: 'warnings' }, [
            h('strong', { key: 'title' }, `${t('picker.warnings')}：`),
            ...warnings.slice(0, 4).map((warning, index) => h('div', { key: `w${index}` }, warning)),
          ]),

          reportSection,
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

      const entryProps = {
        locale: NS,
        inject: () => ({
          open: () => openPicker(ctx),
        }),
      }

      // Icon beside the right-Sidebar toggle. Utilities are right-aligned and
      // hidden by the host while a Session is blank, so the hero seat below
      // carries the same entry for the new-Session state.
      ctx.slots.inject('conversation.session.header.utilities', () =>
        ctx.slots.register({
          ...entryProps,
          name: 'conversation.session.header.utilities',
          id: 'spec-inspect-trigger',
          order: 10,
        }, EntryTrigger))

      // Blank (new) Session: the hero row renders `conversation.hero.options`
      // for the current Session, while the header utilities are skipped. The
      // entry itself is positioned against the header corner (the Sidebar
      // toggle) so it stays in the top-right, not above the composer.
      ctx.slots.inject('conversation.hero.options', () =>
        ctx.slots.register({
          ...entryProps,
          name: 'conversation.hero.options',
          id: 'spec-inspect-hero-trigger',
          order: 10,
        }, HeroTrigger))

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
          inject: () => ({
            api,
            locate: (sessionId, path, line) => locateInSidebar(ctx, sessionId, path, line),
          }),
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
