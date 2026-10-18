# dsh-source-deck / SourceDeck

> [中文（默认）](README.md) | English

SourceDeck is an **in-conversation source deck** for DeepSeek Harness Desktop. Describe what you are looking for in plain language; the current conversation's LLM searches with its own tools and turns the results into cards you can keep, exclude, skip, and favorite. Your checks and the optional note drive the next round, and the final selection is handed back to the same chat.

The deck is not a standalone search app and not a second model session. It belongs to the current chat: it reads recent turns as context, `/deck` opens it from chat, result cards appear in the conversation, and the submission returns to the same session.

## Compatibility

| Item | Version |
|---|---|
| DeepSeek Harness Desktop | **0.2.1-rc.2** (exact peer) |
| `@deepseek-ai/cordis` | **4.0.5** (exact peer) |
| `@deepseek-ai/dsh-typert-protocol` | 0.2.1-rc.2 |
| `@deepseek-ai/dsh-session` | 0.2.1-rc.2 |
| This plugin | 0.2.5 |

- Only public `0.2.1-rc.2` APIs are used; no alpha-only APIs.
- `peerDependencies` are **exact**; the plugin will not silently load on an unverified DSH version.
- Both the sandbox and the production Desktop run `0.2.1-rc.2`. This package was verified with a real model in the sandbox; production installation is left to the user. If `0.1.17` is already installed, use the same local-install flow for 0.2.5; 0.2.5 does not auto-upgrade other versions.

## Installation

1. Open DSH Desktop → **Settings → Plugins**.
2. Choose **Install from file** and select `dsh-source-deck-0.2.5.tgz` (or build the tarball from this repo).
3. Reload/restart Desktop when prompted.
4. The **Deck** entry should appear under **+** in the right sidebar of any session.

Do not install a local package through the market HTTP endpoint (the market only accepts its curated registry), and do not use `dsh plugin --profile desktop`. Install and uninstall through the App's plugin manager.

## Plugin market

SourceDeck has been submitted to the curated DSH plugin market (`dshmarket`): [awesome-dsh-plugin PR #7739](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/7739).

- The repository is public and carries the `dsh-plugin` topic, which the market needs to fetch the code.
- The PR check passes; the Submission gate is waiting only for the repository to be 24 hours old (created 2026-10-17 03:35 UTC, eligible around 2026-10-18 11:35 Beijing time). The gate re-runs automatically; do not close or resubmit the PR.
- After merge, search for `SourceDeck` in the DSH plugin market. Until then, use the local tgz.
- Market entry: `data/plugins/Archaofan__dsh-source-deck.yml`; `dshmarket` on DSH 0.2.1-rc.2 reads it through `awesome-dsh-plugin.com/plugins.json`.

## Ways to open the deck

There are four explicit entry points plus one automatic Agent path:

1. **Right-sidebar tab**: session right sidebar `+` → **Deck**.
2. **Composer button**: the **Deck** button at the bottom-right of the chat composer.
3. **Slash command**: type `/deck` in the chat composer and press Enter. The menu shows “打开资料台 / Open deck”.
4. **Conversation card**: after the Agent submits candidates, click **Open in deck** on the “Candidate sources” card.
5. **Agent submission**: when a search round starts, the Agent calls `deck_submit_sources`; candidates appear in the current round automatically.

> `/deck` currently only opens the deck. `/deck <query>` is not implemented yet.

## Usage

### 1. Start a search round

1. Open the deck in the target conversation.
2. The first screen only asks “What are you looking for?”. Enter a natural-language request, for example:
   - `Find four high-star Go logging libraries active in the last six months, GitHub repos`
   - `Continue with three more Rust async runtimes suitable for production`
   - `RAG evaluation methods and practical articles`
3. Press **Search**. The request is sent as a structured prompt into the **current conversation**, and the current model uses its own search/web tools.
4. Wait for the Agent. The deck shows “The Agent is searching and submitting candidates…”; usually 10–30 seconds, but complex rounds can take more than two minutes.

No site URL, regex, or seed title is required. The old source-scope policy remains available under Settings as an optional advanced surface, not a first-run prerequisite.

### 2. Screen the cards

- GitHub repositories show an avatar, repository name, description, ★ stars, language, and an open link.
- Other sources show a title, description, and link.
- **✓ Keep** — a positive example for the next round.
- **✕ Exclude** — a negative example for the next round; an optional reason can be saved.
- **Skip** — leave it undecided; it counts as neither kept nor excluded. After a decision, “Skip” clears it back to pending.
- **☆ Save** — add to favorites without changing this round's decision.
- **Open link** — open the original page in the browser.

An exclusion reason is persisted on the candidate and included in the next round's prompt, so the Agent can avoid similar results.

### 3. Continue with a note

The footer has an optional **Note for the next round**:

- Examples: `MIT/BSD licenses only`, `prefer the smol ecosystem, avoid low-maintenance projects`, `no tutorials`.
- Press **Continue searching**. The Host writes the previous kept items, excluded items and reasons, and the note into the next prompt. Follow-up rounds are usually capped at about four candidates: quality over quantity.
- New cards appear under **Round 2**, **Round 3**, and so on, next to earlier rounds for comparison.
- To start a completely new topic, use **New search**; it creates a new set instead of overwriting the old one.

### 4. Submit the selection to the Agent

When screening is done, press **Submit to Agent (N kept)** at the bottom:

- The Host sends the kept/excluded/policy summary back to the current conversation through `session.prompt`.
- The Agent can then tell exactly what you kept, what you excluded, and why.
- The set becomes submitted. To keep screening, use **New search** or **Continue searching** to create a new set.

### 5. Favorites

- Press ☆ on a card to save it.
- Open **Saved** in the header; search by title, URL, or note.
- **Add to deck** turns a saved item back into a candidate in the current set; **Remove** deletes it.
- Favorites are stored with the deck and survive a Desktop restart.

### 6. Stop and timeouts

- You can keep chatting with the Agent while a round runs. If the Agent asks a question in chat, answer it, then return to the deck and press **Continue searching**.
- Polling stops after five minutes. The timeout is only a notice; already-arrived candidates are not deleted. Press **Refresh** to read again.

## Conversation linkage

This is the core change in 0.2.x. The detailed research is in [docs/research/2026-10-17-chat-deck-linkage.md](docs/research/2026-10-17-chat-deck-linkage.md).

- **Same session**: the deck is bound to the current `sessionId`; it does not create a child session or copy models/credentials.
- **Context**: when a round starts, the Host reads up to five recent user/assistant messages from the Session log (filtering runtime noise and the deck's own prompts) and puts them into the search prompt, so “continue”, “these”, and “similar” have referents.
- **Chat triggers**: `/deck`, the composer button, the right-sidebar tab, and the conversation card all open the same set.
- **Results back in chat**: every round updates `plugin:dsh-source-deck/set-snapshot`; the conversation card shows the latest round and candidate state. The final submission returns through `session.prompt`.
- **No duplicate model**: search uses the current session's model and tools; it does not choose another model or create another credential.

## Data and privacy

- The `source_deck` domain has eight tables: `sets`, `sources`, `candidates`, `selections`, `scope_policies`, `session_active`, `rounds`, `favorites`.
- Data is stored locally in the current DSH profile; it is not uploaded to a third-party service. Search content is still sent to the configured model provider under the current session's model/tool policy.
- Settings → Deck can clear this plugin's data; uninstalling the plugin does not automatically delete existing data.
- The deck does not read credential files or store API keys.

## Build from source

```sh
pnpm install
pnpm run build
node --test tests/*.test.ts
npm pack
```

Artifacts: `lib/index.js` (Host half) and `lib/client.js` (browser lazy-CJS factory). `npm pack` produces `dsh-source-deck-<version>.tgz`.

## Known limitations

- `/deck` only opens the deck; `/deck <query>` and a model-facing `deck_open` tool are not implemented yet (the latter needs a Host→Client push channel).
- Whether a follow-up round strictly follows the note depends on the model. The Host strengthens the prompt (continuation, positive/negative examples, reasons, fewer but better results), but cannot guarantee model output. Exclude unsuitable cards and continue.
- Complex searches can take more than two minutes; the deck keeps polling for five minutes.
- If a GitHub avatar fails to load, the deck shows the first letter as a fallback; title, description, and link are unaffected.
- Cross-device sync, export, and version-chain diffs are not provided.

## Documentation

- [Design, including §14 v2 revision](docs/design/2026-10-17-solution-design.md)
- [Chat ↔ deck linkage research](docs/research/2026-10-17-chat-deck-linkage.md)
- [Verification record (nights 4–7)](docs/SETUP-VERIFICATION.md)
- [Implementation plan](docs/implementation/2026-10-17-implementation-plan.md)
- [Version policy](docs/VERSION-POLICY.md)
