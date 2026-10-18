# 插件市场收录记录（2026-10-18）

本文记录 SourceDeck 在 DSH Desktop 插件市场（`dshmarket`）的注册状态。市场应用本身不接收插件条目；它读取精选目录 [`awesome-dsh-plugin`](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin) 生成的 `plugins.json`，所以“注册”= 向该目录提交一个 YAML 条目并合并。

> [English status](MARKETPLACE.en.md)

**2026-10-18 17:55 北京时间复核：** PR #7739 仍为 OPEN、merged=false，mergeable=true（mergeable_state=unstable）；`check` 为 success，`Submission gate` 仍是 2026-10-17 13:23 UTC 的年龄失败。仓库已超过 1 天（创建于 2026-10-17 03:35:45 UTC），但 gate 尚未自动重跑。市场主目录不存在该条目（`data/plugins/Archaofan__dsh-source-deck.yml` 在 `main` 上 404），当前未上架。未修改 PR 分支，未声称已合并或已上架。

## 最后确认状态

| 项目 | 状态 |
|---|---|
| 仓库 | `Archaofan/dsh-source-deck`，已设为 **public** |
| Topic | `deepseek-harness`、`dsh`、`dsh-plugin`、`plugin`、`ui`、`source-deck`、`ai-agents`、`ai-research`、`developer-tools`、`desktop` |
| 市场 PR | [#7739](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/7739)，OPEN，未合并 |
| 条目文件 | `data/plugins/Archaofan__dsh-source-deck.yml`（仅在 PR 分支） |
| PR check | SUCCESS（2026-10-17 13:23 UTC 完成） |
| Submission gate | FAILURE，唯一原因：仓库未满 24 小时（旧结论，未重跑） |
| 满足年龄时间 | 仓库创建于 2026-10-17 03:35:45 UTC；已于 **2026-10-18 03:35 UTC / 11:35 北京时间** 满足 |
| 下次自动复检 | 2026-10-18 18:19 UTC / 2026-10-19 02:19 北京时间（`19 */6 * * *`；24h cooldown 已满足） |
| 市场主目录 | 未收录（`main` 上条目文件 404） |
| 生产安装 | 未改动；生产仍是 0.1.17 |

Submission gate 原文：

```text
repository is 0.4 days old (needs 1) — nothing to do:
this check re-runs by itself and should clear in about 15h.
No need to resubmit, push, or close and reopen;
the age bar is the only thing failing here.
```

gate 由 `regate.yml` 自动重跑，调度为 `19 */6 * * *`（UTC），并对年龄失败设置 24h cooldown。2026-10-18 06:41 UTC 的一次运行距 gate 完成不足 24h，未重跑本 PR；下一次 18:19 UTC 的调度应满足 cooldown。这只表示会重跑，不保证通过或合并。不要为了绕过年龄门槛关 PR、重开 PR 或 force-push。

## 市场条目

```yaml
url: https://github.com/Archaofan/dsh-source-deck
name: Archaofan/dsh-source-deck
category: ui
description:
  en: "In-conversation source deck for DSH Desktop: the current chat model runs LLM search rounds, candidates render as GitHub-aware cards, and keep/exclude feedback, favorites, and the selected sources stay in the same conversation."
  zh: "DSH Desktop 的会话内资料台：由当前对话模型执行搜索轮次，候选以 GitHub 卡片展示，保留/排除反馈、收藏夹与筛选结果都留在同一会话。"
```

条目要求（来自 `contributing.md`）：

- 仓库 `package.json` 声明 `dsh.bundle`，且仓库含真实可运行代码；本仓库满足。
- 仓库创建至少 1 天；最后确认时只差这一项。
- 仓库添加 `dsh-plugin` topic；已完成。
- 描述只陈述功能，不带营销词；已核对。
- 每个 PR 只加一个 YAML 文件；本 PR 满足。

## 收录后的安装路径

1. DSH Desktop → 插件市场（`dshmarket`）→ 搜索 `SourceDeck`。
2. 打开卡片 → 选择市场实际可用版本（目标 0.3.0；须确认交付分支已被市场获取） → Install。
3. 安装后按提示重载 Desktop；右侧栏 `+` 出现「资料台」。

合并后市场目录需要一次生成/同步，通常一天内生效。当前交付仍用本地 0.3.0 包，SHA256 见 [夜-9 验收记录](SETUP-VERIFICATION.md)。以下为上一版历史产物：

- `dsh-source-deck-0.2.5.tgz`
- SHA256 `BADA485796D6C1FACF99AE25E9830719358D3A660078B1535E3F26ADB9FEC9C6`
- App → 设置 → 插件 → 本地安装。

## 为什么不是调用 `/dsh-market/install`

`POST /dsh-market/install` 是桌面端本地安装/curated 校验路径，不是市场目录注册 API；它只接受已经在指定 registry 中的条目。第三方插件进入 `dshmarket` 的正确路径就是 awesome-dsh-plugin 的 PR。DSH 自带的实验性 **Custom plugin markets** 则是另一套：用户手动添加任意 index JSON URL，不经过本目录。

## 仓库公开与安全

市场必须能读取仓库，因此 2026-10-17 将仓库从 private 改为 public。公开前已确认：

- 无 `.env`、私钥、API key 或凭据文件进入 Git；
- `docs/security/2026-10-17-credential-exposure.md` 已脱敏，只保留事件类别与处置，不含账号标识或凭据值；
- 沙箱、`node_modules`、tgz、日志不进 Git。

如果对公开范围有新的要求，应先调整仓库可见性，再同步市场 PR。

## 复核命令

```sh
gh pr view 7739 --repo awesome-dsh-plugin/awesome-dsh-plugin \
  --json state,mergeable,statusCheckRollup

gh api repos/awesome-dsh-plugin/awesome-dsh-plugin/check-runs/<gate-id> \
  --jq '{conclusion,output}'

gh api repos/Archaofan/dsh-source-deck \
  --jq '{visibility,created_at,topics}'
```

PR 合并后，市场页面由 `awesome-dsh-plugin.com/plugins.json` 刷新；可用市场搜索确认，不需要改本插件代码。
