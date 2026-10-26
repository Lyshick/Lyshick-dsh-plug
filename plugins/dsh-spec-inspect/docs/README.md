# dsh-spec-inspect · 实现文档

本目录记录 `dsh-spec-inspect` 的实现思路、索引协议、踩坑与验证过程，面向维护者；面向使用者的快速上手说明在 [../README.md](../README.md)。

## 文档索引

| 文档 | 内容 |
|---|---|
| [实现与架构.md](实现与架构.md) | Host / Client 分工、HTTP 路由、索引归一化、文档解析、报告解析、定位与应用修复、下拉与刷新、侧边栏注册 |
| [使用与索引格式.md](使用与索引格式.md) | 安装、设置、索引 JSON 规范、P0-P5 分级约定与输出格式 |
| [踩坑与排查.md](踩坑与排查.md) | 本次实现踩过的坑：客户端模块缓存、旧版 `.doc`、Buffer 解析、右侧栏 Tab、HMR 等 |
| [验证记录.md](验证记录.md) | 自检、真实 `.doc`、HTTP 路由、Live Slot 注册与 Live 页面验证记录 |

## 一句话架构

```text
会话右上角入口 / 空会话 workspace 行入口（Client Slot）
  → 右侧边栏“规范检视”Tab
  → 同源 fetch /spec-inspect/*
  → Host 拉取 JSON 索引 / 文档
  → 解析 Markdown / Word 为纯文本
  → 拼装 P0-P5 检视提示词
  → agent.followup() 发给当前会话
  → 检视完成后轮询会话事件，解析 P0-P5 报告
  → 面板内：定位到代码行 / 把修复建议交给 Agent
```

页面内：渠道与文档用下拉列表选择；标题右侧的刷新按钮直接重新拉取索引；结果面板按级别列出问题，每条带定位与应用修复按钮。

## 设计原则

1. **零跨包依赖**：Host 与 Client 都不 `import` 任何 `@deepseek-ai/*` 包，避免桌面版迁移后 profile 内 pnpm junction 悬空导致整个插件加载失败。
2. **Host 做所有有权限/有依赖的事**：跨域拉取、Word 解析、设置持久化、Agent 唤醒都在 Host 完成；浏览器只做选择和展示。
3. **文档分级以文档为准**：P0-P5 是外层约束，实际输出使用规范文档自己定义的级别，不硬凑、不改名。
4. **插件本身只读**：插件只写自己的设置文件；检视不修改代码，应用修复也由 Agent 在正常回合里完成，插件不直接写工作区，也不写自定义会话事件。
5. **可诊断**：每个 Remote/HTTP 返回都带明确错误码与中文原因，页面原样展示，便于定位索引源或文档问题。

## 目录结构

```text
plugins/dsh-spec-inspect/
├── index.js            # Host：路由、索引、设置、文档解析、提示词
├── client.js           # Client：右上角入口 + 右侧边栏页面
├── cordis.patch.yml    # 插入 spec-inspect 行
├── package.json        # bundle + dsh.client 声明
├── locale/{zh,en}.json # 插件列表展示元数据
├── icon.svg
├── _selftest.mjs       # 离线自检
├── README.md           # 使用者快速上手
└── docs/               # 本目录
```
