# SourceDeck 项目约定

同时遵守父目录 `E:/DSH-Desktop-Plugin-Dev/AGENTS.md` 和 README.md。工作目录固定为本项目文件夹。

**当前状态（2026-10-17 夜更新）**：方案 A 已批准；**阶段 1（R1 冒烟）已完成并推送**；**阶段 1.5（沙箱升级与适配）已完成，最终基线为 `0.2.1-rc.2`**（仅开发环境）。用户随后明确决定：**产品 `peerDependencies` 切换到最新基线 `@deepseek-ai/dsh@0.2.1-rc.2`、cordis `4.0.5`**。产品版本 bump 到 `0.1.2`，已在沙箱安装并复验阶段 1 三项（guide 入口 / tab chip / placeholder body）。**注意：生产 Desktop 仍是 `0.2.0-rc.2`，精确 peer 为 `0.2.1-rc.2` 的 0.1.2 在生产升级前不会在日用环境加载。** 下一步：阶段 2（V3a 无模型链路）。详见 docs/VERSION-POLICY.md 夜段、docs/SETUP-VERIFICATION.md 夜-3 段与 docs/HANDOFF.md。

产品目标见 `docs/PROJECT-BRIEF.md`。关注 AI / Agent 日常交互，提供自己的 UI 控件及对话内便捷入口。视频、控制、协议、嵌入式等旧选题不属于本项目。

所有安装和集成试验使用父目录共用 `sandbox/dsh-desktop/`。不得改日用 DSH、复制日用凭据或自行再装一个共享环境。独立前端模拟不能代替官方 Desktop 内的验证。

当前产品支持基线为 `0.2.1-rc.2`（用户 2026-10-17 明确选择，精确 peer + cordis 4.0.5）。生产 Desktop 仍为 `0.2.0-rc.2`，因此 0.1.2 在生产升级前不会被其加载；这是用户已知的后果，不要为此擅自放宽 peer 或改成宽范围。方案只依赖该 RC 的真实公共接口；遇到 alpha 才有的功能，改方案或明确列为暂不支持，不能要求用户升级 alpha。版本策略详见 docs/VERSION-POLICY.md。

不把上游、node_modules、沙箱数据和早期 Hindsight 摘录提交到本仓库。阶段性修改检查后提交并同步 `origin`；记录失败和未完成的验证。
