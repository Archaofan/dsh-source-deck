# SourceDeck · 资料筛选台

为 **DeepSeek Harness 官方 Desktop** 开发的 AI / Agent 交互插件。用户在对话中收集一批资料，使用插件自己的 UI 挑选后，让 Agent 继续阅读、比较或排除。

**当前状态：方案 A 已获用户批准（2026-10-17），含来源范围配置要求；尚未实现插件。** 设计基于沙箱固定 RC `0.2.0-rc.2` 的接口实测证据。沙箱已按用户指示配好本 DSH 的 DeepSeek API 并验证可真实调用。不要把选题预研当作已经批准的架构或接口。

**支持目标：用户日用的 `0.2.0-rc.2`。** 只维护选定生产 RC / 正式版，沙箱已切换至同一 RC；不支持 alpha 专有功能，不自动跟随最新发布。见 [版本维护策略](docs/VERSION-POLICY.md)。

- [项目简报](docs/PROJECT-BRIEF.md)
- [方案设计 v1.1（已批准）](docs/design/2026-10-17-solution-design.md)
- [界面草图](docs/design/wireframes.md)
- [RC 接口调研证据](docs/research/2026-10-17-rc-interface-evidence.md)
- [前置调研来源](docs/research/2026-10-17-reference-map.md)
- [开发环境](docs/DEVELOPMENT.md)
- [接手提示词（实现阶段）](docs/HANDOFF.md)
- [准备验证记录](docs/SETUP-VERIFICATION.md)
- [安全事故记录](docs/security/2026-10-17-credential-exposure.md)

本项目在 `E:/DSH-Desktop-Plugin-Dev/dsh-source-deck` 独立开发。根目录 README.md / AGENTS.md 管理跨项目约定；共用官方 Desktop 沙箱位于 `../sandbox/dsh-desktop/`。

私有远端：[Archaofan/dsh-source-deck](https://github.com/Archaofan/dsh-source-deck)。后续有效修改完成检查后提交并推送；同步必须核对结果。
