# 前置准备验证记录

日期：2026-10-17，工作区 `E:/DSH-Desktop-Plugin-Dev`。本次交付是独立项目仓库、共用官方 Desktop 开发沙箱、操作约定和接手资料；尚未设计或实现 SourceDeck 产品。

## 已完成并验证

| 项目 | 证据与结果 |
|---|---|
| 项目与远端 | `dsh-source-deck/` 独立 Git，分支 main；私有远端 `Archaofan/dsh-source-deck`；首次准备资料提交后推送并核对两端 SHA，最新同步记录在沙箱 status.json |
| 官方基线 | `deepseek-ai/deepseek-harness`，tag `dsh-v0.2.1-alpha.5`，commit `1517a4dbca0a2789ff1d41ba439600f8547d23fa`；2026-10-17 核对官方发布列表时为最新发布；未打包源码开发版 |
| 冻结安装 | 官方 pnpm 11.28.5，本地工具目录，保留官方 lockfile；冻结安装和官方脚本策略检查通过 |
| 官方构建 | build:artifacts 7/7 通过：native、Host compiler/bundle、Desktop、Client compiler/bundle、Web；100.49 秒 |
| 构建后检查 | build:check 2/2 通过：Host 与 Client aggregate；50.84 秒 |
| Desktop runtime | Electron 44.7.0 已安装；官方 primary-runtime 准备完成，Node 24.21.0 / Python 3.12.14 / pnpm 11.28.5；依赖检查和 Office 文档往返 smoke 通过 |
| 实际启动 | 实际 Electron 主进程与 Host 启动；沙箱前端 HTTP 200，返回 HTML 37,757 bytes。此项不是仅检查可执行文件存在 |
| 默认工作区 | 官方 workspace-controller 的 documentsDirectory 指向沙箱项目材料目录；实际新会话位于 `test-workspaces/dsh-source-deck/deepseek-harness/default-workspace/` |
| 环境与互斥 | Test-Sandbox.ps1 通过：固定基线、隔离路径、真实子进程中 Electron Node 模式标志已移除、调用者环境还原、第二个占用者被文件锁拒绝 |
| Desktop 插件管理入口 | 开发路径适配器调用官方 runDesktopCli；在沙箱 desktop profile 执行 list 返回退出码 0，当前无 SourceDeck 插件 |
| 日用配置观察 | 前后比较三个既有配置文件、HKCU dsh 协议命令、用户 PATH：unchanged=true。此范围不等于全系统审计 |
| 收尾 | 确认测试会话无任务事件后，仅停止本沙箱的具体 Electron 主进程，Host 随断开清理；共享占用锁已释放 |

原始本机证据保存在沙箱 `logs/`：install.log、build.log、build-check.log、electron-install.log、primary-runtime.log、desktop.log、frontend-check.json、plugin-list.log、production-paths-after.json。日志可能包含瞬时本地访问令牌，因此不纳入 Git、不发送到远端。结构化结果见沙箱 status.json。

## 环境适配与边界

受限执行账号曾无法读取 Windows 用户信息、系统 keyring 和进程信息；相应构建、GitHub 和进程核对使用单条主机执行权限。GitHub CLI OAuth 已完成，凭据由系统 keyring 管理。没有把 Token 写进项目，也没有修改全局 Git 身份或全局 safe.directory。

Windows Schannel 凭据异常通过该条 Git 命令的 OpenSSL 后端处理，未关闭 TLS 验证。下载使用既有代理；Electron 缓存、包管理缓存与临时目录均有沙箱路径。脚本会实际移除 ELECTRON_RUN_AS_NODE，而不是设置空字符串；退出后还原父进程原值。

官方源码 CLI 对 Desktop 托管 profile 有管理边界，因此使用 `scripts/desktop-cli.mjs` 为官方管理函数提供开发 runtime/support 路径；不得改用指向默认 home 的全局 dsh。当前 list 已实测；真实插件 add/remove 必须在 SourceDeck 包实现后再验证。

首次启动定位到系统 Documents 的默认工作区后，已改为官方支持的 documentsDirectory 配置，并重新用实际会话路径验证。初始空沙箱 home/userData 仅在沙箱 archives 中保留可恢复副本，没有移动或删除系统 Documents。其他项目复用时仍须在 Desktop 中选择各自的测试工作区。

启动日志有上游开发模式的 `dsh-desktop:mandatory-status` IPC handler 缺失与 Electron CSP 提示；本次未修改上游产品代码。实际 Host 和前端可达，但尚未逐项验证这些提示的 UI 影响。

## 尚未验证

- 没有配置或调用模型 API；第一次使用需在沙箱独立登录或配置。
- 没有进行截图或完整图形交互验收，没有验证通过菜单正常退出；本次为确认空闲后的受控进程收尾。
- 没有插件包、产品 package.json、产品测试或既定架构；真实安装、Agent 接续、UI 行为均留待方案设计与实现后验收。
- 沙箱是开发目录隔离，不是限制任意插件系统权限的 OS 安全沙箱。

## 接手检查

先读父目录 README.md / AGENTS.md、项目简报与 HANDOFF.md。执行沙箱 Get-SandboxStatus.ps1 和 Start-Desktop.ps1 -CheckOnly，核对 Git 状态及 HEAD/远端 main；无新问题时不重复全量安装与构建。具体方案设计在新对话进行，设计文档放项目 docs/design/ 后交用户审阅。
