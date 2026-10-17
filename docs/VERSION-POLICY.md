# 版本维护策略

2026-10-17 用户明确要求：插件会在自己的生产 Desktop 中使用，不升级不稳定的 alpha。维护目标由用户实际使用的版本决定，不由官方“最新发布”决定。

## 当前唯一验收基线

| 项目 | 固定值 |
|---|---|
| 产品支持基线（用户选定） | `dsh-v0.2.1-rc.2`，commit `687f282e8625c6b8d11ff58211a90524be2e4317` |
| 产品 peer 声明 | `@deepseek-ai/dsh@0.2.1-rc.2`、`@deepseek-ai/cordis@4.0.5`（精确） |
| 用户生产 Desktop | `E:/DSH-Desktop/DeepSeek/DeepSeek Harness.exe`，文件版本仍 `0.2.0-rc.2`（**升级前不会加载 0.1.2**） |
| 共用沙箱 | 同一基线 `0.2.1-rc.2`（用户 2026-10-17 批准，仅开发环境） |
| RC 工具链 | `0.2.1-rc.2` 声明 `pnpm@11.28.5`（旧基线为 11.7.0） |

官方把 RC 也标为预发行版。这里“稳定基线”指用户已选定支持的 RC，不代表宣称其为官方最终正式版。

## 设计、打包和发布

- 当前只维护 `0.2.1-rc.2`。不实现 alpha 专属分支、不承担 alpha 兼容，也不宣称支持未验收的历史或未来版本。生产 Desktop 升级到该基线前，产品包在日用环境不可用，这是用户明确选择的后果；不要为兼容旧生产而放宽 peer。
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
