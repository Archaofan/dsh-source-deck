# Developer workflow research and iteration proposal

2026-10-18. **Research complete; design review pending. No product code, dependency, or version changes.** [Chinese, primary document](2026-10-18-developer-workflow-review.md).

## Intent and constraints

The user prioritized **finding open-source libraries and comparing technical approaches**. The intended outcome is a direct entry from the current chat, useful suitability and tradeoff information, independent comparison and screening decisions, and a clear handoff back to the same Agent conversation.

Keep the current session/model/tools, eight-table domain, natural-language entry, keep/exclude/favorites, and optional scope policies. The exact DSH baseline remains `0.2.1-rc.2`, with Cordis `4.0.5`. Sandbox verification is required; production deployment still needs separate explicit user approval. This proposal does not replace the approved A/v2 design until reviewed.

## Baseline evidence

- Local HEAD and GitHub's actual main were both `28448a30c4ed65d3d17434a0380bf0d5bc9f893e`; the local tracking ref was stale and was subsequently refreshed by `git fetch origin main`.
- Shared sandbox: `officialVersion=0.2.1-rc.2`, `matchesProduction=true`, `occupied=false`; launcher CheckOnly passed. Upstream HEAD is `687f282e8625c6b8d11ff58211a90524be2e4317`.
- Existing unit suite: 35 passed, zero failed. The 0.2.5 archive SHA256 still matches the recorded `BADA485796D6C1FACF99AE25E9830719358D3A660078B1535E3F26ADB9FEC9C6`.
- UI analysis uses the prior sandbox screenshot `logs/shots/deck-v2/round1-023.png` and the current components/styles. This research did not start Desktop or issue a live model request.
- Around 10:43 China time, marketplace PR #7739 remained open/unmerged: check success; Submission gate still failed on repository age. The exact 24-hour threshold is 11:35:45; a later automated rerun must be observed before claiming success. No PR branch mutation was made.

## Primary research and implications

These sources inform interaction design, not DSH API compatibility:

- [VS Code Chat](https://code.visualstudio.com/docs/chat/chat-overview): conversational input and slash shortcuts support a direct `/deck <request>` entry. Queue admission should be distinguished from actual execution.
- [VS Code Context](https://code.visualstudio.com/docs/chat/copilot-chat-context) and [Continue Context Selection](https://docs.continue.dev/ide-extensions/chat/context-selection): keep text as the only required input and expose optional context. Show a preview/toggle for the plugin's extra recent-conversation recap.
- [VS Code Sidebars](https://code.visualstudio.com/api/ux-guidelines/sidebars): related views and restrained actions support a single deck with screening/comparison/favorites views.
- [WAI keyboard guidance](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/): preserve visible focus and common navigation. Scope optional letter shortcuts to the deck, excluding text editing and IME.
- [WCAG target size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html): a 24×24 CSS px target or qualifying spacing is the minimum. Proposed primary product controls aim for at least 32px height and 14px body text.
- [GitHub repositories](https://docs.github.com/en/rest/repos/repos#get-a-repository) and [licenses](https://docs.github.com/en/rest/licenses/licenses): maintenance and license metadata matter for selection. Show provenance, observation time and unknowns; do not equate model-provided metadata with independent API verification.

## Confirmed defects and code-path findings

`node docs/research/probes/2026-10-18-workflow-probe.mjs` uses only in-memory storage. It confirms that a late first-round result is assigned to a newer round, an old result is assigned to a new topic, and two commits with the same requestId create two selection records. The probe's true values explicitly mean **existing defects observed**, not successful fixes.

Code-path findings awaiting sandbox interaction regression:

- **P0:** submit ignores a false prompt result, while the Host marks the set submitted before delivery. The UI does not restore its submitted state from the stored set.
- **P0:** waiting/busy state is local to the mounted component; reopening loses it. Search replacement remains accessible during a search, and refresh callbacks lack a session-generation guard.
- **P1:** the first candidate ends polling; empty and all-duplicate results have no completion signal.
- **P1:** unassigned/manual candidates can disappear when round groups also exist. Legacy candidates only render a title, without screening actions.
- **P1:** a historical chat card opens the current active set, rather than the card's set; submitted-state mutation guards are missing from card/Host decision paths.
- **P1:** K/X/U/search shortcuts are advertised but absent from the v2 body. Earlier screening filters/bulk controls are also absent.
- **P1:** favorites are profile-wide, contrary to the per-set README claim; metadata is lost through UI save/import paths.
- **P2:** globally deduplicated sources reuse old metadata without refreshing it. Selection needs observation time and snapshot semantics.

Priorities indicate workflow impact, not security severity.

## Fixed RC feasibility

All interface evidence comes from [the pinned upstream commit](https://github.com/deepseek-ai/deepseek-harness/tree/687f282e8625c6b8d11ff58211a90524be2e4317):

- Host command definitions support input and `CommandInvocation.rawInput`.
- Client `commandUi.decorate` supplies the bare-command behavior while preserving Host argument handling. Do not keep a same-name client contribution alongside a Host command: catalog composition rejects that collision.
- The client `command/executed` event includes sessionId; `sidebarRight.openTabIn` supports session-targeted opening.
- The session controller checks prompt requestIds against durable messages and queued items. A stable requestId supports deduplicated retry. Admission does not mean the model has processed the request.

Build exports, injection and bundle purity must still be checked during implementation and verified in the official sandbox.

## Alternatives

**A, recommended: an in-conversation selection workbench.** Fix correctness first, add an argument-bearing command, a readable screening list, independent comparison, recent-search access and evidence-oriented metadata. This covers the prioritized workflow with incremental changes to existing records/protocols.

**B: refine existing cards only.** Smaller UI scope, but insufficient for comparison, late results and recovery; P0 fixes remain necessary.

**C: a separate research Agent/project knowledge base.** New sessions, indexing and synchronization substantially expand scope and diverge from the current-conversation product. Not recommended for this iteration.

## Recommended behavior for review

### Entry and context

- Bare `/deck` opens the current session's recent deck and focuses the request, without automatically requesting a model turn.
- `/deck <request>` directly starts a new topic; earlier topics remain accessible under recent searches. Continue an existing topic from its own continuation action.
- The composer button opens/focuses the request without consuming or clearing the chat draft.
- Chat cards open their exact sessionId/setId. Viewing history does not silently change the active search. Submitted history is read-only.
- Improve tool descriptions for an explicit natural-language request to use the deck; do not intercept generic search keywords or promise model compliance or automatic focus stealing.
- Default the extra recap toggle on, matching existing behavior. Preview/send the same snapshot. Disabling this recap does not remove the current model's own conversation history.
- Defer global shortcuts, message-menu integration, general file attachments and a new deck_open push system.

### Screening and comparison

Use a single-column default, with a two-column wide-panel alternative. Show topic/round/state, recent searches and favorites; provide status filters and current-topic search. Render manual and round candidates through the same reusable component.

Each candidate shows its repository/link, purpose, suitability, limits/unknowns, license/maintenance/language, auxiliary stars and provenance/time. Keep/exclude are durable decisions; comparison selection is independent. Reasons are optional and retain their draft on failure. Provide undo.

Compare 2–4 items on shared dimensions, stacking by dimension in narrow panels. Unknown values remain unknown; do not invent scores/rankings. The primary action hands kept sources back to the current conversation, with compare/recommend/read intent; continue-search is secondary. Exclusions-only submission uses an explicit feedback label.

Favorites remain explicitly profile-wide for this iteration. Preserve their metadata and observation time. Project-scoped favorites require separate review.

### Reliable state and delivery

Keep eight tables with backward-compatible optional fields. Old rounds without lifecycle state are historical, not presumed running. Explicit searches use stable roundId and prompt requestId; result submission validates original session/set/round ownership. Untagged legacy submissions remain a separate chat-collection path and cannot update explicit search rounds.

Persist dispatching/waiting/completed/timed-out/failed state. Without reliable execution-stage evidence, say the request was sent and is waiting for the current conversation. Use explicit batch completion, including empty/all-duplicate responses; emit one snapshot per batch. Late results update their original round only. Ending the deck's wait must not claim to stop the whole model.

Persist a selection snapshot and pending-delivery state keyed by a stable requestId. Show success and lock only after prompt admission. Uncertain delivery can retry with the same ID and recover across remounts. Enforce submitted-state guards on both Host and UI; guard stale async callbacks after session changes.

Proposed focused boundaries are a shared CandidateItem, SearchHeader, CompareView, session-bound data hook and centralized round/ownership/delivery operations. These are review candidates, not scaffolding already created. No additional GitHub token or background enrichment service is proposed for the first iteration.

## Validation and next gate

Cover late/cross-topic results, empty/duplicate completion, idempotent retries, read-only submitted sets, old-record compatibility, false/thrown sends, remount and session-switch races, mixed candidate groups, and keyboard/IME exclusions. Then build/pack with exact peers and lazy-CJS, bump before sandbox installation, and use the approved installer. Verify narrow/wide panels, zoom, long bilingual text, focus, screenshots and a real two-round model workflow. Synchronize Chinese/English user documentation. Production remains unchanged.

The pending decision is direction A with a single-column default, independent comparison, direct commands and correctness first. Formal design and implementation planning follow that review; implementation has not begun.
