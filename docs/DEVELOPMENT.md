# 开发环境

项目目录：`E:/DSH-Desktop-Plugin-Dev/dsh-source-deck`。独立 Git，默认分支 `main`，私有远端 `https://github.com/Archaofan/dsh-source-deck.git`。Git 身份为本仓库局部的 Archaofan / GitHub noreply 地址，不改变全局用户身份。

后续设计和代码在本项目进行；上游 DSH 与试验环境统一位于 `../sandbox/dsh-desktop/`。开始前读取父目录 README.md、AGENTS.md，运行沙箱状态脚本，核对当前占用与基线。

```powershell
Set-Location E:\DSH-Desktop-Plugin-Dev\dsh-source-deck
pwsh -NoProfile -File ..\sandbox\dsh-desktop\scripts\Get-SandboxStatus.ps1
pwsh -NoProfile -File ..\sandbox\dsh-desktop\scripts\Start-Desktop.ps1 -Project dsh-source-deck
```

沙箱采用官方 `dsh-v0.2.1-alpha.5` 源码开发模式，按 2026-10-17 的官方发布列表核对。具体准备与启动证据见 `SETUP-VERIFICATION.md` 及沙箱 status.json；并非对所有未来版本的兼容承诺。

插件包打包和安装命令需在设计后建立项目构建配置。当前没有 package.json、产品代码、已安装的 SourceDeck 插件或实现测试；避免把环境准备误报成 MVP 已完成。

Git 更新按“检查 → commit → push → 核对 origin”执行。系统 keyring 在受限执行环境下可能读不到，需要该条命令的主机权限；用户已经完成官方 GitHub CLI OAuth 授权，不应因此反复要求重设 Token。该项目使用本地 credential helper 调用 `gh auth git-credential`。

根目录和沙箱脚本在 `docs/environment-baseline/` 保留版本化准备快照，用于接手、审阅和恢复；**实际执行以工作区根和 sandbox 当前文件为准**。恢复时先对比，不能直接覆盖后来变更。运行时、会话、凭据、缓存和日志不进入此快照或 Git。
