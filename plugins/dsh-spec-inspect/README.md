# dsh-spec-inspect · 业务规范检视

在会话右上角、右侧边栏开关的旁边增加一个「规范检视」入口。点开后从公司内部渠道的 JSON 索引源里选择一份 HTML 业务规范文档，点击「开始检视」后，AI 会按文档要求检索**当前会话工作区**的前端代码，并把发现的问题按文档定义的 **P0-P5** 分级罗列在对话里。

- 文档类型：`.md` / `.markdown` / `.txt` / `.html` / `.doc` / `.docx`
- 索引源：一个可 HTTP(S) 访问的 JSON 文件，可随时在插件页里修改
- 结果：按文档自己的 P0-P5 级别分组；文档没有定义的级别不会硬凑
- 只读：只输出检视报告，不修改代码
- 零依赖：Host 与 Client 都只用 Node / 浏览器内置能力，不 import 任何 `@deepseek-ai/*` 包

## 安装

在 DSH 侧边栏的**插件**页安装框填入：

```text
github:Lyshick/Lyshick-dsh-plug#path:plugins/dsh-spec-inspect
```

或用 CLI：

```sh
dsh plugin install "github:Lyshick/Lyshick-dsh-plug#path:plugins/dsh-spec-inspect"
```

安装完成、插件启用后，打开任意会话，右上角工具区会出现「规范检视」图标（在右侧边栏开关左侧）。

## 使用

1. 点击右上角「规范检视」图标 → 右侧边栏打开「规范检视」页。
2. 第一次使用点「设置」，填入索引源 JSON 的 URL，点「保存并加载」。
3. 选择渠道、选择文档，点「开始检视」。
4. AI 会在当前会话里开始检索工作区，并按规范文档的分级输出报告。

设置保存在 `~/.dsh/spec-inspect.json`（或 `$DSH_HOME/spec-inspect.json`），重装插件后仍然有效。`cordis.patch.yml` 里的 `indexUrl` 只作为首次默认值。

## 索引 JSON

推荐（也是最小）结构：

```json
{
  "channels": [
    {
      "id": "web",
      "name": "Web 渠道",
      "docs": [
        {
          "id": "html-style",
          "title": "HTML 编写规范",
          "url": "https://spec.example.com/web/html-style.md"
        },
        {
          "id": "activity-page",
          "title": "活动页规范",
          "url": "https://spec.example.com/web/activity.doc"
        }
      ]
    }
  ]
}
```

字段说明：

| 字段 | 必填 | 说明 |
|---|---|---|
| `channels[]` | 是 | 渠道列表；每个渠道一组文档 |
| `channels[].id` | 否 | 渠道 id，缺省按顺序生成 |
| `channels[].name` | 否 | 渠道显示名，缺省用 id |
| `channels[].docs[]` | 是 | 文档列表 |
| `docs[].id` | 否 | 文档 id，缺省从标题生成；用于发起检视 |
| `docs[].title` | 否 | 显示标题，缺省用 URL 文件名 |
| `docs[].url` | 是 | 文档地址；可以是绝对 URL，也可以是相对索引源的路径 |
| `docs[].type` | 否 | `md` / `doc` / `docx` / `txt` / `html`，缺省按 URL 后缀判断 |
| `docs[].description` | 否 | 副标题/备注，显示在文档标题下方 |

也兼容几种常见变体：顶层直接给 `docs` 数组、顶层数组、`channels` 写成对象映射、文档字段用 `href` / `link` / `path`、渠道文档字段用 `documents` / `files` / `items`。无法解析或非 HTTP(S) 的链接会被跳过，并在页面里显示索引提示。

## 文档解析

- `.md` / `.markdown` / `.txt` / `.html`：按 UTF-8 读取；`.html` 会去掉标签和脚本，只保留可读文本。
- `.docx`：内置最小 zip + WordprocessingML 解析器，提取 `word/document.xml` 的段落文本。
- `.doc`（Word 97-2003）：内置 OLE 复合文档 + Word 分片表（piece table）解析器，直接提取正文文本；不依赖 LibreOffice、Word 或 npm 依赖。
- `.doc` 实际是 docx / RTF / HTML / 纯文本时，会按内容自动识别并回退。

实现上刻意不引入 `@deepseek-ai/*` 依赖：桌面版迁移安装目录后，profile 里的 pnpm junction 可能悬空，任何跨包 import 都可能让整个插件加载失败。这里只使用 `node:fs`、`node:zlib`、`fetch`、`TextDecoder` 等内置能力。

## 检视结果

发给模型的消息里明确要求：

- 先通读规范、提炼检查项，再用 `glob` / `grep` / `read` 检索工作区；
- 每条问题必须有文件路径、尽量带行号、关键代码证据和文档原文依据；
- 严重级别严格使用文档定义的 P0-P5：文档定义了哪些级别就只用哪些，不自行新增或改名；文档完全没定义 P 级时才退回 P0（阻断）/P1（严重）/P2（一般）；
- 按级别分组输出，附「级别汇总」表和「待确认」；
- 只检视、不修改文件。

示例输出结构：

```text
## 检视结论
...
## 检视范围
...
## P0 问题
- **位置**：`src/pages/a.vue:42`
  - **问题**：...
  - **规范依据**：...
  - **风险**：...
  - **修复建议**：...
## P1 问题
...
## 级别汇总
| 级别 | 数量 |
...
## 待确认
...
```

## HTTP 接口

插件挂在 `/spec-inspect` 前缀下，供页面自身调用（同源 `fetch`）：

| 方法 | 路径 | 作用 |
|---|---|---|
| GET | `/spec-inspect/status` | 当前索引源、设置文件路径、版本 |
| GET | `/spec-inspect/index?refresh=1` | 拉取并归一化索引 |
| POST | `/spec-inspect/settings` | 写入 `{ "indexUrl": "..." }` |
| POST | `/spec-inspect/start` | 写入 `{ "docId": "...", "sessionId": "..." }`，拉取文档并唤醒该会话的 Agent |

所有响应形如 `{ "ok": true, "value": ... }` 或 `{ "ok": false, "error": { "code", "message" } }`。

## 自检

插件里带一份离线自检，验证索引归一化、相对链接、类型识别和提示词结构：

```sh
node plugins/dsh-spec-inspect/_selftest.mjs
```

## 维护者文档

更深入的实现说明、索引协议、踩坑与验证记录在 [docs/](docs/README.md)：

- [实现与架构](docs/实现与架构.md)
- [使用与索引格式](docs/使用与索引格式.md)
- [踩坑与排查](docs/踩坑与排查.md)
- [验证记录](docs/验证记录.md)

## 限制

- PDF / Excel / PPT 文档不解析；请把规范转存为 md / doc / docx。
- `.doc` 解析覆盖 Word 97-2003 标准二进制文档；加密文档、极旧的 Word 6/95 文档、扫描件（只有图片）无法提取文字，会返回明确错误。
- 索引源和文档地址需要能从运行 DSH 的机器访问；插件不做登录鉴权，内网地址可直接配置。
- “开始检视”把文档全文作为一条用户消息发到当前会话；超长文档会截断到 20 万字符。

## 目录结构

```text
plugins/dsh-spec-inspect/
├── index.js            # Host half：路由、索引、文档解析、提示词
├── client.js           # Client half：右上角入口 + 右侧边栏页面
├── cordis.patch.yml    # 插入 spec-inspect 行
├── package.json
├── locale/{zh,en}.json
├── icon.svg
├── _selftest.mjs
├── README.md
└── docs/               # 实现、索引格式、踩坑、验证记录
```
