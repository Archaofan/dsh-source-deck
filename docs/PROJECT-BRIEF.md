# 项目简报

日期：2026-10-17。名称由用户确认：**SourceDeck / dsh-source-deck**，中文名“资料筛选台”。

## 已确认目标

用户出于个人兴趣开发 AI / Agent 应用，已选择“让 Agent 更好用的交互与功能插件”。SourceDeck 是官方 DSH Desktop 插件，有自己的 UI 控件，同时能方便地在对话过程中使用。

典型场景：Agent 找到一批资料，用户直接选择其中几条，并表达“继续阅读”“比较这些”“排除这些”，后续研究能明确使用所选资料。减少复制标题、反复解释指代和在聊天文本里逐项挑选的操作。

项目独立目录与 GitHub 仓库已经获准建立。用户要求所有插件开发优先使用工作区内共用的独立官方 Desktop 沙箱，后续项目也遵守根目录约定；Git 更新同步远端。

新增明确约束：用户自己会在日用环境使用插件，当前生产 Desktop 为 `0.2.0-rc.2`，不升级 alpha。SourceDeck 只维护选定的生产 RC / 正式版本；方案必须基于 RC 的公共接口，沙箱也固定同一版本。具体规则见 VERSION-POLICY.md；缺失于 RC 的 alpha 能力不能作为首版前提。

## 方案设计结果（2026-10-17 已批准）

用户审阅并**批准方案 A**（右栏资料台 + 对话流候选卡片 + `session.prompt` 回传），同时要求首版来源范围可在配置页配置。上节"下一对话需要决定"的各项结论如下（详见 [design/2026-10-17-solution-design.md](design/2026-10-17-solution-design.md)）：

- 第一版来源：Agent 工具提交（`deck_submit_sources`）+ 用户手动添加；**来源范围在设置页配置**（预置 GitHub 等社区源 + stars/最近更新时间等筛选参数 + 「LLM 自主」模式），作为结构化约束传给 Agent，候选带 `policyFlags` 标记，不阻断人工保留。
- UI 组合：右栏自定义 tab（资料台）+ 对话流业务卡片（候选）+ `input.right` 入口按钮 + 设置页（数据管理与来源范围配置）。
- 数据模型：域 `source_deck` 五表（sets/sources/candidates/selections/session_active）+ scope_policies；URL 规范化去重；记录只增不改。
- 交回方式：Client 经自建 Remote 交 Host 落库，再调官方 `ctx.remote.session.prompt`（忙碌 steer / 空闲 queue）；用户已接受"提交即唤醒"。
- 验收：V0–V7（见设计 §9），R1（第三方 client half 进 boot graph）为最高优先冒烟项。
- 沙箱 LLM API 已按用户指示复用本 DSH 的 DeepSeek API（见 SETUP-VERIFICATION.md 下午记录），凭据事故与轮换提醒同在该文件。

下一阶段：实现（遵循已批准设计，不得跳过设计变更流程）。**阶段 1（R1 冒烟）已完成**：第三方 client half 进入沙箱 desktop boot graph，右栏「资料台」tab 与 guide 入口在真实 Desktop 内可见（实测记录见 [implementation/2026-10-17-implementation-plan.md](implementation/2026-10-17-implementation-plan.md)）。**阶段 1.5（沙箱升级到 0.2.1-rc.1 与适配）也已完成**：新 RC 下阶段 1 验收复验通过，适配结论见 [research/2026-10-17-0.2.1-rc.1-interface-delta.md](research/2026-10-17-0.2.1-rc.1-interface-delta.md)；产品 peer 仍为 0.2.0-rc.2，切换与否待用户决定。后续按阶段 2→5 推进。

## 证据与局限

早期预研仅表明“交互筛选—明确动作—Agent 继续”值得验证，不保证无人实现。SearchSieve、现成搜索插件、收藏/资料管理和人工参与 Agent 流程是近邻；必须核对完整能力，避免只换皮重做。前置来源见 `research/2026-10-17-reference-map.md`。
