# SourceDeck 实现计划（2026-10-17）

依据已批准的 [design/2026-10-17-solution-design.md](design/2026-10-17-solution-design.md)（方案 A）。用户要求：**每个阶段都在沙箱 Desktop 内展示真实效果**。因此每阶段结束保留：启动日志摘录、CDP DOM 检查输出、沙箱窗口截图。

## 沙箱验证方式（每阶段通用）

- 安装：`powershell -NoProfile -ExecutionPolicy Bypass -File sandbox/dsh-desktop/scripts/Install-Plugin.ps1 -Project dsh-source-deck -PackagePath <tgz>`
- 启动：`powershell -NoProfile -ExecutionPolicy Bypass -File sandbox/dsh-desktop/scripts/Start-Desktop.ps1 -Project dsh-source-deck`（日志 logs/desktop.log，含 dsh web URL）
- DOM 检查：remote-debugging-port 19322（CDP，Runtime.evaluate 查 `document.title`/tab 文案/DOM 节点）
- 截图：对沙箱 Electron 窗口截屏存 `sandbox/dsh-desktop/logs/shots/<阶段>/`（不进 Git）
- 停进程：只停本次记录的沙箱 PID（先校验命令行含 sandbox 路径）

## 阶段 1：R1 冒烟（V0/V1）— 已完成（2026-10-17）

目标：第三方 `dsh.client` 半包能进沙箱 desktop boot graph，右栏出现「资料台」tab。

- 插件包骨架：`package.json`（peer 精确 `0.2.0-rc.2` + `@deepseek-ai/cordis@4.0.4`、`dsh.bundle.patch` → cordis.patch.yml、`dsh.client` manifest + `exports["./client"]`）、tsconfig（tsc 只发 lib/types）、tsdown 配置（本地复刻 clientBundle 预设：lazy-CJS factory + lightningcss CSS Modules + 纯度门）、`src/index.ts`（Host 最小 apply）、`src/client/index.ts`（sidebarRightTabs.register + `sidebar.right.pane.tab` 两步注册 + guide 条目 + 空面板）。
- 交付物：`.tgz`、安装退出码、list 输出、右栏 tab 的 CDP 证据 + 截图。
- 通过标准：无任何 LLM 凭据也能启动且 tab 可见（R1 失败则整体方案回备选）。

### 阶段 1 实测记录（2026-10-17）

构建与安装：

- `node node_modules/tsdown/dist/run.mjs`：lib/index.js（ESM）+ lib/client.js（CJS lazy-CJS factory）；`tsc -p tsconfig.json`：lib/types/**/*.d.ts，exit 0。
- lib/client.js 头部为 `window.__ModuleLoader__.load({ id: "dsh-source-deck", factory: (require) => {`，外部请求仅基线 `react/jsx-runtime`；CSS Modules 编译为 `<style data-plugin-css="dsh-source-deck/DeckBody.module.css">` 注入。
- `Install-Plugin.ps1` → profile `dependencies` 增加 `dsh-source-deck: file:...tgz`，`dsh.profile.bundles` 增加 `dsh-source-deck`（reconcile 生效；bundle patch 由启动时 composer 合并，不写用户层 cordis.patch.yml）。

沙箱启动与验证（CDP 19322，pid 37696）：

- 启动日志：`dsh web: http://127.0.0.1:9901/?token=...`；`[deepseek-account] response codes ... code: 0, bizCode: 0`（账号链路 200）；无 source-deck 错误行。
- guide 页（右栏展开）：`开始 | 资料筛选台 | 收集候选资料，逐条筛选后交回 Agent | 工作区文件 | ...`（插件 guide 条目渲染成功——定义缺 guide 条目时右栏无入口，这是本次修复点）。
- 点击入口后 body：`data-deck-state="placeholder"`，文本「资料台已就绪 | 候选资料会出现在这里。Agent 提交或手动添加后即可筛选。」
- tab chip：`["资料台"×6]`（chip/title/浮动面板头等 seat）。
- 截图：`sandbox/dsh-desktop/logs/shots/phase1/`（desktop-right-sidebar.png、deck-tab-open.png、deck-tab-chip.png；不进 Git）。
- Host 半无错误（profile 启动加载 `dsh-source-deck` 行，Loader 未报错）。

### 阶段 1 环境修复（沙箱资产，均不进 Git）

1. `scripts/Common.ps1`：`Get-UpstreamCommit`/`Invoke-SandboxPnpm`/`Invoke-SandboxDesktopCli` 的 `$LASTEXITCODE` 在 StrictMode 下未设置即读会抛错——调用前置 `$LASTEXITCODE = 0`。
2. `scripts/Common.ps1`：调用方 `ErrorActionPreference=Stop` 会把 native stderr 变成终止错误——两个 Invoke 函数内置 Continue 并在 finally 恢复。
3. 官方 desktop CLI 硬编码 `<runtime>/pnpm/bin/pnpm.mjs`，而沙箱未打包开发构建的 runtime 没有 pnpm——已把沙箱 `tools/pnpm-11.7.0/package` 复制到 `upstream/apps/desktop/.desktop-build/targets/win-x64/runtime/pnpm`（不改上游源码，不碰日用安装）。
4. **版本 bump 纪律**：pnpm 对相同 `name@version` 的 `file:` tgz 不替换内容；每次迭代必须 bump `package.json` version 再 pack 安装（0.1.0 → 0.1.1 即因此而来）。

### 阶段 1 遗留

- `.npmrc` 的 `auto-install-peers=false` 对 pnpm 11.7.0 不生效（config get 返回 undefined）；实际用 `pnpm install --config.auto-install-peers=false`（避免拉入 `@deepseek-ai/dsh` 全家桶的 libreoffice 大二进制）。
- `npm pack` 会警告 `.npmrc` 含 pnpm 专有键，无害。
- 一次性探测脚本（`Probe-*.ps1`、`tmp/*.mjs`）留在沙箱，不进 Git。

## 阶段 2：无模型链路（V3a）

- Host：`defineDomain('source_deck')` 五表、`deck_submit_sources` 工具、`sourceDeck` Remote 命名空间（addSource/listSets/getSet/decide/commitSelection/clearData）、log-only 事件（set-opened/candidate-decided/selection-submitted）。
- Client：资料台面板（待处理/保留/排除分组、添加资料表单、提交按钮、策略摘要条占位）、对话流候选卡片（勾选/排除）、`input.right` 入口按钮。
- 交付物：手动添加→卡片→筛选→提交全链路；域文件可查；队列/steer 消息出现在会话投影；截图。

## 阶段 3：来源范围配置（V7）

- `scope-policy.ts`：三种策略类型 schema + flags 计算；`getScopePolicy/setScopePolicy`；`scope_policies` 表；`sources.meta`；`candidates.policyFlags`。
- 设置页策略编辑器（GitHub 参数表单 / web 域名清单 / LLM 自主指导语）；资料台策略摘要条；卡片/面板策略标记（不阻断保留）。
- 交付物：改策略→新候选带标记的对比截图。

## 阶段 4：模型链路（V3b）

- 沙箱 DeepSeek API 已就绪（见 SETUP-VERIFICATION 下午记录）。验证 Agent 调用 `deck_submit_sources`→卡片→筛选→提交→下一轮引用保留资料。
- 交付物：会话投影截图 + 下一轮请求历史含摘要的证据（日志/CDP）。

## 阶段 5：边界行为（V4/V5/V6/V2）

- 重启恢复、多会话隔离、停用/卸载/清除数据、peer 负向兼容。
- 交付物：各项行为记录表。

## 阶段间纪律

- 每阶段提交推送并核对 HEAD/origin；沙箱、缓存、凭据不进 Git。
- 阶段失败：记录 pending 与证据，不隐瞒；R1 失败触发设计 §10 回退评估。
