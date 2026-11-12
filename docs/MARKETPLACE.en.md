# SourceDeck market status (2026-10-18)

> [中文（默认）](MARKETPLACE.md) | English

## Current verification: 2026-11-12 — 0.4.2 released, catalog PR pending

SourceDeck **0.4.2** adapts the plugin to **DSH Desktop 0.2.2-rc.2 / Cordis 4.1.0**. The previous catalog update completed:

- [PR #12339](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/12339) merged at **2026-11-05T17:18:36Z**. The catalog entry's `tarball` points to `v0.4.1/dsh-source-deck-0.4.1.tgz`, and both descriptions note `DSH 0.2.2-rc.1` support.
- The generated catalog snapshot `awesome-dsh-plugin.com/plugins.json` (`updated=2026-11-11`) already contains that entry; the market page shows 0.4.1 and the rc.1 wording.
- The older README claim that the PR was open and the catalog still pointed to 0.3.3 has been false since 2026-11-05 and is corrected in this round.

**The 0.4.2 catalog PR** points `tarball` at `v0.4.2/dsh-source-deck-0.4.2.tgz` and changes both descriptions to support `DSH 0.2.2-rc.2`. Until it merges the catalog still points to 0.4.1; use this repository's Release asset for 0.4.2. Catalog inclusion does not establish actual market-UI installation acceptance.

> History: the 2026-11-05 entry recorded 0.4.1 as released with PR #12339 open; 2026-10-23 recorded PR #7739 merged with the entry on 0.3.3; 2026-10-18 recorded first inclusion and the Submission gate text.

## Historical verification: 2026-10-23

[PR #7739](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/7739) merged at **2026-10-18 20:22:40 UTC**, merge commit `b51b8394b9a1155f64e18ba6269649be6adab27d`. GitHub API reports merged=true. The [catalog entry](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/data/plugins/Archaofan__dsh-source-deck.yml) was read from the default branch; its tarball currently points to `v0.3.3/dsh-source-deck-0.3.3.tgz`.

Catalog inclusion is confirmed. This does not establish market availability of 0.4.0 or actual market-UI installation acceptance. Use this repository's Release asset for 0.4.0. No external catalog entry or production installation was changed. The older OPEN/age-gate statements below are historical and superseded by this section.

## Historical record: 2026-10-18

SourceDeck was submitted to the curated awesome-dsh-plugin catalog in [PR #7739](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/7739). Its repository is public and has the dsh-plugin topic.

**Rechecked 2026-10-18 17:55 Beijing time:** PR #7739 is still OPEN and unmerged (`merged=false`, `mergeable=true`, `mergeable_state=unstable`). The ordinary `check` is successful. The `Submission gate` is still the 2026-10-17 13:23 UTC age failure; the repository passed the one-day age bar on 2026-10-18 11:35:45 Beijing time, but the gate has not rerun. The entry file is absent from `main` (`data/plugins/Archaofan__dsh-source-deck.yml` returns 404), so the plugin is not listed. No branch update or gate workaround was attempted.

Wait for or verify the scheduled regate result. If still failed after eligibility, inspect the new reason before making a normal branch update. Do not close/reopen or force-push. After merge, confirm SourceDeck appears in the actual market and verify which repository ref/version is consumed.

The current local delivery is dsh-source-deck-0.3.0.tgz; SHA256 and sandbox evidence are in [verification, night 9](SETUP-VERIFICATION.md). Production installation remains separately authorized; production still has plugin 0.1.17.
