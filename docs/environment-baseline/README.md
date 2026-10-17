# 共用环境准备快照

此目录保存 2026-10-17 回退到生产 `0.2.0-rc.2` 后的跨项目说明、固定版本记录和操作脚本，随 SourceDeck 私有仓库版本化，便于后续接手与恢复。它不是第二份运行沙箱；初次 alpha 快照仅留在 Git 历史，不是当前支持目标。**2026-10-17 夜随用户批准的沙箱先行升级到 `0.2.1-rc.1` 更新过一次**（仅开发环境；生产与产品 peer 仍 `0.2.0-rc.2`），因此本快照的 `baseline.json` 与脚本反映升级后的状态。

- `workspace-README.txt`、`workspace-AGENTS.txt`：工作区根说明原文。
- `sandbox-README.txt`、`baseline.json`：共用沙箱说明和官方固定基线。
- `scripts/`：沙箱操作脚本原文备份。

说明文档以 txt 保存，原文相对链接仍按原工作区位置解释。脚本依赖真实沙箱的相对位置，**不能在本快照目录直接执行**。实际入口为 `E:/DSH-Desktop-Plugin-Dev/sandbox/dsh-desktop/scripts/`；实际跨项目规则以工作区根 README.md / AGENTS.md 为准。恢复前先比较当前文件，不得覆盖后来修改。

本目录不含上游源码、依赖、runtime、status.json、会话、日志、缓存、Token 或 Hindsight 摘录。实时状态以真实沙箱的状态脚本与 status.json 为准。今后修改共用脚本或约定后，核对差异并更新此快照，随后按项目约定提交推送。
