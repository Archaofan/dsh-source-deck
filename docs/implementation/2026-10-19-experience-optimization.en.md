# Experience and performance implementation — 2026-10-19

> [中文（默认）](2026-10-19-experience-optimization.md) | English

The user approved the written proposal and explicitly requested implementation. The 0.3.1 and 0.3.2 batches are implemented on `feat/experience-optimization`; conditional 0.4.0 is excluded. The pinned DSH 0.2.1-rc.2 / Cordis 4.0.5, eight tables, Host contracts, worker restrictions and dependencies are unchanged. Production and upstream source were untouched.

## Implemented behavior

- Full reads are serialized and invalidations coalesce into a trailing read. Active research uses a two-second delay; idle results use thirty seconds. The fixed RC's `tab.visible`, document visibility and favorites mode pause periodic full reads. Intent polling remains separate.
- Fresh identical JSON payloads reuse object identity without skipping Host requests. Grouping, favorite lookup, locale formatters and comparison facts avoid repeated work. The 200-call formatting probe improved p50/p95 from 18.080/20.661ms to 0.456/0.495ms; these are pure formatter measurements, not UI/INP claims.
- Result pages use on-demand new-search/follow-up editors, independent scoped queries, explicit filter-empty recovery, contextual comparison and return focus/scroll. Existing images, facts, decisions, optional reasons and full descriptions remain accessible.
- Candidate writes preserve blur-save order and the last queued explicit choice, with local saving/errors. Reference/direct-summary handoff waits for current-topic writes, blocks new decisions during handoff, stops on failed saves, and permits retry. Queues and busy operations are owner-scoped.

## Review and verification

One independent whole-branch review found three Important issues: a failed old read lost queued invalidation; generic long descriptions lacked disclosure; reference/delivery could overtake writes. A fourth Minor issue returned comparison focus to an unmounted element. Because it violated the promised keyboard workflow, it was treated as Important and fixed too. No review finding was deferred; regressions, not a second review cycle, verify the fixes.

All four classes were reproduced before fixes. Focused tests passed 11/11; `node --test tests/*.test.ts` passed **81/81** and `npm run build` passed. There is no `npm test` script. Final installed `lib/index.js`, `lib/client.js` and package metadata matched local SHA256; temporary QA logging is absent from the final build.

## Real pinned-RC Host evidence

- Six real sources: two kept, one excluded; images/stars/code-update facts preserved. Existing metadata was reused and no new research/model call was made.
- Candidate `zap` and favorite `zerolog` queries remained independent. No-match filtering showed 0/6 and recovered with Clear. Cancelling new search retained all six results and its draft.
- Two-source comparison returned focus exactly to its comparison button; scroll return was checked. Reason blur followed by reference insertion retained the existing composer text and inserted a two-source chip without sending.
- At 420×800, the panel was 419×762; header/nav/footer occupied 28.42%, with zero permanent textareas and no horizontal overflow.
- Light/dark × 320/420/640/900 viewport matrix produced 319/419/639/899px panels: one column at the two narrow sizes and two at the others, without root horizontal overflow.
- Separate 24-item and 200-item title-only fixtures were added through the actual interface and read back. Representative 6/24/200-item interaction measurements are recorded below.

Actual Host screenshots (panel only, no account area): [light](../assets/screenshots/source-deck-0.3.2-light.png), [dark while reading](../assets/screenshots/source-deck-0.3.2-dark.png). Local raw evidence remains under the shared sandbox's `test-workspaces/dsh-source-deck/experience-acceptance/` and is not uploaded.

Earlier short 34,287ms and 31,863ms samples remain historical and are excluded from full-minute claims. New complete windows supersede them.

## Additional pre-release acceptance

The user requested independent verification, pushing and release without user testing. The same pinned RC sandbox was used. A temporary ignored diagnostic client recorded operation names, durations and DOM feedback, without request contents. The final package is rebuilt without diagnostics.

| Actual Host check | Samples | p95 / result |
|---|---:|---:|
| Filter feedback at 6 / 24 / 200 items | 30 each | 33.7 / 33.2 / 76.1ms |
| Comparison selection feedback at 6 / 24 / 200 | 30 each | 30.2 / 29.7 / 28.8ms |
| Decision feedback / Host confirmation at 24 | 30 | 32.8 / 15.6ms |
| Actionable warm return at 24 / 200 | 30 each | 295 / 302ms upper bound |
| Full reads at 200 | 32 | RPC p95 66ms; maximum in-flight 1 |
| Visible terminal / favorites / hidden | 60 seconds each | Full reads 2 / 0 / 0; activity 30 each |

Feedback runs from event capture to two animation frames after the first plugin DOM mutation: a local laboratory approximation, **not field INP or exact pixel-paint time**. Warm return includes controller overhead and restores retained actionable data while requesting fresh data in the background; it is not cold start or fresh-data completion. Each cadence result uses the first 60,000ms of actual 110,001 / 71,387 / 72,066ms observations. See the [Host summary](../research/probes/2026-10-19-host-acceptance-summary.json).

A separate in-memory 6/24/200-item × 1/100/1,000-topic matrix ran 30 samples per cell. The largest case had read p95 2.575ms and projection/facts p95 0.539ms. It excludes disk/RPC/React and **does not represent actual Host profiles at these history sizes**. [Reproducible probe](../research/probes/2026-10-19-experience-acceptance.mjs), [results](../research/probes/2026-10-19-experience-acceptance.json). These measurements do not justify adding storage rewrites or virtualization.

Five single-agent scenarios passed: six sources/two kept/reference/continue drafting; Chinese edit/Enter/Escape/reopen; independent candidate/favorite queries; no-match recovery; and two-source comparison returning focus to the current button. Chinese composer text and a two-source chip coexisted without sending. This is a heuristic walkthrough, **not a 3–5-person study** or OS-native IME composition test.

Real attachment upload was denied twice by the browser authorization gate, including after explicit user authorization for a generated text-only fixture. No alternate route bypassed that restriction. Actual attachment combinations remain unverified; automated draft/attachment protocol regressions are separate evidence.

## Delivery limits

Release policy is **0.3.2 prerelease**, retaining stable 0.3.0; production remains untouched. Representative actions satisfy local 100ms feedback / 500ms warm-return targets, without extending that claim to all actions, hardware, fresh loads, image completion or INP. Cold launch and the actual Host history-size matrix are unmeasured. Native Electron 125%, real IME/attachment combinations and human observation remain unverified, so full-matrix stable acceptance is not claimed. Existing model/cancel/restart evidence belongs to the previous release, not a new model run in this iteration. Actual publication and synchronization results appear in setup verification.

Final package hash and Git synchronization are recorded in [setup verification](../SETUP-VERIFICATION.md), under “2026-10-19 体验迭代”.
