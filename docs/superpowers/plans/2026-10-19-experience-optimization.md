# SourceDeck Experience Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Implement the approved 0.3.1 performance and 0.3.2 workflow refinements without expanding product scope.

**Architecture:** Keep Host operations and eight tables unchanged. A client read scheduler serializes full reads and follows the fixed RC's `tab.visible`; a response decoder reuses only identical, freshly received JSON. Existing panel components gain staged editors, local projections, operation feedback and focus continuity.

**Tech Stack:** Existing React/TypeScript, Node test runner, tsdown, DSH 0.2.1-rc.2 / Cordis 4.0.5. No dependency changes.

**Spec:** [Approved iteration proposal](../../design/2026-10-19-experience-iteration-proposal.md). User authorized execution on 2026-10-19 with “按方案执行落地”; implement inline in this session, with one final independent review. 0.4.0 remains conditional and excluded.

## Global Constraints

- Sole project path `E:/DSH-Desktop-Plugin-Dev/dsh-source-deck`; work on `feat/experience-optimization` in place, respecting the user's unique project directory.
- Exact peers and eight-table/worker/reference/delivery contracts remain unchanged. No upstream edits, new dependencies, credentials, global shortcuts or production operations.
- Preserve real images, stars/push/lookup distinctions, two columns with <620px single-column fallback, reasons/favorites/maximum-four comparison.
- Chinese default, English synchronized; shared official sandbox only; checks before commits/push; verify actual remote identity.
- Do not call lab action timing field INP or claim a 3–5-person user study happened. Native zoom/IME limitations remain explicit.

## Review Focus

1. Slow reads with writes arriving meanwhile must finish with a fresh read, without overlap or a lost final update (Task 1).
2. Hidden/favorites/session switches must not apply a disposed target's response or lose intent-based opening (Tasks 1, 3).
3. Identical payload reuse must never mask changed source metadata, deletion, null results or another topic (Task 2).
4. Reason blur followed by a verdict must preserve both in order; failures retain drafts and last confirmed state (Task 3).
5. Filter removal, disclosures and comparison return must preserve meaningful keyboard focus, scroll and real composer contents (Tasks 3, 4).

### Task 1: serialized, lifecycle-aware full reads

**Files:** create `src/client/deck-refresh.ts`, `tests/deck-refresh.test.ts`; modify `src/client/DeckBody.tsx`.

**Interfaces:** `DeckRefresh<T>(read:()=>Promise<T>, accept:(value:T)=>void, failed:(error:unknown)=>void, isRunning:(value:T)=>boolean)` exposes `refresh():Promise<void>`, `setEnabled(enabled:boolean):void`, `dispose():void`. It owns timers, not Host/model state.

- [x] Write behavior tests: 60 seconds idle produces two reads after initialization; running updates after 2 seconds; concurrent refreshes cause no overlap and one trailing read; pause cancels timers, resume refreshes; dispose ignores late results; errors can retry.
- [x] Run `node --test tests/deck-refresh.test.ts`; observe missing behavior fail.
- [x] Implement the scheduler and integrate actual `tab.visible` plus document visibility and candidate/favorites mode. Preserve explicit refresh after writes; retain the separate activity observer. Use a per-effect controller so cleanup/restart is safe.
- [x] Run scheduler and full suite; build. Record baseline/after in local acceptance materials. Commit independently.

### Task 2: presentation work and 0.3.1 delivery

**Files:** create `src/client/stable-json.ts`, `src/client/deck-projection.ts`, `tests/deck-projection.test.ts`, `tests/stable-json.test.ts`; modify `src/client/index.ts`, `source-presentation.ts`, `CandidateCard.tsx`, `ComparePanel.tsx`, `DeckBody.tsx`, package version and bilingual release notes.

**Interfaces:** `StableJson<T>.decode(raw:string):T` compares only the most recent freshly received payload; no request skipped. `projectDeck(view:SetView|null, filter:'all'|Verdict, query:string)` returns counts, shown entries and grouped entries. `favoriteIdentity(source:{url?:string;title:string}):string` supports a lookup Set. Formatter public behavior remains `formatSourceFacts(source,locale)`.

- [x] Tests first: changed/null/cleared/other-topic JSON is not stale; grouping retains manual/unmatched running rounds and literal counts; URL/reason search works; structured metadata changes remain visible. Allocation measurement uses the existing probe, not timing assertions.
- [x] Observe failing tests, then implement; use memoized projections and per-source facts, bounded locale formatters and one fact computation per comparison source. No blanket memoization or store rewrite.
- [x] Run full suite/build and compare the pure formatting probe, identifying its limits. Bump to 0.3.1, pack into hash path, install with official script; verify installed lib bytes and real Host reads/visibility/ordinary 6/24-item flows.
- [x] Record actual metrics/limits, commit and push this milestone. Do not treat a failed check as a feature-expansion trigger.

### Task 3: result-focused panel and continuity

**Files:** modify `DeckBody.tsx`, its CSS, `CandidateCard.tsx`/CSS, `locales.ts`, `candidate-mutations.ts` if needed; create focused panel-state helpers/tests only where they enforce nontrivial transitions.

**Interfaces:** reuse Task 1 scheduler and Task 2 projection. Existing `DeckFace` remains intact. New search opens editing only; Start uses existing `startRound(...,{mode:'new'})`. UI state remains local/session draft storage.

- [x] Tests first for transitions/projection: independent scoped queries, zero-filter vs zero-arrival distinction, new-search cancel preserves current set, and same-card blur/choice order with failure recovery. Keep expectations literal.
- [x] Implement two navigation destinations, compact topic/result layout, contextual comparison and return, staged new/refine editors, one primary reference action and one-level labeled secondary actions. Preserve optional reasons, immediate-send semantics and submitted-set read-only state.
- [x] Add per-card saving feedback; guard stale-owner completions. Focus adjacent card/result status only when the active decision removes its card; preserve position through comparison and disclosure return. Keep all high-frequency controls discoverable and >=32px where appropriate.
- [x] Run unit suite/build and real Host flow checks. Commit independently without adding 0.4.0 prompt/data work.

### Task 4: review, acceptance, 0.3.2 package and synchronization

**Files:** package version, bilingual README/HANDOFF, `docs/SETUP-VERIFICATION.md`, implementation record; local evidence under shared sandbox `test-workspaces/dsh-source-deck/experience-acceptance/` only.

- [x] Execute fixed RC visual/interaction matrix at 320/420/640/900 widths, light/dark; measure 420×800 collapsed-result chrome <=35%, representative operation feedback/warm-return timings, 200-item stress costs. Count full/activity calls separately; no idle full reads in favorites/hidden, <=2/minute visible terminal, max one in-flight steady-target full read. Actual additional evidence is in the Host acceptance summary.
- [ ] Full stable acceptance beyond the verified preview scope: native Electron 125% / OS IME / real attachment combinations, 3–5-person observation, cold launch and actual Host profiles at 1/100/1,000 topics. Upload was denied even after explicit user permission. No full-matrix completion claim; retain stable 0.3.0 and publish 0.3.2 as prerelease.
- [x] Verify reference insertion with existing draft/attachments contract, history/read-only, independent queries, filter-empty state, failed writes, comparison return, cancellation and restart behavior. Clearly distinguish automated protocol checks, browser Host checks, and unavailable native/human checks.
- [x] Request one independent whole-branch review under executing-plans; reproduce/fix Important/Critical findings with failing regression then green suite. Record remaining limits honestly.
- [x] Bump 0.3.2, build/pack/hash/install through official sandbox script; verify final bytes. Update Chinese/English user/handoff material and current approval state. Run full suite, diff/package checks, commit/push and verify local/tracking/remote equality. Deliver absolute package path; no production install or external publication implied.


Execution result: Tasks 1–3 implemented. Task 4 preview scope covers common flows/layout/review/package plus actual 6/24/200-item representative feedback, warm returns, full-minute cadence and serialized reads. The user subsequently explicitly authorized pushing and release after independent checks; publication is now in scope, without production installation. Remaining stable-acceptance gaps are listed above, so 0.3.2 is a prerelease rather than a claim that the complete original matrix passed. See bilingual implementation record and metric summaries. Conditional 0.4.0 remains excluded.
