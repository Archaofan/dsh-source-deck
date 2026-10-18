# 开发者资料筛选工作流调研与迭代提案

日期：2026-10-18。状态：**调研完成，方案待用户评审；未修改产品代码、依赖或版本**。

## 目标与约束

用户本轮明确选择优先场景：**找开源库、比较技术方案**。成功应表现为：在当前聊天输入需求即可开始；能迅速理解候选为什么适合、有什么限制；选择与对比保持独立；交回 Agent 后得到围绕已选资料的选型分析。

保留同一会话、同一模型与工具、八表域、自然语言首屏、保留/排除/收藏、可选来源策略。精确支持 DSH `0.2.1-rc.2` / Cordis `4.0.5`；只在共用沙箱验证。生产仍保留旧插件，部署另需用户批准。

这是对既有方案 A / v2 的变更建议，不替代已批准设计；评审后再形成正式设计与实施计划。

## 本轮接手证据

- 本地 HEAD 与 GitHub API 的 main 均为 `28448a30c4ed65d3d17434a0380bf0d5bc9f893e`。本地 `origin/main` 缓存落后一条，不代表真实远端未同步。
- `Get-SandboxStatus.ps1`：`officialVersion=0.2.1-rc.2`、`matchesProduction=true`、`occupied=false`。`Start-Desktop.ps1 -Project dsh-source-deck -CheckOnly` 通过。
- 固定上游 HEAD：`687f282e8625c6b8d11ff58211a90524be2e4317`。
- `node --test tests/*.test.ts`：35 passed / 0 failed。
- 交付包 SHA256 复核仍为 `BADA485796D6C1FACF99AE25E9830719358D3A660078B1535E3F26ADB9FEC9C6`。
- 视觉依据为上一轮沙箱截图 `logs/shots/deck-v2/round1-023.png`，并结合当前组件/CSS 阅读；本轮未启动 Desktop、未运行真实模型请求。截图不入 Git。
- 约北京时间 10:43 复核市场 PR #7739：open / merged=false；check success；Submission gate 仍为仓库年龄失败。24 小时门槛在 **11:35:45** 满足，自动任务实际重跑时间还需复核，不能承诺届时立即转绿或已上架。

## 外部实践与适用结论

以下是官方资料。本轮查阅时间为 2026-10-18；仅借鉴交互，不把它们当作 DSH 接口证据。

| 研究面 | 官方证据 | 对 SourceDeck 的建议（产品判断） |
|---|---|---|
| 聊天内命令 | [VS Code Chat](https://code.visualstudio.com/docs/chat/chat-overview) 使用自然语言与斜杠命令；执行中的请求有队列/引导/停止等不同处理 | `/deck` 打开，`/deck 需求` 直接开始；只明确显示已知状态，不把排队称为正在搜索 |
| 上下文可见性 | [VS Code Context](https://code.visualstudio.com/docs/chat/copilot-chat-context) 提供上下文选择；[Continue](https://docs.continue.dev/ide-extensions/chat/context-selection) 只要求文本，文件/选中代码等是可选上下文 | 首屏保持一句话；“参考最近对话”可以关闭和展开预览，默认延续现有行为，不要求先配项目 |
| 侧栏信息层级 | [VS Code Sidebars](https://code.visualstudio.com/api/ux-guidelines/sidebars) 强调相关内容聚合、清晰命名和克制工具栏 | 单一资料台；筛选、对比、收藏在内部切换；减少重复链接和按钮，主要动作固定可见 |
| 键盘操作 | [WAI Keyboard Interface](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/) 强调可见焦点、常见键位和避免冲突 | 先保证 Tab/Enter；K/X/U/搜索键只在资料台内非编辑区域生效，不接管聊天、输入法或全局快捷键 |
| 点击目标 | [WCAG 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) 给出 24×24 CSS px 或间距例外的最低要求 | 产品主要控件目标高至少 32px；不依赖颜色区分状态；正文以 14px 起，不缩小字体塞双列 |
| 开源选型信息 | [GitHub Repository API](https://docs.github.com/en/rest/repos/repos#get-a-repository)、[License API](https://docs.github.com/en/rest/licenses/licenses) 提供仓库事实与许可证元数据 | 显示许可证、维护时间、语言、归档状态和证据时间；stars 仅作辅助。LLM 提交值标注来源与未独立核验状态，未知不补猜值 |

用户于 2026-10-18 评审时明确选择：**同一套自适应卡片布局，默认双列，面板过窄时自动变为单列**。不再将单列/双列作为两种独立方案让用户选择；这一布局决定已确认，其余工作流提案仍待整体评审。

## 现有问题：复现与根因

### 已通过纯内存探针复现

执行：`node docs/research/probes/2026-10-18-workflow-probe.mjs`。仅调用现有 ops，全部数据在内存；不访问 DSH profile、凭据或网络。

| 问题 | 根因与操作路径 | 结果 |
|---|---|---|
| 迟到结果归错轮次 | `addSource` 从 `session_active.roundId` 取值，不接收原搜索身份。先创建 A 再创建 B，再模拟 A 返回 | A 的候选被标为 B |
| 新搜索接收旧搜索结果 | `addSource` 从当前会话的活跃集合取目标；先换主题再模拟旧搜索返回 | 旧结果进入新集合 |
| 重复提交不幂等 | `commitSelection` 保存 requestId，但未先查同 ID 记录。对相同 set/requestId 调用两次 | 产生两个 selectionId / 两条记录 |

当前代码观察输出均为 `true`，探针明确报告为“观察到现有缺陷”，不是“修复通过”。

### 通过代码路径确认，待沙箱交互回归

| 优先级 | 问题与影响 | 代码依据 |
|---|---|---|
| P0 | 发送失败仍可能显示提交成功；刷新后又能操作已提交集合 | `DeckBody.submit` 忽略 `deck.prompt` 的 boolean；Host 在发送前标 submitted；组件的 submitted 初始为 false，未从 set.status 恢复 |
| P0 | 关闭重开丢失等待状态；新搜索按钮搜索期间仍可点；异步返回有覆盖新会话视图的风险 | searchingRound/busy 为本地 state；refresh 无会话代际保护；startFresh 的入口不禁用 |
| P1 | 第一条候选到达就结束等待；空结果或全重复结果没有完成信号 | 轮询用 `some(roundId)` 推断结束；RoundRecord 无生命周期；工具没有 roundId/完成参数 |
| P1 | 手动加入或收藏导入的候选可能不显示；旧候选仅有标题，缺少筛选动作 | feed 只遍历 rounds；无 roundId 分组在混合数据时未渲染；无轮次回退分支仅有链接 |
| P1 | 聊天历史卡片可能打开当前集合而非卡片对应集合，卡片决策也没继承集合锁定状态 | DeckCard 的 openDeck 无 setId；面板只 load active；卡片按钮无 submitted guard；Host decide 未检查 set.status |
| P1 | 快捷键说明与实际行为不符；筛选、搜索、批量操作在 v2 页面中已不见 | footer.hint 仍写 K/X/U/搜索，DeckBody 仅有手动添加和原因框 Enter，没有这些键处理 |
| P1 | 收藏作用域文档不一致，选型信息丢失 | 实现是 profile 级 favorites（非按集合）；界面收藏未传 meta，导入也不传 meta；README 却称按资料集保存 |
| P2 | 同 URL 的旧 source 被跨集合复用，元数据可能过期 | `addSource` 找到 source 后直接复用，不更新元数据；选型展示需要查询时间与快照语义 |

P0/P1 为本轮优先的工作流可靠性和可用性排序，不是安全漏洞评级。

## 固定 RC 的可行性

所有下列证据来自本地固定 commit `687f282…`，不使用 master 或 alpha 文档。可在[固定上游目录](https://github.com/deepseek-ai/deepseek-harness/tree/687f282e8625c6b8d11ff58211a90524be2e4317)核对。

- `packages/interaction/commands/src/index.ts`：Host `CommandDefinition` 提供 input 与 `CommandInvocation.rawInput`，能接 `/deck <需求>`。
- `packages/client/ui-commands/src/client/contract.ts`：`decorate` 仅替换 Host 命令裸调用行为；保留带参调用。**不能同时保留同名 client register 和 Host 命令**，否则目录合成报冲突。
- `packages/client/ui-commands/src/client/service.ts`：`command/executed(sessionId, name, result)` 可用于当前客户端命令执行后的定向打开。
- `packages/client/ui-sidebar-right/src/client/service.ts`：`openTabIn(sessionId, kind, options)` 可按会话定位；异步回调必须用捕获的 sessionId，不能只操作当前焦点会话。
- `packages/api/session-controller/src/commands.ts`：`prompt` 先检查 requestId 是否已在消息或排队项中；可复用稳定 requestId 重试，避免重复排队。接受入队不等于模型已完成处理。

具体导出、注入及 bundle 纯度仍须在实现时构建并在官方沙箱验收；这里只确认接口路径存在。

## 三种迭代方向

| 方向 | 内容 | 取舍 |
|---|---|---|
| **A：会话内选型工作台（推荐）** | 修复可靠性；带参命令；自适应卡片筛选、已选对比、最近搜索、可信信息层级 | 覆盖开发者主要任务；保留既有模型/数据边界。比纯换肤多一次数据协议增量 |
| B：仅做现有卡片精修 | 触发说明、字号/间距、现有元数据展示 | 改动小；无法有效处理对比、迟到结果与重开状态，建议至少先修 P0 |
| C：独立调研 Agent / 项目知识库 | 新子会话、索引、抓取缓存、同步 | 规模大且偏离“当前会话资料台”；本轮不推荐 |

## 方向 A 的可评审行为

### 触发与上下文

- `/deck`：打开当前会话最近的资料台，聚焦需求框，不自动消耗模型请求。
- `/deck <需求>`：创建一个新搜索主题并直接发给当前会话；旧主题保留在“最近搜索”。继续已有主题从其“继续查找”按钮发起，避免命令隐式改写旧主题。
- 输入区按钮：打开并聚焦需求框，保留聊天草稿；不静默读取、清空或自动发送输入框内容。
- 对话卡片：定向打开该卡片的 sessionId + setId；查看历史不暗中改变活跃搜索。历史已提交集合只读。
- 自然语言“用资料台找…”：优化现有工具描述，让模型可提交候选并在聊天展示卡片；不拦截所有“查找/搜索”关键词，不把模型遵循率说成保证，也不自动抢焦点。
- “参考最近对话”默认开，可展开本轮预览、可关闭。预览与发送使用同一快照，避免预览后上下文变化；明确这只控制插件额外摘要，当前会话模型本来就有自己的历史。
- 暂不新增全局快捷键、消息菜单、全量文件附件或 deck_open 推送系统。

### 筛选与视觉

- 顶部显示搜索主题、轮次和状态，另有最近搜索/收藏入口。面板按自身容器宽度响应布局。
- 默认双列；资料台面板自身内容宽度不足时自动切为单列，放宽后自动恢复双列，无需手动切换。初始断点约 620 CSS px，在官方沙箱依据卡片文字与按钮所需空间微调；不按整个浏览器/桌面窗口宽度推断侧栏宽度。最多两列，14px 正文、15–16px 标题、32px 以上主要操作目标；切列不重置勾选、对比、原因或轮次，也不通过缩小字体维持双列。
- 每项依次展示：仓库名/原始链接；一句用途；“适合当前需求”和“限制/待确认”；许可证/维护时间/语言，stars 辅助；核验来源与时间。
- 提供全部/待处理/保留/排除计数、当前主题搜索；轮次可收起；手动项有明确分组并复用相同操作组件。
- 保留/排除是持久化决策，重复点击可撤销；“加入对比”是独立选择，不改变保留状态。排除原因可选，保存失败保留草稿；短时撤销提供明显入口。
- 对比 2–4 项，列出相同维度；窄面板按维度纵向排布。值未知显示“未提供/待核验”；不生成缺证据的评分或排名。
- 底部“交给当前对话（N 条保留）”为主要动作，“继续查找”为次要动作。交回时可选“比较优缺点/给推荐/继续阅读”，默认比较优缺点；这是 prompt 意图，不是执行脚本或自动安装。
- 仅有排除项时仍可提交反馈，按钮明确“发送排除反馈”，避免标成 0 条保留的选择提交。
- 收藏明确是当前 profile 的独立收藏，不宣称项目隔离；保留原有收藏，通过添加 meta 和来源时间避免导入后信息退化。项目级收藏单独评审。

### 轮次与投递可靠性

- 保留八张表，以兼容的可选字段扩展现有记录。旧数据保持可读：无状态的旧轮次按历史记录呈现，不推断还在运行。
- 每个显式搜索有稳定 roundId 与 prompt requestId。工具提交显式带 roundId，Host 校验 session/set 归属；不能再按“此刻活跃轮次”归类迟到结果。
- 发送中、等待模型提交、完成、超时、发送失败可从 Host 恢复。没有可靠的执行阶段信号时写“已发送，等待当前对话提交”，不展示虚假的搜索进度百分比。
- 工具有显式完成信号，可完成空结果/全重复结果；不以第一条候选为完成条件。每批只写一次完整快照，降低重复事件数量。
- 超时保留原轮次，重试/刷新不会另开重复轮次。晚到数据只更新其原轮次；用户另开主题后，旧数据不能污染新主题。用户“结束等待”不声称停止了当前模型。
- 旧无 roundId 的工具调用保留独立的对话收集路径，不允许用它更新任何显式搜索轮次；不猜它属于哪个搜索。
- 提交使用稳定 requestId 保存选择快照和待投递状态；收到 `session.prompt` 接受确认后才展示成功并锁定。网络结果不明时可用同 ID 重试；关闭/重开能继续恢复。只保证已确认入队，不声称 Agent 已阅读或外部副作用恰好一次。
- Host 与 UI 都执行已提交只读约束；候选操作使用逐项状态；会话切换后的旧异步返回不覆写新视图。

### 模块边界与不确定性

建议在既有结构中抽取共用 CandidateItem（手动项/轮次项同渲染）、SearchHeader、CompareView 和会话绑定的数据 hook；Host 将轮次状态、归属验证、投递状态集中在 ops/Remote/工具边界。此处是待评审边界，不提前搭建架构。

第一版不新接 GitHub token 或后台抓取服务。新增适合/限制/查询时间可由模型及其已用工具提供，界面明确未经插件独立核验；对比是结构化展示，不自动变成“经过 GitHub API 认证”的事实。

## 验收建议

1. 纯逻辑回归：迟到结果、跨主题归属、空/重复完成、同 ID 重试、已提交集合拒绝修改、旧记录兼容。
2. 组件回归：发送 false/throw 不显示成功；关闭重开状态；切会话时过期请求；手动/收藏与轮次混排；K/X/U 不影响 textarea/contenteditable/IME。
3. 固定 RC 构建与包检查：精确 peer、类型、lazy-CJS、无新增未经允许的平台值导入；bump 后 pack，再由 Install-Plugin.ps1 装入沙箱。
4. 官方沙箱交互：320/420/640/900 宽面板、100%/125% 缩放、长中英标题、键盘路径；截图入沙箱日志，不入 Git。
5. 沙箱真实模型：`/deck <需求>` 两轮搜索；从聊天保留两项、对比、提交，再确认后续助手明确使用该选择；记录实际模型调用费用/耗时，不用组件模拟替代。
6. 生产不动。README 中英同步并纠正收藏作用域/快捷键能力；发布版本与市场状态以实际结果更新。

## 待评审决定

建议选方向 A，采用“双列默认、窄面板自动单列；对比独立、命令直达、可靠性先行”。其中响应式列数已由用户确认，整体工作流仍待评审；正式 spec 和实施计划在评审后写，尚未开始产品实现。
