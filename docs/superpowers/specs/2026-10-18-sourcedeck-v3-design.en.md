# SourceDeck v3: background research, chat references and complete theme support

2026-10-18. **The user approved this written design and requested implementation and Git delivery. The [implementation plan](../plans/2026-10-18-sourcedeck-v3.en.md) awaits review; core implementation has not started.** [Chinese, primary specification](2026-10-18-sourcedeck-v3-design.md).

## Confirmed outcome

Help developers discover open-source libraries, compare approaches and bring screened references into the current project's development conversation. Confirmed requirements are responsive two-column cards collapsing to one, repository imagery, visible GitHub stars/latest code-update dates, complete light/dark support, natural-language activation, quiet follow-up research, independent left/right execution, and editable references in the main composer. The user explicitly selected a managed background research child, inheriting the current model configuration and credential policy while allowing concurrent model requests.

This revises v2's execution model: the main conversation still owns the deck, but searches no longer run serially inside the main Agent. The exact baseline remains DSH `0.2.1-rc.2`, Cordis `4.0.5`, upstream commit `687f282e8625c6b8d11ff58211a90524be2e4317`. Retain the eight-table domain and old data. Product remains 0.2.5; no production installation, baseline upgrade, new credential store, knowledge index or unlimited parallel research.

## Entry and research execution

Natural-language requests such as “Use the deck to find four Markdown editors” invoke a new `deck_search` tool. It starts research and returns a compact acknowledgment promptly. Model routing requires a tool-capable model and live-model acceptance tests; `/deck <request>` is the deterministic alternative.

Bare `/deck` opens only. An argument-bearing Host command starts a new research topic directly; panel continuation sends feedback to its research execution rather than calling the main session's prompt Remote. Composer buttons preserve drafts. Explicit open intent addresses the originating parent session using openTabIn; switching conversations must not open results into or steal focus from another session. A lightweight mounted activity observer can use verified public events, or a compact activity poll if no suitable event is verified; it never requests model turns.

A ResearchCoordinator uses the pinned RC's `ctx.subagents.startActivation` with a local fresh/spawn provider. It supplies the task, optional recent-context snapshot and screening feedback; default model routing and credential lookup follow the parent's configuration at launch. It uses `delivery: 'caller'`, consumes completion itself and does not wake the main model on completion. Runtime lineage, workspace and lifecycle stay under the official manager. Research tool restrictions must be enforced through the official composition and verified; a read-only instruction alone does not constitute a write restriction.

Reserve worker identity and persist parentSessionId/setId/roundId/workerSessionId/requestId before activation. Validate trusted executing identity for result submission; arbitrary supplied IDs confer no ownership. Publish one snapshot per batch. Existing main-session collection remains a separate compatibility path and cannot write to background rounds.

Activation settlement determines completion; the first candidate is merely partial progress. Empty/all-duplicate results terminate visibly. Failure, timeout and cancellation retain partial data. Late results cannot contaminate a new topic. Cancel only the exact research child, never the main Agent. Session switches preserve research. After a Host restart, unverified running state becomes interrupted/retryable rather than an invented live task.

Left/right editing and model execution can run independently. Screen, save, compare and reference already-arrived candidates while research continues; search busy state does not globally disable these actions. Provider quotas, network and hardware remain shared. Missing services/providers cause a clear failure rather than silently reverting to noisy main-session searches or upgrading the baseline.

## Message visibility

The pinned session.prompt request has no hidden flag and creates ordinary user messages. Repeated search bubbles are a consequence of the old dispatch path. v3 keeps internal prompts in the child; the main conversation retains the human request, necessary compact status and deck card. Official child catalog/lifecycle records and auditable research history may remain. CSS hiding is not the solution.

## Editable references in the main conversation

The primary panel action becomes **Reference in chat (N)**. It freezes the selected source snapshot, inserts a reference chip into the addressed parent composer and focuses it. It does not send a prompt or replace existing text/attachments. The user can append:

```text
[@Deck · 3 selected]
Study these repositories' UI designs, then consider how to improve
this repository's implementation within its current component constraints.
```

`@deck` also offers current-session selected sources and historical snapshots from the left composer. References support removal, preview and item inspection.

Use the public inputTriggers ReferenceInsert/codec.serialize contract. At send time, serialize actual titles/URLs/notes/necessary metadata, not an opaque ID alone. Snapshots are immutable as later screening continues, and Host reads validate session ownership. Reuse selections with optional reference/submission kind and snapshot content; creating a reference does not submit or lock the source set. Use official revision-guarded draft insertion; changed or locked drafts remain untouched with a retry action. Unresolved or cleared references fail visibly rather than silently sending an empty reference. Directly sending the selection summary remains an explicit secondary action with stable IDs and confirmed admission; legacy submitted sets remain read-only.

References do not imply that repositories have been downloaded/read or that dependency installation is approved. The main Agent follows the user's additional development instructions under existing tool policy.

## Theme, imagery and plugin identity

Use the Host's active theme and `--dsw-alias-*` tokens. ThemePresenter sets root color-scheme and body data-ds-dark-theme; do not rely solely on OS preference, assume legacy aliases exist or modify global theme state. Verify light/dark for cards, comparison, favorites/history, loading/empty/errors, buttons/focus/disabled states, settings fields and expanded dropdown options, chips and reference previews. Native selects inherit the Host color scheme and correct foreground/background tokens; use an existing public selection component if platform menus cannot meet acceptance. Do not override all global options.

Reflow and theme changes preserve drafts, decisions, reasons, comparison and references. Cap at two columns, with an initial breakpoint around 620 CSS px. Verify 320/420/640/900px panels and 100%/125% zoom.

Preserve real repository images/logos/avatars, stars, last-code-update time and separate lookup provenance. The user reported unavailable images in the inline preview despite prior successful local-browser display. That does not constitute official Desktop image acceptance; diagnose the actual Host failure and validate both successful loading and fallback without bypassing resource policy.

New local assets are `assets/icon.svg` (848 bytes) and `assets/icon.png` (256×256, 8,082 bytes): stacked source cards plus a selection check, with blue/teal colors and an opaque background. The self-contained SVG has no fonts/scripts/network dependencies. A local raster contact sheet checks 32/64px on dark/light backgrounds; it is not an installed-Desktop acceptance test.

The next manifest adds top-level `"icon": "./assets/icon.svg"` and includes it in files. The existing package.json export lets the Host read it. Locale meta.title/meta.description resources can replace the technical package name and long English description with concise localized metadata. The pinned RC supports SVG/PNG/JPEG/WebP up to 256 KiB, inside the package, and returns an embedded data URL. The current manifest/tgz were not changed and installed profiles do not automatically receive the icon.

## Pinned interface evidence

- api/session-controller types, index and commands: ordinary prompt messages and requestId admission deduplication.
- subagent/subagent index/types and spawn provider: managed activation, caller delivery, exact child identity and fresh context/model-route support; service presence does not prove a provider is registered.
- ui-input-trigger types/controller: source-owned reference codecs and send failures; submit interception filters slash/@ prefixes, so it is not generic natural-language recognition.
- ui-conversation contract input/draft-editor: ReferenceInsert, scoped input actions and revision-guarded insertion.
- ui-layout theme-presenter and ui-theme styles: active scheme and alias tokens.
- app-boot package-meta and the pinned adding-a-package cookbook: embedded local icon and locale metadata rules.

All evidence is from commit `687f282e8625c6b8d11ff58211a90524be2e4317`. Provider availability, cold-session restoration, composition restrictions, precise insertion wiring and parallel model behavior still need official sandbox verification.

## Acceptance and delivery

Cover ownership, late/empty/duplicate results, cancellation/recovery/retry, immutable references and old data. Cover all theme states and open native menus, draft conflicts, invalid references, historical navigation and keyboard/IME behavior. In the official RC sandbox, exercise natural-language and command starts, continuation without main user prompts, concurrent left-side work, independent cancellation and a real reference-plus-development request. Verify thumbnails and failure cases, packed icon resources, metadata data URLs, disabled-plugin metadata visibility and installed-list screenshots in both themes. Bump before build/pack/install, preserve exact peers/lazy-CJS, and use the sandbox installer. Keep model-free and real-model evidence distinct.

The written specification is ready for review. Core implementation, manifest changes and installation have not started. Implementation planning follows written-spec approval; production installation still requires separate explicit authorization.
