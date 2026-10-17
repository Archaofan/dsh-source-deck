# RC（dsh-v0.2.0-rc.2）插件接口调研证据

日期：2026-10-17。本文是 SourceDeck 方案设计的第一手接口证据，全部取自沙箱固定基线：

- 源码：`E:/DSH-Desktop-Plugin-Dev/sandbox/dsh-desktop/upstream`
- tag `dsh-v0.2.0-rc.2`，commit `639ed015397290b3745d163aafe02ffee4aa3f84`
- 与用户日用 Desktop `0.2.0-rc.2` 一致；不使用 alpha / master / website 文档作为接口证据。

引用格式：`文件路径:行号`。未在本文出现的接口一律视为未经 RC 验证。

## 1. 对话内交互机制（工具 / 附件 / 命令 / 用户提问 / 审批）

### 1.1 插件与 Host 工具

- 插件是 Cordis 函数插件：`export const name` / `inject` / `Config` / `apply`，无 default export（`packages/AGENTS.md`「Plugin exports」条；混用形式会被 Loader 丢弃，postmortem 0001）。
- 工具注册：`apply(ctx)` 内 `ctx.tools.register(defineTool({...}))`，返回 disposer，插件 fiber dispose 即注销（`docs/cookbook/adding-a-tool.zh.md:9-38`）。
- 定义结构（`docs/subsystems/tools.zh.md:27-103`）：模型可见 schema（name/description/parameters）+ 强制 `output`（`schema` + `render` + 可选 `presentationMeta`）+ `execute(args, exec)` + 可选 `projectContent`/`finalizeContent`/`presentCall`/`presentResult`。
- `execute` 返回规范 JSON 值；注册表快照→校验→冻结后交 `output.render(args, value)` 产出模型可见内容。回流路径：`tool/call`（执行前记）+ `tool/result`（唯一模型可见产出）两个会话事件；循环只持久化 `content`/`error`/`meta`，规范 `value` 不持久化（`tools.zh.md:392`）。
- `ctx.tools.register()` 也直接接受原始 JSON Schema `ToolDefinition`（`docs/cookbook/extension-cookbook.zh.md:9`）。

### 1.2 工具结果在 UI 中的渲染

- Host 侧 `presentCall(args)`→`ToolCallView`、`presentResult(args,{content,isError,meta})`→`ToolResultView`，都是 `card` 标签的封闭联合（generic/terminal/diff/read/search/web），必须是纯函数（`adding-a-tool.zh.md:69-93`）。
- 内置 Web Client 不消费 `presentCall`/`presentResult`；Web Client 通过 keyed slot `tool.call.toolview`（key = wire 工具名）分派客户端组件，props 由三阶段（preparing/start/result）block + 原始 args/content/isError/持久化 `result.meta` 派生（`adding-a-tool.zh.md:97`；`packages/client/ui-tool/src/client/contract/slots.ts:16-32,98-104`）。
- 插件为特定工具做自定义 UI：Host 端注册工具 + Client 半包注册 `tool.call.toolview` keyed 条目；未注册回退 generic 行。
- 需要"模型可见内容无法无损保存的有界结构化事实"时用 `output.presentationMeta(args,value)` 派生可回放 JSON 存进 `result.meta`。

### 1.3 附件（attachment）

- 两类：图片（`ImageAttachmentRef`，PNG/JPEG/WebP/GIF，带 mediaType/bytes/width/height/name）与通用文件（`FileAttachmentRef`）（`docs/subsystems/attachment.zh.md:5-56`）。
- Host seam `ctx.attachments`：`saveImage`/`saveImages`/`saveFile`/`saveFileStream`/`admitPromptContent` 等，先持久化后发布内容寻址引用，落盘 `<DSH_HOME>/attachments/v1`（`attachment.zh.md:186-298`）。
- 会话事件与模型可见附件块只含引用+元数据，绝不含 object URL/宿主临时路径/base64（`attachment.zh.md:5`）。
- 草稿附件是浏览器-owned（`DraftAttachmentId` + `ComposerAttachment`），只能经 composer 的 `addFiles`/`onAddFiles` 路径进入；插件能拿到的是 `inputActions.addAttachments(ids)`（需已有 id）与 `conversation.input.attachments` slot occupant 的 `onAddFiles(files, directories)`（`packages/client/ui-conversation/src/client/contract/input.ts:161-208,222-269`；`contract/slots.ts:57-77`）。
- 结论：RC 没有公开的"把附件程序化加入当前输入框"API（`ConversationController.createDrafts()` 不在 `IConversation` 公开面）。把选中资料作为二进制附件交给 Agent 在 RC 内不现实；更现实的是 `@` 引用 chip。

### 1.4 Slash 命令（commands）

- Host 侧 `ctx.commands.register(CommandDefinition)`（name/description/input/recordInput/handler）；`ctx.commands.execute(agent, line, submittedAttachments, signal)` 是 `@Remote`，由客户端 composer 调（`docs/subsystems/commands.zh.md:35-196`）。
- 执行位置在 Host：handler 直接在接收 agent 上跑，不产生模型消息；结果 `CommandResult`（`{kind:'success',text?,sourceEventSeq?}` | `{kind:'error',text}`）由派发 UI 直接呈现；只追加 `command/run`/`command/done` 日志-only 事件。
- Host handler 不能弹 UI；客户端另有 `ctx.commandUi.register(CommandContribution)`/`decorate(CommandDecoration)` 提供纯客户端 popupSelect/action，弹窗撑满 composer 浮层（`packages/client/ui-commands/src/client/contract.ts:101-149`；`ui-commands/README.zh.md:80`）。

### 1.5 用户提问（user-questions）

- Host seam `ctx.userQuestions`：`ask(request)` 阻塞到答；`askTimed(request, callId, timeoutMs)` 有界前台等待，超时返回 `{pending:true,callId}` 且问题仍可回答；`answer(agent, callId, answer)`（`@Remote`）把迟到回复作为 `user/message`（source `user-question-reply`）排入 agent；`attachWait(agent, callId, signal)`（`@Remote({mode:'stream'})`）让 UI 接管倒计时（`docs/subsystems/user-questions.zh.md:110-277`）。
- `AskUserQuestionItem{id, question, detail?, header?, options?, multiSelect?, intent?}`；答案 `{answers:[{id, selected[], custom?}]}`。
- 模型侧入口是 `ask_user_question` 工具（`dsh-tool-ask-user`，legacy 阻塞 / timed 两种 schema）（`packages/interaction/tool-ask-user/src/index.ts:29-109`）。
- 存活子 agent 不能提问（`DELEGATED_CALLER`）；中断的 PTC 等待可能丢失问题（`tool-ask-user/README.zh.md:157-158`）。

### 1.6 输入框周边扩展点（composer / input）

- 完整 slot 声明树见 `docs/subsystems/slots.zh.md:113-188`。
- composer 一族：`conversation.composer`（chain，现有 occupant：ApprovalPanel/SubagentReadonlyComposer/QuestionComposer）、`conversation.composer.bar`（single，resident composer body，replaceRisk=shadows-shipped-ui）、`conversation.composer.dock`（list，卡片下方）、`conversation.input.dock`（list，卡片上方全宽）、`conversation.input.overlay`（list，卡片内浮层——slash 菜单就在这）、`conversation.input.left`/`conversation.input.right`（list，工具行左右紧凑控件）、`conversation.input.activity`（single，模型选择器与发送按钮之间，可展开工具栏）、`conversation.input.attachments`（single，草稿附件栏+拖放目标）（`packages/client/ui-conversation/src/client/contract/slots.ts:186-223`）。
- `ctx.inputTriggers.registerSource(InputTriggerSource)` 注册 `/` 或 `@` source；`onPick` 返回 `PickOutcome`：`{claim}` 进入命令流、`{insert}` 引用 chip、`{text}` 插入文本、`'handled'`（`packages/client/ui-input-trigger/src/types.ts:160-234`）。已知限制：只有全局 source 层，会话 scope 的 source 注册已有设计但未启用（`ui-input-trigger/README.zh.md:80`）。
- 每个 session scope slot 都拿到标准 prop `inputActions`（captureInsertion/insertText/setDraft/addAttachments/removeAttachment/pruneAttachments/submit）（`slots.zh.md:83-95`）。
- `ctx.conversation` 服务提供 `send(text)`/`cancel()`/`loadOlder()`/`updateQueue()`/`blocks`/`input`（`packages/client/ui-conversation/src/client/service.ts:40-71`）。

### 1.7 审批链对插件工具的影响

- `ask` 决策由注册表在 `tools/pre-execute` 之后、单调 guard 之前解析（`packages/core/tools/src/index.ts:1716-1768`）：没有 ApprovalService、调用没有 agent、或 outcome 非 `allowed-once`，一律 deny。
- 插件工具若要询问用户：在自己的 `tools/pre-execute` 监听里对目标调用返回 `{kind:'ask', reason, displayReason}`；或在 `execute` 内直接 `ctx.approval.request({agent, toolName, callId, reason, signal})`（要求会话处于 open turn）。
- 会话策略 `ApprovalPolicy = 'ask'|'never'`：`never` 在服务内部、waterfall 分发之前就确定性地返回 `rejected`（`docs/subsystems/approval.zh.md:28-140`）。无"always allow"；持久化选择在权限预设（`ctx.permissionPresets`）而非审批 seam。

## 2. UI Slot 与 Client 半包机制

### 2.1 Slot 系统

- Slots 是 Web Client 的类型化 React 组合系统；功能插件通过 `ctx.slots.register()` 贡献 UI（`docs/subsystems/slots.zh.md:1-5`）。
- 注册与声明遵循 Cordis effect 生命周期；向其他包的 slot 贡献功能用 `ctx.slots.inject(key, callback)`：callback 在每段声明生命周期内运行，owner 折叠时其 effect 随之移除（`slots.zh.md:19`）。
- 四个维度：cardinality（single/list/keyed/chain）× scope（root/session-maybe/session）。`priority` 数值越小越先（`slots.zh.md:50-60`）。
- 框架标准 hooks（按 scope 提供）：所有 scope `useSessions`/`useSessionStatus`/`useSessionRetainInfo`/`useWorkspaces`/`usePanelInfo`；`session`/`session-maybe` scope `sessionId`/`useSession`/`useProjection`/`useConversation`/`useInput`/`inputActions`/`useChat`/`useTrajectory`（`slots.zh.md:83-95`）。
- 当前层级（RC 发布组合）关键挂点：
  - `conversation.chat.node`（keyed，对话流业务节点，提供 `useTurnData(key)`）
  - `conversation.chat.assistant-actions` / `commandview` / `turnTail`
  - `tool.call.toolview`（keyed，工具调用自定义视图）
  - `conversation.session.header.actions`（会话头部动作）
  - `conversation.input.activity`（模型选择器与发送按钮之间单个活动控件）
  - `conversation.input.left`/`right`/`overlay`/`dock`
  - `sidebar.right.pane.tab`（右栏 tab，`rightbar.session` 下）
  - `settings.section` / `settings.plugins.tab` 等（`slots.zh.md:113-188`）
- 运行中的动态包可以用 `cordis_inspect what:"client"` 查询实时树与某个精确 key（`slots.zh.md:190`）。

### 2.2 Client 半包（dsh.client）

- 包加入 Client 模块表的方式：package.json 声明 `dsh.client`（`platform: 'web'`、可选 `inject` 边、可选 `immediately`），并在 `exports["./client"]` 导出构建好的 bundle（`docs/subsystems/client-modules.zh.md:80`）。
- 宿主扫描 Loader entry，组合 `window.__DSH_BOOT__` entry 图，在 `/plugins` 下提供带版本的单资源或多资源 combo 脚本（`client-modules.zh.md:5`）。
- 激活时畸形声明或缺失 bundle 聚合为大声 `AggregateError`，该 fiber 进入 FAILED；稳态下只记录警告（`client-modules.zh.md:82`）。
- 浏览器半（`ctx.modules`）拉取并物化 bundle；随包 Web 组合通过 `dsh-client-hmr` 交付动态图快照（`client-modules.zh.md:108`）。
- 真实 manifest 样例：`packages/client/ui-skill/package.json:16-41`（`exports["./client"]` + `"dsh":{"client":{"inject":[...],"platform":"web"}}`）。
- Desktop 走 `@deepseek-ai/dsh-web-app` bundle（`packages/bundle/web-app/cordis.patch.yml:308-326,424-425`），Client slot 面对桌面端生效。

### 2.4 右栏自定义 tab（SourceDeck 主面板挂点）

- 两步注册：① `ctx.sidebarRightTabs.register(definition)` 注册静态 tab 类型（`SidebarRightTabDefinition`：id/kind/patterns/priority/canOpen/title/guide）；② 注册 keyed `sidebar.right.pane.tab`（正文）与 `sidebar.right.pane.tab.title`（chip 标题），key = 定义 id（`docs/subsystems/sidebar-right.zh.md:13,36-51`；`packages/client/ui-sidebar-files/src/client/index.ts:52,81-96` 是完整模板）。
- 优先级三档 `extension | builtin | fallback`；`patterns` 是资源地址 glob（`packages/client/ui-sidebar-right/src/client/tab-registry.ts:49,94-138`）。
- 导航服务 `ctx.sidebarRight`（`ISidebarRight`）：`openResource(address, options?)` / `openTab(kind, options?)` / `close(tabId)` / `active()` / `isExpanded()` / `toggleExpanded()` / `focus/split/float/dock` / `mounted`（当前屏幕 Session 快照）/ `registerCloseHandler(kind, handler)`（`service.ts:186-259,277`）。
- 正文组件经注入 hook `useTabInfo()` 读 sidebar/panel/tab 实时信息（`contract/slots.ts:164-190`）。
- 右栏相关 slot：`rightbar.session`（single/session）、`sidebar.right.pane.tab`（keyed/session）、`sidebar.right.pane.tab.title`（keyed/session）、`sidebar.right.tab.guide`（chain/session）、`sidebar.right.tab.guide.entry`（keyed/session）、`sidebar.right.tab.menu.item`（list/session）（`ui-sidebar-right/src/client/contract/slots.ts:41-104`）。

### 2.5 client-resources（地址即活数据）

- 地址语法 `dsh-resource://<type>/…`；协议拥有者 `ctx.resources.register({ protocol, open })`，`open(address, { signal })` 返回 `AsyncIterable<RemoteResult<V>>` 帧流（首帧当前状态，之后每变一帧）；一个协议恰有一个提供方（`docs/subsystems/client-resources.zh.md:11-51`；`packages/client/resources/src/client/contract.ts:60-115`）。
- 任何 slot 组件（不论 scope）在 props 上收标准 hook `useResource<P>(address)`，返回 `{status: 'none'|'loading'|'live'|'failed', value?, failure?}`（`contract.ts:21-26`）。
- `ctx.resources.pin(address, signal)` / `source(address)` 供 React 外持有/读取；右栏每条打开的 tab 在存续期钉住地址（`client-resources.zh.md:86`）。
- 新协议只需在 `ResourceProtocolMap` 上声明合并值类型，不新增 scheme（`ui-slots/src/index.ts:47`）。

### 2.6 设置与插件页挂点

- `settings.section`（list/root，options id/order/label）整页；`settings.general.item`（list/root，空 owner，行内控件与写路径自绘）；`settings.plugins.tab`（`packages/client/ui-settings/src/client/contract/slots.ts:15-93`；`ui-settings-plugins/src/client/index.ts:76-84`）。
- 插件管理页：`plugins.item`（list/root，**已被官方占用**）、`plugins.bundle.config` / `plugins.row.config`（keyed/root）、`plugins.detail.actions/badge/section`（list/root，`subject` = bundle/row/item）（`ui-plugin-manager/src/client/slot-contract.ts:75-122`）。
- 即时配置字段：Config schema 用 `.volatile()` 声明、`ctx.on('loader/volatile-update')` 感知；自定义插件页面经 `ctx.configForms.whileServed(namespaces, register)` 注册（`docs/cookbook/adding-a-settings-card.zh.md:9-28,42,56-71`；`ui-settings/src/client/config-form.ts:317`）。

### 2.7 Client 侧可用 service 与构建约束

- Client service：`ctx.remote.<namespace>`（session/workspace/workspaceFiles/terminal/job/account/settings/credentials/skills/fileReferences/goals/llm/commands/pluginManager/subagents/userQuestions/schedule 等，`packages/api/remotes/src/client/index.ts:181-188`）；`ctx.uiSession` + `sessionId`/`useSession`/`useSessions`/`useSessionStatus`/`useSessionRetainInfo`/`useProjection`（`ui-session/src/client/index.ts:151-193`）；`ctx.resources`/`useResource`；`ctx.slots`/`ctx.locale`/`ctx.shortcuts`/`ctx.layout`/`ctx.sidebarRight`/`ctx.sidebarRightTabs`/`ctx.configForms`/`ctx.uiConversation`/`ctx.modules`。
- 构建：`./client` 产物必须是 lazy-CJS factory（`window.__ModuleLoader__.load({id, factory})`）；生成预设 `clientBundle` 在 `packages/client/tsdown.client.ts:110`，**不在任何已发布的包里，仓库外包要自己复刻**（`adding-a-settings-card.zh.md:58-60`）。
- 隐式基线外部：React、Cordis、`client/store`、`ui-primitives`、`ui-slots`、`ui-dockkit` 不得写进 package.json（`packages/client/AGENTS.md`「Shared modules」）。
- 组件零 ctx：一切数据经 props share；功能插件不得运行时 import 其他功能插件的值（`import type` 除外）（同文件「ctx discipline」「Export discipline」）。
- 完整挂点机读目录：运行中 `cordis_inspect what:"client"`；源码 catalog 由 `pnpm run gen-client-catalog` 生成（`slots.zh.md:190`）。

### 2.3 Client 插件约束（上游规约，第三方插件参考）

- 组件绝不收到 `ctx`；数据经五个 props share（PropsRuntime/PropsRenderSlots/PropsRenderFactories/PropsStore/inject face）进入（`packages/client/AGENTS.md:39-41`）。
- 注册用 `ctx.slots.inject(name, () => ctx.slots.register(...))`；裸 register 进未声明 slot 是错误（`packages/client/AGENTS.md`「New plugin package checklist」第 4 条）。
- 功能插件不得运行时 import 或 re-export 另一个功能插件的值；共享声明用 `import type`；UI 跨包走 slots（`packages/client/AGENTS.md`「Export discipline」第 3 条）。
- `ui-primitives` 是唯一可共享控件的包；插件不能 import 其他插件的组件（同文件「New component checklist」第 1 条）。第三方插件需自绘控件。
- 产品文案走 locale 词典 + `t` seat（`verify-client-ui-i18n`）；CSS 用 `--dsw-*` token + CSS Modules，无字面颜色/组件库/Tailwind（同文件「Styling and localization」）。

## 3. Agent 接续与会话身份（Client 唯一官方链路）

### 3.1 Host 侧 Agent API

- `ctx.agents` 是 Host 侧 `AgentRegistry`（`@deepseek-ai/dsh-agent`）：`create()`/`resume()` 返回 `AgentHandle{agent, dispose()}`；`get(id)`/`list()`/`roots()`（`packages/core/agent/src/index.ts:160-163,566-596`）。
- `Agent.followup/steer/inject/cancel` 全部返回 `void`，无 MessageId 回执；回执从 `agent/inbox/inserted|claimed|discarded` 事件或 inbox 投影观察（`packages/core/agent/src/runtime-types.ts:215-241`；`docs/subsystems/core.zh.md:868-882`）。
- 三者是 `send(message, target, wakeup)` 的固定别名：followup=`next-turn`+wake、steer=`next-step`+wake、inject=`next-step`+no-wake；取消后唤醒一律降级 `next-turn`（`packages/core/agent-loop/src/agent.ts:154-173`）。
- 忙碌语义：followup 排队等当前轮次结束；steer 在运行中于下一个 step 边界被消费（不新增 turn 边界）；inject 不唤醒（`packages/core/agent-loop/src/inbox.ts:97-114`）。
- cancel 持久 `turn/end{kind:'aborted'}`，不带 keepInbox 时清空 inbox 并记录 splice。

### 3.2 Client → Host 回传（SourceDeck 的唯一官方途径）

- 浏览器 Client 插件**不能**调 `ctx.agents`；Client ctx 上只有 `ctx.remote`（`docs/subsystems/web-client.zh.md:30`；`packages/api/remotes/src/client/index.ts:163-171`）。
- 官方链路：`ctx.remote.session.prompt({ requestId, sessionId, mode: 'queue'|'steer', content, clientTimeZone }, signal)`，Host 映射 `mode==='steer' ? agent.steer(msg) : agent.followup(msg)`（`packages/api/session-controller/src/commands.ts:364-365`；`index.ts:425-429`）。
- `requestId`（`SessionRequestId`）做幂等；Host 把它回显成 durable user source 的 `rpcId`（`commands.ts:330-335`；`types.ts:398-405`）。
- 队列操作：`updateQueue({action:{kind:'steer'|'edit'|'remove'}})`；steer action 仅当 `target==='next-turn' && agent.status==='running'`，否则 `session/steer-unavailable`（`commands.ts:432-504,477-479`）。
- 取消：`ctx.remote.session.cancel({sessionId})` → `agent.cancel({kind:'user'},{keepInbox:true})`；硬编码 cause 与 keepInbox（`commands.ts:511-525`）。
- 当前会话身份：Client 侧从 slot 标准 prop `sessionId` 读（`packages/client/ui-session/src/client/index.ts:163-179,259-272`）；Host 侧 `ctx.agents.get(sessionId)`。
- 结果回流：prompt 返回值只有 `{accepted:true}`；用 `session.follow` stream 读持久事件、`session.control` 读 inbox 投影与 running 状态（`packages/api/session-controller/src/client/sessions/session.ts:230,271-359`）。
- prompt 会静默恢复冷会话（`agent.ts:194-197,437-438`）；内容必须含非空白文本（`commands.ts:312-318`）。
- subagent 子会话被 ownership fence 拒绝，须走 `ctx.remote.subagents.prompt({parentSessionId, childSessionId, ...})`（`session.ts:291-299`）。
- **RC 缺口：`inject()` 无 Remote 出口**；"只给模型看不唤醒"的语义在前端做不到，只能降级 queue/steer。

## 4. Remote API（Client ↔ Host 桥）

- Host 侧：继承 `TypertRemoteService` 绑定 service key 与 wire namespace，`@Remote` 标注对外方法；lookup 对象（`Agent`、`Session`）占顶层参数位，`signal` 放最后（`docs/cookbook/adding-a-remote-api.zh.md:9`）。
- 失败：唯一 `RemoteError` + 域码表（declaration merging 进 `RemoteErrorDetailsMap`）（同文件 `:53-61`）。
- `@Remote` 必须落在 Loader entry 插件包；包清单补 `./typert` 与 `./remote` 生成入口与 protocol peer（同文件 `:92-103`）。
- Client 侧：`inject` 声明 `remote` 与 `remote.<namespace>`，调用 `ctx.remote.<namespace>.<method>(...)`，结果 `RemoteResult<T>`，就地 `if (!result.ok)` 分支判 `code`（同文件 `:109-111`）。
- 签名/码表/namespace/导出名变更后必须重跑 `pnpm run build:lib`（同文件 `:105`）。

## 5. 持久化与数据模型

### 5.1 插件持久化：ctx.storageDomain + defineDomain

- 没有 `ctx.storage.get/set` 式的 per-plugin KV。`ctx.storage` 是枢纽（`register(name, backend)` / `backend.get(name)`）；类型化 API 是 `ctx.storageDomain`（`DomainFacility`，仅 `open(spec)`/`get(name)`/`closeAll()`）（`packages/storage/storage-domain/README.zh.md:12,36-73`；`docs/subsystems/storage.zh.md:5-126`）。
- 插件用 `defineDomain({name, version, tables, global, layout, compatibleVersions, invalidRecords})` 声明自己的领域；`await ctx.storageDomain.open(spec)` 拿句柄；句柄 `table(name)` → `get/entries/keys/size/put/delete/update`，`global.get/set`，`close()` 释放（`storage.zh.md:101-126`）。
- 作用域没有 global/workspace/session/channel/per-plugin 选项——作用域 = 域名+表名+记录键三元组，由插件作者自选；域名/表名匹配 `/^[a-z][a-z0-9_]*$/`，per-record 记录键匹配 `[a-zA-Z0-9_-]+`（会变成文件名）（`packages/storage/storage/src/backend.ts:10,96-102`）。
- 值是 opaque JSON-serializable record；二进制走 `ctx.attachments`（Uint8Array 进、内容寻址 ref 出，落 `<DSH_HOME>/attachments/v1`），大文本走 `ctx.spillStore.saveText` → `SpillRef{locator, bytes, retrievalHint}`（`docs/subsystems/spill.zh.md:11-25,90`）。
- 桌面 base 只挂 `storage-json` 后端（`root: $DSH_HOME/storages`），无 sqlite 行；第三方插件无法为自己的域单独指定后端（`packages/bundle/base/cordis.patch.yml:165-176`；`packages/storage/storage-domain/src/index.ts:52-61,109-110`）。
- 写链：先持久化→再改内存→再发 `domain/changed`（仅进程内）（`storage.zh.md:126`）。

### 5.2 模型可见性边界

- 存储域/枢纽/后端对模型完全不可见（不注册工具、不注入提示词、不写会话事件）（`storage-domain/README.zh.md:134-138`；各存储包 Model Experience 节）。
- 会话日志是唯一真源；surface 事件（`system/message`、`user/message`、`developer/message`、`assistant/message`、`tool/result`）经 `deriveMessages()` 投影为模型消息；log-only 事件只占 seq（`docs/subsystems/session.zh.md:300,670-677`）。
- 仓库级不变量："Model-visible ⟺ logged"——新 model-visible 输入要求对应 session 事件（上游根 AGENTS.md）。

### 5.3 会话事件（v4）与插件自定义事件

- 写入器 `SESSION_FORMAT_VERSION = 4`（`packages/core/session/src/types.ts:89`）；发布记录滞后（latestReleasedVersion=3，无 0.2.0 条目），设计上按"V4 已随本 RC 发布"对待（`docs/session-format-status.zh.md:31-49`）。
- 插件可对 `SessionEventMap` 做 declaration merging 追加自定义事件。约束：只能是仅日志事件（非 `SurfaceEventType`，编译期拒绝 surfaceOp）；`data` 必须无损 JSON（`Session.append` 源头 `isJsonValue` 校验）；默认 required-on-read——不认识该类型的构建拒绝解读整个日志，除非事件带 `ignorable: true`；不 bump `SESSION_FORMAT_VERSION`（`session.zh.md:266-292,349-358,753-757`；`docs/persistence-catalog.zh.md:12-102`）。
- append 是 best-effort；`ctx.sessions.flush(session)` 才是持久屏障（`docs/subsystems/persistence.zh.md:41-110`）。
- 组装 Web Conversation Node 的事件族（start/update/result）必须携带同一稳定业务 id（`docs/subsystems/conversation.zh.md:56-70`）。

### 5.4 磁盘布局与版本/迁移/卸载

- `$DSH_HOME` 解析：显式配置 > `$DSH_HOME` > `~/.dsh`（`packages/util/home-paths/README.zh.md:34-39`）。沙箱实测：`sessions/--<normalized-cwd>--/<encoded-session-id>/session.v4.jsonl.zstd`；`storages/<unit>.json`（single）；`storages/<unit>/<table>/<key>.json`（per-record，`{"version":N,"record":...}`）（`packages/session/session-persistence-jsonl/README.zh.md:58-72`；`storage-json/README.zh.md:88`）。
- 无自动迁移：域 version 不匹配即 `version-mismatch` 拒绝打开；兼容手段是 `compatibleVersions`（per-record 才支持）与 `invalidRecords:'backup-and-skip'`（`storage-domain/README.zh.md:153`；`storage.zh.md:58-87`）。
- 卸载不删任何数据：plugin-manager 卸载 = 移出 bundles + 卸载运行时贡献 + `pnpm remove`；"应用数据保持原样"（`plugin-manager/README.zh.md:148-150`）。会话日志 seam 无删除接口（`session-persistence-jsonl/README.zh.md:163`）。"卸载即清空"需插件自己在 disposer 实现。
- spill 默认根是每进程私有 0700 OS 临时目录（非 DSH_HOME），启动时按 30 天年龄清理；长期可找回需部署方配置 root（`packages/spill/spill-local/README.zh.md:41-45`）。

## 6. 版本兼容、打包与安装

### 6.1 兼容声明（硬门）

- 加载器只读三处普通字段：`name`/`version`、`peerDependencies`（唯一兼容性来源）、`dsh.bundle.patch`（`packages/boot/app-boot/src/plugin-compatibility.ts:31-37`）。
- 只检查名为 `@deepseek-ai/dsh` 或 `@deepseek-ai/dsh-*` 开头的 peer 项；`semver.satisfies(runtimeVersion, requirement, { includePrerelease: true })` 判定；`workspace:^`/`workspace:~`/`workspace:*` 替换为运行时版本；其他 `workspace:` 形式失败关闭；运行时版本读 app-boot 自身 package.json = `0.2.0-rc.2`（同文件 `:44-49,75-83`；测试 `tests/plugin-compatibility.spec.ts:55-59`）。
- `0.2.0-rc.2` 的准确写法：精确 `"0.2.0-rc.2"` 最稳；`^0.2.0` 也能过（includePrerelease），但会顺带接受后续 minor 的 prerelease（node-semver 语义推定，未经 RC 断言）——违背"只维护选定 RC"约定。`engines.dsh` 有类型但 RC 无 reader 强制执行（`packages/util/package-manifest/src/types.ts:23,57-66`）。
- 每个实际 import 的 `@deepseek-ai/dsh-*` 都要在 peerDependencies 声明（判定对每一项求交），并在 devDependencies 镜像供类型检查（`docs/user/develop/basic/publish.zh.md:103`）。
- 兼容门三处生效：安装前 preflight 直接拒绝（`plugin-manager/src/operations.ts:332-351`）；boot 时不兼容 bundle 静默 skip 只打一行 stderr（`app-boot/src/profile.ts:675-682`）；管理面报 `incompatible-version`。**"声明错了"的症状可能是插件不出现**——验收需包含负向验证。

### 6.2 包结构与分发

- Host/Node 半 `src/index.ts` + 浏览器半 `src/client/index.ts`，经 `exports["./client"]` 暴露（`packages/client/ui-user-questions/package.json:21-24`）。
- 函数插件命名导出 `name`/`inject`/`Config`/`apply`，**绝不能有 default export**（混用会被 Loader 丢弃命名空间；`packages/AGENTS.md`「Plugin exports」；`docs/postmortem/0001`）。
- 单 npm 包 = 一个组合包：`dsh.bundle.patch` 指向 `cordis.patch.yml`，patch 行按包名引用（`docs/user/develop/basic/publish.zh.md:35-62`）；`files` 必须覆盖所有相对运行时导入与产物（`packages/client/AGENTS.md`「Dependency declaration」第 7 条）。
- RC 无 `examples/` 脚手架；根 `pnpm run build` 不构建树外插件；现实路径 `pnpm pack` 出 `.tgz`（沙箱 `Install-Plugin.ps1` 只吃项目内 `.tgz`）；git 安装需 prepare + allowBuilds 授权，不采用（`publish.zh.md:167-184`；`scripts/build.ts:44-46`）。

### 6.3 安装/启用/停用（沙箱链路）

- 沙箱链路：`Install-Plugin.ps1` → `Common.ps1:137-154`（Electron `ELECTRON_RUN_AS_NODE=1 --expose-internals` 跑 `scripts/desktop-cli.mjs`）→ adapter 只放行 `list|add|remove` 并拼 `plugin --profile desktop ...` → `runDesktopCli`（`manageDesktopProfile: true`）。普通 CLI 硬拒 `desktop` profile 保留名（`apps/cli/src/args.ts:83-87`）。
- 行级启停只改 profile `cordis.patch.yml` 最后一条匹配覆盖项的 `disabled`（无匹配则追加）；包级启停改 `package.json` 的 `dsh.profile.bundles`，关闭保留依赖（`plugin-manager/src/patch.ts:14-42`；`index.ts:419-448,715-735`）。`disabled:true` 卸载插件但不删条目（`docs/cordis-tutorial/06-composition-and-hmr.zh.md:19`）。
- HMR：Host 半源码热更需 profile patch 显式打开且 `config.root` 指向插件目录；替换已安装包版本仍需重启（`packages/boot/hmr/README.zh.md:27-36,88-89`）；Client 半热更依赖 `dev:web` 持续重建 `lib/client.js`（`client-modules.zh.md:76`）。

## 7. 待确认（沙箱实测项）

1. 第三方插件安装进沙箱 desktop profile 后，其 `dsh.client` 半包是否被组合进 boot graph（client-modules 扫描宿主 Loader entry；第三方 bundle 需实测）。
2. `conversation.chat.node` / `tool.call.toolview` / `conversation.input.*` 对第三方插件的可用性（SlotMap 声明合并是否要求同 monorepo 构建）。
3. Host 侧插件 emit 自定义 session 事件（`SessionEventMap` 声明合并）在第三方包中的实际行为。
4. `^0.2.0` 是否会顺带接受 `0.3.0-alpha.x`（node-semver 推定，需实测后决定 peer 写法）。
5. Desktop profile 中第三方插件的启用/停用/卸载恢复行为（沙箱 adapter 只有 list/add/remove；停用需 GUI 或 plugin_manager 工具）。
6. RC 的 `pnpm run build` 不构建独立插件包；SourceDeck 自己的构建配置（tsdown 直接转译 src/）与 `.tgz` 打包需在实现阶段建立。
7. 无密钥启动验证与真实模型调用验证需分开记录；首次模型登录由用户在沙箱单独完成。
