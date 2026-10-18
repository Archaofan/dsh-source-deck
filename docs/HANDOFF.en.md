# SourceDeck handoff (2026-10-18)

> [中文（默认）](HANDOFF.md) | English

The user approved the v3 design, seven-task plan, inline execution, implementation, and Git delivery. Do not request these approvals again. At the user's subsequent request, 0.3.0 delivery has been fast-forwarded to default branch `main`; `feat/sourcedeck-v3` remains available; exact peers remain DSH 0.2.1-rc.2 and Cordis 4.0.5. The sole project is `E:/DSH-Desktop-Plugin-Dev/dsh-source-deck`, remote `https://github.com/Archaofan/dsh-source-deck.git`.

0.3.0 was published as GitHub Release `v0.3.0` on 2026-10-18 (tag `8f4b373`; asset `dsh-source-deck-0.3.0.tgz`, SHA256 `216AAD7303CE72DEFA0AA90FB16D7A7237A051CC99E17C9947275821BF2EA8C5`). Both READMEs use real Host light/dark screenshots at `docs/assets/screenshots/source-deck-{light,dark}.png` and `source-deck-linkage-{light,dark}.png`; account information in the screenshots has been redacted.

Discoverability: the GitHub description and topics were expanded (`source-deck`, `ai-agents`, `ai-research`); GitMCP returns HTTP 200 and is linked from both READMEs. DeepWiki status is still `unknown`; triggering indexing requires a reCAPTCHA in a trusted browser, and this environment was blocked by Vercel/connection resets, so it remains pending. Marketplace PR #7739 is still unmerged; see [MARKETPLACE.en.md](MARKETPLACE.en.md).

Implemented: managed background research, natural-language deck_search and parameterized /deck, durable topic/round/worker identity and concurrency/idempotency protection, responsive image cards with stars/push/lookup evidence, screening/reasons/favorites/comparison (four sources), immutable @deck draft references, confirmed direct-summary delivery, Host light/dark tokens, bundled icon and locale metadata. The eight-table domain preserves legacy records; no dependencies were added.

The final suite has 67 tests, including refresh intent replay. Actual model acceptance covered zap/zerolog research, concurrent independent parent work, worker-only cancellation, both real URLs delivered in a reference, natural-language React research startup, and interruption after restart. Four Important review findings plus Host-discovered tool scope, image overflow, and stale activity replay defects were fixed with regressions or direct visual measurements. See [verification, night 9](SETUP-VERIFICATION.md).

Package: `dsh-source-deck-0.3.0.tgz`; final SHA256 is recorded in night 9. Use only the shared official sandbox and Install-Plugin.ps1. Same-version local paths can be cached: QA uses an immutable hash filename and checks installed lib hashes. Evidence remains under sandbox test-workspaces/dsh-source-deck/v3-acceptance, outside Git.

Production Desktop is 0.2.1-rc.2; the last confirmed plugin version was 0.1.17. The user requested the absolute 0.3.0 package path to install it themselves. The agent has not operated production or verified its post-installation state. Never copy credentials or expose tokens. Check baseline/status/current lease before using the shared sandbox; manage only exact verified sandbox PIDs.

Outstanding acceptance limits: native Electron 125% zoom, OS popup rendering, and real Chinese IME plus attachment combinations are not fully verified by the available browser control. Offline frozen lock validation lacked registry metadata despite an unchanged dependency graph; do not disable supply-chain policy. Marketplace PR #7739 could not be refreshed in the afternoon due to connector failure and GitHub API rate limiting. Last successful check was 10:43 Beijing (open, old age gate failure); do not claim listing, close/reopen, or force-push.

Run node --test tests/*.test.ts and npm run build. Sync checked milestones to the delivery branch and verify clean status plus HEAD=origin/branch. Use process-scoped safe.directory; the bundled Git path is in the Chinese handoff. Never commit sandbox data, credentials, caches, logs, node_modules, or tgz files.

Deferred build detail: CSS export-map key order may vary on rebuild. The fixed delivery tar matches the tested installation byte-for-byte; canonicalizing those maps proves rebuild equivalence.
