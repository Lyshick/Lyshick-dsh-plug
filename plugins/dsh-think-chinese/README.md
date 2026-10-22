<h1 align="center">dsh-think-chinese</h1>

<p align="center">
  <strong>让 DeepSeek Harness 里的模型始终用中文进行内部推理与思考</strong><br/>
  官方 bundle 插件：一条系统提示词段落，作用于安装它的 profile 上的所有会话
</p>

<p align="center">
  <a href="LICENSE"><img src="https://badgen.net/badge/license/MIT/green" alt="license" /></a>
  <a href="https://www.npmjs.com/package/dsh-think-chinese"><img src="https://img.shields.io/npm/v/dsh-think-chinese" alt="npm" /></a>
</p>

---

DSH（DeepSeek Harness）的模型在展示「思考过程（Thinking）」时，默认倾向于用英文推理。本插件通过注册一条全局系统提示词段落，明确指示模型**始终使用中文进行内部推理与思考**——无论系统提示词、工具说明或对话使用何种语言。

## 安装

官方 bundle 插件，经 web profile 安装（安装后**重启 web 生效**）。

**方式一：npm 安装**

```sh
dsh plugin --profile web add dsh-think-chinese
# 重启 web
```

**方式二：GitHub 直装（免构建，纯 JS 包）**

```sh
dsh plugin --profile web add github:lingtima/dsh-think-chinese
# 重启 web
```

## 使用

安装并重启后**无需任何配置**：安装该插件的 profile 上，每个会话的每次模型请求都自动携带中文思考指令。子代理同样生效（段落是 profile 组合层的全局注册）。

验证是否生效：观察会话中模型的「思考过程（Thinking）」——应为中文。

## 能力

| 面 | 说明 |
|---|---|
| System prompt 段落 | 在 `order: 50` 注册 `think-in-chinese` 段落（人设之后、工具引导之前），指示模型始终用中文推理 |

## 卸载

```sh
dsh plugin --profile web remove dsh-think-chinese
# 重启 web
```

## 插件管理

已装插件可用 plugin-registry 的**薄控制台**管理（浏览器面板）：管理 profile 插件安装态（bundle 层栈 + insert 行 + 启停），无需手改配置。安装：

```sh
dsh plugin --profile web add github:vlln/plugin-registry#main&path:/packages/plugin/console
```

## 工作原理

`index.mjs` 是标准 Cordis entry（命名导出 `name`/`inject`/`apply`），经 `ctx.systemPrompt.section()` 注册一条 `PromptSection`：

- `order: 50` —— 按 DSH 约定位于人设（0）之后、工具引导（100–199）之前
- `text` —— 中文思考指令，随每次提示词组装进入系统提示词
- 段落 disposer 由 `ctx.effect` 托管，插件停止/更新/卸载时自动清理

## License

MIT
