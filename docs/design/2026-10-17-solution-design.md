# SourceDeck 方案设计（v1，待审阅）

日期：2026-10-17。状态：**设计稿，未实现**。接口证据见 [research/2026-10-17-rc-interface-evidence.md](../research/2026-10-17-rc-interface-evidence.md)（全部基于沙箱固定 RC `dsh-v0.2.0-rc.2`，commit `639ed015397290b3745d163aafe02ffee4aa3f84`）。

> 实施环境更新（2026-10-17 夜）：共用沙箱已按用户批准升级到 `0.2.1-rc.2` 作开发环境；方案与决策未变，接口差异与适配结论见 [research/2026-10-17-0.2.1-rc.2-interface-delta.md](../research/2026-10-17-0.2.1-rc.2-interface-delta.md)。产品 peer 仍为 `0.2.0-rc.2`，是否切换由用户另行选择。

## 1. 结论

**推荐方案 A「右栏资料台 + 对话流候选卡片 + session.prompt 回传」**：SourceDeck 做成单 npm 包（`dsh-source-deck`，同时含 Host 半与 Client 半的组合包 bundle），主 UI 是右栏自定义 tab 类型，Agent 提交的候选资料以对话流业务卡片就地呈现，用户勾选/排除后由 Client 经自建 Remote 交给 Host，Host 落库并 emit 会话事件，最后 Client 调官方 `ctx.remote.session.prompt`（忙碌 `steer` / 空闲 `queue`）把选择摘要交回当前会话的 Agent。

一句话理由：RC 没有"筛选面板→回传 Agent"的专用 API，但官方提供了三块成体系的积木——右栏 tab 类型（ui-sidebar-files 先例）、对话流业务节点（ConversationNodeDefinition 先例）、`session.prompt` Remote（内置输入框的同款回传路径）；方案 A 是唯一把"常驻筛选空间、就地筛选、官方回传"三者同时凑齐且不改 agent loop 的组合。方案 B（输入框浮层）和方案 C（仅工具卡片）分别缺少常驻空间与批量比较能力，降级为 A 的辅助入口。

### 1.1 目标场景（2026-10-17 用户确认）

- **想法验证 / 造轮子前调研**："我想实现一个想法，先确认这个功能有没有成熟的、或有人已经造了的轮子。"
- **工程优化调研**："某某功能需要你先去调研相关的开源高星、还经常在更新的实现，然后学习来优化当前实现。"
- **资料汇总与对比**：一批来源（文章、仓库、文档）进来后人工筛选、汇总、对比，再把结论交回 Agent 继续。

共同结构：**先声明范围 → 收集候选 → 人工筛选 → 交回 Agent**。SourceDeck 覆盖全链路；范围声明是其中可配置的一环（见 §5.5 来源范围配置）。

## 2. 设计边界（RC 实测能力盘点）

### 2.1 可直接使用

| 能力 | 机制 | 证据 |
|---|---|---|
| Host 工具 | `ctx.tools.register(defineTool(...))`，模型可调用 | adding-a-tool.zh.md:9-38 |
| Client 半包注入 | `dsh.client` manifest + `exports["./client"]` lazy-CJS bundle | client-modules.zh.md:80；adding-a-settings-card.zh.md:58-70 |
| 右栏自定义 tab | `ctx.sidebarRightTabs.register` + keyed `sidebar.right.pane.tab` | sidebar-right.zh.md:13,36-51；ui-sidebar-files/src/client/index.ts:81-96 |
| 右栏导航 | `ctx.sidebarRight.openTab/openResource/...` | service.ts:186-259 |
| 对话流业务行 | `ConversationNodeDefinition` + keyed `conversation.chat.node` | conversation.zh.md:171-243 |
| 工具结果自定义视图 | keyed `tool.call.toolview`（key=自己的工具名） | ui-tool/src/client/contract/slots.ts:26-32 |
| 输入区控件 | `conversation.input.right`（list，additive） | slots.zh.md:113-188 |
| 设置整页 | `settings.section`（list/root） | ui-settings/src/client/contract/slots.ts:57 |
| Client↔Host 桥 | 自建 `TypertRemoteService` + `@Remote`，Client `ctx.remote.<ns>.*` | adding-a-remote-api.zh.md:9-111 |
| 交回 Agent | `ctx.remote.session.prompt({mode:'queue'\|'steer'})` | session-controller/src/commands.ts:364-365 |
| 插件持久化 | `ctx.storageDomain` + `defineDomain`（per-record JSON） | storage-domain/README.zh.md:36-73 |
| 模型可见性 | 自定义 log-only 会话事件（`SessionEventMap` 声明合并，`ignorable:true`） | session.zh.md:266-292,753-757 |
| 大对象外置 | spill（文本）/ attachments（二进制），只存 ref | spill.zh.md:90；attachment.zh.md:5 |
| 官方类型声明 | npm 有 `@deepseek-ai/dsh-client-ui-chat@0.2.0-rc.2` 等包（2026-10-17 实测） | 见 §9 风险 R2 |

### 2.2 RC 不可用或受限（设计规避）

| 缺口 | 影响 | 规避 |
|---|---|---|
| `agent.inject()` 无 Remote 出口 | 前端无法"只给模型看不唤醒" | 降级为 queue/steer，产品上明示 |
| 程序化加草稿附件无公开 API | 不能把选中资料作为二进制附件插入输入框 | 提交走 prompt 文本（含 URL 列表）；资料正文 ref 由 Agent 用 read/grep 取回 |
| `presentCall/presentResult` 封闭 card 联合且 Web Client 不消费 | Host 侧无法自定义工具卡片 | 工具结果 UI 走 Client `tool.call.toolview` |
| Host command handler 不能弹 UI | slash 命令不能直接开面板 | 首版不用 Host command；入口是 `input.right` 按钮 |
| 无 per-plugin 存储作用域；无 schema 迁移；无卸载清理 | 域名全局；破坏性 schema 变更直接拒绝打开；卸载后数据留盘 | 域名加产品前缀 `source_deck`；schema 只加可选字段；设置页自建"清除数据" |
| approval 无 always allow | 插件工具每次询问只能一次性授权 | 首版工具不做危险操作，不需要审批 |
| input trigger 只有全局 source 层 | `/deck` 无法按会话遮蔽 | 首版不用 input trigger；用 `input.right` 按钮 |
| 桌面 base 只挂 storage-json 后端 | 不能假定 sqlite | 域走 json per-record |

## 3. 方案比较

| 维度 | A. 右栏资料台 + 对话卡片 + prompt 回传（推荐） | B. 输入框 `/deck` 浮层筛选 | C. 仅工具结果卡片内筛选 |
|---|---|---|---|
| 常驻筛选空间 | 右栏 tab，可滚动、可分栏/浮出、可开多个 tab | composer 浮层，空间受输入框约束 | 无，限于卡片高度 |
| 批量比较/排除 | 列表 + 分组（待处理/保留/排除）+ 详情 | 菜单式候选，一次 pick 一个 | 卡片内列表，空间小 |
| 对话内入口 | `input.right` 按钮 + Agent 卡片就地操作 | 键入 `/` 触发（全局 source） | 只有等模型调用工具 |
| 用户手动加资料 | 面板表单（URL/标题/备注/正文） | 菜单 candidate 输入 | 不可 |
| 回传 Agent | `session.prompt` queue/steer（官方同款路径） | chip 提交时 serialize 成模型文本 | 需自建 Remote + prompt |
| RC 风险 | 中（第三方 client half 进 boot graph 待实测） | 中（input trigger 全局层+ReferenceCodec 新机制） | 低（只依赖 tool.call.toolview） |
| 与官方先例 | ui-sidebar-files（右栏）+ conversation.zh.md 示例（业务节点） | 无完整先例 | ui-tool 自带 toolview 注册样例 |
| 扩展性 | 高（多资料集、资源协议地址寻址、版本链） | 低 | 低 |

**取舍说明**：B 的 `/deck` 触发符与 A 的 `input.right` 按钮解决同一个"入口"问题，但 A 的按钮是 list slot（additive、无遮蔽风险），B 的 input trigger 只有全局层且 ReferenceCodec 是新机制；B 保留为后续可选入口。C 的全部交互挤在工具卡片里，违背"一批资料直接筛选"的核心场景，其机制（tool.call.toolview）被 A 吸收为候选卡片的备选渲染路径。**不采用"自动搜索+评分"路线**：那会重做 dsh-search-enhance 且把首版拖入网络审批与评分算法，与"人工筛选"的产品价值相悖。

## 4. 推荐方案架构

### 4.1 组件划分（单 npm 包 = 一个组合包）

```
dsh-source-deck/                 npm 包名 dsh-source-deck，dsh.bundle.patch → cordis.patch.yml
├── src/index.ts                 Host 半：name/inject/apply（命名导出，无 default export）
│   ├── tools.ts                 Host 工具 deck_submit_sources（defineTool）
│   ├── remote.ts                TypertRemoteService「sourceDeck」命名空间
│   │     addSource / listSets / getSet / decide / commitSelection / clearData
│   │     getScopePolicy / setScopePolicy
│   ├── domain.ts                defineDomain('source_deck') + open/读写
│   ├── events.ts                SessionEventMap 声明合并（log-only 事件）
│   ├── scope-policy.ts          来源范围策略：预置源参数 schema + 合规校验
│   └── prompt.ts                选择摘要文本构造（模型面向）
├── src/client/index.ts          Client 半：apply/inject（exports["./client"]）
│   ├── deck-tab.ts              sidebarRightTabs.register + sidebar.right.pane.tab 注册
│   ├── deck-store.ts            注册期 slot store（面板视图状态）
│   ├── set-card.ts              ConversationNodeDefinition + conversation.chat.node 注册
│   ├── entry-button.ts          conversation.input.right 注册（打开资料台）
│   └── settings.ts              settings.section 注册（数据管理 + 来源范围配置）
├── locale/{en,zh}.json          产品文案（typed locale dictionary）
└── lib/                         构建产物（tsdown：Host lib + clientBundle lazy-CJS）
```

兼容声明（实现阶段落 `package.json`；2026-10-17 用户决定切换支持基线后更新为 `0.2.1-rc.2`）：

```json
{
  "name": "dsh-source-deck",
  "version": "0.1.2",
  "type": "module",
  "peerDependencies": {
    "@deepseek-ai/dsh": "0.2.1-rc.2",
    "@deepseek-ai/cordis": "4.0.5"
  },
  "devDependencies": {
    "@deepseek-ai/dsh-client-ui-chat": "0.2.1-rc.2",
    "@deepseek-ai/dsh-client-ui-sidebar-right": "0.2.1-rc.2",
    "@deepseek-ai/dsh-client-ui-session": "0.2.1-rc.2",
    "@deepseek-ai/dsh-client-ui-slots": "0.2.1-rc.2"
  },
  "dsh": {
    "bundle": { "patch": "./cordis.patch.yml" },
    "client": { "platform": "web", "inject": ["@deepseek-ai/dsh-client-ui-chat", "@deepseek-ai/dsh-client-ui-sidebar-right"] }
  }
}
```

peer 一律写**精确 `0.2.1-rc.2`**：`^0.2.0` 虽因 `includePrerelease` 能过 RC 门，但会顺带接受后续 minor 的 prerelease（node-semver 语义，未经 RC 断言），违背"只维护选定 RC"约定。每个实际 import 的 `@deepseek-ai/dsh-*` 都要进 peer（兼容门对每一项求交）；实际 Host 半不 import 其他 dsh 包，因此最终 manifest 只保留 `@deepseek-ai/dsh` 与 cordis 两条 peer。devDependencies 里的官方 Client 包只用于 `import type` 拿 SlotMap 声明（类型在构建期擦除，不进 bundle）。

### 4.2 数据流

```
[模型] --调用 deck_submit_sources--> [Host 工具 execute]
    → 写域（sets/sources/candidates）→ emit log-only 事件 source-deck/set-opened
    → output.render 返回面向人的简短确认（"已收入 N 条候选"）

[Client 对话流] ConversationNodeDefinition 折叠 set-opened 事件 → 候选卡片（可勾选）

[用户] 在卡片或右栏勾选/排除
    → ctx.remote.sourceDeck.decide → Host 写 verdict + emit source-deck/candidate-decided
    →（不唤醒 Agent）

[用户] 点"提交给 Agent"
    → ctx.remote.sourceDeck.commitSelection → Host 写 selections + emit source-deck/selection-submitted
      → 返回 { selectionId, promptText }
    → Client ctx.remote.session.prompt({ requestId=selectionId, sessionId, mode, content:[promptText] })
    → Host: mode==='steer' ? agent.steer : agent.followup
    → Agent 下一轮/下一步看到选择摘要（普通 user/message）
```

## 5. 用户操作流程

主流程（7 步）：

0. **声明范围**（一次性，可随时改）。用户在设置页「来源范围」选择来源类型并填筛选参数（如 GitHub：stars ≥ 500、近 6 个月有提交、语言 Go/TypeScript、排除 fork/archived）；或选「LLM 自主」只留一段指导语。策略持久化，提交候选时自动生效（§5.5）。
1. **带入资料**。两条路：① Agent 在对话中调用 `deck_submit_sources`（按当前策略检索后提交，可携带 stars/最近更新等元数据）；② 用户在右栏资料台点"添加资料"，填 URL/标题/备注（可粘贴正文）。
2. **出现候选**。对话流出现候选卡片（列出标题/域名/snippet、策略合规标记，重复项合并标注）；右栏资料台自动打开（或点 `input.right` 的「资料台」按钮打开），显示同一集合。
3. **筛选**。卡片或面板中逐条「保留 / 排除（可填理由）」；面板按 待处理/保留/排除 分组，显示计数；不符合策略的候选有标记但仍可保留（用户最终拍板）。此阶段不打扰 Agent。
4. **提交**。面板点「提交给 Agent」。系统构造选择摘要（保留清单+排除理由+策略符合情况），经 `session.prompt` 进入当前会话：Agent 忙碌 → steer（下一步边界生效）；空闲 → queue（新轮次）。
5. **Agent 继续**。Agent 在下一轮/下一步看到摘要与保留资料 URL，按用户意图阅读/比较/排除。
6. **回溯**。任何时候重开资料台可看历史集合与决定；对话流卡片随会话持久，重启后回放重建。

### 5.5 来源范围配置（2026-10-17 用户确认加入）

**定位**：这不是"内置搜索引擎+自动评分"，而是**把用户的来源约束结构化，作为 Agent 检索与人工筛选的共同基准**。SourceDeck 不联网抓取；元数据由 Agent 提交（LLM 检索时自然获得 stars、最近提交时间等），Host 只做策略比对、标记与展示。首版预置三种策略类型：

| 类型 | 参数（首版） | 用途 |
|---|---|---|
| `github` | `minStars`、`updatedWithinMonths`、`languages[]`、`licenses[]`、`topics[]`、`excludeForks`、`excludeArchived` | "调研开源高星且活跃更新的实现" |
| `web` | `domainsAllow[]`、`domainsBlock[]`、`preferOfficialDocs` | 文章/文档/教程类来源 |
| `llm-freeform` | `guidance`（自由文本，如"优先官方文档与高星项目"） | 不缩窄范围，只传达倾向 |

**生效方式**：
- 工具 `deck_submit_sources` 的返回文本与 `source-deck/set-opened` 事件都附带当前策略摘要，Agent 提交时即知晓约束；下一批候选可自行修正（flags 反馈闭环）。
- 每条 candidate 入库时 Host 按策略计算 `policyFlags`（如 `stars-below`、`stale`、`fork`、`archived`、`domain-blocked`）；卡片与面板显示标记，不阻断保留。
- 策略可随时在设置页修改；修改只影响后续提交的候选（已入库候选的 flags 不重算，保持历史原样）。

**明确不做（首版）**：程序化调 GitHub API 校验元数据（需网络审批，列为扩展）；多策略 profile 切换（首版单例默认策略 + 每会话可覆盖的记录）；评分/排序算法（只做阈值标记）。

分支流程：

- **重复项**：同集合内规范化 URL 相同 → 合并为一条候选，标注"×N"；跨集合同 URL → 新候选指向已有 source 记录（不复制资料）；标题相似但 URL 不同 → 并列显示，不自动合并（用户判断）。
- **失败项**：无标题且无 URL 的条目在入库前拒绝，工具返回 isError 说明；远程添加返回 Remote 错误码 `sourcedeck/invalid-source`。
- **策略不符**：候选照常入库并标记；用户可保留（覆盖策略）或排除。
- **停止 Agent**：使用官方 composer 的停止按钮；SourceDeck 不重复做取消 UI。已入队的选择摘要由官方队列编辑处理。
- **清理**：设置页「清除 SourceDeck 数据」删除域数据文件（仅 `$DSH_HOME/storages/source_deck*`），会话事件流不删（官方无删除接口）。

界面线框见 [wireframes.md](wireframes.md)。

## 6. UI 挂点映射

| RC slot / service | SourceDeck 用途 | 备注 |
|---|---|---|
| `ctx.sidebarRightTabs.register` + `sidebar.right.pane.tab`（keyed，key=`sourcedeck`） | 资料台主面板 | 抄 ui-sidebar-files 两步注册；`priority:'extension'` |
| `sidebar.right.pane.tab.title` | 活标题（如"资料台 · 保留 3/8"） | 可选 |
| `ConversationNodeDefinition` + `conversation.chat.node`（keyed，key=`source-deck/set`） | 对话流候选卡片 | conversation.zh.md:171-243 完整例 |
| `tool.call.toolview`（keyed，key=`deck_submit_sources`） | 工具调用行的紧凑展示 | 首版可先用 generic 行 + 卡片，toolview 作为增强 |
| `conversation.input.right`（list） | 「资料台」入口按钮 → `ctx.sidebarRight.openTab('sourcedeck')` | additive，避开 single 遮蔽 |
| `settings.section`（list/root） | 数据管理页（清除数据）+ 来源范围配置页（策略编辑器） | 两块同页或两个 section |
| `ctx.remote.sourceDeck.*` | addSource/listSets/getSet/decide/commitSelection/clearData/getScopePolicy/setScopePolicy | 自建 Remote 命名空间 |
| `ctx.remote.session.prompt` | 提交选择给 Agent | 官方唯一回传路径 |
| `ctx.storageDomain` | 域 `source_deck`（per-record） | 私有账本 |
| `SessionEventMap` 声明合并 | `source-deck/set-opened` / `candidate-decided` / `selection-submitted`（log-only，`ignorable:true`） | 模型可见 + 回放真源 |

## 7. 数据模型

### 7.1 域 `source_deck`（per-record 布局，version=1）

| 表 | 键 | 字段 |
|---|---|---|
| `sets` | `set-<uuid>` | `{sessionId, origin:'agent'\|'user', createdAt, status:'open'\|'submitted'}` |
| `sources` | `src-<uuid>` | `{url?, title, note?, snippet?, contentRef?, origin, dedupeKey, createdAt}` |
| `candidates` | `cand-<uuid>` | `{setId, sourceId, verdict:'pending'\|'kept'\|'excluded', reason?, decidedAt?, policyFlags?: string[]}` |
| `selections` | `sel-<uuid>` | `{setId, sessionId, kept:[candidateId], excluded:[{candidateId, reason}], submittedAt, requestId}` |
| `scope_policies` | `policy-<uuid>`（首版单例，另可建 `default` 键） | `{kind:'github'\|'web'\|'llm-freeform', params:{minStars?, updatedWithinMonths?, languages?, licenses?, topics?, excludeForks?, excludeArchived?, domainsAllow?, domainsBlock?, preferOfficialDocs?, guidance?}, createdAt, updatedAt}` |
| `session_active` | sessionId | `{setId, policyId?}`（每会话活跃集与策略覆盖；避免用域级 global 单例造成多会话互踩） |

`sources` 记录新增可选元数据 `meta?: {stars?, pushedAt?, language?, license?, forks?, archived?, topics?}`（Agent 提交时携带，用于策略比对与展示；缺失时该维度不校验）。

`contentRef`：用户粘贴的正文 → `ctx.spillStore.saveText` 的 `SpillRef`；上传文件 → `ctx.attachments.saveFile` 的 `FileAttachmentRef`。域记录只存引用+元数据，不存全文。

### 7.2 身份与版本

- **资料身份** `src-<uuid>`（Host 生成 UUID）；去重键 `dedupeKey` = 规范化 URL（统一 scheme/host 大小写、去 `utm_*` 等跟踪参数、去 fragment）；无 URL 时取规范化标题。资料本体不复制：候选永远引用 sourceId（Zotero 式"归属与本体分离"）。
- **候选集身份** `set-<uuid>`；候选 `cand-<uuid>`；选择 `sel-<uuid>`（同时作为 `session.prompt` 的 `requestId`，保证幂等与回执关联）。
- **版本策略**（首版从简）：记录 schema 设计为"只加可选字段"演进，配合 `compatibleVersions` 读旧记录；资料内容不原地改写——更新正文 = 新建 source 记录，候选改指向新 id，旧记录保留；verdict 变迁保留时间戳，完整历史以会话事件流为准。显式版本链对象（`<subjectId>-v<n>` 表）列为后续扩展。

### 7.3 重复项与失败

- 同 set 同 `dedupeKey` → 合并为一条候选，卡片/面板标注"重复 N 次"（来自 Agent 的重复提交或用户重复添加）。
- 跨 set 同 `dedupeKey` → 复用已有 source，新候选指向它。
- 相似标题不同 URL → 不合并，并列展示（snippet 供人判断）。
- 入库校验失败（无标题无 URL、URL 非法）→ 工具 isError / Remote `sourcedeck/invalid-source`，错误信息面向人或模型可读。

### 7.4 模型可见性

- 域存储对模型不可见（官方边界）。模型能看到的只有：① `deck_submit_sources` 的工具结果（`output.render` 文本）；② 提交时的那条 user/message（选择摘要）；③ 自定义 log-only 事件（`ignorable:true`，仅日志不投影为消息——用于回放与 Conversation Node 折叠，不直接进请求）。
- 摘要文本只含**有界结构化事实**：保留条目（序号+标题+URL）、排除条目（标题+理由）、计数。不含全文、不含 UI 词汇。

## 8. Agent 接续与边界行为

### 8.1 接续

- 提交时 Client 先调 `sourceDeck.commitSelection`（Host 同步完成落库+emit），再调 `session.prompt`。两步分离保证"库里有记录"与"消息入队"不会半途不一致（requestId 幂等兜底重复提交）。
- mode 选择：`useSession`/`session.control` 读到 `running` → `steer`；否则 `queue`。
- 摘要模板（模型面向，实现阶段定稿并 snapshot 固定）：例如"用户已筛选资料集（共 8 条候选）：保留 3 条——1)《title》url 2)…；排除 5 条——…（理由：…）。请基于保留资料继续。" 
- **明示妥协**：RC 无 inject 语义，提交一定会唤醒 Agent（queue 开新轮次 / steer 插下一步）。产品文案避免暗示"静默注入"。

### 8.2 忙碌 / 取消 / 重启 / 多会话

| 场景 | 行为 |
|---|---|
| Agent 忙碌 | 面板显示运行状态；提交用 steer；decide 操作不唤醒 Agent |
| 取消 | 不提供自有取消按钮；官方停止即中止；已入队摘要是可编辑的官方队列消息 |
| 重启/回放 | 候选卡片由 ConversationNodeDefinition 从 log-only 事件折叠重建；资料台从域存储恢复（`session_active` → 当前 set）；事件流是模型可见真源，域是 GUI 账本，两者不一致时以事件流为准 |
| 多会话 | 所有记录带 sessionId；卡片按会话事件流天然隔离；资料台只显示当前会话活跃集（session scope slot 的 `sessionId`）；跨会话不共享候选 |
| 停用 | `disabled:true` 卸载运行时不删条目与数据；重新启用恢复 |
| 卸载 | 官方卸载不删数据（已知行为）；需要时用设置页「清除数据」自清 |
| Host 重启 | 域数据在 `$DSH_HOME/storages/source_deck/`，随 home 持久；会话事件随会话日志持久 |

## 9. 首版验收（沙箱 RC 内）

| # | 级别 | 验收项 | 通过标准 |
|---|---|---|---|
| V0 | 构建安装 | tsdown 产出（Host lib + clientBundle lazy-CJS）；`pnpm pack`；沙箱 `Install-Plugin.ps1`；`List-Plugins.ps1` | 安装退出码 0；list 显示 dsh-source-deck |
| V1 | 无密钥启动 | client half 进 desktop boot graph；右栏出现「资料台」tab；设置出现 SourceDeck 页 | **最高风险，最先验**；失败则整体方案回到备选（见 §10） |
| V2 | 负向兼容 | peer 故意写错范围后安装 | 被 preflight 拒绝或 boot skip 且有可见诊断 |
| V3a | 无模型链路 | 用户手动添加来源 → 卡片渲染 → 勾选/排除 → 提交 | 域文件可查；事件入日志；队列/steer 消息出现在会话投影 |
| V3b | 模型链路（沙箱 LLM API 已配好，复用本 DSH 的 DeepSeek API） | Agent 调用 `deck_submit_sources` → 卡片 → 筛选 → 提交 → Agent 后续轮引用保留资料 | 下一轮请求历史含选择摘要；Agent 行为体现筛选结果 |
| V4 | 恢复 | 重启 Desktop 后重开会话 | 卡片从事件回放重建；资料台从域恢复 |
| V5 | 多会话 | 两个会话各自提交候选 | 互不串扰；session_active 各自独立 |
| V6 | 停用/卸载/重置 | 停用→启用；卸载→数据仍在；设置页清除数据 | 行为符合 §8.2 |
| V7 | 来源范围配置 | 设置 GitHub 策略（stars≥500/近6月）→ Agent 提交含低星候选 | 候选带 `stars-below` 标记；卡片/面板显示标记；仍可保留；改策略后新候选按新策略校验 |

每项记录真实命令与输出（工作区惯例：结论附原始输出）。

## 10. 风险与未验证项（按优先级）

| # | 风险 | 影响 | 处置 |
|---|---|---|---|
| R1 | 第三方插件的 `dsh.client` 半包进入沙箱 desktop profile 的 boot graph 未经实测（官方文档只覆盖 monorepo 内组合） | **方案 A 前提**，失败则对话卡片与右栏面板都不可见 | 实现第一步先做"最小 client half + 右栏空 tab"的冒烟验证，再继续功能 |
| R2 | npm 上的官方 Client 包版本与沙箱 RC 源码构建的类型面是否一致（2026-10-17 实测 npm 有 `dsh-client-ui-chat@0.2.0-rc.2`） | SlotMap 声明合并类型对不上则编译或运行时注册失败 | 用 `@0.2.0-rc.2` 精确版本；若类型不符，退化为自己在 `declare module` 中补最小声明并在文档记录 |
| R3 | `conversation.chat.node` / `sidebar.right.pane.tab` 对第三方包的注册校验（SlotMap 声明合并的 import type 边） | 卡片/面板注册被拒 | 随 R1 冒烟一起验证；失败则备选：工具结果视图走 `tool.call.toolview`（ui-tool 同机制） |
| R4 | 复刻 `clientBundle` 构建预设（tsdown 配置、CSS、基线外部解析） | bundle 格式不对则激活失败 | 按 adding-a-settings-card.zh.md:58-60 复刻；V1 验证 |
| R5 | 沙箱内模型真实调用 | V3b 无法完成 | 已解除：2026-10-17 沙箱 `$DSH_HOME` 已按用户指示配置本 DSH 的 DeepSeek API（仅 DeepSeek 条目最小化合并）；无密钥启动与模型调用验证仍分开记录 |
| R6 | `session.prompt` 的 steer 时序（下一步边界）与用户预期差异 | 用户以为"立即插话" | UI 文案与文档说明；用户已确认"唤醒就唤醒，先实现功能" |
| R7 | 域数据与事件流不一致的边界（如 emit 失败） | 面板与卡片显示分歧 | 写域先于 emit；emit 失败记日志不阻塞；以事件流为准的口径写入文档 |
| R8 | 多 Host 进程/重连时 `domain/changed` 仅进程内 | 面板活数据不刷新 | 首版面板用"操作后主动重取 + slot store"，不依赖跨进程推送 |
| R9 | 策略元数据（stars/pushedAt）由 Agent 自报，可能不准或缺失 | flags 误标 | 标记只作参考不阻断；缺失维度不校验；程序化校验列为扩展 |

## 11. 首版明确不做（边界）

- 程序化联网检索：自动网页搜索、抓取正文、调 GitHub API 校验元数据（元数据由 Agent 提交，Host 只做阈值标记；网络能力留给 LLM 侧工具）。
- 相关性评分/自动排序算法（只做策略阈值标记，人工拍板）。
- 收藏夹/书签同步、跨设备同步。
- 显式版本链对象、diff 视图（记录只增不改 + 事件流已提供历史）。
- 自定义资源协议 `dsh-resource://sourcedeck/...` 与多资料集多 tab 寻址（首版单活跃集 + `openTab`）。
- 多策略 profile 切换（首版单例默认策略 + 每会话覆盖记录）。
- `/deck` 输入触发菜单（input trigger 全局层限制；`input.right` 按钮已覆盖入口）。
- 二进制附件进输入框（RC 无公开 API；URL 列表 + 正文 ref 已够用）。
- subagent 子会话投递（ownership fence；主会话优先）。

## 12. 后续扩展边界（记录，不实现）

多资料集与资源协议地址寻址；工具结果 toolview 增强卡片；程序化 GitHub API 元数据校验（用户明确要求时，需处理网络审批）；版本链与 diff；`/deck` 输入触发；候选去重的相似标题模糊匹配；导出候选集（markdown/json）；策略 profile 多配置切换。

## 13. 已确认事项记录（2026-10-17 用户指示）

1. 采用方案 A。
2. 首版来源范围在配置页可配置：预置开源社区源（GitHub 等）+ 可配筛选参数（stars、最近更新时间等）+ 「LLM 自主」选项；目的是按需求缩窄范围，不改变"人工筛选"的产品核心。
3. inject 唤醒即唤醒，先把功能实现（RC 无 inject Remote 出口的降级被接受）。
4. peer 精确写 `"0.2.0-rc.2"`（**2026-10-17 夜已被第 9 条取代**）。
5. 所有开发实现只在沙箱 Desktop（`sandbox/dsh-desktop/`）验证，不影响日用 DSH；最终安装到本 DSH 需用户明确批准。
6. 沙箱 Desktop 的 LLM API 直接使用本 DSH 已配置的 DeepSeek API（已配置，见 SETUP-VERIFICATION）。
7. 凭据处置事故记录：2026-10-17 调试期间一次"脱敏"正则失误导致日用 `.credentials.yaml` 的多条密钥明文进入对话记录；用户决定不轮换，由我记录并执行后续纪律（只做键级操作）。完整记录见 [../security/2026-10-17-credential-exposure.md](../security/2026-10-17-credential-exposure.md)。
8. 沙箱 Desktop 的 LLM API 已配好（本 DSH 的 DeepSeek API，最小化 3 条）并通过真实调用验证；用户要求实现每个阶段都在沙箱内展示真实效果。
9. **2026-10-17 夜：用户决定产品 `peerDependencies` 切换到最新基线** `@deepseek-ai/dsh@0.2.1-rc.2` + `@deepseek-ai/cordis@4.0.5`（精确）；产品版本 0.1.2。生产 Desktop 仍 0.2.0-rc.2，0.1.2 在其升级前不会加载（用户已知）。此项取代第 4 条。
