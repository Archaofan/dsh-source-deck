# SourceDeck

> [中文（默认）](README.md) | English

SourceDeck is a developer research workbench for DeepSeek Harness Desktop. Start background research from chat, screen and compare open-source libraries, insert the selected repositories into a chat draft, then add your development instructions.

## Screenshots

Real Host screenshots (light / dark), using mainstream agent projects such as Hermes Agent and OpenClaw, showing background research results, per-source keep/exclude decisions, screening reasons, and the reference entry:

| Light | Dark |
|---|---|
| ![SourceDeck light interface](docs/assets/screenshots/source-deck-light.png) | ![SourceDeck dark interface](docs/assets/screenshots/source-deck-dark.png) |

## Compatibility and installation

| Item | Exact version |
|---|---|
| SourceDeck | 0.3.0 |
| DeepSeek Harness Desktop | 0.2.1-rc.2 |
| @deepseek-ai/cordis | 4.0.5 |

Only public APIs from this RC are used. Sandbox and production Desktop share the baseline. **This iteration installs only in the sandbox; production still has plugin 0.1.17.**

Use the Desktop plugin manager to install `dsh-source-deck-0.3.0.tgz`, then restart when prompted. The list displays the bundled custom document icon and localized name. During development, use a new version or a content-hashed tgz path: the package manager may cache the same version at the same path.

Market submission [PR #7739](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/7739) still requires merge/catalog verification; availability is not claimed. See [market status](docs/MARKETPLACE.md).

## Start from chat

- Say `Use SourceDeck to find two Go logging libraries and compare maintenance and structured logging APIs`. The model starts research with `deck_search`; natural-language triggering depends on its tool choice.
- For a deterministic entry, use `/deck Find extensible open-source Markdown editors`. Arguments start research; bare `/deck` only opens the deck.
- The composer button, right-sidebar `+ → Deck`, and conversation cards also open it. Historical cards target their original topic.

Research runs in an official managed child session, inheriting the parent's model configuration and credential policy. It creates extra concurrent model requests. The Host samples recent parent messages as context. Internal search/follow-up prompts remain in the child; the parent can continue development, with concise command/tool status and source cards.

Workers may only use `web_search`, `web_fetch`, and `deck_submit_sources`. Official web tools and the spawn provider must be available. Startup failure is explicit; the plugin does not change configuration or upgrade the baseline.

## Screen and compare

1. Cards show a project image/Logo, then try the GitHub owner avatar, then a monogram. GitHub stars, last code push, lookup time, and evidence link are separate. Unknown facts stay unknown; zero stars stay zero.
2. Keep or exclude; click the active verdict again to return to pending. Expand the optional reason. Favorites and comparison do not change verdicts.
3. Add up to four sources to the comparison panel for descriptions, stars, dates, languages, licenses, reasons, and URLs.
4. Cards default to two columns, automatically becoming one below 620px of panel content width. Light/dark modes follow the Host, including settings select options. Request/note/reason drafts and comparison choices are stored per session/topic in browser sessionStorage.
5. Add a note and continue the same topic: the next round receives kept/excluded sources and reasons. New topic creates a separate set; previous results remain accessible through conversation cards.
6. Screening, favorites, comparison, and references remain available during research. Stop affects only that worker. A five-minute timeout ends the task and keeps partial results. Unrestored work is marked interrupted after Host restart and can be retried.

## Reference and continue development

Press **Reference in chat (N sources)**. Existing draft text, attachments, and references remain; nothing is auto-sent. Append an instruction such as:

> Study the UI designs in these repositories, consider our existing components, then propose and implement improvements.

Typing `@deck` also offers the current kept sources and historical snapshots. References contain immutable titles, real URLs, descriptions, metadata, and reasons. Later verdict changes do not silently replace their contents. Preview opens the original topic; remove a reference before sending if needed.

If the draft changes while insertion is pending, the session switches, or the input is unavailable, the original draft remains and retry is offered. References invalidated by data clearing block sending until removed/reselected.

The secondary **Send screening summary directly** action immediately sends a summary and makes the set read-only. Retries reuse the same delivery identity. Prefer references when you want to append instructions.

## Favorites and advanced settings

Save with ☆. The profile-wide library supports search, remove, and add back to a deck, and survives restart.

Settings → Deck provides optional GitHub, Web, and LLM-freeform scope policies and data clearing. Policies guide and flag candidates; they cannot guarantee model compliance. Uninstalling does not delete records automatically.

## Data and limitations

- The local `source_deck` domain still has eight tables: sets, sources, candidates, selections, scope_policies, session_active, rounds, favorites. Legacy records remain readable; worker arrivals retain their original topic/round.
- No credential files are read and no API keys are stored. The Host's provider policy governs model/web requests. External content is serialized as source data rather than user instructions.
- Image availability depends on the origin, network, and Host CSP. Failed images leave all actions available. Unverified model metadata should not be treated as a live statistic.
- Concurrency is subject to provider limits and official subagent settings. Cross-device sync, export, and version-chain diffs are not provided.
- Actual Host checks and outstanding acceptance limits are recorded in [verification](docs/SETUP-VERIFICATION.md).

## Development

```sh
pnpm install
pnpm run build
node --test tests/*.test.ts
npm pack
```

The package contains Host `lib/index.js`, Client lazy-CJS `lib/client.js`, types, bundled icons, and Chinese/English locale metadata. Exact peers are unchanged; no dependencies were added.

- [v3 design](docs/superpowers/specs/2026-10-18-sourcedeck-v3-design.en.md)
- [Approved implementation plan](docs/superpowers/plans/2026-10-18-sourcedeck-v3.en.md)
- [Workflow research](docs/research/2026-10-18-developer-workflow-review.en.md)
- [Handoff](docs/HANDOFF.md) · [Version policy](docs/VERSION-POLICY.md)
