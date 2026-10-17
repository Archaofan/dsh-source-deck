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
| 沙箱 Desktop 启动 | `Start-Desktop.ps1 -Project dsh-source-deck` 成功启动 Electron（pid 31740 主进程 + 31656 Host）；inspect 端口 19329/19322/19330 就位；日用 19387 仍由原进程 20816 监听，未受影响 |
| 启动链路修复 1 | `Assert-SandboxBaseline` 原来强制调用 `git`，本机无 git → 启动失败。改为 `Get-UpstreamCommit`：git 可用时用 git，否则回退解析 `.git/HEAD` 与 `packed-refs`。实测 upstream HEAD `639ed015397290b3745d163aafe02ffee4aa3f84` = baseline.commit，断言 PASS |
| 启动链路修复 2 | `start:desktop` 脚本嵌套调用 `pnpm`，沙箱 PATH 无 pnpm → 失败。按 pnpm 官方惯例在 `tools/pnpm-home/pnpm.cmd` 建 shim（转发到固定 pnpm 11.7.0），并在 `Push-SandboxEnvironment` 将 PNPM_HOME 加入进程 PATH。实测 `pnpm --version` → `11.7.0` |
| 编辑事故记录 | 用 edit 工具写 Common.ps1 时，一行中文注释曾造成 PowerShell 解析器行合并（报 `Unexpected token '}'`）；改为 ASCII 注释后正常。后续沙箱脚本注释一律用 ASCII |

凭据事故（必须向用户披露）：同日调试"脱敏"正则时一次失误把日用 `.credentials.yaml` 的多条真实密钥明文打印进对话记录（含 `DEEPSEEK_API_KEY` 与若干第三方账号 token）。已建议用户轮换相关凭据；沙箱侧后续只做键级操作，不再输出任何值。

## 尚未验证

- **无密钥启动**（不带任何 LLM 凭据的 Desktop 启动与右栏 tab 冒烟）：仍未验证，属实现阶段 V1；与上面的"已配 key 启动"分开记录。
- 截图、完整图形交互流程及通过菜单正常退出。
- 真实 SourceDeck 包的安装/移除、UI 和 Agent 接续；尚无产品 package.json、产品代码或批准架构。
- OS 安全隔离和全系统改动审计；本沙箱仅作开发目录与进程配置隔离。

## 接手

先读父目录 README.md / AGENTS.md、项目简报、VERSION-POLICY.md 与 HANDOFF.md。检查 Get-SandboxStatus.ps1、Start-Desktop.ps1 -CheckOnly 和 Git 同步状态；已通过的 RC 构建不必重复。方案必须以固定 RC 的真实公共接口为依据，资料和设计写入项目子目录，设计交用户审阅后再实现。
