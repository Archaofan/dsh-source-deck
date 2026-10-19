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
- Twenty-four title-only sources were added via the actual interface. At least 158 were subsequently confirmed visible. Continued bulk control encountered browser-control and automatic-approval timeouts; **200-item interaction performance is not accepted**.

Actual Host screenshots (panel only, no account area): [light](../assets/screenshots/source-deck-0.3.2-light.png), [dark while reading](../assets/screenshots/source-deck-0.3.2-dark.png). Local raw evidence remains under the shared sandbox's `test-workspaces/dsh-source-deck/experience-acceptance/` and is not uploaded.

A diagnostic build observed zero full reads and 24 activity reads during 47,051ms in favorites. An idle sample was only 34,287ms (one full/17 activity reads), not a complete minute. Deterministic tests verify two reads in sixty idle seconds, two-second active delay, pause/resume and no overlap; the real full-minute/hidden matrix remains incomplete.

## Delivery limits

The local 0.3.2 package and branch are delivered without a public Release or production installation. The 100ms/500ms user-latency budgets, 200-item end-to-end interaction and complete real hidden/minute read matrix need reliable follow-up measurement. Automation timing includes tool/approval overhead and is not INP. Native Electron 125%, real Chinese IME/attachment combinations and a 3–5-person task study remain unverified. Automated attachment/draft protocol checks passed but do not replace those native checks. Existing model/cancel/restart evidence belongs to the previous release, not a new model run in this iteration.

Final package hash and Git synchronization are recorded in [setup verification](../SETUP-VERIFICATION.md), under “2026-10-19 体验迭代”.
