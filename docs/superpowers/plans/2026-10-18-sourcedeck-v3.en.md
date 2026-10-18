# SourceDeck v3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship conversation-triggered background research, responsive screening, and references that users can combine with development instructions in their existing draft.

**Architecture:** Keep the eight-table domain and add durable parent/set/round/worker identities. A Host coordinator owns managed child activations. The Client observes activity, screens sources, and inserts references using the Host draft protocol. Research, source mutations, and draft editing have separate state.

**Tech Stack:** TypeScript, React 18, Cordis 4.0.5, pinned DSH RC services, existing Typert JSON Remote, node:test, tsdown, CSS Modules.

**Spec:** [Approved design](../specs/2026-10-18-sourcedeck-v3-design.en.md); [authoritative Chinese plan](2026-10-18-sourcedeck-v3.md). The user approved the design and requested implementation and Git delivery on 2026-10-18. This written plan awaits review. Native execution in this conversation is recommended, followed by independent final review.

## Global Constraints

- Exactly support `@deepseek-ai/dsh@0.2.1-rc.2` and Cordis `4.0.5`; upstream commit `687f282e8625c6b8d11ff58211a90524be2e4317`.
- Preserve the eight tables and legacy data using optional fields; no default reset.
- One research round per set at a time; cancellation addresses only its worker.
- Inherit the parent's model route and official credential resolution at start; never read, copy, or persist API keys.
- Install only through the sandbox `Install-Plugin.ps1`; production requires separate explicit approval.
- Chinese documentation is primary, with English kept in sync. Check, commit, push, and verify each milestone; no force push.
- No private fields, upstream product changes, CSS-hidden main-chat prompts, or baseline upgrades.

## Review Focus

1. Double clicks, retries, and new-topic switches must reuse requests and keep late results in the original target (tasks 1–2).
2. Empty/duplicate results, partial arrivals, and cancellation races must end from activation settlement without perpetual loading (tasks 1–2, 5).
3. IME, attachments, draft edits, and session switches during reference preparation must preserve the draft with retry on conflict (task 4).
4. Legacy submitted sets, restarts, and cold sessions must remain readable and recover through public services (tasks 1–2, 7).
5. Failed images, unknown facts, narrow widths, and theme changes must preserve facts, actions, and readable expanded settings menus (tasks 5–7).

## File and dependency boundaries

`src/research-ops.ts` owns durable rounds, `src/research-coordinator.ts` task admission and lifecycle, and `src/research-runtime.ts` the pinned RC adapter. Pure operations must not import Host implementations. `src/references.ts` owns snapshots/serialization; `src/client/references.ts` registers the source; `src/client/input-bridge.ts` routes guarded insertions. Split candidate cards, comparison, and source presentation out of DeckBody.

Add only exact RC development dependencies needed by actual type imports. Collaborate through Cordis services, with no duplicated Agent/Tools/Subagent runtime. Preserve lazy-CJS and the existing Client platform import allowlist. Review new dependency scripts/provenance/lock changes; introduce no UI framework.

## Task 1: Durable round ownership

**Files:** Modify `src/model.ts`, `src/ops.ts`, `tests/rounds.test.ts`, `tests/ops.test.ts`; create `src/research-ops.ts`, `tests/research-ops.test.ts`.

**Interfaces:**
- `ResearchTarget = { parentSessionId: string; setId: string; roundId: string; workerSessionId: string; requestId: string }`.
- `prepareResearchRound(store: DeckStore, input: { sessionId: string; request: string; note?: string; conversation?: string; requestId: string; workerSessionId: string; mode: 'new' | 'continue'; setId?: string }): Promise<StartRoundResult & { target: ResearchTarget }>`.
- `finishResearchRound(store, input: { target: ResearchTarget; status: 'completed' | 'failed' | 'cancelled' | 'interrupted'; diagnostic?: string }): Promise<RoundRecord>`; `interruptResearchRounds(store): Promise<void>`; `resolveResearchTarget(store: DeckStore, workerSessionId: string): ResearchTarget | undefined`.
- Add optional explicit `target: { setId: string; roundId?: string }` to addSource; validate ownership, matching round, and open set. Legacy main-agent collection may keep non-worker legacy round assignment, but must not infer a background round.
- RoundRecord adds optional workerSessionId/requestId/status/endedAt/diagnostic. Status is starting/running/completed/failed/cancelled/interrupted; old records remain readable.

- [ ] **Step 1:** Add failing `late_result_keeps_original_target`, `wrong_worker_is_rejected`, `repeated_request_reuses_round` (same roundId, one record), and `submitted_set_is_immutable` tests; preserve the original 35 tests.
- [ ] **Step 2:** Run `node --test tests/research-ops.test.ts tests/rounds.test.ts tests/ops.test.ts`; new assertions must fail against the old behavior.
- [ ] **Step 3:** Implement the interfaces. Persist complete binding before starting, reuse request identities, reject terminal-state regressions, and leave task completion independent of candidate count.
- [ ] **Step 4:** Repeat step 2 and add `interrupt_preserves_candidates`; expect all tests to pass.
- [ ] **Step 5:** Review and commit `fix: bind research rounds to durable execution identities`.

## Task 2: Managed research and tool restrictions

**Files:** Create `src/research-coordinator.ts`, `src/research-runtime.ts`, `tests/research-coordinator.test.ts`; modify `src/index.ts`, `src/tools.ts`, `src/search-prompt.ts`, `src/remote-service.ts`, `src/events.ts`.

**Interfaces:**
- `ResearchRuntime.resolveParent(sessionId: string): Promise<Agent>`; `start(input: { parent: Agent; target: ResearchTarget; promptText: string; signal: AbortSignal }): Promise<{ result: Promise<{ stopReason: string; diagnostic?: string }>; dispose(): Promise<void> }>`.
- `ResearchCoordinator.start(input: { sessionId: string; request: string; note?: string; requestId: string; mode: 'new' | 'continue'; setId?: string }): Promise<StartRoundResult & { target: ResearchTarget }>`; `cancel(sessionId: string, roundId: string): Promise<void>`; `targetForWorker(workerSessionId: string): Promise<ResearchTarget | undefined>`; `dispose(): Promise<void>`.
- Remote startRound uses the coordinator; add cancelRound. deck_submit_sources resolves trusted exec.agent.session.id, rejects unbound subagents writing into a parent set, and publishes once per batch.

- [ ] **Step 1:** Add failing fake-runtime tests: one start for concurrent calls on a set; partial arrivals keep running; empty/all-duplicate results finish; cancel disposes only its exact handle and never stops the main Agent; startup failure/cancellation, timeout, and late results settle without cross-topic writes.
- [ ] **Step 2:** Run `node --test tests/research-coordinator.test.ts`; confirm failures.
- [ ] **Step 3:** Implement per-set admission, stable request IDs, reserved worker identities, result/finally settlement, exact disposal, and a five-minute timeout. Mark unrestored tasks interrupted at service startup.
- [ ] **Step 4:** Use public `ctx.sessionController.resolveAgent(sessionId)` (pinned index.ts:243) for cold parents, then `ctx.subagents.startActivation({ provider: 'spawn', childId, label, request: { parent, prompt }, signal, delivery: 'caller' })`. The coordinator owns cancellation; returning from a tool must not abort its background task.
- [ ] **Step 5:** In serial agent/created handling for reserved workers, install scoped tools.restrict plus tools.guard, since restrictions alone do not cover scoped tools. Allow only web_search/web_fetch/deck_submit_sources and select scoped native presentation. Preflight services/provider/tools; fail clearly when unavailable. Test denials for shell, writes, Cordis, and delegation while main tools remain unchanged.
- [ ] **Step 6:** Run task 1–2 tests and build. Require verified GitHub facts, source, and lookup time in prompts. Commit `feat: run source research in managed background sessions`.

## Task 3: Conversation entry and addressed opening

**Files:** Create `src/commands.ts`, `src/activity.ts`, `src/client/DeckActivityObserver.tsx`, `tests/entrypoints.test.ts`; modify `src/index.ts`, `src/tools.ts`, `src/remote-service.ts`, `src/client/index.ts`, `src/client/DeckEntryButton.tsx`, `src/client/locales.ts`.

**Interfaces:** `registerDeckCommands(ctx: Context, coordinator: ResearchCoordinator): void`; deck_search arguments `{ request: string; note?: string }`, with trusted caller identity and immediate roundId/started return. `DeckActivity = { sessionId: string; setId?: string; roundId?: string; revision: string; openRequested: boolean; status?: RoundRecord['status'] }`; Remote getActivity({sessionId}) returns it. An observer mounted in the session entry polls every two seconds, consumes each opening revision once, and cleans up on unmount.

- [ ] **Step 1:** Add failing tests: bare /deck makes no model request, /deck plus Chinese text starts once without changing input, /deckx is ignored, old action registration does not swallow arguments, and A's delayed response never opens results in B.
- [ ] **Step 2:** Run `node --test tests/entrypoints.test.ts`; confirm failures.
- [ ] **Step 3:** Register the official Host command with input/handler; arguments start research, no arguments request opening. Replace the old Client-only action. Tool descriptions/runtime guidance provide explicit Chinese natural-language examples without intercepting generic searches.
- [ ] **Step 4:** Implement activity and targeted `sidebarRight.openTabIn(sessionId, 'sourcedeck', { params: { setId, roundId } })`. History cards open their recorded target. Failures preserve request and follow-up text.
- [ ] **Step 5:** Test/build, confirm searches no longer call main session.prompt, and commit `feat: start and open source research from conversation`.

## Task 4: Immutable references and draft protection

**Files:** Create `src/references.ts`, `src/client/references.ts`, `src/client/input-bridge.ts`, `tests/references.test.ts`, `tests/input-bridge.test.ts`; modify `src/model.ts`, `src/ops.ts`, `src/remote-service.ts`, `src/client/index.ts`, `src/client/deck-face.ts`, `src/client/DeckEntryButton.tsx`.

**Interfaces:**
- `ReferenceSnapshot = { selectionId: string; sessionId: string; setId: string; createdAt: string; items: readonly { candidateId: string; source: SourceRecord; reason?: string }[] }`.
- `createReference(store, input: { sessionId: string; setId: string; requestId: string }): Promise<ReferenceSnapshot>`; `getReference(store, input: { sessionId: string; selectionId: string }): Promise<ReferenceSnapshot>`; `serializeReference(snapshot: ReferenceSnapshot): string`; `listReferences(store, sessionId: string): Promise<readonly ReferenceSnapshot[]>`.
- Optional selection kind/snapshot fields; missing kind means submitted. Add owned createReference/getReference/listReferences Remote operations. Make commitSelection reuse sessionId/requestId and immutable delivery text; persist pending/sent/failed with explicit acknowledgment.
- `ReferenceBridge.register(sessionId: string, handle: { captureInsertion(): TokenSpan; insert(reference: ReferenceInsert, span: TokenSpan): boolean; persistDraft(): void; focus(): void }): () => void`; `insert(sessionId: string, prepare: () => Promise<ReferenceSnapshot>): Promise<'inserted' | 'draft-changed' | 'unavailable'>`.

- [ ] **Step 1:** Add failing tests for immutable source/verdict snapshots, an open set after referencing, cross-session rejection, idempotent requests, actual titles/URLs/notes/metadata in serialization, one legacy submission on retry, and no sent acknowledgment after failed delivery.
- [ ] **Step 2:** Run `node --test tests/references.test.ts tests/input-bridge.test.ts tests/ops.test.ts`; confirm failures.
- [ ] **Step 3:** Implement snapshots and serialization. Reject zero-kept references, mark external content as data, support preview/removal, and let official codec failure block invalid references after cleanup.
- [ ] **Step 4:** Register @deck input source/codec for current kept results and historical snapshots. Encode sessionId/selectionId in owned refs, revalidate on retrieval, and preview the original addressed set.
- [ ] **Step 5:** Register disposable session input handles in the existing entry component. Capture insertion before awaiting the snapshot, send ReferenceInsert/TokenSpan through the retained session event, then persist/focus on success. Test edits, IME, switching, submitting, existing chips, and attachments: no setDraft/submit call; stale revisions preserve content and offer retry.
- [ ] **Step 6:** Keep direct summary sending secondary with stable IDs and delivery acknowledgment. Test/build and commit `feat: reference screened sources in conversation drafts`.

## Task 5: Screening UI, imagery, and comparison

**Files:** Create `src/client/CandidateCard.tsx`, `src/client/CandidateCard.module.css`, `src/client/ComparePanel.tsx`, `src/client/ComparePanel.module.css`, `src/client/source-presentation.ts`, `tests/source-presentation.test.ts`; modify `src/client/DeckBody.tsx`, `src/client/DeckBody.module.css`, `src/client/deck-face.ts`, `src/client/definition.ts`, `src/client/DeckCard.tsx`, `src/client/card-definition.ts`, `src/scope-policy.ts`, `src/tools.ts`, `src/remote-service.ts`, `src/client/locales.ts`.

**Interfaces:** `sourceImages(source: SourceRecord): readonly string[]`; `formatSourceFacts(source: SourceRecord, locale: string): { stars: string; updated: string; checked: string }`; optional metadataFetchedAt/metadataUrl. DeckFace routes background research and adds cancel/reference/activity/history while retaining favorites/policy APIs.

- [ ] **Step 1:** Add failing tests: zero stars shows zero; unknown stays unknown; pushedAt and lookup time remain distinct; invalid dates are safe. Prefer project image/logo then owner avatar; reject non-http(s)/credential-bearing image URLs; exhausted images keep identity and all actions.
- [ ] **Step 2:** Run `node --test tests/source-presentation.test.ts`; confirm failures.
- [ ] **Step 3:** Extract cards and render proportional imagery, one attempt per fallback, prominent stars/recent code update, separate source/lookup time. Diagnose Host image failures from actual load/network evidence; no CSP workaround or arbitrary-image proxy.
- [ ] **Step 4:** Derive search state from durable rounds and separate candidate/favorite/reference loading. Keep screening, reasons, favorites, comparison, and references usable during research. Comparison uses source identity without mutating verdicts; history/new topics use exact targets.
- [ ] **Step 5:** Use a container query: two columns at >=620px content width, one below. Check real-source fixtures at 320/420/640/900px and 100%/125%, long Chinese/URLs, and state preservation on resizing/theme changes/refresh.
- [ ] **Step 6:** Test/build, record interactions, and commit `feat: improve responsive source screening and comparison`.

## Task 6: Complete themes and plugin identity

**Files:** Modify all `src/client/*.module.css`, `src/client/ScopePolicySection.tsx`, `src/client/locales.ts`, `package.json`, `pnpm-lock.yaml`; create `locale/zh.json`, `locale/en.json`; use existing `assets/icon.svg` and `assets/icon.png`.

**Interfaces:** Keep component business interfaces. Map local colors to real pinned `--dsw-alias-bg-base/bg-layer-1/border-l2` and text tokens, inheriting Host color-scheme and body data-ds-dark-theme.

- [ ] **Step 1:** Record current light/dark defects for expanded select/options, inputs/placeholders, disabled/error, decisions, and reference chips in the sandbox matrix. Do not add tests that merely mirror CSS constants.
- [ ] **Step 2:** Apply Host tokens to all focus/hover/selected/loading/empty/disabled/error states. Theme native options; if the actual RC platform remains unreadable, use its existing public select component. No global option/body overrides.
- [ ] **Step 3:** Wire icon='./assets/icon.svg', packaged assets/locales, locale exports, SourceDeck display titles, and short bilingual descriptions while preserving exports/exact peers.
- [ ] **Step 4:** Verify the complete matrix in Host light/dark themes, 32/48/64px icons, and metadata while the plugin is disabled. Check self-contained SVG, package-local resolution, and <256KiB. Static previews do not replace Host screenshots.
- [ ] **Step 5:** Build and commit `feat: support host themes and custom plugin identity`.

## Task 7: Pinned RC acceptance and Git delivery

**Files:** Modify `package.json`, `pnpm-lock.yaml`, `README.md`, `README.en.md`, `docs/SETUP-VERIFICATION.md`, `docs/HANDOFF.md`, `AGENTS.md`; keep local evidence in sandbox test-workspaces/dsh-source-deck and logs.

**Interfaces:** Next product version 0.3.0, unchanged exact peers. Deliver dsh-source-deck-0.3.0.tgz plus SHA256; no production installation.

- [ ] **Step 1:** Run `node --test tests/*.test.ts`, `npm run build`, and `git diff --check`; all must pass. Check generated types, Client platform-only requires, and no duplicated Host core runtime; review introduced dependencies.
- [ ] **Step 2:** Bump 0.3.0 and sync the existing lockfile with the current package manager; build/pack. `npm pack --dry-run --json` and actual tar contents must include icons/locales/artifacts/types and exclude sandbox, credentials, node_modules, and private research memory.
- [ ] **Step 3:** Check the lease, install the exact local tgz using Install-Plugin.ps1, then Start-Desktop.ps1 on the pinned RC. Record enabled plugins; do not alter upstream/baseline.
- [ ] **Step 4:** Verify legacy data, restart interruption/recovery, cold parent activation, identities/idempotency/tool denials, history, draft conflicts, invalid references, icon metadata, and the full width/theme matrix without model calls.
- [ ] **Step 5:** Verify real-model natural-language and /deck entry, follow-up without internal main user prompts, a simultaneous independent left-side task, research-only cancellation, empty/duplicate settlement, and actual reference URLs reaching the model with a UI-research instruction. Use only sandbox-configured credentials; missing model/quota remains explicitly unverified and requires sandbox configuration.
- [ ] **Step 6:** Run independent final review, fix findings, rerun affected checks, and synchronize bilingual usage/limits/evidence/handoff. Marketplace claims must match actual PR merge state.
- [ ] **Step 7:** Commit `release: ship SourceDeck 0.3.0 developer research workflow`, push the delivery branch without force, and verify clean status plus HEAD=origin/delivery-branch. Use single-command host execution for established keyring limits. Report package/hash/tests and real-model acceptance separately.

## Self-review and execution handoff

Spec sections 1–3 map to tasks 3/5; 4–5 to 1/2; 6 to 4; 7–8 to 5/6; 9–10 to 7. Every Review Focus item has owned tests or a Host matrix. There is no new data domain, production deployment, or baseline change.

Planning checks passed: local links and UTF-8 in eight updated documents, seven tasks per plan, no placeholders, and git diff --check. The existing baseline passed 35/35 tests; sandbox baseline/CheckOnly passed and the lease was free. Desktop and new-feature/model acceptance have not run in this stage.

Recommend **Native** execution by the current Agent in this conversation, then independent final review. The seven tasks share execution identity and reference contracts; continuous implementation helps preserve them while retaining per-task validation/commits/pushes. Invoke executing-plans after this written plan is reviewed; implementation has not started.
