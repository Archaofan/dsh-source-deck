# 开发环境

项目目录：`E:/DSH-Desktop-Plugin-Dev/dsh-source-deck`。独立 Git，默认分支 `main`，私有远端 `https://github.com/Archaofan/dsh-source-deck.git`。Git 身份为本仓库局部的 Archaofan / GitHub noreply 地址，不改变全局用户身份。

后续设计和代码在本项目进行；上游 DSH 与试验环境统一位于 `../sandbox/dsh-desktop/`。开始前读取父目录 README.md、AGENTS.md，运行沙箱状态脚本，核对当前占用与基线。

```powershell
Set-Location E:\DSH-Desktop-Plugin-Dev\dsh-source-deck
powershell -NoProfile -ExecutionPolicy Bypass -File ..\sandbox\dsh-desktop\scripts\Get-SandboxStatus.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File ..\sandbox\dsh-desktop\scripts\Start-Desktop.ps1 -Project dsh-source-deck
```

沙箱当前为开发先行版官方 `dsh-v0.2.1-rc.2`（commit `687f282e8625c6b8d11ff58211a90524be2e4317`，用户 2026-10-17 批准，仅开发环境）；生产仍是 `0.2.0-rc.2`。工具链按新版 RC 自带声明使用本地 pnpm 11.28.5，执行 RC 的 `pnpm run build`（0.2.1 的构建脚本包含 9 个 gate，且需要 git commit：沙箱脚本通过官方非 Git 路径注入 `DSH_CLIENT_COMMIT_HASH`）。不要套用更早 alpha 的构建入口。具体准备与启动证据见 `SETUP-VERIFICATION.md` 及沙箱 status.json；维护范围见 VERSION-POLICY.md。

本机**有 git**：`C:\Users\Administrator\AppData\Local\hermes\git\cmd\git.exe`（Hermes 自带，git 2.54.0），只是未加入会话 PATH。仓库由另一账号创建，命令需带进程级 `safe.directory`（示例见 HANDOFF），不要改全局配置。

插件包打包和安装命令（阶段 1 起生效，2026-10-17 实测；路径随沙箱 pnpm 版本更新）：

```powershell
# 安装依赖（peer 不自动安装；避免拉入 @deepseek-ai/dsh 全家桶的大二进制依赖）
node ..\sandbox\dsh-desktop\tools\pnpm-11.28.5\package\bin\pnpm.cjs install --config.auto-install-peers=false
# 构建（tsdown 管 JS；tsc 只发 lib/types；直接跑 tsdown 可绕过 pnpm run 的依赖检查）
node node_modules\tsdown\dist\run.mjs
node node_modules\typescript\bin\tsc -p tsconfig.json
# 打包与安装进沙箱
npm.cmd pack --pack-destination .
powershell -NoProfile -ExecutionPolicy Bypass -File ..\sandbox\dsh-desktop\scripts\Install-Plugin.ps1 -Project dsh-source-deck -PackagePath .\dsh-source-deck-<version>.tgz
```

**版本 bump 纪律**：pnpm 对相同 name@version 的 `file:` tgz 不替换已安装内容；每次迭代先 bump `package.json` 的 `version` 再 pack/install。

**pnpm 11.28.5 的发布年龄例外**：官方 RC 包刚发布时会被 pnpm 的 minimumReleaseAge 策略挡住；安装 0.2.1-rc.2 后 pnpm 生成了 `pnpm-workspace.yaml` 的 `minimumReleaseAgeExclude`，精确列出本包需要的版本。该文件随仓库提交，保证后续安装可复现；升级基线时由 pnpm 重新生成或手工更新对应版本。

**安装时的兼容门（0.2.1 起）**：安装前读包清单，按 `engines.dsh`（声明了就用它）或 dsh peer 判定；不兼容时 pnpm 可能显示 `Already up to date`，CLI 打印 `Plugin … is incompatible with dsh …` 并保留安装，但**profile 启动会拒绝装载该 bundle**。负向验证以启动后 guide/tab 是否出现为准，而不只看安装退出码。

Git 更新按“检查 → commit → push → 核对 origin”执行。系统 keyring 在受限执行环境下可能读不到，需要该条命令的主机权限；用户已经完成官方 GitHub CLI OAuth 授权，不应因此反复要求重设 Token。该项目使用本地 credential helper 调用 `gh auth git-credential`。

根目录和沙箱脚本在 `docs/environment-baseline/` 保留版本化准备快照，用于接手、审阅和恢复；**实际执行以工作区根和 sandbox 当前文件为准**。恢复时先对比，不能直接覆盖后来变更。运行时、会话、凭据、缓存和日志不进入此快照或 Git。
