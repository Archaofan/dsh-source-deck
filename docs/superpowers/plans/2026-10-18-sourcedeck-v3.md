# SourceDeck v3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将资料台升级为可从对话启动、后台研究、边查边筛选并引用回开发对话的完整工作流。

**Architecture:** 八表域保留兼容数据，研究轮次持久化明确的主会话、资料集和 worker 身份。Host 协调受管子会话；Client 观察活动、显示资料并通过宿主引用协议插入草稿。研究生命周期、资料操作和草稿修改分别管理。

**Tech Stack:** TypeScript、React 18、Cordis 4.0.5、固定 DSH RC 公共服务、现有 Typert JSON Remote、node:test、tsdown、CSS Modules。

**Spec:** [已批准的书面设计](../specs/2026-10-18-sourcedeck-v3-design.md)；[English plan](2026-10-18-sourcedeck-v3.en.md)。用户于 2026-10-18 确认设计并要求落地、推送 Git。用户随后批准本计划，并选择当前会话 Native 执行。七项实现已落地；最终检查、Host 证据与原生验收限制见 [夜-9](../../SETUP-VERIFICATION.md)。

> 交付说明：未勾选的验收步骤保留原生125%/OS弹窗/IME与附件、离线registry metadata、真实模型空/重复轮次等明确限制。核心实现、67测试、真实Host主链路、包检查和Git交付见夜-9；不能把未勾选项说成已通过。

## Global Constraints

- 精确支持 `@deepseek-ai/dsh@0.2.1-rc.2`、Cordis `4.0.5`；上游固定 commit `687f282e8625c6b8d11ff58211a90524be2e4317`。
- 保留八表域及旧数据；扩展字段而不默认清空或迁移到新应用。
- 一个资料集同时只运行一轮研究；取消只作用于对应 worker。
- 默认使用主会话开始研究时的模型路由和官方凭据解析；不读取、复制、保存 API key。
- 只通过沙箱 `Install-Plugin.ps1` 安装；生产安装仍单独获得用户明确批准。
- 文档中文默认、英文同步；各阶段检查后提交并推送本项目远端，不 force push。
- 禁止通过私有字段、修改上游、CSS 隐藏主聊天消息或升级基线实现目标。

## Review Focus

1. 连点启动、网络重试和新主题切换：同一请求只创建一轮，旧 worker 不写入新主题（任务 1、2）。
2. 空结果、全部重复、第一批先到、取消后的迟到回调：以 activation 完成状态结束，不永久显示搜索中（任务 1、2、5）。
3. 输入法、附件、用户在异步引用期间继续输入或切会话：保留原草稿和附件，冲突可重试（任务 4）。
4. 旧 submitted 集合、Host 重启及冷会话：历史可读，失联任务显示中断，公共入口恢复主 Agent（任务 1、2、7）。
5. 图片失效、未知 stars/日期、窄窗与主题切换：事实不伪造，布局不丢状态，设置菜单展开仍可读（任务 5、6、7）。

## 文件与依赖边界

`src/research-ops.ts` 管持久化轮次，`src/research-coordinator.ts` 管任务串行和生命周期，`src/research-runtime.ts` 只适配固定 RC；纯逻辑不导入 Host 实现。`src/references.ts` 管不可变快照与序列化，`src/client/references.ts` 管引用来源注册，`src/client/input-bridge.ts` 管具体会话的草稿插入。`DeckBody` 只组装页面，将候选卡片、对比和图片逻辑拆为小组件。

仅按实际 type-only imports 增加精确 RC 开发依赖；Host 通过 Cordis 服务协作，不把另一份 Agent/Tools/Subagent 运行时打入包。Client 保持 lazy-CJS，跨插件 value import 只允许现有平台表中的模块。新增依赖需检查来源、脚本和 lockfile 变化；不引入新 UI 框架。

## Task 1: 明确轮次归属与可靠持久化

**Files:** Modify `src/model.ts`, `src/ops.ts`; create `src/research-ops.ts`, `tests/research-ops.test.ts`; modify `tests/rounds.test.ts`, `tests/ops.test.ts`。

**Interfaces:**
- `ResearchTarget = { parentSessionId: string; setId: string; roundId: string; workerSessionId: string; requestId: string }`。
- `prepareResearchRound(store: DeckStore, input: { sessionId: string; request: string; note?: string; conversation?: string; requestId: string; workerSessionId: string; mode: 'new' | 'continue'; setId?: string }): Promise<StartRoundResult & { target: ResearchTarget }>`。
- `finishResearchRound(store, input: { target: ResearchTarget; status: 'completed' | 'failed' | 'cancelled' | 'interrupted'; diagnostic?: string }): Promise<RoundRecord>`；`interruptResearchRounds(store): Promise<void>`；`resolveResearchTarget(store: DeckStore, workerSessionId: string): ResearchTarget | undefined`。
- `addSource` 增加可选 `target: { setId: string; roundId?: string }`，显式目标验证 session/set/round 一致且集合未提交；旧主会话采集可沿用非 worker 旧轮次，不推断后台轮次。
- RoundRecord 新增可选 `workerSessionId/requestId/status/endedAt/diagnostic`，状态含 `starting/running/completed/failed/cancelled/interrupted`；未带字段的旧轮次继续可读。

- [x] **Step 1: 写回归测试。** `late_result_keeps_original_target`：创建 A 后切 B，A 的显式结果仍属 A；`wrong_worker_is_rejected`：不同 worker 不获目标；`repeated_request_reuses_round`：相同 session/requestId 返回相同 roundId，rounds 数为 1；`submitted_set_is_immutable`：历史集合拒绝新增与改判；旧 35 例继续通过。
- [x] **Step 2: 运行 `node --test tests/research-ops.test.ts tests/rounds.test.ts tests/ops.test.ts`，确认新增断言在旧逻辑失败。**
- [x] **Step 3: 实现上述接口。** 启动前完整写入绑定；请求重试先查原记录；状态变更验证目标且终态不回退。空/重复结果不决定任务结束。保留旧记录字段和八张表。
- [x] **Step 4: 运行 Step 2，预期全部通过；增加 `interrupt_preserves_candidates`，断言中断状态保留已有候选与筛选。**
- [x] **Step 5: 检查差异后提交 `fix: bind research rounds to durable execution identities`。**

## Task 2: 受管后台执行与真实工具限制

**Files:** Create `src/research-coordinator.ts`, `src/research-runtime.ts`, `tests/research-coordinator.test.ts`; modify `src/index.ts`, `src/tools.ts`, `src/search-prompt.ts`, `src/remote-service.ts`, `src/events.ts`。

**Interfaces:**
- `ResearchRuntime.resolveParent(sessionId: string): Promise<Agent>`；`start(input: { parent: Agent; target: ResearchTarget; promptText: string; signal: AbortSignal }): Promise<{ result: Promise<{ stopReason: string; diagnostic?: string }>; dispose(): Promise<void> }>`。
- `ResearchCoordinator.start(input: { sessionId: string; request: string; note?: string; requestId: string; mode: 'new' | 'continue'; setId?: string }): Promise<StartRoundResult & { target: ResearchTarget }>`；`cancel(sessionId: string, roundId: string): Promise<void>`；`targetForWorker(workerSessionId: string): Promise<ResearchTarget | undefined>`；`dispose(): Promise<void>`。
- Remote `startRound` 转协调器；新增 `cancelRound`。工具 `deck_submit_sources` 使用可信 exec.agent.session.id 解析 worker 绑定，未绑定的 subagent 拒绝写入父资料集；批量提交后只发一次快照。

- [x] **Step 1: 写失败测试。** fake runtime 中并行启动同一 set 只调用 start 一次；首批到达时状态仍 running；result completed 且 0 新条目时完成；全部重复同样完成；取消仅 dispose 对应 handle，主 Agent 的停止调用次数为 0；失败、超时、启动中取消、晚到结果均有终态且不串主题。
- [x] **Step 2: 运行 `node --test tests/research-coordinator.test.ts`，确认尚无协调器而失败。**
- [x] **Step 3: 实现协调器和固定 RC adapter。** 采用逐 set 锁、稳定请求身份、预留 workerId 后启动、受管 result/finally 收口；插件卸载 dispose 精确 handle。超时设为 5 分钟并显示超时原因。服务开始时把未恢复运行记录标为 interrupted。
- [x] **Step 4: 核对并接入公共 `ctx.sessionController.resolveAgent(sessionId)`（上游 index.ts:243），恢复冷主会话；使用 `ctx.subagents.startActivation({ provider: 'spawn', childId, label, request: { parent, prompt }, signal, delivery: 'caller' })`。** 不绑定短命工具调用 signal 到已返回的后台任务；协调器自己持有 AbortController。
- [x] **Step 5: 在已预留 worker 的 `agent/created` 串行监听中安装作用域工具限制。** 固定 RC 公共 `agent.ctx.tools.restrict` 仅约束 global tools，因此同时装 `tools.guard` 限制 scoped 工具；研究只允许 `web_search`、`web_fetch`、`deck_submit_sources`，使用作用域 native presentation。启动前检查必要服务/provider/tools；缺失或无法限制时明确失败。测试证明 shell、文件写入、Cordis、委派等调用均被拒绝，主 Agent 工具集合保持原样。
- [x] **Step 6: 运行任务 1、2 测试并构建，检查提示要求查证 GitHub metadata、来源和查询时间；提交 `feat: run source research in managed background sessions`。**

## Task 3: 自然语言、带参命令与定向打开

**Files:** Create `src/commands.ts`, `src/activity.ts`, `src/client/DeckActivityObserver.tsx`, `tests/entrypoints.test.ts`; modify `src/index.ts`, `src/tools.ts`, `src/remote-service.ts`, `src/client/index.ts`, `src/client/DeckEntryButton.tsx`, `src/client/locales.ts`。

**Interfaces:**
- `registerDeckCommands(ctx: Context, coordinator: ResearchCoordinator): void`；新增模型工具 `deck_search`，参数 `{ request: string; note?: string }`，从 exec 身份确定主会话，立即返回 roundId 与 started 状态。
- `DeckActivity = { sessionId: string; setId?: string; roundId?: string; revision: string; openRequested: boolean; status?: RoundRecord['status'] }`；Remote `getActivity({sessionId})` 返回该值。
- `DeckActivityObserver` 在已有会话入口挂载，2 秒观察活动；相同 revision 只消费一次打开意图；卸载清理定时器和未完成请求。

- [x] **Step 1: 写失败测试。** `/deck` 不调用模型；`/deck 找 Markdown 编辑器` 原样传中文需求并启动一次；`/deckx` 不被匹配；旧 action 命令不能吞掉带参命令。新活动打开到它的 session/set/round，切到 B 后 A 的迟到响应不打开 B。
- [x] **Step 2: 运行 `node --test tests/entrypoints.test.ts`，确认新增能力失败。**
- [x] **Step 3: Host 注册官方 commands 的 `deck` input/handler，参数调用协调器，空参数只记录打开意图。** Client `/deck` 改为 Host 适配，移除抢占同名的旧纯 action；自然语言由 `deck_search` 描述和必要 runtime guidance 给出中文例句，不劫持所有“搜索”文字。
- [x] **Step 4: 实现 getActivity 和观察组件，调用 `sidebarRight.openTabIn(sessionId, 'sourcedeck', { params: { setId, roundId } })`；聊天卡片也使用节点里的归属打开历史主题。** UI 的请求失败不清空需求和补充说明。
- [x] **Step 5: 运行测试与构建，核对无新增主 `session.prompt` 搜索路径；提交 `feat: start and open source research from conversation`。**

## Task 4: 不可变资料引用与草稿保护

**Files:** Create `src/references.ts`, `src/client/references.ts`, `src/client/input-bridge.ts`, `tests/references.test.ts`, `tests/input-bridge.test.ts`; modify `src/model.ts`, `src/ops.ts`, `src/remote-service.ts`, `src/client/index.ts`, `src/client/deck-face.ts`, `src/client/DeckEntryButton.tsx`。

**Interfaces:**
- `ReferenceSnapshot = { selectionId: string; sessionId: string; setId: string; createdAt: string; items: readonly { candidateId: string; source: SourceRecord; reason?: string }[] }`。
- `createReference(store, input: { sessionId: string; setId: string; requestId: string }): Promise<ReferenceSnapshot>`；`getReference(store, input: { sessionId: string; selectionId: string }): Promise<ReferenceSnapshot>`；`serializeReference(snapshot: ReferenceSnapshot): string`；`listReferences(store, sessionId: string): Promise<readonly ReferenceSnapshot[]>`。
- SelectionRecord 增加可选 kind/reference snapshot；旧缺省 kind 当 submitted。Remote 新增 createReference/getReference/listReferences，结果校验 session 归属。`commitSelection` 以 sessionId/requestId 幂等返回原投递内容，增加 pending/sent/failed 投递状态和显式确认操作。
- `ReferenceBridge.register(sessionId: string, handle: { captureInsertion(): TokenSpan; insert(reference: ReferenceInsert, span: TokenSpan): boolean; persistDraft(): void; focus(): void }): () => void`；`insert(sessionId: string, prepare: () => Promise<ReferenceSnapshot>): Promise<'inserted' | 'draft-changed' | 'unavailable'>`。在对应会话入口注册有 disposer 的 scoped input handle，不缓存另一会话的 actx。

- [x] **Step 1: 写失败测试。** 创建引用后改判/改源数据，快照和序列化保持原值；set 仍 open；跨会话读取被拒绝；相同 requestId 不增记录；正文含真实标题、URL、说明和 metadata。旧提交重试只有一条 selection，投递失败不会标记为已发送。
- [x] **Step 2: 运行 `node --test tests/references.test.ts tests/input-bridge.test.ts tests/ops.test.ts`，确认新增断言失败。**
- [x] **Step 3: 实现存储与序列化。** 空 kept 拒绝创建引用；外部来源内容以数据边界包裹，避免当作指令。引用可预览、移除；清理后的引用解析失败并交由官方协议阻止发送。
- [x] **Step 4: 注册 `inputTriggers` 的 `@deck` source 与 codec；候选为当前已选资料和历史快照，选取通过官方 ReferenceInsert。** source-owned ref 编入 sessionId/selectionId，codec 发起 getReference 时重新验证；预览定向打开原主题。
- [x] **Step 5: 右侧主按钮通过 bridge 插入引用。** 在异步 prepare 前 captureInsertion，完成后通过对应 retained Session 的 `slash/input-insert-reference` 发送 ReferenceInsert + TokenSpan，成功后 persistDraft/focus。测试异步期间用户继续输入、IME、会话切换、正在提交、已有引用与附件：不调用 setDraft/submit；CAS 失败保留正文并提供重试。
- [x] **Step 6: 次要“直接发送摘要”采用稳定 requestId、投递确认与失败重试；运行任务 4 全部测试和构建后提交 `feat: reference screened sources in conversation drafts`。**

## Task 5: 开发者筛选 UI、仓库图片与比较

**Files:** Create `src/client/CandidateCard.tsx`, `src/client/CandidateCard.module.css`, `src/client/ComparePanel.tsx`, `src/client/ComparePanel.module.css`, `src/client/source-presentation.ts`, `tests/source-presentation.test.ts`; modify `src/client/DeckBody.tsx`, `src/client/DeckBody.module.css`, `src/client/deck-face.ts`, `src/client/definition.ts`, `src/client/DeckCard.tsx`, `src/client/card-definition.ts`, `src/scope-policy.ts`, `src/tools.ts`, `src/remote-service.ts`, `src/client/locales.ts`。

**Interfaces:** `sourceImages(source: SourceRecord): readonly string[]`；`formatSourceFacts(source: SourceRecord, locale: string): { stars: string; updated: string; checked: string }`；SourceMeta 新增可选 `metadataFetchedAt/metadataUrl`。`DeckFace.startRound` 对接后台启动，新增 cancel/reference/activity/history 定位能力，保留收藏和策略 API。

- [x] **Step 1: 写失败测试。** GitHub 的 stars=0 显示 0，未知显示未知；pushedAt 与查询时间分别显示；非法日期不生成错误时间。图片顺序为已知项目图/Logo、GitHub owner avatar，排除非 http(s) 或带凭据 URL；全失败保留项目字标及全部动作。
- [x] **Step 2: 运行 `node --test tests/source-presentation.test.ts`，确认新增能力失败。**
- [x] **Step 3: 拆卡片并实现呈现。** 原图/Logo 按比例展示，错误只尝试下一张一次；GitHub 明显显示 stars 与最近代码更新时间，查询时间和来源另列；不在浏览器绕过 CSP 或后台代理任意图片。检查失败事件与 Host 网络证据以定位此前“暂不可用”。
- [x] **Step 4: 重构页面状态。** 搜索状态来自持久化 round.status；操作 loading 按候选/收藏/引用区分；研究期间已有候选仍可勾叉、原因、收藏、对比、引用。保留独立对比入口、筛选和计数；对比按来源身份选取并可移除，不改变 verdict。新主题/历史定位后按各自 set/round 显示。
- [ ] **Step 5: CSS container-type 按面板内容宽度响应，>=620px 双列，<620px 单列；长 URL/中文不撑破卡片。** 使用真实 SourceRecord 测试材料，在 320/420/640/900px 和 100%/125% 检查；缩放、切列、刷新不清除草稿/原因/选择/对比。
- [x] **Step 6: 运行纯逻辑测试与构建，记录交互验收结果，提交 `feat: improve responsive source screening and comparison`。**

## Task 6: 完整主题与插件身份

**Files:** Modify 全部 `src/client/*.module.css`, `src/client/ScopePolicySection.tsx`, `src/client/locales.ts`, `package.json`, `pnpm-lock.yaml`; create `locale/zh.json`, `locale/en.json`；使用已有 `assets/icon.svg`, `assets/icon.png`。

**Interfaces:** 保持组件业务接口不变；局部颜色映射到固定 RC `--dsw-alias-bg-base/bg-layer-1/border-l2` 和实际 text token，继承宿主 color-scheme 与 body `data-ds-dark-theme`。

- [ ] **Step 1: 为本任务建立沙箱视觉验收表，先记录当前浅/深主题设置 select 展开、输入/placeholder、禁用、错误、候选选择与引用标签的问题。** 不为颜色常量编写镜像单元测试。
- [x] **Step 2: 使用宿主 alias token 改局部样式。** 原生 select/option 继承 color-scheme 并设置前景背景；若固定 RC 平台展开菜单实测仍不可读，采用该 RC 已发布公共选择组件。覆盖 focus-visible、hover、selected、loading、empty、disabled、error；禁止全局 option/body 覆盖。
- [x] **Step 3: 清单接入 `icon: './assets/icon.svg'`、files 中的图标与 locale，导出 locale 文件，提供“SourceDeck · 资料台”及简短中英描述。** 保留已有 exports 和精确 peer，不引入外链图标。
- [ ] **Step 4: 深/浅主题在宿主中实测 Step 1 全表；检查图标 32/48/64px、插件禁用后 metadata 仍可读取。** 用 Node XML/文件检查确认 SVG 自包含、包内路径、大小<256KiB；不把静态预览代替宿主截图。
- [x] **Step 5: `npm run build` 通过后提交 `feat: support host themes and custom plugin identity`。**

## Task 7: 固定 RC 验收、版本与 Git 交付

**Files:** Modify `package.json`, `pnpm-lock.yaml`, `README.md`, `README.en.md`, `docs/SETUP-VERIFICATION.md`, `docs/HANDOFF.md`, `AGENTS.md`；本地证据只放共享沙箱的 `test-workspaces/dsh-source-deck/` 和 logs。

**Interfaces:** 产品下一版本 `0.3.0`；精确支持版本保持不变。交付 `dsh-source-deck-0.3.0.tgz` 与 SHA256，生产不安装。

- [x] **Step 1: 运行 `node --test tests/*.test.ts`、`npm run build`、`git diff --check`。** 新增测试全部通过；确认 Client 只有 shell baseline require、Host 无重复核心运行时、类型生成通过；新增依赖按供应链技能检查。
- [ ] **Step 2: bump 0.3.0，使用当前项目包管理器同步 lockfile，再 build/pack。** `npm pack --dry-run --json` 与实际 tar 清单应含图标、locale、两半产物及 types；不含沙箱、凭据、node_modules 或研究个人记忆。
- [x] **Step 3: 确认沙箱未占用，经 `Install-Plugin.ps1 -Project dsh-source-deck -PackagePath <本项目tgz绝对路径>` 安装，使用 Start-Desktop.ps1 启动固定 RC。** 记录启用插件组合；不改上游或共享基线。
- [ ] **Step 4: 官方 Host 无模型检查。** 新旧数据读取、重启后中断/恢复、冷主会话启动、归属/幂等/权限限制、历史定位、输入冲突、失效引用、图标 metadata；完成任务 5、6 的全部宽度/主题矩阵。
- [ ] **Step 5: 真实模型链路验收。** 中文自然语言和 `/deck query` 各启动一次；补搜期间主聊天无新增内部 user prompt；左侧同时完成一项独立开发任务；取消研究不停止主任务；空/重复结果能结束；引用真实 2–3 个仓库后用户续写 UI 调研指令，模型收到 URL 等实际内容。仅复用沙箱已配置账号；若缺模型/额度，明确记录未验收项并请求沙箱配置，不能冒称通过。
- [x] **Step 6: 做最终独立审查，处理实际问题并仅重跑受影响检查；同步中文/英文使用说明、限制、沙箱证据和 handoff，核对没有“已上架/已生产安装”的不实表述。** 按实际 PR 合并状态维护市场说明。
- [x] **Step 7: 提交 `release: ship SourceDeck 0.3.0 developer research workflow`，push origin 当前交付分支。** 不 force push；有 keyring 限制则申请准确 push 的主机执行。核对工作区干净、本地 HEAD=origin/交付分支，并报告 tgz/SHA256、测试结果和真实模型实测状态。

## 计划自审与执行交接

设计 §1–3 对应任务 3、5；§4–5 对应任务 1、2；§6 对应任务 4；§7–8 对应任务 5、6；§9–10 对应任务 7。Review Focus 五项均落入拥有相关逻辑的测试或宿主矩阵。没有新增数据域、生产部署或 baseline 变更。

计划阶段检查：8 份更新文档的本地链接和 UTF-8 检查通过，中英计划各 7 项任务、无占位项；`git diff --check` 通过。既有基线测试复跑 35/35 通过，沙箱 baseline/CheckOnly 通过且空闲。这描述计划阶段的历史状态；实施后的真实 Host 与模型验收见夜-9。

推荐 **Native**：由当前 Agent 在本会话执行整条计划，最终独立审查。七个任务共享执行身份和引用协议，连续实现便于保持接口一致；每个任务仍独立检查、提交和推送。计划已由用户确认，已按 executing-plans 执行并完成一次独立审查与修复。
