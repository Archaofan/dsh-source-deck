# 前置准备验证记录

日期：2026-10-17。当前有效基线是用户生产同版 **0.2.0-rc.2**，不再使用 alpha。交付仍限于项目、共用沙箱、操作约定与接手资料，未开始 SourceDeck 产品设计或实现。版本维护规则见 [VERSION-POLICY.md](VERSION-POLICY.md)。

## 当前 RC 的实测结果

| 项目 | 证据与结果 |
|---|---|
| 项目与远端 | dsh-source-deck 独立 Git，main 分支，私有远端 Archaofan/dsh-source-deck；修改检查后提交推送并核对 SHA，最新同步见沙箱 status.json |
| 官方基线 | tag dsh-v0.2.0-rc.2，commit 639ed015397290b3745d163aafe02ffee4aa3f84，与生产程序文件版本一致；官方源码未打包开发版 |
| 冻结安装 | RC 官方 pnpm 11.7.0；冻结 lockfile 安装通过，24.6 秒；官方脚本策略检查通过 |
| RC 官方完整构建 | pnpm run build 退出码 0；完成 native、Host compiler/bundle、Desktop bundle、Client compiler/bundle、Web；记录 347 个 Client artifacts。RC 不存在 alpha 的 build:artifacts / build:check，未套用它们的历史结果 |
| Desktop runtime | Electron 44.0.0 安装成功；primary-runtime manifest 的 desktopVersion 为 0.2.0-rc.2，Node 24.21.0 / Python 3.12.14 / pnpm 11.7.0；依赖检查和 Office 文档往返 smoke 通过 |
| 真实 Desktop / Host 启动 | Electron 主进程和 Host 成功运行；认证令牌交换 HTTP 303，携带内存中的会话 Cookie 后前端 HTTP 200，HTML 35,577 bytes |
| 同时运行隔离 | RC 默认 Host 端口 19387 与生产冲突；通过官方 webserver 配置 host=127.0.0.1、port=0 解决，实测沙箱监听 9580，生产 19387 仍由原进程 20816 监听。9580 是本次分配值，不应硬编码 |
| 默认工作区与状态 | 使用全新 RC home/userData；默认工作区实际位于 test-workspaces/dsh-source-deck/deepseek-harness/default-workspace；对应 session.v4.jsonl.zstd 只有头记录，0 个任务事件 |
| 版本与隔离防护 | Test-Sandbox.ps1 通过：接受当前生产 RC，拒绝 alpha / 生产版本不匹配，隔离路径、真实子进程环境、调用者环境还原、排他占用锁 |
| Desktop 插件管理 | 官方 runDesktopCli 的开发路径适配入口在 RC desktop profile 执行 list，退出码 0；尚无 SourceDeck 插件 |
| 生产观察 | 实际生产账号对照回退前保留的主机快照：三个配置文件、HKCU dsh 协议命令及用户 PATH 未变；生产版本仍为 0.2.0-rc.2，原日用进程仍运行。范围不等于全系统审计 |
| 收尾 | 确认测试会话无任务事件后，仅停止路径/userData 完全匹配的沙箱主进程 37912；Host 随断开清理，共享占用锁释放 |

当前日志位于沙箱 logs/：install.log、build.log、electron-install.log、primary-runtime.log、desktop.log、frontend-check.json、plugin-list.log、production-host-after.json、production-paths-after.json。日志可能含瞬时本地访问令牌，不纳入 Git、不上传。结构化当前状态见沙箱 status.json。

## 2026-10-17 下午：沙箱 LLM API 复用与启动链路修复（方案设计阶段）

背景：用户明确指示"沙箱内 desktop 的 API，直接用本 DSH 已配置的 DeepSeek API"（2026-10-17 原话）。这是对"不从日用 DSH 导入密钥"惯例的**用户授权例外**，仅限 DeepSeek 相关条目，最小化复制。

| 项目 | 证据与结果 |
|---|---|
| 沙箱凭据配置 | 从日用 `E:\DSH-Desktop\.dsh\.credentials.yaml` 仅提取 3 条 DeepSeek 相关条目（`refs.DEEPSEEK_API_KEY`、`records.deepseek-account-platform/default`、`records.deepseek-account-platform/device`），合并写入沙箱 `sandbox/dsh-desktop/home/.credentials.yaml`（写入前备份为 `.bak-<时间戳>`，权限 0600）。沙箱原有记录 `client-connection/browser-session` 保留。全程未输出任何凭据值；脚本见沙箱 tmp/gitpush/credential-sync.mjs（仅报键名与长度） |
| DeepSeek API 实际调用 | 用沙箱 key 打 `https://api.deepseek.com/v1/chat/completions`（deepseek-chat，max_tokens=1）：**HTTP 200**，返回 response id `e5899001-5cda-4383-9e59-ddf3740d6e5a`，model `deepseek-flash`，usage total 6 tokens。证明 key 有效、沙箱可完成真实模型调用 |
| 沙箱 Desktop 启动 | `Start-Desktop.ps1 -Project dsh-source-deck` 成功启动 Electron（pid 31740 主进程 + 31656 Host）；inspect 端口 19329/19322/19330 就位；日用 19387 仍由原进程 20816 监听，未受影响。GUI 地址由启动日志给出（本次 `dsh web: http://127.0.0.1:10138/?token=...`，端口动态分配、带本地访问令牌，401 属未带 token，非故障） |
| 凭据在 Desktop 内生效 | 启动日志中 `[deepseek-account]` 系列请求全部 200（`/auth-api/v0/users/current`、`/api/v0/users/get_user_summary`、`get_unnotified_bonuses`），证明沙箱 Desktop 已加载 DeepSeek 账号授权并成功调用 platform.deepseek.com |
| 启动链路修复 1 | `Assert-SandboxBaseline` 原来强制调用 `git`，本机无 git → 启动失败。改为 `Get-UpstreamCommit`：git 可用时用 git，否则回退解析 `.git/HEAD` 与 `packed-refs`。实测 upstream HEAD `639ed015397290b3745d163aafe02ffee4aa3f84` = baseline.commit，断言 PASS |
| 启动链路修复 2 | `start:desktop` 脚本嵌套调用 `pnpm`，沙箱 PATH 无 pnpm → 失败。按 pnpm 官方惯例在 `tools/pnpm-home/pnpm.cmd` 建 shim（转发到固定 pnpm 11.7.0），并在 `Push-SandboxEnvironment` 将 PNPM_HOME 加入进程 PATH。实测 `pnpm --version` → `11.7.0` |
| 编辑事故记录 | 用 edit 工具写 Common.ps1 时，一行中文注释曾造成 PowerShell 解析器行合并（报 `Unexpected token '}'`）；改为 ASCII 注释后正常。后续沙箱脚本注释一律用 ASCII |
| 验证后收尾 | 验证完成后按记录的沙箱 PID（31740/31656/41932/12508/10252，均校验命令行含 sandbox 路径）精确停止，日用 19387 进程 20816 未受影响；主进程退出码 -1 为被强杀的预期结果，启动阶段日志显示 Desktop 已稳定运行并通过 deepseek-account 链路 |

凭据事故（已按用户决定处置）：同日调试"脱敏"正则时一次失误把日用 `.credentials.yaml` 的多条真实密钥明文打印进对话记录（含 `DEEPSEEK_API_KEY`、`STEPFUN_API_KEY` 与 CODEARTS/TRAE/QODERCN/LOOMY 账号授权、`deepseek-account-platform`）。**用户 2026-10-17 明确决定不轮换，由我负责记录与后续纪律**；完整记录见 [security/2026-10-17-credential-exposure.md](security/2026-10-17-credential-exposure.md)（仅键名，无值）。暴露面仅限本机会话记录，未进任何仓库或沙箱文件。沙箱侧后续只做键级操作，不再输出任何值。

## 2026-10-17 傍晚：阶段 1 插件冒烟的安装链路（实现阶段 R1/V1）

背景：实现阶段开始（方案 A 已批准）。首次通过 `Install-Plugin.ps1` 把第三方插件包装进沙箱 desktop profile，暴露三处沙箱资产问题并修复；均在沙箱内、不进 Git、不碰日用安装。

| 项目 | 证据与结果 |
|---|---|
| 官方 CLI 的 pnpm 依赖 | desktop CLI 的 packageManager 硬编码 `<runtime>/pnpm/bin/pnpm.mjs`，沙箱未打包开发构建的 `upstream/apps/desktop/.desktop-build/targets/win-x64/runtime` 只有 bin/office-skills/primary-runtime。复制沙箱 `tools/pnpm-11.7.0/package` 到该 `runtime/pnpm` 后 `node .../pnpm.cjs --version` → `11.7.0`，`dsh plugin --profile desktop add/list` 恢复工作 |
| StrictMode 下 $LASTEXITCODE | `Invoke-SandboxPnpm`/`Invoke-SandboxDesktopCli`/`Get-UpstreamCommit` 在子进程未设置退出码时读 `$LASTEXITCODE` 抛错；调用前置 `$LASTEXITCODE = 0` 后正常 |
| 调用方 ErrorActionPreference=Stop | native command 的 stderr 行会变成终止错误导致启动脚本假失败；两个 Invoke 函数内置 `Continue` 并 finally 恢复原值。修复后 `Start-Desktop.ps1` 可重复成功启动 |
| 版本 bump 纪律 | pnpm 对相同 name@version 的 `file:` tgz 不替换已安装内容（第一次 0.1.0 重装无效）；必须 bump 版本再 pack/install。实测 0.1.1 后 profile 与 node_modules 一致 |
| 插件安装结果 | profile `dependencies` 增加 `dsh-source-deck: file:...tgz`，`dsh.profile.bundles` 增加 `dsh-source-deck`；官方 CLI add 输出 `Packages: +1` 与 list 表格 |
| 无密钥冒烟 | 阶段 1 验收不依赖 LLM 凭据；Desktop 启动后 guide 页出现插件入口、tab 打开、placeholder body 渲染（详见实现计划阶段 1 实测记录） |

## 2026-10-17 傍晚-2：新 RC 0.2.1-rc.1 发布与沙箱先行升级计划（实现阶段入口变更）

| 项目 | 证据与结果 |
|---|---|
| 新 RC 发布事实 | `npm view @deepseek-ai/dsh dist-tags`：`latest` = `0.2.0-rc.2`（生产在用）、`next` = `0.2.1-rc.1`、`alpha` = `0.2.1-alpha.5`；GitHub release `dsh-v0.2.1-rc.1`（prerelease）`published_at` = `2026-10-17T05:22:10Z`，为 0.2.1 系列首个 RC |
| 用户指示 | 沙箱先更新到新 RC，完成适配后再继续开发；生产用的 DSH（0.2.0-rc.2）不受影响。产品支持基线切换（peer 声明）留待用户另行明确选择 |
| 与插件开发相关的变更要点（release notes 摘录） | 自定义插件索引源；插件启用/停用/卸载及更新后依赖同步、启用热重载；实验性 Session 状态记录接口（插件写读自己的会话记录）；实验性 Claude Code Mods 兼容层；实验性开发者工具组合包；pi-ai 路由按模型能力处理系统提示词更新与工具动态增删；识别已发送消息中的密钥/令牌并默认脱敏按需查看 |
| 升级执行口径 | 沙箱 upstream 更新到 `dsh-v0.2.1-rc.1` 并更新 baseline.json（不绕过 Assert-SandboxBaseline、不静默升级共享基线）→ 官方构建 → 0.1.1 插件重装复验阶段 1 验收项 → 证据落 `sandbox/dsh-desktop/logs/shots/upgrade-0.2.1-rc.1/` 与本文档；步骤与决策点见 HANDOFF.md |
| 尚未验证 | 0.2.1-rc.1 沙箱升级本身及其对两步 tab 注册、dsh.client 装载链路、PLATFORM_MODULES 基线、clientBundle lazy-CJS 预设的影响；沙箱升级属开发环境，不改变产品 peer 声明与日用安装 |

## 尚未验证

- **不带任何 LLM 凭据的 Desktop 启动**：仍未单独验证（当前启动均带沙箱 DeepSeek 凭据）；阶段 1 的"无密钥"标准按"验收不调用模型"达成，纯无密钥启动列为阶段 5 附加验证。
- 截图、完整图形交互流程及通过菜单正常退出。
- OS 安全隔离和全系统改动审计；本沙箱仅作开发目录与进程配置隔离。

## 接手

先读父目录 README.md / AGENTS.md、项目简报、VERSION-POLICY.md 与 HANDOFF.md。检查 Get-SandboxStatus.ps1、Start-Desktop.ps1 -CheckOnly 和 Git 同步状态；已通过的 RC 构建不必重复。方案必须以固定 RC 的真实公共接口为依据，资料和设计写入项目子目录，设计交用户审阅后再实现。
