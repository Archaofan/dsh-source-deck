# SourceDeck market status (2026-10-18)

> [中文（默认）](MARKETPLACE.md) | English

## Current verification: 2026-11-05 — 0.4.1 released, catalog PR pending

SourceDeck **0.4.1** was published as a prerelease at `2026-11-05T12:33:31Z` and exactly supports **DSH Desktop 0.2.2-rc.1 / Cordis 4.1.0**.

[PR #12339](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/12339) updates only this plugin's entry: the `tarball` now points to `v0.4.1/dsh-source-deck-0.4.1.tgz`, and both descriptions note `DSH 0.2.2-rc.1` support. The PR is OPEN, `mergeable=MERGEABLE`, `mergeStateStatus=UNSTABLE` (CI running), and changes only `data/plugins/Archaofan__dsh-source-deck.yml`.

**Until that PR merges, the catalog still points to `v0.3.3` (old baseline)** and must not be used to install on 0.2.2-rc.1; use this repository's [v0.4.1 Release](https://github.com/Archaofan/dsh-source-deck/releases/tag/v0.4.1). After merge and catalog regeneration, re-read the entry to confirm it points to 0.4.1 before treating market availability as verified.

## Historical verification: 2026-10-23

[PR #7739](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/7739) merged at **2026-10-18 20:22:40 UTC**, merge commit `b51b8394b9a1155f64e18ba6269649be6adab27d`. GitHub API reports merged=true. The [catalog entry](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/data/plugins/Archaofan__dsh-source-deck.yml) was read from the default branch; its tarball currently points to `v0.3.3/dsh-source-deck-0.3.3.tgz`.

Catalog inclusion is confirmed. This does not establish market availability of 0.4.0 or actual market-UI installation acceptance. Use this repository's Release asset for 0.4.0. No external catalog entry or production installation was changed. The older OPEN/age-gate statements below are historical and superseded by this section.

## Historical record: 2026-10-18

SourceDeck was submitted to the curated awesome-dsh-plugin catalog in [PR #7739](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/7739). Its repository is public and has the dsh-plugin topic.

**Rechecked 2026-10-18 17:55 Beijing time:** PR #7739 is still OPEN and unmerged (`merged=false`, `mergeable=true`, `mergeable_state=unstable`). The ordinary `check` is successful. The `Submission gate` is still the 2026-10-17 13:23 UTC age failure; the repository passed the one-day age bar on 2026-10-18 11:35:45 Beijing time, but the gate has not rerun. The entry file is absent from `main` (`data/plugins/Archaofan__dsh-source-deck.yml` returns 404), so the plugin is not listed. No branch update or gate workaround was attempted.

Wait for or verify the scheduled regate result. If still failed after eligibility, inspect the new reason before making a normal branch update. Do not close/reopen or force-push. After merge, confirm SourceDeck appears in the actual market and verify which repository ref/version is consumed.

The current local delivery is dsh-source-deck-0.3.0.tgz; SHA256 and sandbox evidence are in [verification, night 9](SETUP-VERIFICATION.md). Production installation remains separately authorized; production still has plugin 0.1.17.
