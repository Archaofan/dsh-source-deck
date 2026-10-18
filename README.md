# dsh-source-deck / SourceDeck 资料台

> 中文（默认） | [English](README.en.md)

SourceDeck 是 DeepSeek Harness Desktop 的**会话内资料台**：用一句自然语言说明要找什么，当前会话的 LLM 会用它的搜索工具查找，把结果变成可勾选、可收藏的卡片；你勾选/排除并补充说明后，下一轮会按你的反馈继续找，最终把筛选结果交回对话。

资料台不是独立的搜索应用，也不是第二个模型会话。它属于当前聊天：读取最近对话作为上下文，`/deck` 从聊天打开，结果卡片出现在对话流里，提交后回到同一个会话。

## 适配版本

| 项目 | 版本 |
|---|---|
| DeepSeek Harness Desktop | **0.2.1-rc.2**（精确 peer） |
| `@deepseek-ai/cordis` | **4.0.5**（精确 peer） |
| `@deepseek-ai/dsh-typert-protocol` | 0.2.1-rc.2 |
| `@deepseek-ai/dsh-session` | 0.2.1-rc.2 |
| 本插件 | 0.2.5 |

- 只使用 `0.2.1-rc.2` 的公共接口，不依赖 alpha-only API。
- `peerDependencies` 是**精确版本**，不会在未验证的 DSH 版本上静默加载。
- 沙箱和生产 Desktop 都已是 `0.2.1-rc.2`；本包在沙箱完成真实模型验证，生产需由用户安装。生产若已装 `0.1.17`，用 0.2.5 的本地安装按插件管理器流程替换；0.2.5 不会自行升级其他版本。

## 安装

1. 打开 DSH Desktop → **设置 → 插件**。
2. 选择**本地安装**，选中 `dsh-source-deck-0.2.5.tgz`（或 GitHub 仓库构建出的 tgz）。
3. 按界面提示重载/重启 Desktop。
4. 在任意会话右侧栏的 **+** 菜单里应出现「资料台」。

不要通过市场 HTTP 接口安装本地包（市场只接受 curated registry），也不要用 `dsh plugin --profile desktop`。安装和卸载都应由 App 的插件管理界面完成。

## 插件市场

已向 DSH 插件市场（`dshmarket`）的精选目录提交收录：[awesome-dsh-plugin PR #7739](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/7739)。

- 仓库已设为 public，并添加 `dsh-plugin` topic（市场拉取代码的前置条件）。
- PR check 已通过；Submission gate 目前只差“仓库创建满 24 小时”这一项（2026-10-17 03:35 UTC 创建，约 2026-10-18 11:35 北京时间满足）。gate 会自动重跑，不需要关 PR 或重新提交。
- 合并后可在 DSH 插件市场搜索 `SourceDeck` 安装；收录完成前请使用本地 tgz。
- 市场条目：`data/plugins/Archaofan__dsh-source-deck.yml`；DSH 0.2.1-rc.2 的 `dshmarket` 从 `awesome-dsh-plugin.com/plugins.json` 读取该目录。

## 触发方式

资料台有四个显式入口，外加一个 Agent 自动入口：

1. **右侧栏 tab**：会话右侧栏 `+` → 「资料台」。
2. **输入区按钮**：聊天输入框右下角的「资料台」按钮。
3. **斜杠命令**：在聊天输入框输入 `/deck`，按 Enter。菜单里会显示「打开资料台」。
4. **对话卡片**：Agent 提交过候选后，对话里的「候选资料集」卡片点「在资料台打开」。
5. **Agent 自动提交**：搜索轮次开始后，Agent 调用 `deck_submit_sources`，候选自动出现在资料台当前轮；不需要你手动粘贴。

> `/deck` 目前只负责打开资料台；`/deck <query>` 带参形式尚未实现。

## 使用说明

### 1. 开始一轮搜索

1. 在目标会话中打开资料台。
2. 首屏只有「你想找什么？」。输入自然语言需求，例如：
   - `找 4 个高星且近半年活跃的 Go 日志库，要 GitHub 仓库`
   - `继续找 3 个类似的 Rust 异步运行时，要生产可用`
   - `RAG 评测方法与实战文章`
3. 点「开始查找」。需求会作为一条结构化 prompt 发到**当前对话**，由当前模型用自身搜索/网页工具执行。
4. 等待 Agent 提交。界面会显示「Agent 正在搜索并提交候选…」；通常 10–30 秒，复杂搜索可能 2 分钟以上。

不需要填写站点 URL、正则或资料标题。来源范围策略仍保留在设置页，但只是可选高级项，不是首次使用的前置条件。

### 2. 看卡片、做勾选

每个候选是一张卡片：

- GitHub 仓库：头像、仓库名、简介、★ stars、语言、打开链接。
- 其他来源：标题、简介、链接。
- **✓ 保留**：进入下一轮的正例。
- **✕ 排除**：进入下一轮的负例；可填写可选原因。
- **跳过**：保持未处理，不进入保留/排除；已处理后也可点「跳过」撤销。
- **☆ 收藏**：加入收藏夹，不改变本轮筛选结果。
- **打开链接**：在浏览器打开原始页面。

排除原因会保存到候选记录；下一轮 prompt 会带上它，帮助 Agent 避开同类内容。

### 3. 用补充说明继续下一轮

面板底部有「补充说明（可选）」：

- 例如：`只要 MIT/BSD 许可证`、`优先 smol 生态，避免低维护项目`、`不要教程`。
- 点「继续查找」后，Host 会把**上一轮保留项、排除项及原因、补充说明**写进下一轮 prompt；续搜通常限制在 4 条左右，宁可少提交，不凑数。
- 下一轮卡片会显示为「第 2 轮」「第 3 轮」，和上一轮并列，方便回看。
- 想换一个全新主题时，点右上角「新搜索」会新建集合，不覆盖旧集合。

### 4. 提交选择给 Agent

筛选完成后点底部的「提交给 Agent（N 条保留）」：

- Host 把保留/排除/策略摘要通过 `session.prompt` 发回当前对话。
- Agent 下一轮会明确知道你保留了哪些、排除了哪些，以及原因。
- 提交后集合变为已提交；想继续筛选可点「新搜索」或「继续查找」新建集合。

### 5. 收藏夹

- 卡片右上角 ☆ 收藏。
- 点顶部「收藏夹」查看；支持按标题、链接、备注搜索。
- 「加入资料台」把收藏重新变成当前集合的候选；「移除」删除收藏。
- 收藏由当前 DSH profile 共享，不按资料集或项目隔离；重启 Desktop 后仍在。

### 6. 停止/超时

- 搜索期间可继续在聊天里和 Agent 对话；如果 Agent 在对话里向你提问，先回答，再回到资料台点「继续查找」。
- 轮询超时为 5 分钟；超时只提示，不会删除已到达的候选。可点「刷新」重新读取。

## 聊天联动

这是 0.2.x 的核心变化，详细调研见 [docs/research/2026-10-17-chat-deck-linkage.md](docs/research/2026-10-17-chat-deck-linkage.md)。

- **同一会话**：资料台绑定当前 `sessionId`，不创建 child session，不复制模型/凭据。
- **上下文**：开始一轮时，Host 从 Session 最近消息里抽取最多 5 条对话（过滤运行时噪声和资料台自身 prompt），写入搜索 prompt，所以「继续/这些/类似」有指代。
- **聊天触发**：`/deck`、输入区按钮、右侧栏 tab、对话卡片都能打开同一集合。
- **结果回到聊天**：每轮结束更新 `plugin:dsh-source-deck/set-snapshot`，对话卡片显示最近轮次和候选状态；最终提交通过 `session.prompt` 回到对话。
- **不重复模型**：搜索使用当前会话已有模型与工具，不会另选模型或另建凭据。

## 数据与隐私

- 域 `source_deck` 共 8 张表：`sets`、`sources`、`candidates`、`selections`、`scope_policies`、`session_active`、`rounds`、`favorites`。
- 数据保存在当前 DSH profile 的本地存储，不上传第三方服务；搜索内容仍会按当前会话的模型/工具策略发送给模型提供方。
- 设置页「资料台」可清除本插件数据；卸载插件不会自动删除已有数据。
- 资料台不会读取凭据文件，也不保存 API Key。

## 从源码构建

```sh
pnpm install
pnpm run build
node --test tests/*.test.ts
npm pack
```

构建产物：`lib/index.js`（Host 半）、`lib/client.js`（浏览器 lazy-CJS factory）。`npm pack` 生成 `dsh-source-deck-<version>.tgz`。

## 已知限制

- `/deck` 只支持无参打开；`/deck <query>` 和模型主动 `deck_open` 工具尚未实现（后者需要 Host→Client 推送通道）。
- 下一轮是否严格遵循补充说明取决于模型；Host 会强化 prompt（续搜、正例、负例、原因、少而精），但不能 100% 约束模型输出。不合适的候选可以继续叉掉。
- 复杂搜索可能超过 2 分钟；5 分钟内会持续轮询。
- GitHub 头像加载失败时显示首字母兜底，不影响标题/简介/链接。
- 目前不提供跨设备同步、导出、版本链 diff。

## 文档

- [设计（含 §14 v2 修订）](docs/design/2026-10-17-solution-design.md)
- [聊天 ↔ 资料台联动调研](docs/research/2026-10-17-chat-deck-linkage.md)
- [开发者工作流调研与下一轮提案（待设计评审）](docs/research/2026-10-18-developer-workflow-review.md)
- [v3 完整设计：后台研究、对话引用与深浅主题（已批准）](docs/superpowers/specs/2026-10-18-sourcedeck-v3-design.md)
- [v3 实施计划：七项任务与固定 RC 验收（待计划评审）](docs/superpowers/plans/2026-10-18-sourcedeck-v3.md)
- [验收记录（夜-4 至夜-7）](docs/SETUP-VERIFICATION.md)
- [实现计划](docs/implementation/2026-10-17-implementation-plan.md)
- [版本策略](docs/VERSION-POLICY.md)
