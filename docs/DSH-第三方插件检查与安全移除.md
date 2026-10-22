# DSH 第三方插件：失效检查与安全移除

> 适用：DeepSeek Harness Desktop 0.2.1-rc.2（Windows）。本文方法在本机实测通过。
> 目标：**先判定哪些插件真的坏了，再动手删**——避免把还能用的插件一起清掉。

## 0. 先分清 profile，再谈"坏"

DSH 的插件组合是按 profile 隔离的。本机有两个：

| profile | 谁在用 | 路径 |
|---|---|---|
| `desktop` | 桌面端 GUI（Electron 应用） | `~/.dsh/profiles/desktop` |
| `web` | `dsh web` 命令启动的 Web 服务 | `~/.dsh/profiles/web` |

判断当前 GUI 属于哪个 profile 的简单办法：看 `profiles/<name>/cordis.patch.yml` 里的模型/provider
配置是否与界面一致；`desktop` 的条目通常含 `agent-default-model`、`dsh-quota-board` 这类桌面端插件。

**关键前提**：`desktop` profile 被 Electron 应用独占，CLI 会直接拒绝：

```
error: profile "desktop" is managed exclusively by the Electron application
```

所以下文检查路径 A 用官方 API（不受此限制），B 只能用于 `web` 这类非独占 profile。

## 1. 检查路径（从轻到重，A 最推荐）

### A. 用官方 `loadProfileDirectory` 审计（只读，最准）

直接调用 DSH 自己的 profile 加载器，拿到"哪些 bundle 被跳过、为什么"。
它不启动服务，也不受 Electron 独占限制。

脚本 `audit_profile.mjs`（用桌面端自带的 Node 24 执行）：

```js
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const boot = await import(
  'file:///D:/DSH/resources/app.asar/dsh/node_modules/@deepseek-ai/dsh-app-boot/lib/index.js'
)
const home = join(process.env.USERPROFILE, '.dsh')
const profileDir = join(home, 'profiles', 'desktop')      // 或 'web'
const installAnchor = 'D:\\DSH\\resources\\app.asar\\dsh\\package.json'

const result = boot.loadProfileDirectory('dsh', profileDir, installAnchor)
const out = [`layers: ${result.layers.length}`]
for (const layer of result.layers) out.push('  OK   ' + (layer.packageName ?? '?'))
out.push('skipped: ' + result.skippedBundles.length)
for (const s of result.skippedBundles) {
  out.push('  SKIP ' + s.packageName + ' :: ' + String(s.reason).slice(0, 240))
}
writeFileSync(join(process.env.TEMP, 'profile-audit.log'), out.join('\n') + '\n')
```

执行（Electron 作 Node 用；注意 stdout 会被吞，所以结果写文件）：

```powershell
$env:ELECTRON_RUN_AS_NODE = "1"
& "D:\DSH\DeepSeek Harness.exe" audit_profile.mjs
Get-Content "$env:TEMP\profile-audit.log" -Raw
```

判读：

- `skipped: 0` → 该 profile 的组合全部可加载，**不要动它**。
- `SKIP <包名> :: incompatible with dsh <版本>` → 版本不兼容，DSH 自己不会加载它。

> 注意：`desktop` 走的是 `loadProfileDirectory`（应用独占路径），被跳过的 bundle **不打印任何日志**（源码注释：`nothing is printed`）。所以"看不到报错"不等于"没问题"，必须用本审计。

### B. CLI 真实启动，抓 stderr（能看到插件模块 import 失败）

版本不兼容会被审计发现，但"代码用了已移除的 API"只有真正 import 时才炸。
对非独占 profile，用 CLI 启动并重定向 stderr：

```powershell
$err = "$env:TEMP\dsh-err.txt"; $out = "$env:TEMP\dsh-out.txt"
$p = Start-Process -FilePath "cmd.exe" `
  -ArgumentList "/c","`"D:\DSH\resources\runtime\cli\bin\dsh.cmd`" --profile web --port 34999 --no-open" `
  -RedirectStandardError $err -RedirectStandardOutput $out -PassThru -WindowStyle Hidden
Start-Sleep -Seconds 14
if (-not $p.HasExited) { Stop-Process -Id $p.Id -Force }
Get-Content $err -Raw
```

典型输出：

```
dsh: skipping profile bundle "dshmarket": ... is incompatible with dsh 0.2.1-rc.2 ...
dsh: warning: 1 entry did not activate
vision (dsh-vision-any): failed to import: ...lib/settings.js:11
SyntaxError: The requested module '@deepseek-ai/dsh-settings'
            does not provide an export named 'settingsNamespace'
```

第二类（`failed to import`）就是"bundle 能加载、插件代码跑不起来"，第 A 步看不出来。

### C. 静态检查（不启动，适合排查"为什么坏了"）

三件事，各自独立：

**C1. 版本要求是否满足运行时**

```powershell
$pkgs = 'dsh-quota-board','dsh-chat-manage','dsh-vision-any'
foreach ($n in $pkgs) {
  $pj = "$env:USERPROFILE\.dsh\profiles\node_modules\$n\package.json"
  if (-not (Test-Path $pj)) { continue }
  $j = Get-Content $pj -Raw | ConvertFrom-Json
  $peers = @()
  if ($j.peerDependencies) {
    foreach ($p in $j.peerDependencies.PSObject.Properties) {
      if ($p.Name -match '^@deepseek-ai/dsh') { $peers += ($p.Name -replace '@deepseek-ai/','') + '@' + $p.Value }
    }
  }
  "{0,-24} v{1,-10} engines.dsh={2,-8} peers={3}" -f $j.name, $j.version,
    ($(if ($j.engines.dsh) { $j.engines.dsh } else { '-' })), ($peers -join ', ')
}
```

判定规则（与 DSH 内部 `evaluatePluginCompatibility` 一致）：有 `engines.dsh` 就只看它；
否则逐个比对 `peerDependencies` 里 `@deepseek-ai/dsh*` 的 range 与运行时版本（本机 `0.2.1-rc.2`）。
`^0.1.0-rc.7` 这类要求在 0.2.x 下**不满足**。

**C2. 代码是否 import 了已被移除的导出**

0.2.x 的 `@deepseek-ai/dsh-settings` 当前只导出：

```js
export { SettingsConflictError, SettingsForms, SettingsForms as default, redactSecrets }
```

`settingsNamespace` 与 `installSettingsSection` **已不存在**。凡是代码里出现：

```powershell
Select-String -Path "$env:USERPROFILE\.dsh\profiles\node_modules\*\*.js" `
  -Pattern "settingsNamespace|installSettingsSection"
```

即判定为失效。

**C3. junction 悬空（影响"以后新装的插件"）**

`profiles/node_modules/@deepseek-ai/*` 是 pnpm 建的 junction，指向**安装时**的运行时路径。
桌面端升级或迁移目录后它们会指向不存在的路径：

```powershell
$p = "$env:USERPROFILE\.dsh\profiles\node_modules\@deepseek-ai"
$broken = Get-ChildItem $p -Force | Where-Object {
  $_.LinkType -eq 'Junction' -and -not (Test-Path $_.Target)
}
"junctions: $((Get-ChildItem $p -Force).Count)  broken: $($broken.Count)"
```

本机实测：**249 个全部悬空**，指向 `D:\deepSeek\DSH Desktop\runtime\dsh\node_modules\...`（旧安装路径）。
运行中的 DSH 有内部解析拦截器，自身不受影响；但新插件直接 `import '@deepseek-ai/*'` 会失败。

## 2. 判定表

| 现象 | 判据 | 是否失效 |
|---|---|---|
| 审计里 `SKIP` + `incompatible with dsh` | peer/engines 不满足 | **失效** |
| CLI stderr 里 `failed to import` + `does not provide an export` | 代码用了已移除 API | **失效** |
| 审计 `OK`，且无 import 报错，只 insert 自己的行 | 正常 | **可用，别删** |
| 在 `dependencies` 但**不在** `dsh.profile.bundles` | 不加载（无害） | 未启用，可留可删 |
| 只在 `bundles`、不在 `dependencies` | 插件页不显示（`installed=false` 被过滤） | 配置不完整，需补依赖记录 |

## 3. 安全移除流程

### 第 0 步：确认它只在要清理的 profile 里

```powershell
foreach ($n in 'desktop','web') {
  $pj = "$env:USERPROFILE\.dsh\profiles\$n\package.json"
  "--- $n ---"
  (Get-Content $pj -Raw | ConvertFrom-Json).dsh.profile.bundles
}
```

两个 profile 都引用同一个共享包时，删目录会影响另一个（本机 `dsh-vision-any`、`dshmarket`
在共享层 `profiles/node_modules`，只有 `web` 引用 → 可删）。

### 第 1 步：备份

```powershell
$d = "$env:USERPROFILE\.dsh\profiles\web"
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
Copy-Item "$d\package.json" "$d\package.json.bak-$stamp"
```

### 第 2 步：三处同时清（缺一处就会留下"半装"状态）

1. `package.json` 的 `dependencies`
2. `package.json` 的 `dsh.profile.bundles`
3. 包目录（`profiles/node_modules/<pkg>` 或 `profiles/<profile>/node_modules/<pkg>`）

```json
{
  "dependencies": {},
  "dsh": { "profile": { "bundles": ["@deepseek-ai/dsh-base", "@deepseek-ai/dsh-web-app"] } },
  "name": "dsh-profile-web",
  "private": true
}
```

### 第 3 步：删目录前先验证路径与身份

```powershell
$dirs = @(
  "$env:USERPROFILE\.dsh\profiles\node_modules\dsh-vision-any",
  "$env:USERPROFILE\.dsh\profiles\node_modules\dshmarket"
)
foreach ($d in $dirs) {
  $resolved = [System.IO.Path]::GetFullPath($d)
  if ($resolved -notlike "*\.dsh\profiles\*") { "REFUSE: $resolved"; continue }
  $j = Get-Content "$resolved\package.json" -Raw | ConvertFrom-Json
  "READY {0} -> {1} v{2}" -f $resolved, $j.name, $j.version   # 确认删的是对的包
}
```

确认无误后再 `Remove-Item -Recurse -Force`。

### 第 4 步：清理空 scope 目录

删完 `@max-null/dsh-chinese-thinking` 后，`@max-null` 会变成空目录，一并删掉：

```powershell
$mn = "$env:USERPROFILE\.dsh\profiles\web\node_modules\@max-null"
if ((Get-ChildItem $mn -Force | Measure-Object).Count -eq 0) { Remove-Item $mn -Force }
```

### 第 5 步：复查

重跑第 1.A 步审计，期望：

```
layers: 2
  OK   @deepseek-ai/dsh-base
  OK   @deepseek-ai/dsh-web-app
skipped: 0
```

`pnpm-lock.yaml` 会与 `package.json` 不同步。DSH 启动不读它，无需处理；
若以后跑 `dsh plugin install` 会自动重建。想彻底干净可删掉该 lock 文件。

### 第 6 步：重启

profile 组合在启动时加载。重启前别用联网搜索等会写会话日志的功能。

## 4. **不要删**的清单

| 对象 | 原因 |
|---|---|
| `@deepseek-ai/*` | DSH 自身，由安装目录提供 |
| `dsh-desktop-bridge` / `dsh-desktop-session-manager` / `dsh-desktop-web-search` 等桌面端包 | 桌面端功能件，可能由应用直接加载，删了可能导致界面功能缺失 |
| 审计里 `OK`、且 stderr 无 import 报错的第三方插件 | 它在正常工作，只是你可能不熟 |
| 不在 `bundles` 里的插件 | 不加载、无害，删它没有收益 |

判断原则：**只删"审计 SKIP"或"stderr failed to import"这两类**。其余先留着。

## 5. 本机案例（2026-10-22）

### 移除的 4 个（都在 `web` profile）

| 插件 | 版本 | 失效原因 |
|---|---|---|
| `dsh-vision-any` | 0.1.0 | `import { settingsNamespace }`，0.2.x 已移除 |
| `dshmarket` | 1.15.0 | peer 要求 `dsh-settings@^0.1.0-rc.7` 不满足 + 同上 API |
| `@max-null/dsh-chinese-thinking` | 0.3.0 | peer 要求 `dsh-system-prompt@^0.1.1-rc.1` 不满足 + 同上 API |
| `dsh-better-sidebar` | 0.15.2 | 14 个 peer 要求 `^0.1.0-rc.8`，全部不满足 |

### 保留的 3 个（在 `desktop` profile）

`dsh-chat-manage`、`dsh-quota-board`、`dsh-think-chinese`
——审计结果 9 层全部加载、`skipped: 0`，只有 `insert` 自己的行，无 `@deepseek-ai` import。**可用**。

> 教训：一开始我误以为"desktop 里的第三方插件也被跳过"（因为 `web` profile 有两个被 skip），
> 实际审计后 desktop 是干净的。**不审计就动手会误删。**

## 6. 回滚

```powershell
$d = "$env:USERPROFILE\.dsh\profiles\web"
Move-Item "$d\package.json.bak-20261022-114318" "$d\package.json" -Force
```

包目录已被删除时，需要重新安装（`dsh plugin add` 或插件页「添加插件」），并装
与当前运行时兼容的版本。`desktop` profile 的每次改动前，本机都保留了
`~/.dsh/profiles/desktop/package.json.bak-*` 与 `cordis.patch.yml.bak-*`。
