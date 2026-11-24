# dsh-web-search-ark

**OpenAI Responses 风格**的 DSH 搜索 provider，带侧栏「插件」页配置卡片。

一套代码适配多个后端，用 `preset` 切换：

| preset | 后端 | 默认端点 | 默认模型 |
|---|---|---|---|
| `ark`（默认） | 火山方舟 | `https://ark.cn-beijing.volces.com/api/plan/v3` | `deepseek-v4-1-flash-261017` |
| `qwen` | 千问 Token Plan | `https://token-plan.maas.qianwenaiapi.com/compatible-mode/v1` | `deepseek-v4.1-flash-1017` |
| `custom` | 任意 OpenAI 兼容端点 | 自行填写 | 自行填写 |

它们共用同一协议：`POST {base}/responses`，`tools: [{ type: 'web_search' }]`，
来源从响应的 `output[].action.sources[]` 提取。

- provider id：`ark-official`（v1.3.0 起代表「当前 preset 选中的后端」，id 未变以免破坏既有 profile）
- 计费：按后端实际 `web_search` 调用次数计（Ark 联网资源每月免费 2 万次；千问见其 Token Plan 说明）

## 三步上手

> **挂载 ≠ 选中。** 完成第 1 步后卡片、配置按钮都会出现，但搜索**不会**经过本插件；
> 必须完成第 2 步「激活」。卡片顶部徽标会实时显示这两种状态的区别。

### 1. 安装（挂载）

在 desktop profile 的 `package.json` 中把 `dsh-web-search-ark` 加入 `dsh.profile.bundles`
（或用插件市场安装）。重启后侧栏**插件**页出现卡片即挂载成功。

### 2. 激活（选中）——**必做，未做此步插件不会生效**

把下面这段追加到 profile 的 `cordis.patch.yml`（与 `bundles` 声明同级），然后重启：

```yaml
- id: web
  name: "@deepseek-ai/dsh-web"
  config:
    searchProvider: ark-official
    fetchProvider: http
```

桌面版该文件通常位于 `~/.dsh/profiles/desktop/cordis.patch.yml`；打开卡片即可看到插件探测到的确切路径与可一键复制的 YAML。

> 设计说明：bundle 层补丁刻意**不**替你写 `web` 行 selection——多个搜索 provider 插件并存时不应抢配置。
> 作为补偿，卡片徽标与 Host 启动日志都会在「挂载但未选中」时明确提示，不再静默。

### 3. 配置后端与凭证

打开卡片，在「后端预设」里选 `ark` / `qwen` / `custom`，切换时会自动填入该后端的默认端点与模型。
凭证按顺序尝试（先查 `~/.dsh/.credentials.yaml` 的 refs，再查启动环境变量，命中的第一个生效）：

| preset | 默认凭证链 |
|---|---|
| `ark` | `ARK_API_KEY` → `HUOSHAN_API_KEY` → `ATEST_API_KEY` |
| `qwen` | `QIANWEN_AI_API_KEY` → `DASHSCOPE_API_KEY` |
| `custom` | 同 `ark`，可自行改成逗号分隔的任意候选链 |

存好其中之一即可，**无需重启**（provider 每次搜索重读配置）。也可直接填「直接密钥」。

## 更换后端

从火山方舟切到千问（或反向），只需要在卡片里改预设并保存——**不用改 profile、不用重启**：

```json
// ~/.dsh/web-search-ark.json
{
  "preset": "qwen",
  "apiKeyEnv": "QIANWEN_AI_API_KEY"
}
```

若想同时保留两套配置，可只在文件层写当前想要的那套；旧值留作注释或另存备份即可。

## 各后端差异

两个后端协议同源，差异已由 preset 自动处理，一般无需手工干预：

| 差异点 | Ark | 千问 |
|---|---|---|
| `max_keyword` | 支持（1–50，直接影响计费次数） | **不支持**，preset 下不发送，卡片中该项禁用 |
| `include: web_search_call.action.sources` | 需显式请求 | **不需**，默认就返回 |
| 来源标题 | `title` / `site_name` / `summary` / `publish_time` 齐全 | **只有 `url`**，插件用域名兜底，可开启标题补全 |
| `annotations[].url_citation` | 有（含 `summary` 长摘要） | `annotations` 恒为空数组 |
| 计费计数 | 无 | `tool_usage.web_search.num_requests` |
| 检索方式 | web_search 工具内多轮 | agent 式多轮（实测一次查询 3 次 `web_search_call`） |

## 配置参考

生效值按此顺序合并，**后者覆盖前者**：profile `cordis.patch.yml` 的行 `config:` → `~/.dsh/web-search-ark.json`。
每个字段的默认值取自 `preset`；显式填写则覆盖预设。

| 键 | 默认值 | 说明 |
|---|---|---|
| `preset` | `ark` | `ark` / `qwen` / `custom`，决定其余默认值与请求参数形态 |
| `apiKey` | — | 字面密钥，优先于 `apiKeyEnv`；不推荐 |
| `apiKeyEnv` | 见上表 | 凭证候选链（逗号分隔，按序回退） |
| `baseURL` | 按 preset | 自动拼 `/responses` |
| `model` | 按 preset | 执行搜索的模型，必须支持 `web_search` |
| `maxKeyword` | `5` | 单轮关键词上限（仅 Ark/custom 生效） |
| `timeoutMs` | `120000` | 单次搜索超时 |
| `enrichTitles` | `false` | 对只返回域名的来源补抓真实网页标题，见下节 |
| `enrichTitleLimit` | `5` | 补全前几条来源（1–10） |

## 来源标题补全（可选）

千问的 Responses API **只返回链接、不给标题**，所以来源列表默认只能看到域名。
开启 `enrichTitles` 后，插件会对**前 N 条只有域名兜底标题**的来源各抓一次网页，
从 `<head>` 里提取 `<title>`：

```json
// ~/.dsh/web-search-ark.json
{ "enrichTitles": true, "enrichTitleLimit": 5 }
```

实测对比（同一个查询，千问后端）：

| | 标题 | 耗时 |
|---|---|---|
| 关闭 | `www.weather.com.cn` | 3.1 s |
| 开启（5 条） | `杭州天气预报,杭州7天天气预报…` | 6.3 s |

实现上的克制之处：

- **只补兜底标题**，后端已给出真实标题的来源不会被覆盖或重复抓取
- 只读**前 64 KB**，找到 `</title>` 就提前中断，不下载整页
- 按响应头 / `<meta charset>` 解码，中文 GBK 页面不会变成乱码（解码失败则保留域名）
- 单页 6 s 超时、失败静默降级——**抓标题失败绝不会让搜索失败**
- 默认关闭，因为它是「用延迟换可读性」的取舍

## 为什么不用内置 provider

`@deepseek-ai/dsh-web-search-deepseek` 只发 Anthropic 的 `web_search_20250305` 服务端工具，
搜索在 DeepSeek 服务端执行。火山方舟与千问的联网搜索都只存在于各自的原生 Responses API
（OpenAI 风格 `{"type":"web_search"}`），所以需要一个独立的 provider。

## 状态自检

打开配置卡片即可看到启用徽标与凭证预检；也可直接请求：

```bash
curl http://127.0.0.1:<host端口>/ark-search/status
```

返回 `selected`（`true`/`false`/`null`）、`preset`、`configuredSearchProvider`、`keyResolved` 等。
若 Host 启动日志出现 `dsh-web-search-ark mounted but web.searchProvider is …` 警告，说明第 2 步未完成。

## 零依赖设计

本包**不 import 任何 `@deepseek-ai/*` 包**，Host 与 Client 两侧都只用宿主提供的 `require`。

1. `~/.dsh/profiles/node_modules` 下的 `@deepseek-ai/*` 是 pnpm 创建的 junction，指向**安装时**的
   runtime 路径；桌面版升级或迁移目录后这些 junction 会悬空（实测 249 个全部失效）。
2. 0.2.x 移除了 `settingsNamespace` / `installSettingsSection` 等导出，用它们的第三方插件会在加载期失败。

顺带好处：没有 `peerDependencies` / `engines.dsh`，不会被 DSH 的插件兼容性检查跳过。

seam selection 的探测是**鸭子式**读取 `ctx.web` 实例的公开字段（`config.searchProvider`、
`searchProviderEnv`、`searchProviders`），任何字段改名都会安全降级为「无法确定」，不会崩溃。

## 审计

**每次搜索尝试**——无论成败——都会追加一行 JSONL 到 `~/.dsh/web-search-ark.audit.jsonl`
（`time`、`endpoint`、`model`、`maxKeyword`、`ok`、`code`、成功时附 `sources`、`elapsedMs`）。

诊断规则：**audit 无记录 ⇒ 搜索必然没经过本 provider**（未激活）；有记录则能直接看到每次尝试的成败与错误码
（如 `WEB_PROVIDER_CREDENTIAL_MISSING`）。路径可用 `DSH_WEB_SEARCH_ARK_AUDIT_FILE` 覆盖（自检脚本用它隔离）。

审计**只写插件自己的文件，不写会话日志**：自定义事件类型若未带 envelope `ignorable: true` 标记，
会让不认识该类型的 harness 版本拒绝加载整个会话，而 `Session.append` 的第三个参数并不支持
`ignorable`（只认 `surfaceOp` / `sourceEventSeqs`）；官方逃生口 `appendPluginRecord` 需要导入
`@deepseek-ai/dsh-session`，违背零依赖设计。历史版本（1.1.0 及更早）曾写 `web/ark-search-request`
事件导致过一次会话无法加载，已改为文件审计。

## HTTP 路由

| 方法 | 路径 | 作用 |
|---|---|---|
| GET | `/ark-search/status` | 启用状态快照：`selected`、`preset`、`presets`、`configuredSearchProvider`、`available`、profile 补丁文件候选、`keyResolved` 凭证预检 |
| GET | `/ark-search/settings` | 当前生效配置、文件层内容、文件路径 |
| POST | `/ark-search/settings` | 写入 `{ config: {...} }` 到文件层 |
| POST | `/ark-search/test` | 用当前配置跑一次真实搜索，返回来源数与耗时 |

## 自检

```bash
set ELECTRON_RUN_AS_NODE=1
"D:\DSH\DeepSeek Harness.exe" _selftest.mjs   # 离线：映射/去重/错误码/凭证回退/失败审计/preset/设置归一化（42 项断言）
"D:\DSH\DeepSeek Harness.exe" _parsetest.mjs  # 用真实响应样本验证映射
```

`_qwentest.mjs` 是**真实联网**的端到端检查（需环境变量 `QWEN_KEY`，会消耗一次搜索配额）：

```bash
set QWEN_KEY=<你的千问 key>
"D:\DSH\DeepSeek Harness.exe" _qwentest.mjs

set ENRICH=1
"D:\DSH\DeepSeek Harness.exe" _qwentest.mjs   # 同时验证标题补全
```

## 回滚

1. 删除 profile `cordis.patch.yml` 里的 `- id: web-search-ark` 行；
2. 把 `web` 行的 `searchProvider` 改回 `deepseek-official`；
3. 从 `package.json` 的 `dsh.profile.bundles` 删掉 `dsh-web-search-ark`；
4. 可选：删 `~/.dsh/web-search-ark.json`；
5. 重启 DeepSeek Harness。