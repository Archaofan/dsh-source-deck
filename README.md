# dsh-source-deck

SourceDeck — 资料筛选台。DeepSeek Harness Desktop 插件（Host 半 + Client 半单包）。

Stage one is complete and verified in the sandbox Desktop: the third-party
`./client` half enters the boot graph, the `sourcedeck` right-Sidebar tab and
its guide entry render, and the placeholder body mounts (evidence in
`docs/implementation/2026-10-17-implementation-plan.md`). Stage two adds the
`source_deck` domain, the `deck_submit_sources` tool, and the deck panel.

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

`@deepseek-ai/dsh@0.2.0-rc.2` and `@deepseek-ai/cordis@4.0.4`, declared exactly
in `peerDependencies`. No alpha-only APIs.
