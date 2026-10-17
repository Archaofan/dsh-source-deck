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

## alpha 归档与版本回退

原 alpha 源码、编译产物、home/userData、试验材料、操作脚本和验证记录完整保存在沙箱 archives/alpha-0.2.1-alpha.5-20261017T041240Z/，没有删除。只复用可校验的包管理/Electron 缓存及工具目录，RC 使用新拉取的固定 tag 与全新可变状态，没有将 alpha 会话或数据库降级加载到 RC。

初次 alpha 准备曾通过 7 个构建 gate 和 2 个检查 gate；这些只属于归档版本，不能证明 RC 兼容。Git 历史中的 alpha 环境快照也不再是当前执行基线。当前 docs/environment-baseline/ 已同步 RC 的说明与脚本，实际执行仍以根目录共用沙箱为准。

## 本次适配与观察限制

RC Desktop Host 在源码中默认传入端口 19387。首次启动因此与日用实例冲突；失败日志保存在 desktop-first-start-port-conflict.log。修复仅使用官方 profile 配置覆盖 webserver 的完整配置，未修改上游产品源码或停止日用实例；重新启动的实测结果才计入上表。

生产设置对照的一次跨账号调用曾出现 HKCU/PATH 假差异：受限执行账号与 Administrator 看到不同用户注册表。已按实际生产账号比较回退前保留的主机快照，结果 unchanged=true；脚本现记录 observerSid 并拒绝跨账号或身份未知的 Before/After 对照。今后两次观察必须使用同一生产 Windows 账号。

GitHub CLI OAuth 已完成，凭据由系统 keyring 管理。构建、Electron 和 GitHub 若被受限执行账号阻挡，使用相应单条主机执行权限；不改全局 Git 身份/safe.directory，不关闭 TLS 校验。缓存和临时目录都在沙箱，执行后还原父进程环境。

启动仍有上游开发模式的 dsh-desktop:mandatory-status IPC handler 缺失及 Electron CSP 提示；Host 和认证前端可达，但尚未逐项检查这些提示的图形交互影响。受控停止令启动脚本最终返回非零，不代表此前启动验证失败，也不等于通过菜单正常退出已验收。

## 尚未验证

- 模型登录和模型 API 调用；第一次使用需在沙箱独立配置。
- 截图、完整图形交互流程及通过菜单正常退出。
- 真实 SourceDeck 包的安装/移除、UI 和 Agent 接续；尚无产品 package.json、产品代码或批准架构。
- OS 安全隔离和全系统改动审计；本沙箱仅作开发目录与进程配置隔离。

## 接手

先读父目录 README.md / AGENTS.md、项目简报、VERSION-POLICY.md 与 HANDOFF.md。检查 Get-SandboxStatus.ps1、Start-Desktop.ps1 -CheckOnly 和 Git 同步状态；已通过的 RC 构建不必重复。方案必须以固定 RC 的真实公共接口为依据，资料和设计写入项目子目录，设计交用户审阅后再实现。
