# 共用官方 DSH Desktop 开发沙箱

本目录由整个工作区共用。基线见 [baseline.json](baseline.json)，实际验证状态见 [status.json](status.json)。它是官方源码构建的未打包 Desktop，不是同名社区桌面壳，也没有运行覆盖安装器。

当前基线为 **开发先行版 `0.2.1-rc.1`**（官方 RC，仍标记 prerelease）；用户于 2026-10-17 明确批准沙箱先行升级，**生产仍是 `0.2.0-rc.2`**。`baseline.json` 用 `sandboxRelation: ahead-of-production` 与 `upgradeApproval` 记录该例外，`Assert-SandboxBaseline` 只在“与生产同版”或“批准记录逐项匹配”时通过；alpha 与未批准的新版仍拒绝。原 alpha 的源码、产物、数据和验证记录在 archives 内可恢复保存；旧 RC 基线归档在 `archives/rc-0.2.0-rc.2-*/`。不得把旧版本数据直接交给新版本读取。

该 RC 的 Desktop Host 默认固定监听 19387，会与同时运行的日用 RC 冲突。沙箱 desktop profile 通过官方 `webserver` 配置限定 `host: 127.0.0.1`、`port: 0`，由 OS 分配空闲端口；完整保留压缩配置，不改上游代码或日用监听。启动脚本在首次创建 profile patch 时一并设置；保留该覆盖项。

## 路径

| 路径 | 归属 |
|---|---|
| `upstream/` | 官方固定 tag checkout 与编译产物；保持产品源码不变 |
| `tools/pnpm-11.28.5/` | RC 固定本地 pnpm，避免安装全局包管理器（旧基线 11.7.0 保留作历史工具） |
| `cache/` | npm/pnpm/Electron 缓存 |
| `home/` | 沙箱 DSH_HOME，包含 desktop profile、会话、设置和沙箱凭据 |
| `electron-user-data/` | 独立 Electron 浏览器存储与桌面壳设置 |
| `appdata/`、`localappdata/`、`tmp/` | 启动期间子进程的 Windows 数据/缓存/临时目录 |
| `test-workspaces/<项目>/` | 各插件的试验材料 |
| `logs/` | 安装、构建、启动和验证日志；可能含本地路径，不上传 |
| `scripts/` | 唯一推荐的准备、启动、状态和插件安装入口 |

## 使用

在 `E:/DSH-Desktop-Plugin-Dev` 的 PowerShell 7 终端执行：

```powershell
# 查看基线、占用和准备结果
powershell -NoProfile -ExecutionPolicy Bypass -File .\sandbox\dsh-desktop\scripts\Get-SandboxStatus.ps1

# 启动前只检查目录和基线，不启动应用
powershell -NoProfile -ExecutionPolicy Bypass -File .\sandbox\dsh-desktop\scripts\Start-Desktop.ps1 -Project dsh-source-deck -CheckOnly

# 打开独立官方 Desktop；此命令保持运行，退出 Desktop 后释放占用
powershell -NoProfile -ExecutionPolicy Bypass -File .\sandbox\dsh-desktop\scripts\Start-Desktop.ps1 -Project dsh-source-deck
```

首次模型使用请在沙箱单独登录或配置。当前首次默认工作区已通过官方 workspace-controller 配置限定到 `test-workspaces/dsh-source-deck/deepseek-harness/default-workspace/`，已核对实际会话目录。切换其他项目时，在 Desktop 中选择该项目的 `test-workspaces/<项目>/`；`-Project` 用于占用记录和材料目录，不会替换已有 Desktop 会话或自动切换工作区。当前准备不需要日用账号凭据，也不代表模型 API 已验证。

设计和开发完成后，在项目内打出 `.tgz`，关闭沙箱 Desktop，再安装：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\sandbox\dsh-desktop\scripts\Install-Plugin.ps1 -Project dsh-source-deck -PackagePath .\dsh-source-deck\artifacts\实际包名.tgz
```

安装器只接受指定项目目录内存在的 `.tgz`，只操作沙箱的 `desktop` profile。脚本设置全部隔离变量并在退出时还原当前进程原值，不修改用户级环境、PATH 或普通 DSH。不要绕过脚本用默认 home 的全局 `dsh`。

官方限制普通 npm CLI 修改 Desktop 的托管 profile。本沙箱使用 `desktop-cli.mjs` 为官方 `runDesktopCli` 提供官方开发模式生成的 runtime/support 路径，并通过准备好的 Electron Node 模式执行；不是放宽普通 CLI 的限制。首次启动并退出后可用 `scripts/List-Plugins.ps1` 验证。该开发适配入口需随基线重新检查。

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\sandbox\dsh-desktop\scripts\List-Plugins.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\sandbox\dsh-desktop\scripts\Test-Sandbox.ps1
```

准备与启动实测结果见 SourceDeck 的 `docs/SETUP-VERIFICATION.md`。模型调用、图形交互全流程和真实插件安装已在阶段 1 与升级适配中验证，证据见同一文档。

若需要重新准备已固定的版本：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\sandbox\dsh-desktop\scripts\Prepare-Desktop.ps1
```

该命令按顺序进行冻结安装、RC 官方完整构建（pnpm run build）、Electron 准备和官方 primary-runtime 准备；保留上游 lockfile、下载哈希与构建脚本策略。0.2.1-rc.1 的 `pnpm run build` 会运行 9 个 gate（含原生、Host、Desktop、Client、Web），并需要 commit；沙箱通过 `DSH_CLIENT_COMMIT_HASH` 提供。日志按步骤分别保存。受限 Agent 环境可能无法查询 Windows 用户信息或读系统凭据，此时申请相应命令的主机执行权限；不要关闭校验或全局提升日用应用。

## 占用与恢复

准备、启动和安装通过同一个 OS 文件锁互斥；`.active-run.json` 记录项目、动作、PID 和时间，不能仅因旧记录存在就推断进程仍在运行。正常退出释放锁并记录结束时间。崩溃后 OS 会释放文件句柄，状态脚本以实际锁为准。

从应用菜单退出当前沙箱。不要按名称杀掉所有 Electron/Node/DSH。若异常进程需要处理，先核对 `.active-run.json`、父子进程关系、可执行文件和启动参数，确认仅属于本沙箱，再处理对应 PID。

## 版本更新

不自动追随 master、alpha 或新发布的 RC。只有用户明确选择新的生产 RC / 正式版本后，才关闭实例、记录旧基线和插件清单，核对官方来源，显式更新上游 checkout、baseline.json（含 productionVersion）和对应工具链，再准备和验证。保留旧版本和状态直到新基线验证完成；不同版本状态不可假定支持降级，新插件复用已验证基线，不自行升级。启动与准备脚本拒绝 alpha 或未被批准记录覆盖的基线。

2026-10-17 的沙箱升级是用户批准的**开发环境先行**：`version=0.2.1-rc.1`、`productionVersion=0.2.0-rc.2`，批准记录写在 `baseline.json` 的 `upgradeApproval`。产品插件仍只声明生产基线；沙箱中的适配测试包不是产品发布。

0.2.1 的构建需要 git commit 但本机没有 git；沙箱在进程环境注入 `DSH_CLIENT_COMMIT_HASH=<baseline commit>`（上游支持的非 Git 构建路径）。源码获取、对象校验与构建证据见 SourceDeck 的 SETUP-VERIFICATION.md 夜段。

安装进 profile 的插件若与运行时 dsh 不兼容，0.2.1 的 CLI 会保留安装但打印 `Plugin … is incompatible with dsh …`，并在启动时拒绝装载该 bundle；负向验证以启动后 UI 是否出现为准。

初次拉取遇到 Windows Schannel 在受限账号下的凭据错误，改用该命令的 OpenSSL TLS 后端后成功，未关闭证书校验。主机执行与沙箱账号不同导致 Git 所有权检查时，脚本只为准确上游路径设置进程级信任。

## 隔离边界

脚本同时限定 DSH_HOME、Electron userData、APPDATA、LOCALAPPDATA、临时目录和缓存；开发模式不会登记默认 `dsh://` 协议，也不注册 CLI PATH。启动脚本清除常见继承模型/GitHub Token 环境值，避免意外借用日用凭据；这些进程级变化在脚本退出后还原。

目录隔离不能约束恶意 Host 插件的全部权限，插件仍需走官方工具与文件访问政策。默认不复制日用 DSH 数据，不运行 NSIS 安装器，不部署到日用环境。

Check-ProductionPaths.ps1 的 Before / After 必须使用同一生产 Windows 账号。脚本记录 observerSid 并拒绝跨账号比较，避免受限 Agent 与主机账号的 HKCU / 用户 PATH 视图差异产生误报；身份未知的旧快照也不会直接用于该自动比较。
