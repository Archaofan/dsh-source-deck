# Next iteration experience review

> [中文（默认）](2026-10-23-next-iteration-review.md) | English

Date: 2026-10-23, Asia/Shanghai. Reviewed version: 0.3.3 at `eabe490`. This is research and proposed scope; product code, version and packages are unchanged.

The user requested another substantial iteration informed by comparable plugins' interaction patterns and recurring problems. The existing developer use case remains finding open-source implementations, screening/comparing them and referencing them in the current conversation. Overall friction reduction is the working assumption; a priority question is pending. Success means easier retrieval, understandable judgments, recoverable decisions and reliable handoff.

## Evidence and limits

Current list, card, comparison, mutation and prompt code were inspected alongside prior handoffs. Official sources below were read again. No competitor application was operated or timed. Forum reports establish individual experiences, not prevalence or a currently reproducible defect.

The shared sandbox reports `occupied=false`, baseline `0.2.1-rc.2`, with Host/Desktop builds present. No Desktop, model or production interaction occurred. A fresh `node --test tests/*.test.ts` passed 83 tests with zero failures. Local HEAD and remote main both resolve to `eabe490b860a817c39258f7deac368a011ded6ea`. This is baseline evidence, not new-version acceptance.

## Comparable plugins and tools

| Primary source | Documented behavior | SourceDeck implication (inference) |
|---|---|---|
| [Raindrop extension](https://help.raindrop.io/install-extension) | Optional saved-page indicator and persistent sidebar | Keep favorite feedback; expose comparison membership by name |
| [Raindrop search](https://help.raindrop.io/using-search/) | Collection scope and matching across titles, URLs, tags and notes | Search existing language/license/topics consistently; identify local filtering |
| [Reader navigation](https://docs.readwise.io/reader/docs/faqs/navigation) | Optional auto-advance and keyboard-layout limitations | Keep pending-item processing and neighboring focus; prefer visible undo over global letter shortcuts |
| [Zotero sorting](https://www.zotero.org/support/sorting) | Explicit field sorting and secondary order | Offer original order, stars, code push and title; popularity is not relevance |
| [Obsidian Clipper troubleshooting](https://obsidian.md/help/web-clipper/troubleshoot) | Extraction can omit content; selection/highlights/templates help; transfers can depend on OS permissions | Summaries do not prove complete reading; retain uncertainty and wait for Host insertion confirmation |
| [Zotero Connector input interruption report](https://forums.zotero.org/discussion/127862/metadata-fetching-interrupts-manual-tag-entry) | Users describe focus interruption during metadata updates; automated analysis was not reproduced here | Verify editing during refresh and stale responses; do not call the suggested root cause verified |
| [Zotero duplicates](https://www.zotero.org/support/duplicate_detection), [Raindrop duplicates](https://help.raindrop.io/duplicates/) | Different duplicate presentation and merge semantics | Preserve existing deduplication; avoid another cleaner or automatic deletion of similar sources |

## Confirmed code gaps

Candidate search omits language/license/topics; favorite search covers fewer fields. Comparison has a count without directly editable names and reports the limit after an extra click. A repeated verdict resets to pending, but filtered-out cards are unavailable and there is no undo restoring an arbitrary prior verdict/reason. Candidates lack explicit fact sorting; round attribution should survive any change. The research prompt still requests a short introduction in note although the UI prioritizes screening guidance; applicability, uncertainty, license and archived status are not explicitly requested. Existing metadata already supports the last two. This mismatch does not prove all actual results are poor. These are code-backed gaps and product judgments, not newly reproduced crashes or data loss.

## Alternatives and recommendation

A cosmetic pass leaves recovery and comparison friction. A new knowledge library, automatic scoring or verification pipeline introduces architecture and cost and needs separate design. The recommended bounded option improves the existing decision flow:

- Consistent local matching fields for candidates/favorites; sorting within each round, original order by default. Missing values last, zero stars valid, stable ties. Comparison follows selection order.
- A compact comparison area with up to four removable names, clear/open actions and a limit explanation at unselected cards. Narrow layouts wrap.
- One undo for the latest confirmed local explicit decision, restoring prior verdict/reason. Reason autosaves do not create separate entries. Use the existing write queue and preserve failure feedback. Navigation, submission/clearing, later changes to that item or observed conflicts invalidate undo. No atomic multi-window undo or persistent history is promised. Referencing waits for undo writes too.
- Existing research requests produce applicability and material uncertainty in note, keeping description as introduction. Request license/archived only when found. Label guidance as research judgment and retain evidence links/time; no extra model calls or certification badges.
- Preserve drafts, rounds, decisions and immutable references; refresh must not steal editing focus. Remember query/sort by session/topic. Avoid unsupported storage, polling or virtualization rewrites.

Likely areas: DeckBody, CandidateCard, ComparePanel, projection, prompts, bilingual locales and relevant tests. Keep comparison and undo logic cohesive rather than enlarging DeckBody indiscriminately. Reuse Remote, eight tables and the fixed RC, without new dependencies. Choose the version after scope approval; this report is not a release.

## Future verification — not yet performed

Cover metadata matching, missing/zero sorting, selection order, comparison limits, prior reasons, failed/rapid writes, topic isolation and references waiting for writes. On the fixed RC Host, exercise 6/24/200 candidates, both themes/languages, 320/420/640/900px, filtered undo, removal focus, editing during refresh, return navigation, read-only sets and draft-preserving references. Existing native zoom/IME/attachment limitations remain.

Prompt changes require inspecting a few actual model results for URLs, applicability, uncertainty and evidence; prompt unit tests cannot establish research quality. Record unavailable model validation. Preserve single in-flight reads and idle budgets; measure fixed-area height against the existing 35% target at 420×800. No measurement means no speedup claim.

The short design still needs approval under the workspace's design-review requirement; previous 0.3.3 approval does not approve this iteration. After confirmation continue implementation, build, sandbox acceptance, commit/push and package delivery. Production installation requires separate explicit authorization.
