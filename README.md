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

`@deepseek-ai/dsh@0.2.1-rc.2` and `@deepseek-ai/cordis@4.0.5`, declared exactly in
`peerDependencies` (user decision, 2026-10-17). No alpha-only APIs. The sandbox and
the verified target are both `dsh-v0.2.1-rc.2`; stage-one acceptance passed with the
product build `0.1.2` (see `docs/SETUP-VERIFICATION.md`).

The production Desktop still runs `0.2.0-rc.2`. Because the exact peer requirement
is now `0.2.1-rc.2`, this release does not load there; upgrade the production
Desktop to `0.2.1-rc.2` before installing it.
