# 聊天 ↔ 资料台联动调研与设计（2026-10-17）

问题：资料台如果只是右侧独立窗口，用户要重新描述需求，结果也不回到对话，插件价值会被削弱。本次调研目标是让资料台成为**当前会话的一部分**：对话能触发资料台，资料台能读到对话上下文，结果能回到对话。

## 1. 先看现有产品怎么做

### VS Code Chat Participant

来源：[Chat Participant API](https://code.visualstudio.com/api/extension-guides/ai/chat)

- 用户用 `@participant` 调用领域助手，用 `/command` 调用具体动作，输入框会显示命令与 follow-up。
- participant 能读取**当前聊天历史**（`ChatContext.history`），但历史不会自动进 prompt，由 participant 决定放多少。
- 响应可以包含 Markdown、图片、引用、进度、**按钮**（按钮调用 VS Code 命令），并支持 follow-up 建议。
- 关键点：聊天是入口，命令是触发，历史是上下文，按钮是回跳动作。

### Continue

来源：[Context Selection](https://docs.continue.dev/ide-extensions/chat/context-selection)、[How Chat Works](https://docs.continue.dev/ide-extensions/chat/how-it-works)

- 文字输入是唯一必需上下文；选中代码、当前文件、`@Files`、`@Terminal`、`@Git Diff` 都是可选的附加。
- 选中代码自动进入 prompt，当前文件需要显式按键；`@` 选择具体文件。
- 侧栏 chat 与编辑器共享选择与文件状态，而不是另开一个孤立搜索框。

### Cursor

来源：[Prompting agents](https://cursor.com/docs/agent/prompting)

- `@` 附加文件/文件夹/终端/历史对话/Git diff/浏览器；`/` 调用 skill 或 Custom Mode。
- 上下文用量有环形指示，可查看 breakdown；模型可随时切换。
- 关键点：上下文是**显式可见的附件**，用户知道模型看到了什么。

### Obsidian Copilot

来源：[Context and Mentions](https://github.com/logancyang/obsidian-copilot/blob/67e06f33/docs/context-and-mentions.md)

- 默认自动带当前笔记与选中文本；可关闭。
- `@note`、`@folder`、`@#tag`、`@URL`、`@vault`、`@websearch` 等都是显式上下文。
- 输入区显示 context pills，用户能确认“模型将看到什么”；命令面板提供 **Add selection to chat context**。
- 关键点：自动上下文 + 可见 pills + 手动添加，三者结合最接近“开箱即用”。

### Sourcegraph Cody

来源：[Cody Context](https://sourcegraph.com/docs/cody/core-concepts/context)

- 以 context chips / @-mentions 组织仓库、文件、符号、网页等上下文，聊天侧栏直接显示引用。

### DSH 现有插件

**dsh-better-sidebar（已装）**

- 侧边对话（beta）**继承主会话完整上下文独立运行**，实时推送、排队可见可撤回、每线程独立选模型、可一键提升为顶层会话。
- 提供模型侧 `sidebar_open` 工具，让模型主动打开侧边栏；请求通过 Host 队列 + WebSocket 推给侧栏视图（不是简单的前端状态）。
- 右侧 tab 按 `sessionId` 作用域打开；`openTabIn(sessionId, kind)` 可定向到别的会话。
- 说明：侧边对话是**独立 child session**，适合“另开一个线程”；资料台不是对话，不需要复制一套模型会话，否则会出现两套上下文与凭据选择。

**task-board（已装）**

- 任务执行记录绑定 `sessionId`，可从任务打开执行会话；这是“面板对象 ↔ 会话”的双向引用模式。

**dsh-context（已装）**

- 展示 token/上下文构成，不直接做聊天联动；说明 DSH 里已有“上下文可视化”先例。

**DSH 客户端扩展点**

- `commandUi.register({ name, ui: { kind: 'action', run(session) } })`：注册 `/` 命令；ui-conversation 的 `/file` 即此模式。
- `conversation.chat.node` keyed 渲染器：把资料集作为对话流卡片。
- `conversation.input.right` list：输入区入口。
- `ctx.remote.session.prompt`：唯一把内容送回当前会话的路径。
- `ctx.sidebarRight.openTab('sourcedeck')`：打开右侧资料台。

## 2. 当前资料台的痛点（实测）

| 痛点 | 现象 |
|---|---|
| 独立窗口 | 打开资料台后像另一个应用，用户要重新输入需求，和刚才聊天无关 |
| 无对话上下文 | 第一轮搜索 prompt 只有“需求”，模型不知道用户在聊什么，无法理解“继续/这些/类似” |
| 结果不回聊天 | 候选只在右栏；对话里只有提交后的摘要，且旧卡片不体现轮次 |
| 触发只有按钮 | 聊天里没有 `/deck` 之类入口，模型也不能主动打开资料台 |
| 配置负担 | 早期版本要求站点/正则/策略，用户明确反感 |
| 长轮次无反馈 | 第二轮搜索超过 2 分钟被误判超时，候选到达后 UI 已停止轮询 |

## 3. 设计决定

1. **资料台是当前会话的一个视图，不是独立会话。**
   - 不创建 child session、不复制模型/凭据；搜索 prompt 发给当前会话，使用当前模型与工具。
   - 资料台的 `sessionId` 与右侧 tab 的 `sessionId` 一致，切换会话即切换资料集。

2. **对话触发资料台：`/deck` 命令 + 输入区按钮 + 卡片。**
   - `/deck` 是 client-owned `commandUi` action，打开当前会话的资料台。
   - 输入区「资料台」按钮和对话卡片「在资料台打开」是同一入口的三个位置。
   - 未来可加 `/deck <query>`（需要 Host command 与参数）或模型 `deck_open` 工具（需要 Host→Client 推送通道）；本轮先做 `/deck`。

3. **资料台读取对话上下文。**
   - Host 在 `startRound` 时读取当前 Session 最近 6 条 user/assistant 文本，过滤资料台自身的 prompt，作为“当前对话的最近上下文”写入搜索 prompt。
   - 不把全量历史塞进 prompt；上限 1200 字符，只用于理解指代。
   - 这比让客户端读 chat store 更稳：Host 有权威日志，且不需要 ui-chat 的会话内 hook。

4. **结果回到对话：卡片 + 提交摘要。**
   - 每轮结束更新 `plugin:dsh-source-deck/set-snapshot`；对话卡片显示最近一轮的 request、候选与勾叉状态。
   - 卡片可继续在对话里勾/叉；点击「在资料台打开」回到同一集合。
   - 最终提交仍用 `session.prompt` 把保留/排除/策略摘要发回会话，Agent 下一轮可引用。
   - 不额外发送“每轮摘要”消息，避免每轮都唤醒 Agent；卡片本身就是对话侧的可视结果。

5. **轮次是资料台内部结构，不是新的会话。**
   - 一轮 = 用户需求 + 可选补充说明 + Agent 提交的候选；下一轮 prompt 带上一轮保留/排除与补充说明。
   - 候选按 `roundId` 分组；面板按轮次流式展示。

6. **搜索超时从 2 分钟放宽到 5 分钟并继续轮询。**
   - 实测第二轮 Agent 用了 2 分 09 秒；2 分钟超时会误判并停止刷新。
   - 超时只作为提示，不改变已收到的候选。

## 4. 后续可做（不在本轮）

- `/deck <query>`：Host command 接收参数，直接开资料台并发起一轮。
- 模型 `deck_open` 工具：Host 队列 + 客户端订阅（参考 `sidebar_open`），让 Agent 在回答里主动打开资料台。
- 对话消息引用：把某条对话消息作为一轮的“上下文附件”，显示 context pill。
- 卡片上直接输入补充说明并继续下一轮。

## 5. 验证计划

- `/` 菜单出现「打开资料台」，执行后右侧资料台打开。
- 新会话先聊一句“我在调研 Go 日志库，偏好 zap”，再打开资料台搜“继续找类似的”；会话日志中的 prompt 含“当前对话的最近上下文”与聊天内容。
- 第二轮完成后卡片显示「第 2 轮 · …」，资料台与卡片计数一致。
- 收藏、跳过、排除原因仍可用。
