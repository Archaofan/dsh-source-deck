# 右侧面板与可用性调研（2026-10-17）

目的：为 SourceDeck 的资料台面板、对话卡片、设置页和默认配置找可借鉴的成熟实践。只采用能在官方文档/源码中核对的行为，不把博客观点当结论。

星数取自 GitHub API（2026-10-17，`gh api repos/<repo> --jq .stargazers_count`）：

| 项目 | 星数 | 与本项目相关的界面 |
|---|---:|---|
| microsoft/vscode | 193,773 | 侧边栏 View、Welcome View、View Actions、设置页规范 |
| makeplane/plane | 60,975 | 右侧 side peek 详情面板、折叠分区、快捷键 |
| twentyhq/twenty | 58,439 | 右侧 side panel、命令菜单、记录页 |
| siyuan-note/siyuan | 46,809 | 反链面板筛选/搜索、折叠大纲 |
| logseq/logseq | 45,266 | 右侧栏承载块引用与多页面上下文 |
| continuedev/continue | 36,233 | IDE 侧栏 Chat 的上下文 chips、会话管理 |
| obsidianmd/obsidian-releases | 22,299 | 右栏独立抽屉、Backlinks/Outline/Tags 标签页 |
| zotero/zotero | 15,632 | Item Pane 的可折叠分区、侧导航、密度默认值 |

## 1. VS Code：View 的边界与空状态

来源：[Views](https://code.visualstudio.com/api/ux-guidelines/views)、[Sidebars](https://code.visualstudio.com/api/ux-guidelines/sidebars)、[Settings](https://code.visualstudio.com/api/ux-guidelines/settings)

- 一个 View 里放数据，图标 + 简短名称；一个 Sidebar 里 3–5 个 View 是多数屏幕的舒适上限。
- 空 View 用 **Welcome View** 引导（说明用途 + 一个主操作 + 文档链接），不要拿空状态做推广。
- 长任务在 View 内显示进度，而不是弹全局通知。
- 每个 item 的动作不超过 3 个；View 工具栏动作也要克制。
- 设置项必须给默认值、清楚描述、复杂项链接文档；不要自建整套设置页。

对 SourceDeck 的映射：资料台只有一个主视图，空状态应直接给出「添加资料 / 让 Agent 提交」两条路；行内动作保持 2–3 个（保留/排除/撤销），其余收进行菜单；加载与提交要有局部进度。

## 2. Zotero 7：从横向标签改成可折叠分区

来源：[Zotero 7: Zotero, redesigned](https://www.zotero.org/blog/zotero-7/)

- Item Pane 从 Info/Tags/Notes 横向标签改为 **可折叠的纵向分区 + 侧边导航**，让更多信息同屏，插件也能加自己的分区。
- 顶部 header（标题/作者/日期）在 Info 折叠后仍然可见，用户可以不展开元数据也看到关键信息。
- 新增 **Compact / Comfortable** 两档密度，**Comfortable 是默认**。
- 深色模式从设计之初就纳入；键盘导航与屏幕阅读器做了系统性改进。

对 SourceDeck 的映射：候选行不需要很多分区，但「标题/来源域名/标记/决定」应在一行内可扫读；默认使用舒适密度（行高与留白足够），紧凑密度作为后续设置；面板头部的进度与策略应始终可见（sticky），不要随列表滚走。

## 3. Plane：side peek 是默认，详情有层次

来源：[Work item details](https://docs.plane.so/work-items/work-item-details)、[Keyboard shortcuts](https://docs.plane.so/support/keyboard-shortcuts)

- 点击条目默认在列表旁 **side peek** 打开；可在 side peek / modal / full screen 间切换，新条目仍回到 side peek 默认。
- 详情分三层：header（面包屑 + 全局动作）、meta row（最常改的属性）、右侧可折叠 sidebar（Details / Project structure / Custom properties）。
- 描述区自动保存；底部 activity 用标签分 All/Activity/Comments/Updates/Worklogs/Transition/History。
- 全局快捷键 `Cmd+/` 打开快捷键表；条目内 `S/P/A/L` 直接改状态、优先级、负责人、标签。

对 SourceDeck 的映射：资料台本身就是「side peek」形态，不要占满主区；候选的常用动作（保留/排除）必须在行上一步可达；顶部保留「进度 + 策略 + 更多」；快捷键不必多，先给 `K 保留 / X 排除 / U 撤销 / / 搜索` 并在页脚提示。

## 4. Twenty：side panel 快速预览 + 全页

来源：[Layout](https://docs.twenty.com/getting-started/core-concepts/layout)

- 点击记录在右侧打开 **side panel**，只给关键信息；需要深入时点 **Open** 进入完整记录页。
- 左侧栏可折叠；`Cmd+K` 命令菜单、`/` 聚焦搜索；可拖拽排序、建文件夹、隐藏不用项。

对 SourceDeck 的映射：资料台只承担筛选，不承担全文阅读；候选详情保持「标题 + 链接 + 备注 + 标记」，长内容交给浏览器/Agent；面板头部提供「刷新/在设置中编辑策略」即可，不必复制命令面板。

## 5. Continue：侧栏 Chat 的上下文与会话

来源：[How Chat Works](https://docs.continue.dev/ide-extensions/chat/how-it-works)

- 侧栏 Chat 自动带入选中代码/当前文件/历史，手动用 `@` 加文件；每个回答块带 Apply/Insert/Copy 动作。
- `Cmd/Ctrl+L` 新会话，清空上下文；prompt logs 可查看实际发送内容。

对 SourceDeck 的映射：候选的「上下文」就是来源元数据与标记，应折叠成 chips；提交摘要应可预期（保留/排除/策略），让用户知道 Agent 会看到什么；「策略」是可解释的，不该是黑盒。

## 6. SiYuan / Obsidian / Logseq：右栏作为多工具容器

来源：[SiYuan 官网（反链面板支持筛选与搜索）](https://b3log.org/siyuan/en/)、[Obsidian Workspace](https://mintlify.wiki/obsidianmd/obsidian-help/ui/workspace)、[Logseq 教程](https://raw.githubusercontent.com/logseq/logseq/ad3eda7c25154cc055f4cb32a543dd5d8b381ae6/src/resources/tutorials/tutorial-sk.md)

- SiYuan 的反链面板支持筛选与搜索；大纲/列表可折叠，块级引用在右栏展开。
- Obsidian 右栏独立折叠，Backlinks/Outgoing/Outline/Tags 作为标签页并存，标签可切换/固定。
- Logseq 右栏用于并排打开块引用/页面上下文，不打断主编辑区。

对 SourceDeck 的映射：资料台目前只有一个集合，暂无多标签需求；但「搜索 + 过滤」是必需项；未来若支持历史集合，再引入标签页（右栏标签系统已由宿主提供）。

## 7. 综合：SourceDeck 的 10 条设计原则

1. **Side peek 优先**：面板只做筛选，不抢主区；卡片提供「在资料台打开」而不是复制完整列表。
2. **状态先于操作**：顶部固定显示进度（已处理/总数）、策略与错误；列表滚动时仍可见。
3. **逐步披露**：默认只露标题、域名、标记、决定；备注/理由按需展开。
4. **一屏内完成筛选**：过滤标签 + 搜索 + 批量保留/排除；不要逼用户逐组滚动。
5. **动作就近**：每行保留/排除；排除理由内联可选；撤销在 5 秒内。
6. **空状态可行动**：说明两条进入方式（手动添加/Agent 提交），直接给输入框或示例。
7. **默认克制**：默认策略不预设强门槛（LLM 自主 + 指导语），需要时才切 GitHub 高星；默认密度舒适。
8. **可解释**：标记用中文短标签 + tooltip 解释来源（stars/更新时间等），策略摘要始终可见。
9. **快捷键少而稳**：`/` 搜索、`K` 保留、`X` 排除、`U` 撤销、`Esc` 清空选择；页脚提示。
10. **可访问与一致**：aria-label、焦点环、键盘可达；只使用宿主设计 token，深浅色一致。

## 8. 现状差距（对照截图 `stage3-4-model/agent-panel-flags.png`）

- 添加表单常驻三行输入，占掉首屏；无 Enter 提交、无 URL 自动识别。
- 没有过滤/搜索/批量操作；长列表只能滚动。
- 计数行与分组标题重复，空分组也占高度。
- 提交按钮在列表末尾，不固定，候选多时找不到。
- 候选行没有选中态、没有理由输入、没有撤销。
- 策略条是纯文本，不能一键去编辑；标记没有解释。
- 卡片只有「在资料台打开」，不能直接保留/排除（与设计 §5 步骤 3 不一致）。
- 无加载骨架；无错误恢复入口；空状态没有示例。
- 设置页没有预设、没有恢复默认、没有标记说明。

## 9. 本次迭代决策

| 决策 | 依据 | 变更 |
|---|---|---|
| 默认策略改为 `llm-freeform` + 指导语 | VS Code 设置默认值、Zotero 舒适默认、Plane side peek 默认 | `DEFAULT_POLICY` 改为 LLM 自主；GitHub 高星作为一键预设 |
| 面板改为「固定头部 + 过滤/搜索 + 批量栏 + 固定提交」 | Plane side peek、Zotero 持久 header | 重写 DeckBody 布局 |
| 添加表单折叠、单输入框优先 | VS Code Welcome View、Twenty side panel | 空集展开，有候选时折叠为「＋ 添加资料」 |
| 行内保留/排除 + 排除理由 + 撤销 | Plane 行内动作、Zotero 可折叠 | 新增行状态与 undo |
| 卡片行内保留/排除 | 设计 §5 步骤 3、Continue 每回答动作 | 卡片注入 decide，同步 set-snapshot |
| 设置页预设 + 恢复默认 + 标记图例 | VS Code 设置默认值/描述 | ScopePolicySection 增加预设与图例 |
| 快捷键 `/ K X U Esc` + 页脚提示 | Plane 快捷键、Obsidian 键位 | DeckBody 键盘处理 |
| 舒适密度为默认 | Zotero 7 Comfortable 默认 | 行高 10px/间距 8px，后续再做紧凑档 |

不在本次范围：历史集合多标签、拖拽排序、虚拟滚动、入口 badge（需要新的订阅通道，另行评估）。
