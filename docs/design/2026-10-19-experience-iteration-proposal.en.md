# SourceDeck experience and performance iteration proposal

> [中文（默认）](2026-10-19-experience-iteration-proposal.md) | English

Date: 2026-10-19. **Research-based roadmap awaiting review, not an approved implementation plan.** Evidence: [comparable tools and measured baseline](../research/2026-10-19-comparable-tools-experience-review.en.md). Product remains 0.3.0. Version labels below identify proposed batches, not release commitments or a version bump.

## Intent and success

The user requests deeper comparable-tool research and an optimization roadmap focused on users, usability and performance without feature accumulation. Preserve the established developer task: find open-source approaches in the current conversation, screen/compare and reference them to the Agent.

Success means seeing useful candidates sooner, deciding without interruption, handing back whenever ready, and avoiding repeated idle work. “Choose two from six” is a proposed evaluation fixture, not observed usage statistics.

No new top-level workspace, business-table model, dependency, credential or background service. Exact DSH `0.2.1-rc.2` and Cordis `4.0.5` support remains. Preserve managed research workers; no upstream changes or baseline upgrades.

## Options

| Direction | Benefit | Cost / limit | Decision |
|---|---|---|---|
| Visual compression only | Less whitespace and instruction copy | Mixed task stages, repeated reads and unclear relevance remain | Supporting technique only |
| **Task-focused incremental refinement** | Each batch addresses a measurable problem | Requires explicit states and return behavior, beyond CSS | **Recommended** |
| Comprehensive research platform | Long-term organization, reports and graphs | More information, requests and maintenance; outside the core task | Keep out of the roadmap |

## Complexity budget

These are acceptance constraints, not new settings.

- Two destinations: Candidates and Favorites. Comparison becomes a contextual action with selection count and the existing four-source limit.
- No persistent new-request or follow-up textarea in the result-reading state. Existing New search opens the request; Refine opens follow-up input. Empty state retains one request and Start.
- Footer defaults to selection summary and one primary reference action, allowing two rows at 420px. Refinement is secondary. Direct summary remains available in a labeled, one-level More disclosure explaining immediate delivery and read-only consequences.
- Cards preserve image/logo, identity, short explanation, stars, code-push date, useful license/language and visible keep/exclude. Comparison selection stays discoverable; favorite targets remain usable. Do not shrink text or remove approved facts to meet density goals.
- Reasons stay optional. Topics, generic descriptions and lookup detail can collapse; critical limitations/archived status remain visible. Unknown facts remain unknown, without relevance scores.
- No density/sort/advanced-filter settings. Any persistent new entry must identify the existing entry it replaces.
- Preserve two columns and automatic single-column below 620px. No list/grid switch. Comparison may adapt internally.

## Behavior by task

| State | Proposed presentation | Invariants |
|---|---|---|
| No research | Request, Start and a few examples | No setup prerequisite; parameterized `/deck` still starts directly |
| Running | Topic, real status and Stop; arrived candidates remain usable | Independent main chat, no fake percentages or automatic extra model calls |
| Results | Compact topic, four existing verdict filters, one local search and cards | New search opens editing; create the topic only on Start. Cancel returns to results with drafts intact; updates preserve scroll/focus |
| Refine | One editor after explicit action, current topic already bound | Prior decisions/reasons carry forward; collapsing keeps input |
| Compare | Focused 2–4 source view in the same pane, return restores position | One selection asks for another; comparison never changes verdict |
| Kept sources | Reference count and one success acknowledgment | Insert without sending; preserve text, attachments and immutable snapshots |
| Filter has no matches | Explain current conditions and offer clear filters | No claim of research failure, implicit re-search or silent reset |
| Failure/interruption/read-only | Local diagnostics and next action | Retain arrivals, scoped retries and idempotent delivery; hide inapplicable editors |

## Proposed 0.3.1: remove repeated work

No new visible capability. Prioritize low-risk, measurable costs.

1. Serialize full reads and coalesce refreshes after actions. Running research on the candidate page retains roughly two-second updates. Terminal idle state uses a 30-second interval. Stop full reads in Favorites or when actual invisibility/unmount is established; refresh on returning to Candidates, visibility restoration, target switch or confirmed local action. Keep the activity observer running. Verify RC lifecycle: `document.hidden` alone does not identify every hidden pane.
2. Preserve the lightweight activity observer for command/natural-language opening and count it separately. `openRevision` is not content revision. Do not depend on an unverified push subscription or introduce a new content-version protocol in this batch.
3. Reuse locale Intl formatters and compute comparison facts once per source. Group once and use efficient favorite lookup. Stabilize props/memo only where profiler evidence supports it.
4. Avoid unchanged view replacement and repeated error interruption. Measure equality-check cost before adding deep comparisons. Local input remains immediate; any deferred draft persistence must flush before blur/target changes.

Consistency tradeoff: writes from another window/client can take about 30 seconds to appear in idle state. Local confirmed actions, visibility restoration and explicit refresh update immediately. Running results must not be lost, and entering running restores active cadence. If this delay is unacceptable in task tests, separately review content invalidation rather than silently changing guarantees.

Acceptance: on the fixed RC Host, at most two full-set idle reads per 60 seconds excluding initialization/explicit actions, and at most one in flight per pane. Count full-load and activity requests separately. Profile 200-item stress behavior while checking normal 6/24-item writes, references, topic switching, restart and cancellation isolation. Finish this batch before expanding scope.

Excluded: persistent indexes, new tables, virtualization, global state libraries and background GitHub fetching. Current in-memory scan p95 is below 1ms and does not justify prioritizing a storage rewrite.

## Proposed 0.3.2: a focused result page

Depends on stable measurements and regression behavior from 0.3.1.

1. Implement staged editors, a compact footer and contextual comparison entry. Keep Candidates/Favorites destinations. Reduce duplicate branding/instructions; the result view foregrounds the actual request.
2. Separate queries by scope and locally match title, URL, explanation and reason. Distinguish no filter matches, no additions, completion and failure. Show relevant counts without repeating an empty message for every hidden round.
3. Provide per-card saving/error feedback without losing drafts or confirmed state. Preserve mutation ordering and the user's final explicit choice; avoid redundant queued clicks. Do not introduce optimistic rollback/undo queues. Existing same-choice toggle remains available.
4. When a decision removes an item from Pending, move focus to a neighboring result or result status. Polling/appends must not steal focus. Disclosure, refinement and More support Tab/Enter/Escape and focus restoration; test real IME.

Acceptance: compare identical fixtures on 0.3.0 and the new version, initially with 3–5 formative participants. This finds issues; it does not establish statistical significance. Choosing two, referencing and continuing should require no advanced menu. Refinement/direct summary remain discoverable. Measure completion time, mistakes and searching for controls. Restore text entry points if hiding them harms discovery.

Excluded: new bulk actions, global single-key shortcuts, automatic decisions, mandatory reasons, popularity sorting, another status model and card-layout selectors.

## Conditional next batch: evidence and narrow comparison

Tentative **0.4.0 candidate scope**, not a mandatory feature list. Proceed only if the first two batches show that understanding candidates or comparing them remains the main bottleneck.

- Prefer existing note for task relevance and key uncertainty ahead of generic description. Label it a research judgment; retain factual description in details. Ask for concise, traceable explanations without another model call. Review separately if structured fit/limitations fields become necessary.
- Request existing license/archived fields when available. Missing facts stay unverified; do not trigger extra research to fill every display cell. Keep evidence/date in existing details, without a false certification badge.
- Focus comparison on common dimensions: table at >=620px, vertical dimensions with source names below that. Returning restores filters/focus/scroll. No difference-only toggle, custom columns or AI ranking unless user evidence supports them.
- Evaluate real URLs, relevance, explicit uncertainty and refinement duplication. More candidates or longer summaries are not success metrics. Do not promise greater depth at lower cost without time/token evidence.

If the main issue is model/provider latency, unavailable tools or missing facts, record it in that part of the chain rather than adding UI complexity.

## Proposed budgets

**All are unachieved acceptance targets.** Measure the original first. If targets are inappropriate for the machine, document and review changes instead of relabeling them as success.

| Observation | Target / method |
|---|---|
| Interaction to visible feedback | 30 samples/action at 6/24/200 candidates; p95 <=100ms. Local feedback need not wait for persistence |
| Confirmed state | Record Host acknowledgment and following paint separately; show local saving status beyond 300ms. Local response does not imply saved |
| Existing results ready | Warm 24-item pane p95 <=500ms, 30 samples; cold starts separately. Exclude model time and remote image completion |
| Idle | <=2 full reads/minute; count activity separately; no sustained full scans when lifecycle confirms invisibility. Not zero total requests |
| Formatting/refresh | One fact computation/source/comparison render; unchanged ticks do not rerender every card's business content. 200 items are stress only |
| Stability | Fixed image frame on load/failure; no jump to top or stolen input focus |
| Reading space | At 420×800 CSS px, collapsed-result header+navigation+footer target <=35% height, measured with DOM/screenshots; body >=14px and primary controls >=32px |
| Larger-list escalation | Investigate before reviewing virtualization/round disclosure if 200-item interaction p95 remains >200ms, long tasks recur, or recorded DOM/memory bottlenecks exist. Item count alone is insufficient |
| Compatibility | 320/420/640/900 pane widths, light/dark, long Chinese/English, 100%/125%; real native IME/attachments/zoom still need acceptance |

Matrix: current 6/24/200 items × 1/100/1,000 total topics. Normal tasks emphasize 6/24; 1,000 topics is stress. Record hardware, RC, commit, enabled plugins and launch mode. No production telemetry or uploaded user sources.

## Boundaries before implementation

- Backoff needs no new platform API. Pane visibility and comparison return behavior require fixed-RC verification. Any later subscription must have public-interface evidence at that exact RC, not master/alpha examples.
- Writes/invalidation retain session/set/round ownership. Any cache must cover clearing, shared-source metadata changes, other clients and restart. Without complete invalidation, omit the cache.
- New search/close/return preserve request, follow-up and reason drafts. Collapsing changes presentation, not reference checks or persistence semantics.
- Review each batch's concrete design before implementation. Previous v3 approval does not approve this new scope. Research/roadmap documents can be checked, committed and synchronized now without extending the task into product implementation.

## Release and stopping

Each approved batch independently passes relevant regression, build, sandbox installation and real-Host acceptance before commit/push and HEAD/remote verification. Record failed synchronization as pending. Bump the product only for approved work; production installation still requires explicit instruction.

Hold release for lost draft/attachment/reference, cross-topic arrivals, missed completion due to backoff, cancellation affecting the main conversation, unreadable old records, IME conflicts or undiscoverable secondary actions. If the first two batches solve the core task, do not continue adding the conditional batch.
