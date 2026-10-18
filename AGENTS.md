# SourceDeck 项目约定

同时遵守父目录 `E:/DSH-Desktop-Plugin-Dev/AGENTS.md` 和 README.md。工作目录固定为本项目文件夹。

**当前状态（2026-10-18，v2 + 市场提交）**：方案 A 及其 2026-10-17 v2 修订（LLM 搜索轮次、聊天联动）已完成并通过沙箱验证。产品 `0.2.5`，peer 精确 `@deepseek-ai/dsh@0.2.1-rc.2`、cordis `4.0.5`，生产 Desktop 已由用户经 Codex 升级到 `0.2.1-rc.2`（与沙箱一致）。功能：八表域（`sets/sources/candidates/selections/scope_policies/session_active/rounds/favorites`）、`deck_submit_sources` 工具、自建 `sourceDeck` Remote、`ignorable` 会话记录；资料台首屏是一句自然语言需求，当前会话的 LLM 用自身搜索工具查找，结果按轮次渲染为 GitHub 可视化卡片（头像/简介/stars/语言/链接）；✓ 保留、✕ 排除、跳过、可选原因、补充说明驱动下一轮；收藏夹可搜索/加入资料台/移除；`/deck` 命令、Host 抽取最近对话作为搜索上下文、对话卡片展示最近轮次；字体放大、2 列卡片、5 分钟轮询。来源范围策略保留为可选高级项，不再要求首次配置。验收覆盖真实模型两轮搜索、勾叉/原因/跳过、收藏、`/deck`、对话上下文、重启恢复、多会话隔离、清除/卸载重装；35 个单元测试全绿。证据见 docs/SETUP-VERIFICATION.md 夜-4 至夜-7 段、docs/research/2026-10-17-chat-deck-linkage.md、docs/design/2026-10-17-solution-design.md §14。**未安装到生产**，生产仍为 0.1.17；交付包由用户自行在本 DSH 安装。

**市场收录（2026-10-18）**：`dshmarket` 通过 awesome-dsh-plugin 精选目录收录，PR [#7739](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/7739) 已开；仓库已设为 public 并加 `dsh-plugin` topic；PR check 通过，Submission gate 仅差仓库创建满 24 小时（约 2026-10-18 11:35 北京时间），gate 自动重跑，不要关/重开或 force-push。合并后才算上架，之后在市场搜 `SourceDeck`。详见 [docs/MARKETPLACE.md](docs/MARKETPLACE.md)。

产品目标见 `docs/PROJECT-BRIEF.md`。关注 AI / Agent 日常交互，提供自己的 UI 控件及对话内便捷入口。视频、控制、协议、嵌入式等旧选题不属于本项目。

所有安装和集成试验使用父目录共用 `sandbox/dsh-desktop/`。不得改日用 DSH、复制日用凭据或自行再装一个共享环境。独立前端模拟不能代替官方 Desktop 内的验证。

当前产品支持基线为 `0.2.1-rc.2`（用户 2026-10-17 明确选择，精确 peer + cordis 4.0.5）。生产 Desktop 已由用户经 Codex 升级到 `0.2.1-rc.2`，与本产品 peer 匹配；安装到生产仍须用户明确批准，不要擅自安装。方案只依赖该 RC 的真实公共接口；遇到 alpha 才有的功能，改方案或明确列为暂不支持，不能要求用户升级 alpha。版本策略详见 docs/VERSION-POLICY.md。

不把上游、node_modules、沙箱数据和早期 Hindsight 摘录提交到本仓库。阶段性修改检查后提交并同步 `origin`；记录失败和未完成的验证。
