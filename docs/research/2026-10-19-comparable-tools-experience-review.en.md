# Comparable tools: a lighter, smoother, faster SourceDeck

> [中文（默认）](2026-10-19-comparable-tools-experience-review.md) | English

Date: 2026-10-19, Asia/Shanghai. Baseline: SourceDeck **0.3.0 / `bdaae38`**. Deliverables are this research and an [iteration proposal](../design/2026-10-19-experience-iteration-proposal.en.md). Product code, dependencies, version and deployment remain unchanged.

## Findings

Improve the work after discovery: **see candidates sooner, understand their relevance, and return chosen sources to the conversation easily**. More entry points, taxonomies, graphs or automatic reports do not resolve the clearest current friction.

1. Separate starting research, screening results and refining a search. Collapse the new-request and follow-up editors while reading results.
2. Prefer a short explanation of relevance over generic project copy. Preserve real images, stars and code-push dates, while reducing repetitive tags and instructions.
3. Reduce unchanged reads, repeated formatting and unnecessary view updates before considering indexes or virtualization.

These are product judgments grounded in documentation, code and an existing screenshot. No competitive usability timing or SourceDeck user study establishes an improvement yet.

## Questions and evidence

The established audience is developers selecting open-source libraries or technical approaches and handing sources to their current Agent. The new constraint is to improve experience and performance without accumulating features.

Seven related tools and GitHub as a direct discovery surface were examined across starting, browsing, screening, comparing and handing back. This is not a feature-count, popularity or vendor-accuracy ranking.

- External evidence: official help, developer documentation and product descriptions revisited on this date. No paid accounts or hands-on walkthrough of every application. A vendor description supports the documented mechanism, not superiority in task efficiency.
- Internal evidence: current 0.3.0 source, the existing real-Host screenshot `docs/assets/screenshots/source-deck-light.png`, and a new in-memory probe.
- Environment: shared baseline/status and live `Get-SandboxStatus.ps1` checked; RC `0.2.1-rc.2`, `occupied=false`. Old sandbox stage records do not supersede project acceptance night-9. No Desktop launch or research model invocation this round.
- Recommendations, risks and budgets below are proposals, not implemented behavior.

## Mechanisms worth borrowing

All sources accessed 2026-10-19. Adoption limits describe SourceDeck's scope, not shortcomings of the other products.

| Tool / task | Official evidence | Transferable mechanism | Boundary for SourceDeck |
|---|---|---|---|
| Zotero / browsing and organization | [Collections](https://www.zotero.org/support/collections_and_tags) can share one item without duplication; [7.0 history](https://www.zotero.org/support/7.0_changelog) documents collapsible item sections | Separate source identity from decisions; disclose secondary detail progressively | Preserve source/candidate/favorite boundaries. No folder tree or tag manager. Historical 7.0 evidence is not a claim about the latest release |
| Raindrop.io / retrieval | [Bookmarks](https://help.raindrop.io/bookmarks/) have previews, notes and favorites; [filters](https://help.raindrop.io/filters/) reflect relevant content and have explicit scope | Clear scope and a small set of useful filters | Separate candidate/favorite queries and explain filtered emptiness. Keep verdict filter positions stable, including zero counts |
| Readwise Reader / continuous triage | [Library configuration](https://docs.readwise.io/reader/guides/workflows/library-configuration) documents Inbox/Later/Archive and a separate Shortlist workflow | Make remaining work recognizable | Reuse pending/kept/excluded; no second state model or workflow selector |
| Raycast / focused actions | [Action Panel](https://developers.raycast.com/api-reference/user-interface/action-panel) organizes contextual primary/secondary actions; [List](https://developers.raycast.com/api-reference/user-interface/list) documents filtering, loading and asynchronous throttling | Expose frequent decisions and reveal secondary actions when useful | Keep keep/exclude visible; move direct summary to secondary actions. Do not transplant macOS shortcuts into Windows or chat inputs |
| NotebookLM / source scope and citations | The old help URL now redirects to [Gemini Notebook help](https://support.google.com/gemininotebook/answer/16179559?hl=en), documenting selected sources and citations opening their context | Make selected scope and evidence traceable | Explain that references contain kept items from this topic. A SourceDeck URL is not a passage locator, and does not constrain the main Agent to those sources |
| Elicit / reasons and evidence | [Systematic review announcement](https://elicit.com/blog/evaluating-elicit-slr) documents exclusion reasons and supporting quotes; [current workflow help](https://support.elicit.com/en/articles/14757543-getting-started-with-elicit-which-workflow-should-i-use) distinguishes research workflows | Explain recommendations and exclusions | Reasons remain optional; distinguish research judgments from facts. No scores, mandatory review protocol, custom extraction columns or extrapolated accuracy claims |
| ResearchRabbit / directed refinement | [Official guide](https://www.researchrabbit.ai/articles/guide-to-using-researchrabbit) explores Similar/References/Cited By from seed papers and iterates | Refine from previous decisions instead of restating everything | Reuse kept/excluded sources and reasons. Paper citation edges are not repository relationships; no graph or recommendation subscription |
| GitHub / repository facts | [Repository search](https://docs.github.com/en/search-github/searching-on-github/searching-for-repositories) documents stars, pushed, language and archived qualifiers | Preserve verifiable facts | Stars are not task fit; a push is not a release. No additional filter wall or plugin-owned credentials |

Complete the current task before expanding knowledge organization. The main evaluation should be choosing two sources from six, not building a library. Keep secondary detail discoverable through text, counts and keyboard access. Do not hide decisions, errors or critical warnings with everything else.

Terminology cannot simply be assembled across products: Zotero's multi-collection membership differs from Raindrop's single-collection bookmark model, and Reader's archive is not SourceDeck's exclusion. A stable model is easier to understand than several competing taxonomies.

Allow users to leave when they have enough: referencing must not require favoriting, deciding every pending item, generating a report or running another research round.

## Friction in 0.3.0

These observations concern current code and an existing real-Host screenshot. Previously fixed round ownership, delivery idempotency and worker-isolation issues are not presented as open work again.

| Evidence | User impact / uncertainty | Direction |
|---|---|---|
| `DeckBody.tsx:170` keeps the new-request editor open after results; footer at `195` includes follow-up editor, continue, reference, direct summary and instructions | Several task stages compete for reading space | Compact topic/status; explicit new-search expansion; follow-up editor on demand |
| `CandidateCard.tsx:35` prefers `meta.description` to `note`; `search-prompt.ts:88` requests a one-line introduction | Generic copy can obscure relevance to the current request | Use existing note for concise relevance; retain description in details; acknowledge missing evidence |
| Cards display language/license/three topics plus status, lookup information and reason | Repetitive metadata may add density without helping decisions; task testing still needed | Keep useful license/language and limitations; move topics and lookup details into existing disclosure |
| One query state at `DeckBody.tsx:29`; predicate at `130` omits URL/reason | Favorite search affects the returning candidate view; finding by domain or reason fails | Independent scope-local queries; search existing fields locally |
| Empty groups at `DeckBody.tsx:189` use “no new results” after filtering too | Hidden matches can be mistaken for a failed search | Distinguish unstarted, running, no additions, no filter matches and failure |
| Six fixed comparison rows, minimum column widths, comparison before the feed | Narrow views require horizontal scanning; opening from a scrolled position needs Host verification | Focused comparison with return position; vertical dimensions in narrow panes |
| `DeckBody.tsx:62` refreshes fully every two seconds, without running/mode/visibility conditions | Mounted idle or favorites views keep reading the full set; hidden-pane lifecycle is not established | Serial/coalesced reads and idle backoff, with refresh on return |
| `ops.ts:322` scans history; formatting creates Intl objects; comparison repeats formatting per row | Work scales with history, card count and refreshes | Remove repeated work first; no unsupported claim of severe UI lag |
| Same-card mutations are serialized, but card busy reflects favorite operations | Concurrency protection is not per-decision saving feedback; rapid-click experience unmeasured | Local saving/error feedback, preserving reliable mutation order |

Images already have lazy loading, a fixed-height frame and fallbacks. Preserve these, the approved image cards, automatic single-column layout below 620px, and separate stars/push/lookup information.

## Measured baseline

[Probe](probes/2026-10-19-experience-baseline.mjs), [raw result](probes/2026-10-19-experience-baseline.json), measured **2026-10-19 09:33:57 Asia/Shanghai**, Node `v26.7.0`.

Each synthetic topic has 24 candidates, three rounds and one reference selection; the last topic is loaded. The probe calls real `getSet` over a counting in-memory store. Fixture construction is excluded; ten warmups and 60 samples. Counts include iterator visits, not keyed `get()` calls.

| Total topics including current | Returned candidates | Iterator visits/read | p50 / p95 ms | Theoretical visits/minute at 2s/read |
|---:|---:|---:|---:|---:|
| 1 | 24 | 28 | 0.008 / 0.021 | 840 |
| 100 | 24 | 2,800 | 0.113 / 0.195 | 84,000 |
| 1,000, stress case | 24 | 28,000 | 0.817 / 0.895 | 840,000 |

History amplifies scans, but measured memory reads remain fast. Visits do not establish CPU, disk reads, energy or UI latency, and do not justify prioritizing a storage rewrite. Returned JSON is about 16KB, not proportional to all history.

Real `formatSourceFacts`, Chinese locale, valid stars and two dates, ten warmups and 30 samples:

| Calls/pass | p50 / p95 ms | Interpretation |
|---:|---:|---|
| 6 | 0.524 / 0.626 | Common initial batch |
| 24 | 2.062 / 2.456 | Four comparison sources × six dimensions currently |
| 200, stress case | 18.080 / 20.661 | Repeated Intl construction, not total React rendering |

Reuse locale formatters and presentation facts, and avoid replacing unchanged views. Memoization requires stable inputs and measured benefit.

`DeckActivityObserver` also polls every two seconds, but uses direct active-pointer/round keys, **not another full getSet scan**. It supports intentional opening after command/tool actions. Its `openRevision` is navigation intent, not a candidate content version.

Not measured: Electron, Remote, actual Host storage, React, first paint, scrolling, memory, model time or tokens. No optimized comparison exists, so no speedup is claimed.

## Evaluation

- Fixed task: choose two suitable repositories from six, explain one exclusion, insert references and continue writing. Record completion time, backtracking, mistakes and actual reference contents.
- Continuity: refine once, filter, compare and return, favorite, then switch conversations. Check drafts, scroll and decisions.
- Separate click feedback, confirmed Host write, visible update and model first results. Model latency is not panel latency.
- [INP](https://web.dev/articles/inp) measures interaction through paint; laboratory action timing is not field INP. [CLS guidance](https://web.dev/articles/optimize-cls) supports reserving image space, which already exists here.
- Review disclosure behavior against [WAI menu buttons](https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/). [WCAG 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) has a 24 CSS px minimum with exceptions; keep the product goal of at least 32px for primary controls.

See the [iteration proposal](../design/2026-10-19-experience-iteration-proposal.en.md) for scope, budgets and stop conditions. These await subsequent design review; this research task does not include implementation or production deployment.

## Delivery checks

- The in-memory probe completed and scan assertions passed; raw JSON is retained. Timing varies and exact decimals are not regression gates.
- `node --test tests/*.test.ts`: **67 passed / 0 failed**, rerun on this date. This verifies existing logic, not a new UI.
- All 53 local links across eight bilingual documents resolve; report measurements match the JSON, product remains 0.3.0, and `git diff --check` passes.
- Only documentation/research-probe changes; no product rebuild/package or new real-Host/model acceptance.
