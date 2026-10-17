# dsh-source-deck

SourceDeck — 资料筛选台。DeepSeek Harness Desktop 插件（Host 半 + Client 半单包）。

Stages one through five are implemented and verified in the sandbox Desktop:
the third-party `./client` half enters the boot graph; the `sourcedeck` tab,
its guide entry, the deck panel, the conversation card, and the composer entry
render; the `source_deck` six-table domain, `deck_submit_sources` tool, and
`sourceDeck` Remote serve both manual and model-driven submissions; ignorable
session records replay into the card; a source-scope policy (GitHub / web /
LLM-freeform) flags candidates from Agent metadata; and restart recovery,
session isolation, data clearing, uninstall/reinstall, and peer rejection were
exercised. The panel and card were then iterated for usability: a fixed
progress/policy header, filter tabs and search, bulk decisions, inline
exclusion reasons with undo, a collapsed add form, a sticky submit bar,
keyboard shortcuts, and a neutral LLM-freeform default policy with one-click
GitHub/docs presets (research in
`docs/research/2026-10-17-right-panel-ux-research.md`). Evidence is in
`docs/SETUP-VERIFICATION.md` (夜-4 through 夜-6) and the sandbox screenshots.
The plugin is not installed into the production Desktop.

## Build

```sh
pnpm install
pnpm run build   # lib/index.js (Node half) + lib/client.js (browser lazy-CJS factory)
pnpm run pack    # dist tarball for the sandbox Install-Plugin.ps1
```

The browser bundle is the lazy-CJS factory artifact the client module system
mounts from the bare package name; the build reproduces the RC cookbook preset
locally (see the header comment in `tsdown.config.ts`).

## Compatibility

`@deepseek-ai/dsh@0.2.1-rc.2` and `@deepseek-ai/cordis@4.0.5`, declared exactly in
`peerDependencies` (user decision, 2026-10-17). No alpha-only APIs. The sandbox and
the verified target are both `dsh-v0.2.1-rc.2`; stage-one acceptance passed with the
product build `0.1.2` (see `docs/SETUP-VERIFICATION.md`).

The production Desktop still runs `0.2.0-rc.2`. Because the exact peer requirement
is now `0.2.1-rc.2`, this release does not load there; upgrade the production
Desktop to `0.2.1-rc.2` before installing it.
