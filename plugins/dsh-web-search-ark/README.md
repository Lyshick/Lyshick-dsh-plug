# dsh-web-search-ark

火山方舟（Volcengine Ark）**联网内容插件**的 DSH 搜索 provider，带侧栏「插件」页配置卡片。

- provider id：`ark-official`
- 端点：`POST {baseURL}/responses`，工具 `{ type: 'web_search', max_keyword: N }`
- 来源：`output[].content[].annotations[]` 的 `url_citation`（`title` / `url` / `site_name` / `publish_time` / `summary`）
- 计费：方舟按实际 `web_search` 调用次数计；联网资源每月免费 2 万次

## 为什么不用内置 provider

`@deepseek-ai/dsh-web-search-deepseek` 只发 Anthropic 的 `web_search_20250305` 服务端工具，
搜索在 DeepSeek 服务端执行。火山方舟的 Anthropic 兼容层不实现该工具，而其联网内容插件
只存在于原生 Responses API（OpenAI 风格 `{"type":"web_search"}`），所以需要一个独立的 provider。

## 配置卡片

侧栏**插件** → 找到 `dsh-web-search-ark` → 打开组合包 → 行 `web-search-ark` 旁的**配置**。

卡片可改：凭证名、直接密钥、接口地址、执行搜索的模型、单轮关键词上限、超时。
**保存后下一次搜索立即生效，不需要重启 Host**（provider 每次搜索重读配置）。

实现方式：`client.js` 按 `window.__ModuleLoader__` 格式手写，注册 `plugins.row.config`
（key = `dsh-web-search-ark#web-search-ark`），通过插件自己的 `/ark-search` 路由读写配置。
不依赖 `SettingsForms` 协议，也不 import 任何 `@deepseek-ai/*` 客户端包。

> **`dsh.client.immediately: true` 是必需的。** 客户端插件默认惰性：脚本执行只注册
> factory，模块体在「物化」时才运行。惰性插件若没有别人 import 它，就永远不会物化，
> 于是 `apply` 不执行、slot 不注册、配置按钮不出现。缺省时表现为「插件已加载但 UI 上没有
> 任何痕迹」，很难查。`inject` 里还列了 `dsh-client-ui-plugin-manager`，确保声明
> `plugins.row.config` 这个 slot 的页面先就位。

## 配置层

生效值按此顺序合并，**后者覆盖前者**：

1. profile `cordis.patch.yml` 里该行的 `config:`——部署默认值
2. `~/.dsh/web-search-ark.json`——卡片写入的值

| 键 | 默认值 | 说明 |
|---|---|---|
| `apiKey` | — | 字面密钥，优先于 `apiKeyEnv`；不推荐 |
| `apiKeyEnv` | `ATEST_API_KEY` | 凭证名：先查 `ctx.credentials`，再查启动环境 |
| `baseURL` | `https://ark.cn-beijing.volces.com/api/plan/v3` | 自动拼 `/responses`；套餐 key 用 `/api/plan/v3`，标准 key 用 `/api/v3` |
| `model` | `deepseek-v4-1-flash-261017` | 执行搜索的模型，必须支持 `web_search` |
| `maxKeyword` | `5` | 单轮最多拆几个关键词（1–50），直接影响费用 |
| `timeoutMs` | `120000` | 单次搜索超时 |

选中它（profile 的 `cordis.patch.yml`）：

```yaml
- id: web
  name: "@deepseek-ai/dsh-web"
  config:
    searchProvider: ark-official
    fetchProvider: http
```

## 零依赖设计

本包**不 import 任何 `@deepseek-ai/*` 包**，Host 与 Client 两侧都只用宿主提供的 `require`。

原因有两条：

1. `~/.dsh/profiles/node_modules` 下的 `@deepseek-ai/*` 是 pnpm 创建的 junction，指向**安装时**的
   runtime 路径；桌面版升级或迁移目录后这些 junction 会悬空（本机实测 249 个全部失效）。
2. 0.2.x 移除了 `settingsNamespace` / `installSettingsSection` 等导出，凡是用它们的第三方插件
   都会在加载期失败。本包不触碰这些 API。

顺带好处：没有 `peerDependencies` / `engines.dsh`，不会被 DSH 的插件兼容性检查跳过。

## 审计

每次搜索尝试会追加一行 JSONL 到 `~/.dsh/web-search-ark.audit.jsonl`（时间、端点、模型、关键词上限、工具配置）。

审计**只写插件自己的文件，不写会话日志**：自定义事件类型若未带 envelope `ignorable: true` 标记，
会让不认识该类型的 harness 版本拒绝加载整个会话，而 `Session.append` 的第三个参数并不支持
`ignorable`（只认 `surfaceOp` / `sourceEventSeqs`）；官方逃生口 `appendPluginRecord` 需要导入
`@deepseek-ai/dsh-session`，违背本包零依赖设计。历史版本（1.1.0 及更早）曾写 `web/ark-search-request`
事件导致过一次会话无法加载，已改为文件审计。

## HTTP 路由

| 方法 | 路径 | 作用 |
|---|---|---|
| GET | `/ark-search/settings` | 返回当前生效配置、文件层内容、文件路径 |
| POST | `/ark-search/settings` | 写入 `{ config: {...} }` 到文件层 |
| POST | `/ark-search/test` | 用当前配置跑一次真实搜索，返回来源数与耗时 |

## 自检

```bash
set ELECTRON_RUN_AS_NODE=1
"D:\DSH\DeepSeek Harness.exe" _selftest.mjs   # 映射/去重/错误码（离线）
"D:\DSH\DeepSeek Harness.exe" _parsetest.mjs  # 用真实响应样本验证映射
```

## 回滚

1. 删除 profile `cordis.patch.yml` 里的 `- id: web-search-ark` 行；
2. 把 `web` 行的 `searchProvider` 改回 `deepseek-official`；
3. 从 `package.json` 的 `dsh.profile.bundles` 删掉 `dsh-web-search-ark`；
4. 可选：删 `~/.dsh/web-search-ark.json`；
5. 重启 DeepSeek Harness。
