# dsh-source-deck

SourceDeck — 资料台。DeepSeek Harness Desktop 插件（Host 半 + Client 半单包）。

Stages one through six are implemented and verified in the sandbox Desktop. The
0.2.x product revision turns the deck into a conversation-shaped, LLM-driven
screening surface: the first screen is a plain “你想找什么？” request; the Host
sends a structured search prompt into the current session, the Agent uses its
own search tools, and `deck_submit_sources` results arrive as visual cards
(GitHub avatar, description, stars, language, link). Each round keeps its
request and optional note; ✓/✕/skip and an optional exclusion reason feed the
next round; favorites are saved and searchable; `/deck` opens the deck for the
current conversation, and the Host includes a compact recap of recent chat
turns in every search prompt. The old source-scope policy still exists as an
optional settings surface, but it is no longer required to start. The domain
now has eight tables (`sets`, `sources`, `candidates`, `selections`,
`scope_policies`, `session_active`, `rounds`, `favorites`). Evidence is in
`docs/SETUP-VERIFICATION.md` (夜-4 through 夜-7), chat-linkage research in
`docs/research/2026-10-17-chat-deck-linkage.md`, and the design revision in
`docs/design/2026-10-17-solution-design.md` §14. 35 unit tests pass. The plugin
is not installed into the production Desktop.

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
the verified target are both `dsh-v0.2.1-rc.2`; the production Desktop has also been
upgraded to `0.2.1-rc.2`, so this package's peer matches production.
