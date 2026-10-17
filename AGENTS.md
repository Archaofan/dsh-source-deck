# SourceDeck 项目约定

同时遵守父目录 `E:/DSH-Desktop-Plugin-Dev/AGENTS.md` 和 README.md。工作目录固定为本项目文件夹。

**当前状态（2026-10-17 傍晚更新）**：方案 A 已批准，实现阶段已开始；**阶段 1（R1 冒烟）已完成并推送**。DSH 新 RC `0.2.1-rc.1` 已发布，用户指示：**沙箱先升级到 0.2.1-rc.1 并完成适配，再继续阶段 2 开发；生产 DSH（0.2.0-rc.2）不受影响**。产品 peer 基线是否切换到 0.2.1-rc.1 由用户另行明确选择，在此之前仍声明 `0.2.0-rc.2`。详见 docs/VERSION-POLICY.md 傍晚段、docs/SETUP-VERIFICATION.md 傍晚-2 段与 docs/HANDOFF.md。

产品目标见 `docs/PROJECT-BRIEF.md`。关注 AI / Agent 日常交互，提供自己的 UI 控件及对话内便捷入口。视频、控制、协议、嵌入式等旧选题不属于本项目。

所有安装和集成试验使用父目录共用 `sandbox/dsh-desktop/`。不得改日用 DSH、复制日用凭据或自行再装一个共享环境。独立前端模拟不能代替官方 Desktop 内的验证。

只维护用户当前生产基线 `0.2.0-rc.2` 的兼容性（沙箱可先行升级新 RC 作开发环境，但不改产品 peer 声明），后续经用户明确选择才能切换支持基线。方案只依赖该 RC 的真实公共接口；遇到 alpha 才有的功能，改方案或明确列为暂不支持，不能要求用户升级 alpha。版本策略详见 docs/VERSION-POLICY.md。

不把上游、node_modules、沙箱数据和早期 Hindsight 摘录提交到本仓库。阶段性修改检查后提交并同步 `origin`；记录失败和未完成的验证。
