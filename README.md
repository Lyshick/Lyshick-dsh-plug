# Lyshick-dsh-plug · DeepSeek Harness 插件合集

本仓库托管 [DeepSeek Harness (DSH)](https://www.deepseek.com/) 的 4 个插件，每个插件位于 `plugins/` 下的独立子目录，可直接通过 `github:` 安装链接从本仓库安装。

## 插件列表

| 插件 | 版本 | 功能 |
|---|---|---|
| [dsh-web-search-ark](plugins/dsh-web-search-ark/) | 1.1.0 | 将 DSH 内置的 `web_search` 能力通过火山方舟（Volcengine Ark）Responses API 的联网内容插件执行，并在侧边栏插件页提供配置卡片 |
| [dsh-think-chinese](plugins/dsh-think-chinese/) | 0.1.0 | 让模型始终用中文进行内部推理与思考（think in Chinese） |
| [dsh-quota-board](plugins/dsh-quota-board/) | 0.1.0 | 模型供应商额度看板：展示各供应商的余额、套餐窗口与本地 token 用量 |
| [dsh-chat-manage](plugins/dsh-chat-manage/) | 0.1.2 | 会话管理：从侧边栏菜单删除会话，浏览、恢复或删除已归档的会话 |

## 安装方法

在另一台电脑上，打开 DSH 侧边栏的 **插件** 页，在安装输入框中填入对应链接即可：

```text
github:Lyshick/Lyshick-dsh-plug#path:plugins/dsh-web-search-ark
github:Lyshick/Lyshick-dsh-plug#path:plugins/dsh-think-chinese
github:Lyshick/Lyshick-dsh-plug#path:plugins/dsh-quota-board
github:Lyshick/Lyshick-dsh-plug#path:plugins/dsh-chat-manage
```

链接格式说明：`github:<用户>/<仓库>#path:<仓库内插件目录>`。`#path:` 指向插件在本仓库中的子目录，安装时 pnpm 会只拉取该子目录对应的包。

也可以用 CLI 安装：

```sh
dsh plugin install "github:Lyshick/Lyshick-dsh-plug#path:plugins/dsh-chat-manage"
```

## 更新插件

修改某个插件后，更新它 `package.json` 里的 `version`，提交并推送；在目标电脑的插件管理页先卸载旧版，再用同一链接重新安装即可。

## 目录结构

```text
plugins/
├── dsh-web-search-ark/   # 火山方舟联网搜索
├── dsh-think-chinese/    # 中文内部推理
├── dsh-quota-board/      # 供应商额度看板
└── dsh-chat-manage/      # 会话管理
```

## 来源与致谢

- `dsh-chat-manage`、`dsh-quota-board` 原始发布仓库：[Anixuil/dsh-chat-manage](https://github.com/Anixuil/dsh-chat-manage)、[Anixuil/dsh-quota-board](https://github.com/Anixuil/dsh-quota-board)，原作者 Anixuil，遵循 MIT 协议。
- 各插件目录内保留其原始 README 与 LICENSE（MIT）。
