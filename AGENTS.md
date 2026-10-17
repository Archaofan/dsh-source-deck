# SourceDeck 项目约定

同时遵守父目录 `E:/DSH-Desktop-Plugin-Dev/AGENTS.md` 和 README.md。工作目录固定为本项目文件夹。

**当前状态（2026-10-17 最终）**：方案 A 已批准；阶段 1、1.5、1.6、2、3、4、5 全部完成并推送。产品 `0.1.12`，peer 精确 `@deepseek-ai/dsh@0.2.1-rc.2`、cordis `4.0.5`，生产 Desktop 已由用户经 Codex 升级到 `0.2.1-rc.2`（与沙箱一致）。已实现 `source_deck` 六表域、`deck_submit_sources` 工具、自建 `sourceDeck` Remote、`ignorable` 会话记录、资料台面板、对话流候选卡片、输入区入口、来源范围策略（三种类型 + 设置页 + 标记）。沙箱验收覆盖：手动/模型两条提交链路、筛选提交与下一轮引用、策略标记、重启恢复、多会话隔离、清除/卸载重装、peer 负向拒绝（见 docs/SETUP-VERIFICATION.md 夜-4/夜-5 段），单元测试 29 例全绿。**未安装到生产**，等待用户明确批准。下一步：用户验收；如批准，按生产安装流程（App 设置 → 插件或市场接口）装入。

产品目标见 `docs/PROJECT-BRIEF.md`。关注 AI / Agent 日常交互，提供自己的 UI 控件及对话内便捷入口。视频、控制、协议、嵌入式等旧选题不属于本项目。

所有安装和集成试验使用父目录共用 `sandbox/dsh-desktop/`。不得改日用 DSH、复制日用凭据或自行再装一个共享环境。独立前端模拟不能代替官方 Desktop 内的验证。

当前产品支持基线为 `0.2.1-rc.2`（用户 2026-10-17 明确选择，精确 peer + cordis 4.0.5）。生产 Desktop 已由用户经 Codex 升级到 `0.2.1-rc.2`，与本产品 peer 匹配；安装到生产仍须用户明确批准，不要擅自安装。方案只依赖该 RC 的真实公共接口；遇到 alpha 才有的功能，改方案或明确列为暂不支持，不能要求用户升级 alpha。版本策略详见 docs/VERSION-POLICY.md。

不把上游、node_modules、沙箱数据和早期 Hindsight 摘录提交到本仓库。阶段性修改检查后提交并同步 `origin`；记录失败和未完成的验证。
