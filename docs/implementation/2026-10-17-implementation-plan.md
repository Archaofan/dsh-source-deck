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

## 阶段 1.5：沙箱升级到 0.2.1 RC 与适配（2026-10-17 已完成，最终基线 rc.2）

背景：DSH 于 2026-10-17 05:22 UTC 发布 `dsh-v0.2.1-rc.1`；用户指示沙箱先升级并完成适配，生产 DSH 不受影响。随后 `dsh-v0.2.1-rc.2`（2026-10-17T08:16:33Z）发布，用户要求把沙箱内容升级到新版本，于是最终基线为 rc.2。产品 peer 基线是否切换仍由用户另行明确选择。

执行结果（证据见 [../SETUP-VERIFICATION.md](../SETUP-VERIFICATION.md) 夜段/夜-2 段与 [../research/2026-10-17-0.2.1-rc.2-interface-delta.md](../research/2026-10-17-0.2.1-rc.2-interface-delta.md)）：

- 基线：tag `dsh-v0.2.1-rc.2`，commit `687f282e8625c6b8d11ff58211a90524be2e4317`；rc.2 用真实 git（Hermes 自带 2.54.0）`fetch --depth 1` 取得，`git status` 干净、`git rev-parse HEAD` 与 tag ref 一致。rc.1（`1600d8a…`）为中间验证版本，已归档。
- 工具链：pnpm 11.28.5、Electron 44.7.0、primary runtime Node 24.21.0 / Python 3.12.14；官方构建 9 gate 全过（75.00s），325 个 client artifacts；构建记录 commit `687f282`、版本 `0.2.1-rc.2`。
- 兼容性：0.1.1（peer `0.2.0-rc.2`）在新 RC 下**安装保留但启动被拒**（诊断 `Plugin dsh-source-deck@0.1.1 is incompatible with dsh 0.2.1-rc.1`）。
- 适配验证：构建仅沙箱的 `0.1.3-adapt.1`（peer `0.2.1-rc.2`、cordis `4.0.5`、devDependencies 全部 `0.2.1-rc.2`）并装入沙箱；阶段 1 三项复验全部通过：guide 入口「资料筛选台」、tab chip「资料台」、placeholder body（`data-deck-state="placeholder"`）。截图 `sandbox/dsh-desktop/logs/shots/upgrade-0.2.1-rc.2/`。
- 适配结论：两步 tab 注册、`dsh.client`/bundle patch 装载、lazy-CJS 预设、工具/Remote/存储/会话事件接口仍成立；变化项为兼容门（`engines.dsh` 优先且替代 peer 检查）、`PLATFORM_MODULES` 新增 `zod`/`@tanstack/react-virtual`、cordis 4.0.5、pnpm/Electron 版本；阶段 2 可按原设计推进。
- 未改：产品 `package.json`（仍 0.1.1 / peer `0.2.0-rc.2`）、日用 DSH、上游产品源码。`0.1.3-adapt.1` 是沙箱测试产物，不是产品发布。

## 阶段 1.6：产品 peer 切换到 0.2.1-rc.2（2026-10-17 用户决定，已完成）

用户指示：“产品 peerDependencies 切换到最新基线。”

- `package.json`：版本 bump `0.1.1 → 0.1.2`；peer 精确 `@deepseek-ai/dsh@0.2.1-rc.2`、`@deepseek-ai/cordis@4.0.5`；devDependencies 的官方 Client 包全部 `0.2.1-rc.2`；`pnpm-lock.yaml` 同步。
- 构建与验证：`tsdown` + `tsc` 通过；`npm pack` 产出 `dsh-source-deck-0.1.2.tgz`；装入沙箱后 guide 入口、tab chip、placeholder body 复验通过（截图 `sandbox/dsh-desktop/logs/shots/peer-switch-0.1.2/`）。
- 已知后果：生产 Desktop 仍 `0.2.0-rc.2`，0.1.2 在生产升级前不会加载；未做宽范围兼容。
- 证据：SETUP-VERIFICATION.md 夜-3 段、VERSION-POLICY.md 夜-3 段。

## 阶段 2：无模型链路（V3a）— 已完成（2026-10-17，产品 0.1.11）

- Host：`source_deck` 五表（per-record）、`deck_submit_sources` 工具、自建 `sourceDeck` Remote（`request` 单方法分派 addSource/getActiveSet/getSet/decide/commitSelection/clearData）、log-only 会话记录（`plugin:dsh-source-deck/set-snapshot`、`candidate-decided`、`selection-submitted`，均 `ignorable:true`）。
- Client：资料台面板（添加表单、待处理/保留/排除分组、保留/排除/撤销、提交）、对话流候选卡片（折叠 set-snapshot、在资料台打开）、`conversation.input.right`「资料台」入口。
- 交付验证：手动添加→卡片→筛选→提交全链路；域文件可查（sets/candidates/selections/sources/session_active）；`session.prompt` queue 的 user/message 出现在会话投影；`deck_submit_sources` 出现在 request/header 工具目录；16 个单元测试全绿。证据见 [../SETUP-VERIFICATION.md](../SETUP-VERIFICATION.md) 夜-4 段；截图 `sandbox/dsh-desktop/logs/shots/stage2-panel/`、`stage2-card/`、`stage2-final/`。
- 实现取舍：树外包无法运行 workspace 版 Typert 生成器，Remote 采用单 `request(op, bodyJson)` 方法 + 手写贡献；Host 端 `@Remote` 装饰器不被本项目 tsdown 降级，改为显式写入协议同款 `version:1` 原型 marker。后续若要具名 wire 方法，可再引入生成器而不改 UI。

## 阶段 3：来源范围配置（V7）— 已完成（2026-10-17，产品 0.1.12）

- `scope-policy.ts`：github / web / llm-freeform 三类策略的校验、`computeFlags`（stars-below、stale、language/license/topic、fork、archived、domain-blocked/not-allowed）与中文摘要。
- 域：新增 `scope_policies` 表（键 `default`）；`sources.meta`（Agent 提供）；`candidates.policyFlags`；`getPolicy/setPolicy`；`clearData` 覆盖六表。
- UI：`settings.section`「资料台」编辑器（GitHub 参数、web 域名、LLM 指导语、清除数据）；资料台策略摘要条；卡片/面板标记徽章；保存只影响后续候选。
- 验收：29 个单元测试全绿；沙箱设置页把 minStars 改为 800，Agent 提交 `Bun`（无标记）与 `Old Go Repo`（`stars-below`+`stale`）；域记录与 UI 徽章一致。证据见 SETUP-VERIFICATION 夜-5 段。

## 阶段 4：模型链路（V3b）— 已完成（2026-10-17）

- 沙箱 DeepSeek API 已就绪。实测 Agent 调用 `deck_submit_sources`（会话日志 seq19 tool-call），产生 set-snapshot（含策略与 flags）。
- 筛选提交后：`user/message`（seq39）含保留 Bun 与排除理由、当前策略；下一轮助手（seq41）明确「The user has kept Bun」并基于该资料继续。
- 交付物：日志证据 + `logs/shots/stage3-4-model/` 截图。

## 阶段 5：边界行为（V4/V5/V6/V2）— 已完成（2026-10-17）

- V4 重启恢复：卡片与面板从域/日志恢复，决策与策略一致（`logs/shots/stage5-recovery/`）。
- V5 多会话隔离：两个会话各自看到自己的集合（1 条 vs 2 条），无串数据（`stage5-sessions/`）。
- V6 清除/卸载重装：设置页清除后六表 0 文件；卸载后入口/guide/body 均消失，重装恢复（`stage5-clear/`）。
- V2 peer 负向：peer `0.2.0-rc.2` 的 0.1.12-peer-old 被 CLI 明确拒绝并自动回滚，profile 保持 0.1.12。
- 工具：新增沙箱脚本 `Remove-Plugin.ps1`（不在项目 Git 内）。

所有阶段结果与未验证项见 [../SETUP-VERIFICATION.md](../SETUP-VERIFICATION.md) 夜-5 段。生产 Desktop 已由用户升级到 `0.2.1-rc.2`，与本产品 peer 匹配；安装到生产等待用户批准。

## 阶段 6：UI / 默认配置 / 可用性迭代 — 已完成（2026-10-17，产品 0.1.17）

- 调研：高星项目的右侧面板/详情面板实践，记录在 [../research/2026-10-17-right-panel-ux-research.md](../research/2026-10-17-right-panel-ux-research.md)。
- 默认：`llm-freeform` + 指导语；GitHub 高星、官方文档优先作为设置页一键预设；新增“恢复默认”。
- 面板：固定头部/进度条/策略、过滤标签 + 搜索、批量选择 + 批量保留/排除、折叠添加表单、固定提交页脚、`K/X/U//` 快捷键、加载骨架、空状态引导。
- 行：保留/排除/撤销、排除理由内联、6 秒撤销 toast；提交后“继续筛选”新建集合，提交后新增也自动新建集合。
- 卡片：行内保留/排除，事件回写后计数即时更新。
- 验证：30 个单元测试全绿；沙箱逐步操作记录见 [../SETUP-VERIFICATION.md](../SETUP-VERIFICATION.md) 夜-6 段；截图 `logs/shots/ui-iteration/`。

## 阶段间纪律

- 每阶段提交推送并核对 HEAD/origin；沙箱、缓存、凭据不进 Git。
- 阶段失败：记录 pending 与证据，不隐瞒；R1 失败触发设计 §10 回退评估。

## 阶段 7：v2 LLM 搜索轮次 + 聊天联动 — 已完成（2026-10-17，产品 0.2.4）

用户当天验收后的修订目标：去掉站点/正则前置配置，首屏只问需求；由当前会话的 LLM 搜索并提交；GitHub 可视化卡片；勾叉/跳过/可选原因 + 补充说明驱动下一轮；收藏夹；字体放大；资料台与当前聊天联动。

- 域：从六表扩到八表，新增 `rounds`（setId/sessionId/index/request/note/createdAt）与 `favorites`；候选与会话活跃记录增加 `roundId`。
- Host：`search-prompt.ts` 生成中文搜索指令（需求、补充说明、最近对话、保留正例、排除原因、条数上限；续搜 4 条）；`conversation-context.ts` 读 Session 最近 5 条对话并过滤运行时噪声；`startRound` 建轮次并返回 prompt；`deck_submit_sources` 自动归入当前轮；新增收藏 CRUD；Remote 暴露 startRound/listFavorites/addFavorite/removeFavorite。
- UI：首屏“你想找什么？”+ 示例 + 开始查找；轮次流卡片（头像/描述/stars/语言/链接、☆、✓、✕、跳过、原因保存）；底部补充说明 + 继续查找 + 提交；收藏夹搜索/加入/移除；字体放大、2 列网格、5 分钟轮询。
- 聊天联动：`/deck` 客户端命令；对话卡片显示最近轮次；Host 搜索 prompt 带最近对话；提交摘要回到对话。
- 验证：35 个单元测试全绿；真实模型两轮（Go 日志库 6 条、Rust 运行时 6–7 条）；原因/跳过/收藏/`/deck`/上下文/重启恢复均实测。证据见 [../SETUP-VERIFICATION.md](../SETUP-VERIFICATION.md) 夜-7 段；调研见 [../research/2026-10-17-chat-deck-linkage.md](../research/2026-10-17-chat-deck-linkage.md)。

