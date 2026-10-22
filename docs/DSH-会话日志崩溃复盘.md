# DSH 插件开发：会话日志崩溃复盘

> 事故：2026-10-22，`dsh-web-search-ark` 插件让一个历史会话**完全打不开**。
> 本文记录失效链、正确做法、以及已污染日志的抢救流程。
> 详细修复记录见 `E:\deepSeekWorks\_dsh_repair\FIX-REPORT.md`。

## 1. 一句话结论

**不要用 `session.append()` 往会话日志写插件自己的事件。**
它的第三参数不支持 `ignorable`，而持久层对"未知事件类型"是 fail-closed（拒绝加载整份日志）。

## 2. 事故经过

| 时间 | 事件 |
|---|---|
| 11:36 | 插件在每次搜索前执行 `session.append('web/ark-search-request', data, { ignorable: true })`，写入成功，无任何报错 |
| 11:40 | 正常重启 DSH |
| 13:33 | 打开该会话，报错并拒绝加载 |
| 13:30 | 修补日志 + 改插件写法，问题消失 |

错误原文：

```
failed to observe session ... contains event type "web/ark-search-request" (seq 976)
unknown to this harness and not marked ignorable; refusing to interpret the log
```

## 3. 根因（三层叠加）

### 第一层：`append` 静默丢弃不认识的选项

```js
// 我以为：
session.append(type, data, { ignorable: true })   // ← ignorable 被丢掉
// 实际接受的是：
session.append(type, data, { surfaceOp, sourceEventSeqs })
```

第三个参数里多余的键**不报错、不警告**，直接忽略。所以"写入成功"完全无法证明"写得对"。

### 第二层：持久层对未知事件类型 fail-closed

DSH 用 `@deepseek-ai/dsh-session` 的 `KNOWN_SESSION_EVENT_TYPES` 白名单描述"本构建认识的事件类型"。
读取路径的规则（源码注释）：

> The persistence read path refuses to interpret a log containing a type outside this set
> unless the event carries the envelope's `ignorable` marker: such a log was likely written by
> a newer harness, and silently skipping a required event would reconstruct a wrong session.

也就是说：**未知类型 + 没有 `ignorable: true` = 拒绝加载整份日志**。

这是有意的设计——防止新版写的日志被旧版误读后重建出错误会话。但代价是：一个插件的错误写入可以废掉整份会话。

### 第三层：我的验证方式错了

我当时只验证了"事件写进去了"（会话日志里能 grep 到），没有验证"它写成什么样、能否被读回来"。
写入侧的静默成功让我产生了错误的信心。

`ignorable` 是**落盘信封**上的标记，不是 append 的参数——这两者被我混为一谈。

## 4. 正确做法（三选一）

### 方案 A：写到独立文件（推荐，零依赖）

```js
import { appendFileSync } from 'node:fs'
import { join } from 'node:path'

function record(payload) {
  try {
    appendFileSync(
      join(process.env.USERPROFILE, '.dsh', 'my-plugin.audit.jsonl'),
      JSON.stringify({ at: new Date().toISOString(), ...payload }) + '\n',
      'utf8',
    )
  } catch {
    // 审计失败绝不能影响主流程
  }
}
```

优点：完全不碰会话词汇表，任何版本都能读；缺点：审计数据不在会话里，UI 不可见。

### 方案 B：`appendPluginRecord`（事件仍在会话里，但需要 import DSH 包）

`plugin:` 前缀的类型名 + 自动 `ignorable`：

```js
import { KNOWN_SESSION_EVENT_TYPES } from '@deepseek-ai/dsh-session'
// 记录名必须是 plugin: 开头、小写、斜杠分段
session.appendPluginRecord('plugin:my-plugin/search-request', data)
```

注意：源码注释说明该函数**仅供仓库内 `packages/experimental/` 调用**（有 verify 门禁）。
仓库外插件能否使用未验证。而且在 `profiles/node_modules` 下 import `@deepseek-ai/*` 可能因
junction 悬空而失败（见另一篇文档 C3 节）。

### 方案 C：不写日志

搜索/抓取类插件完全可以用 HTTP 路由或用户可见的 UI 状态替代审计。

## 5. 抢救已污染的日志

会话日志是**多帧 zstd**（`session.v4.jsonl.zstd`），不能整体解压再整体压缩——那会重写所有帧。
正确做法是只改需要改的那一帧，其余帧保留原始字节。

流程（工具在 `E:\deepSeekWorks\_dsh_repair\tmp\`）：

1. `decompress_frames.mjs` —— 按 zstd 帧头逐帧扫描并解压（复刻 DSH 的 `scanZstdFrames`）
2. 在解压后的 JSONL 里找到目标 `seq` 的事件行，在信封上加 `"ignorable":true`
   （键序与 DSH 写入习惯一致，放在行尾）
3. 仅重新压缩该帧，其余帧**原字节复制**
4. **校验通过后才替换**，校验项：
   - 帧数不变
   - 事件总数不变
   - `seq` 从 0 连续
   - "未知且未标记"的事件数 = 0
5. 原子替换（写临时文件再 rename），并保留备份（会话目录内 + 工作区各一份）

本机实际数据：733 帧、1324 事件、`seq 0..1323` 连续。

> 关键：`session.v4.jsonl.zstd` 里每个帧可能包含多条事件，改一帧需要重新压缩该帧内的**所有**事件
> 行，所以第 4 步的"事件总数不变 + seq 连续"两条校验必须同时满足。

## 6. 开发自检清单

写完插件后，按这个顺序验证（**每条都要真的做**）：

- [ ] 插件是否往 `session.append` 写自定义事件？→ 若是，改用方案 A/B/C
- [ ] 事件类型名是否在 `KNOWN_SESSION_EVENT_TYPES` 里？→ 用 asar 提取该文件核对
- [ ] **重启后能否打开写入过该事件的会话？** ← 这一步最容易被跳过
- [ ] 写入失败是否会影响主流程？→ 所有审计代码必须包 `try/catch`
- [ ] 是否有其他"参数被静默忽略"的 API？→ 看目标函数的解构参数，不要假设

## 7. 附：同类的"静默失败"契约（本次一并踩到）

这四处的共同点是：**不合规不报错，只表现为"没有效果"**，所以在桌面端尤其难查。

| 位置 | 错误写法 | 后果 | 正确写法 |
|---|---|---|---|
| 会话日志 | `append(type, data, { ignorable })` | 未知事件被拒 → 会话打不开 | 见第 4 节 |
| Host 插件导出 | `export default apply` + `export const inject` | loader 取 default 当入口，`inject` 丢失 → `cannot get property "web" without inject` | 只用具名导出 `export function apply` / `export const inject` |
| `package.json` | `dsh.client` 缺 `immediately: true` | 客户端半侧惰性、永不物化 → UI 无任何痕迹 | 加 `"immediately": true` |
| profile 清单 | 只在 `bundles` 里、不在 `dependencies` 里 | 插件页 `installed=false` 被过滤 → 列表里看不到 | 补 `"<pkg>": "link:../node_modules/<pkg>"` |

## 8. 教训

1. **验证要"读回来"，不要只看"写出去"。** 写入成功不代表数据可用。
2. **静默丢弃比抛异常危险得多。** 遇到"参数好像没生效"，去读目标函数的解构签名，而不是重试。
3. **涉及持久化格式的改动，先假设它会破坏读取端。** 在临时会话里试，验证"重启后能打开"。
4. **桌面端看不到 stderr。** 插件相关的失败要主动把诊断写到文件或 HTTP 路由上，否则没有可观测性。
