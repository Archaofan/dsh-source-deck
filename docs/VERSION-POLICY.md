# 版本维护策略

2026-10-17 用户明确要求：插件会在自己的生产 Desktop 中使用，不升级不稳定的 alpha。维护目标由用户实际使用的版本决定，不由官方“最新发布”决定。

## 当前唯一验收基线

| 项目 | 固定值 |
|---|---|
| 产品支持基线（用户选定） | `dsh-v0.2.2-rc.2`，commit `ddac96760b6edf8fa0fe17cbdcf0b512f4c12b2c` |
| 产品 peer 声明 | `@deepseek-ai/dsh@0.2.2-rc.2`、`@deepseek-ai/cordis@4.1.0`、`@deepseek-ai/dsh-tool-executor-native@0.2.2-rc.2`、`@deepseek-ai/dsh-tools@0.2.2-rc.2`（精确） |
| 用户生产 Desktop | `E:/DSH-Desktop/DeepSeek/DeepSeek Harness.exe`，**仍为 `0.2.2-rc.1`**，装 0.4.1；生产升级需用户另行明确指示 |
| 共用沙箱 | 已升级到 `0.2.2-rc.2`（2026-11-12，`sandboxRelation=ahead-of-production`，用户批准见 `upgradeApproval`） |
| RC 工具链 | `0.2.2-rc.2` 仍声明 `pnpm@11.28.5` |

官方把 RC 也标为预发行版。这里“稳定基线”指用户已选定支持的 RC，不代表宣称其为官方最终正式版。

## 设计、打包和发布

- 当前只维护 `0.2.2-rc.2`。不实现 alpha 专属分支、不承担 alpha 兼容，也不宣称支持未验收的历史或未来版本。生产 Desktop 仍为 `0.2.2-rc.1`，在用户批准生产升级窗口前，0.4.3 不会在生产加载；不要为兼容旧生产而放宽 peer，也不要擅自升级或安装生产。
- 设计中用到的工具、Remote、UI Slot、Agent 接续和持久化接口，必须在这个 RC 的源码与文档确认。最新网站、master 和 alpha 示例只能作参考，不能代替目标接口证据。
- RC 缺少能力时调整方案、缩小首版范围或明确暂不支持。不能为完成首版要求用户升级 alpha，也不能复制 alpha 的私有实现绕过公共扩展机制。
- 实现打包时按 RC 插件加载器实际采用的版本规则声明准确范围，并验证目标 RC 能加载、行为正常。不能只验证前端模拟或构建成功便宣称日用可用。
- 在共用 RC 沙箱完成安装、UI、对话协作、停用/卸载及恢复验收后，日用安装仍需用户另行指示。

## 何时调整基线

即使出现新 RC / 正式版，也不自动升级。用户明确选定新的生产目标后，才更新兼容范围、共用沙箱和接手文档，并重新验收。默认只维护新选定基线；多版本支持需要另行明确范围。

## 2026-10-17 傍晚：新 RC 0.2.1-rc.1 发布，沙箱先行升级（用户指示）

事实（实测）：

- npm dist-tags：`latest` = `0.2.0-rc.2`（生产在用），`next` = **`0.2.1-rc.1`**，`alpha` = `0.2.1-alpha.5`。
- GitHub release `dsh-v0.2.1-rc.1`（v0.2.1-rc.1，prerelease）发布于 **2026-10-17T05:22:10Z**，是 0.2.1 系列首个 RC，汇总自 `0.2.0-rc.2` 以来的变更（自定义插件索引源、插件启用/停用/卸载与依赖同步、启用热重载、实验性 Session 状态记录接口、实验性 Claude Code Mods 兼容层、实验性开发者工具/思考翻译/Git Worktrees 插件、pi-ai 路由系统提示词与工具动态增删、已发送消息密钥脱敏等）。

用户指示（2026-10-17 原话要义）：**沙箱先更新到新 RC，完成适配后再继续开发；生产用的 DSH 不受影响**。

执行口径：

- **沙箱升级到 0.2.1-rc.1** 作为开发环境先行（按沙箱升级流程：更新 upstream tag 与 baseline.json、官方构建、重装 0.1.1 插件复验阶段 1 验收项、留日志与截图）。
- **产品支持基线暂不切换**：`peerDependencies` 仍精确 `@deepseek-ai/dsh@0.2.0-rc.2`，不宣称对 0.2.1-rc.1 的兼容；是否切换由用户另行明确选择。
- 升级适配结论（哪些 RC 接口假设仍成立/变化）写入 SETUP-VERIFICATION.md 与 implementation 计划，作为阶段 2 前置输入。

切换前保留源码/运行时、验证记录与状态备份。不同版本会话及数据库不能假定可降级；本次 alpha → RC 使用全新沙箱状态，原 alpha 归档留在本机，不纳入 Git。现有日用 DSH 没有参与回退或覆盖安装。

## 2026-10-17 夜：沙箱升级完成，沙箱先行生产

执行结果：

- 共用沙箱最终升级到官方 `dsh-v0.2.1-rc.2`（commit `687f282e8625c6b8d11ff58211a90524be2e4317`，release `2026-10-17T08:16:33Z`）。过程为 rc.1（`1600d8a…`）先验证、再按用户“升级沙箱中的内容，确保适配新版本”的指示升级到 rc.2；两次都用真实 git 取得源码（rc.2 为 `git fetch --depth 1`，`git status` 干净），官方构建通过，阶段 1 三项验收复验通过；证据见 [SETUP-VERIFICATION.md](SETUP-VERIFICATION.md) 夜段与夜-2 段。
- `baseline.json` 记录 `sandboxRelation=ahead-of-production` 与用户批准（`upgradeApproval`）；`Assert-SandboxBaseline` 只在“沙箱与生产同版”或“有明确批准且版本逐项钉住”时通过，alpha 与未批准的新版仍拒绝。rc.1 的基线、日志、脚本与 profile 清单归档在 `archives/rc-0.2.1-rc.1-20261017T090812Z/`。
- **当时产品支持基线未变**（夜-3 已按用户决定切换）：`peerDependencies` 仍精确 `@deepseek-ai/dsh@0.2.0-rc.2`，不宣称对 0.2.1-rc.1 / rc.2 兼容；沙箱中的 `0.1.3-adapt.1` 仅为适配测试产物（peer 临时改 0.2.1-rc.2、cordis 4.0.5、devDependencies 同步 rc.2 类型包），不进入产品发布。
- 更正环境事实：本机**有** git（Hermes 自带 `git 2.54.0`，`C:\Users\Administrator\AppData\Local\hermes\git\cmd\git.exe`），只是此前未加入会话 PATH；rc.2 的源码获取与仓库复核已改用真实 git。

## 2026-10-17 夜-3：产品 peer 切换到最新基线（用户决定）

用户明确指示：“产品 peerDependencies 切换到最新基线。”

执行结果：

- 产品 `package.json`：版本 `0.1.1 → 0.1.2`；`peerDependencies` 改为 `@deepseek-ai/dsh@0.2.1-rc.2`、`@deepseek-ai/cordis@4.0.5`（精确）；devDependencies 的官方 Client 类型包全部改为 `0.2.1-rc.2`。
- `pnpm-lock.yaml` 随依赖更新；`tsdown` + `tsc` 构建通过（rc.2 类型下无类型错误）；`npm pack` 产出 `dsh-source-deck-0.1.2.tgz`。
- 沙箱安装 0.1.2（替换此前的 `0.1.3-adapt.1`），无兼容警告；启动后 guide 入口「资料筛选台」、tab chip「资料台」、placeholder body 复验通过。证据见 [SETUP-VERIFICATION.md](SETUP-VERIFICATION.md) 夜-3 段与 `logs/shots/peer-switch-0.1.2/`。
- **后果（已知并接受）**：生产 Desktop 仍是 `0.2.0-rc.2`，精确 peer 为 `0.2.1-rc.2` 的 0.1.2 在生产升级前**不会加载**。不做多版本兼容；如需同时支持两个版本，另行讨论 `engines.dsh` 范围（0.2.1 兼容门优先读取它并替代 peer 检查）。
- 沙箱中的适配测试包（`0.1.2-adapt.1`、`0.1.3-adapt.1`）保留在项目目录但被 Git 忽略，不再代表产品版本。

## 2026-11-05：生产与沙箱升级到 0.2.2-rc.1，产品完成适配（用户指示）

事实（实测）：

- 官方 `dsh-v0.2.2-rc.1` 于 `2026-11-04T13:07:14Z` 发布，commit `66491b05e3f05ad35bcdd4f6cd7ed26041d9e3db`；npm `next` 指向它，`latest` 仍为 `0.2.1-rc.5`。
- 用户明确要求生产 Desktop 与共用开发沙箱一起升级；两者现均为 `0.2.2-rc.1`，`Get-SandboxStatus.ps1` 为 `matchesProduction=true`。生产升级、签名与启动见工作区 `operations/production-upgrade-20261105/README.md`，沙箱见 `sandbox/dsh-desktop/UPGRADE-20261105.md`。
- 旧产品 0.4.0 的四个 DSH peer 精确 `0.2.1-rc.2`，在新基线被安装/启动兼容门拒绝。用户随后指示“资料台项目需要做适配”。

执行结果：

- 产品版本 `0.4.0 → 0.4.1`（开发分支 `feat/adapt-0.2.2-rc.1`）；peer 改为精确 `@deepseek-ai/dsh@0.2.2-rc.1`、`@deepseek-ai/cordis@4.1.0`、`@deepseek-ai/dsh-tool-executor-native@0.2.2-rc.1`、`@deepseek-ai/dsh-tools@0.2.2-rc.1`；devDependencies 同步。
- 0.2.2 删除 `tools.presentAs()`，工具呈现改为按 scope 挂载 executor 插件。研究 worker 改为在自身 scope 动态 import 并挂载官方 native executor；`restrict`/`guard` 与只读工具集不变。
- 94/94 测试、tsdown+tsc 构建通过；官方 `Install-Plugin.ps1` 安装退出 0；实际 Host 深色中文验证资料台入口/tab、手动添加、对话卡片、保留判定、引用 chip、设置 section、清空数据。按用户指示只复制生产 `DEEPSEEK_API_KEY` 到沙箱后完成真实模型验收：聊天回复 `OK`；后台研究约 30 秒返回 2 个真实 GitHub 来源并「已完成」；保留 Ghostwriter、插入引用并发送后，模型正确读取引用 JSON。单样本通过不等于普遍研究质量；PTC 父预设分支未单独切换复验。
- 交付包 `dsh-source-deck-0.4.1.tgz`：188322 bytes、53 文件，SHA256 `BEF8D2989FD99CBCE817822F0BC22407B4B2AE4AB559B40E1DCB3A5CA3D13B73`；安装后 index.js、client.js、package.json 与中英 README 均与包内逐字节一致。
- **`v0.4.1` 已于 2026-11-05T12:33:31Z 发布为预发行**，tag commit `820bf58244b4292d3c4eb26e13b63887ee27ec1f`，资产 188322 bytes / SHA256 `BEF8D2989FD99CBCE817822F0BC22407B4B2AE4AB559B40E1DCB3A5CA3D13B73`，Latest 仍为 v0.3.0；未安装到生产。已发布的 0.4.0 包仍只支持 `0.2.1-rc.2`。发布后不重建/替换资产或移动 tag；生产安装需用户另行明确指示。

## 2026-11-12：沙箱升级 0.2.2-rc.2，产品 0.4.2 适配（用户选择方案 B）

事实（实测）：

- 官方 `dsh-v0.2.2-rc.2` 于 `2026-11-11T11:33:06Z` 发布，commit `ddac96760b6edf8fa0fe17cbdcf0b512f4c12b2c`；npm `next` 指向它（`latest` 仍 `0.2.2-rc.1`），npm 发布时间 `2026-11-12T02:16:12Z`。
- 用户 2026-11-12 选择“B（跟最新）”：沙箱先升级、产品适配并发 0.4.2、README 与市场同步，验收后再议生产。生产 Desktop 未动，仍 `0.2.2-rc.1` + 0.4.1。

执行结果：

- 共用沙箱升级到 `0.2.2-rc.2`；旧 rc.1 归档 `archives/rc-0.2.2-rc.1-20261112T135229Z/`（源码 tar + 隔离数据；不含 node_modules，回滚用 checkout + frozen install）。官方构建 10 gates 通过（195.86s / 371 artifacts），Electron 与 primary-runtime 准备通过。
- 沙箱脚本 `desktop-cli.mjs` 跟进 rc.2 的 `runDesktopCli(supportDir)` 单参数签名；这是沙箱适配，不是上游改动。
- 产品 `0.4.1 → 0.4.3`（分支 `feat/adapt-0.2.2-rc.2`）：六个 peer 与官方 Client 类型包精确 `0.2.2-rc.2`；`zod 4.4.3 → 4.6.6`（typert-protocol 0.2.2-rc.2 的硬要求）。**唯一代码改动**：rc.2 把 `subagents.startActivation` 的 `request: { parent, prompt }` 拍平为顶层字段，`src/research-runtime.ts` 改为扁平传参并新增回归测试。同日先发的 0.4.2 未跟进该破坏，研究回合 8 ms 失败，已标注 superseded。
- 95/95 测试、tsdown+tsc、官方 `Install-Plugin.ps1`（退出 0，无兼容拒绝/豁免）与安装字节核对通过；实际 Host `0.2.2-rc.2-ddac967` 验了入口/tab、手动添加、保留+撤销、引用 chip、设置、保存策略与清除数据。经用户单独授权复用生产 `DEEPSEEK_API_KEY`（仅沙箱隔离凭据，验收后移除并恢复）跑通真实模型：聊天 OK、约 40 秒研究返回 2 个真实 GitHub 来源、保留 MDEZ++ 后引用发送且模型正确读取引用 JSON。
- 交付包 `dsh-source-deck-0.4.3.tgz`：189287 bytes / 53 文件，SHA256 `2B4D7FF20A8631A2C93B83D782E80D2CBAAF2A524286572227D2B2468FB536BC`；发布为预发行 `v0.4.3`，市场条目 PR #14728 待合并。
