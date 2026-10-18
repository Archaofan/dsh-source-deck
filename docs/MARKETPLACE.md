# 插件市场收录记录（2026-10-18）

本文记录 SourceDeck 在 DSH Desktop 插件市场（`dshmarket`）的注册状态。市场应用本身不接收插件条目；它读取精选目录 [`awesome-dsh-plugin`](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin) 生成的 `plugins.json`，所以“注册”= 向该目录提交一个 YAML 条目并合并。

## 当前状态

| 项目 | 状态 |
|---|---|
| 仓库 | `Archaofan/dsh-source-deck`，已设为 **public** |
| Topic | `dsh-plugin`、`deepseek-harness`、`dsh`、`plugin`、`ui` |
| 市场 PR | [#7739](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/7739)，OPEN |
| 条目文件 | `data/plugins/Archaofan__dsh-source-deck.yml` |
| PR check | SUCCESS（2026-10-17 13:23 UTC 完成） |
| Submission gate | FAILURE，唯一原因：仓库未满 24 小时 |
| 满足年龄时间 | 仓库创建于 2026-10-17 03:35:45 UTC；约 **2026-10-18 03:35 UTC / 11:35 北京时间** |
| 生产安装 | 未改动；生产仍是 0.1.17 |

Submission gate 原文：

```text
repository is 0.4 days old (needs 1) — nothing to do:
this check re-runs by itself and should clear in about 15h.
No need to resubmit, push, or close and reopen;
the age bar is the only thing failing here.
```

gate 由 `regate.yml` 自动重跑；不要为了绕过年龄门槛关 PR、重开 PR 或 force-push。满 24 小时后 gate 会自动转绿，然后等待维护者审核合并。

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
- 仓库创建至少 1 天；当前只差这一项。
- 仓库添加 `dsh-plugin` topic；已完成。
- 描述只陈述功能，不带营销词；已核对。
- 每个 PR 只加一个 YAML 文件；本 PR 满足。

## 收录后的安装路径

1. DSH Desktop → 插件市场（`dshmarket`）→ 搜索 `SourceDeck`。
2. 打开卡片 → 选择版本 0.2.5 → Install。
3. 安装后按提示重载 Desktop；右侧栏 `+` 出现「资料台」。

合并后市场目录需要一次生成/同步，通常一天内生效。未收录前用本地包：

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
