# SourceDeck / 资料台

> 中文（默认） | [English](README.en.md)

[GitHub](https://github.com/Archaofan/dsh-source-deck) · [0.4.0 预发行](https://github.com/Archaofan/dsh-source-deck/releases/tag/v0.4.0) · [稳定版 0.3.0](https://github.com/Archaofan/dsh-source-deck/releases/tag/v0.3.0) · [GitMCP](https://gitmcp.io/Archaofan/dsh-source-deck) · [插件市场目录](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/data/plugins/Archaofan__dsh-source-deck.yml)

SourceDeck 是给 DeepSeek Harness Desktop 用的开源资料工作台。它把“先看看别人怎么做的”从十几个浏览器标签页、零散书签和聊天记录里收进一个侧栏：后台研究、卡片筛选、并排对比，再把选中的仓库引用回当前对话。

## 为什么做 SourceDeck

大部分产品设计，其实已经有人做过。与其从零重复造轮子，更常见的做法是先找成熟的开源实现，读它的架构、交互和取舍，再决定直接复用、借鉴，还是绕开。

真正麻烦的往往不是“搜不到”，而是搜到之后：十几个仓库怎么快速比较？哪些看过、为什么排除？选中的怎么带回当前对话，让 Agent 基于真实代码继续？

SourceDeck 就是为这个中间过程做的。它把一次调研变成一条可复查的链路：

> 说清需求 → 后台研究 → 卡片筛选 → 并排对比 → 引用回对话 → 继续开发

适合：技术选型、同类/竞品调研、找可复用实现、给 Agent 补真实背景资料。  
不适合：替代深度代码审计，或替代正式的安全/合规评估。

## 界面预览

0.4.0 真实 Host 截图（浅色中文 / 深色英文）。画面中的 QA 来源为合成验收材料，用于展示搜索、排序、对比名单和撤销。

| 浅色 | 深色 |
|---|---|
| ![0.4.0 资料台浅色界面](docs/assets/screenshots/source-deck-0.4.0-light-wide.png) | ![0.4.0 资料台深色界面](docs/assets/screenshots/source-deck-0.4.0-dark.png) |

## 对话与资料台联动

资料台不是另一个孤立的搜索页。它和左侧对话共用同一个会话上下文，研究结果、筛选决定和引用都留在同一处。

1. **从对话发起**：输入 `/deck 找几个主流 Agent 框架...`，或直接说“用资料台找…”。主 Agent 通过 `deck_search` 启动官方受管子会话；主对话不阻塞，可以继续干活。
2. **结果回到同一会话**：候选进入右侧资料台；对话里保留一张资料卡片，点“在资料台打开”回到原主题。子会话的搜索提示留在子会话，不会把主对话刷满。
3. **在资料台做决定**：保留 / 排除、写原因、收藏、最多四项对比；这些决定按会话/主题隔离，切到别的会话不会串台。
4. **引用回对话**：点“引用到对话”，保留项作为不可变快照进入输入框；原有正文、附件不丢，也不会自动发送。然后继续写“参考这几个仓库，给我们的设计提改进方案”。
5. **改判不影响已插入引用**：之后改判只影响新引用；已插入的是当时快照，发送前可移除。

左侧继续对话，右侧资料台同步；底部输入框已插入 SourceDeck 引用，并续写开发要求。以下为较早版本的联动截图，展示引用流程：

| 浅色 | 深色 |
|---|---|
| ![对话与资料台联动浅色](docs/assets/screenshots/source-deck-linkage-light.png) | ![对话与资料台联动深色](docs/assets/screenshots/source-deck-linkage-dark.png) |

## 适配与安装

| 项目 | 精确版本 |
|---|---|
| 本插件 | 0.4.0 |
| DeepSeek Harness Desktop | 0.2.1-rc.2 |
| @deepseek-ai/cordis | 4.0.5 |

只使用 `0.2.1-rc.2` 的公共接口。**目前只维护这个 RC 基线；更新迭代快的 alpha 版本暂不提供支持。** 升级到新的 RC 或正式版需要单独评估和验收。

从 [v0.4.0 Release](https://github.com/Archaofan/dsh-source-deck/releases/tag/v0.4.0) 下载 `dsh-source-deck-0.4.0.tgz`，在 Desktop 插件管理页选择本地安装，按提示重启。安装列表显示自定义资料卡图标及「SourceDeck · 资料台」。重复开发安装应使用新版本或带内容哈希的新 tgz 路径；同路径同版本可能被包管理器缓存。

市场收录 PR [#7739](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/7739) 已合并。2026-10-23 核对市场目录条目仍指向 0.3.3；安装 0.4.0 请使用上述 Release 包。目录收录不等同于已在实际市场界面验收该版本，详见[市场记录](docs/MARKETPLACE.md)。

## 从聊天开始

- 直接说：`用资料台找几个主流 Agent 框架，比较 stars 和维护活跃度`。模型通过 `deck_search` 启动研究；自然语言触发取决于模型是否调用工具。
- 确定性入口：`/deck 找 Markdown 编辑器，优先开源和可扩展`。带参数开始后台研究，单独 `/deck` 只打开面板。
- 也可点输入框「资料台」、右栏 `+ → 资料台` 或对话卡片「在资料台打开」。历史卡片定位原主题。

研究由官方受管子会话执行，默认继承主会话的模型配置与凭据策略，会产生额外并发模型请求。Host 读取最近主对话作为资料理解上下文。搜索和补搜的内部提示留在子会话；主聊天可继续开发，保留简短的命令/工具状态及资料卡片。

研究工具仅允许 `web_search`、`web_fetch`、`deck_submit_sources`。需要官方网页工具和 spawn provider 可用；无法安全启动时显示失败原因，不自动改配置或升级基线。

## 筛选与比较

可组合搜索标题、URL、说明、筛选原因及已有语言、许可证、标签，例如 `TypeScript MIT`；空格分隔的词需同时匹配。候选与收藏分别记住查询和排序。候选默认原顺序，也可在每轮内按 stars、代码更新时间或名称排序，未知值排后。

对比名单直接显示所选名称，可逐项移除或清空，比较顺序跟随选择，最多四项。不足 620px 时按维度纵向阅读，每个值带来源名称；宽栏使用表格。最近成功保存的本地判定可一键撤销并恢复原原因；切主题、后续同项编辑或发现冲突后失效。

卡片优先显示已有的「研究判断」，详情保留完整判断与简介。新研究的提示要求说明适用点和关键待核验点，并遵循用户明确指定的来源名单或数量；这些要求不构成事实准确性保证。查询、排序、对比和草稿在同主题的输入框入口与历史卡片之间接续。

卡片显示保存状态；引用和直接摘要等待已有筛选写入，失败时保留草稿供重试。研究中约每 2 秒读取一次，静置结果约每 30 秒一次；收藏页或面板隐藏时暂停定期完整读取，返回时刷新。

0.4.0 按预发行交付。6/24/200 项、深浅模式和四种面板宽度已在固定 RC Host 检查；原生缩放、真实 IME/附件组合、屏幕阅读器和真人观察仍有限制，未重跑完整性能矩阵。详见[本轮实施与验收](docs/implementation/2026-10-23-workflow-0.4.0.md)。

1. 卡片展示仓库图 / Logo，失败时尝试 GitHub owner 头像，再显示字标。GitHub 的 stars、最近代码推送时间、查询时间与来源链接分别显示。未知数据明确显示未知，0 stars 保留为 0。
2. `✓ 保留` / `✕ 排除`，再次点击同一选项恢复待处理；可展开填写原因。收藏、对比与筛选互相独立。
3. 点「加入对比」后打开「对比」，最多四个来源，可比较简介、stars、更新时间、语言、许可证及筛选理由。
4. 默认双列；面板内容宽度小于 620px 自动单列。深浅模式跟随 Host，包括设置下拉选项。需求、补充说明、原因草稿和对比选择按会话 / 主题保留在浏览器 sessionStorage。
5. 底部「补充查找」展开输入后，「继续查找」启动同主题新轮次，携带保留项、排除项与原因；「新搜索」展开新需求，点击开始才创建新集合，收起不会丢草稿。旧结果仍可从对话卡片查看。
6. 运行中可筛选、收藏、对比和引用；「停止研究」只停止该轮子任务。五分钟超时会结束研究并保留已到达候选。Host 重启后未恢复的研究显示中断，可重试。

## 引用后继续开发

选好资料，点 **「引用到对话（N 条）」**。主输入框原有正文、附件和引用保留，不会自动发送。然后续写，例如：

> 参考这几个仓库，学习其中的 UI 设计，结合本仓库现有组件提出优化并实现。

也可在主输入框输入 `@deck`，选择当前保留项或历史快照。引用保存标题、真实 URL、说明、metadata 和筛选原因的不可变快照；之后改判不会悄悄更改已插入的资料。点击引用可回看原主题，发送前可移除。

插入期间若用户继续输入、切会话或当前输入框不可用，会保留原草稿并提示重试；清除数据后的失效引用会阻止发送，需移除后重选。

次要入口「直接发送筛选摘要」立即投递摘要并把集合设为只读，失败可重试且使用同一请求身份。需要续写开发说明时优先使用引用。

## 收藏与高级设置

卡片 ☆ 保存至当前 profile 共用收藏夹，支持搜索、移除、重新加入资料台。收藏会跨会话共享，重启保留。

设置页「资料台」提供可选的 GitHub / Web / LLM 自主来源策略，以及清除插件数据。策略用于提示和标记，不保证模型结果严格合规。卸载不会自动删除已有记录。

## 数据与限制

- 本地 `source_deck` 域保持八表：sets、sources、candidates、selections、scope_policies、session_active、rounds、favorites。旧记录可读取；搜索结果绑定原主题和轮次。
- 插件不读取凭据文件或保存 API Key。搜索提示与网页请求按 Host 的配置发送给提供方；外部内容序列化为资料数据，不能替代用户指令。
- 图片受原站、网络及 Host CSP 影响；失败不影响筛选或链接。模型未查证的 metadata 不应当作真实统计。
- 并发受模型提供方额度及官方子会话设置约束；不提供跨设备同步、导出或版本链 diff。
- 真实 Host 验收范围与未验收项目见 [验收记录](docs/SETUP-VERIFICATION.md)。

## 参与共建

SourceDeck 还在早期，很多取舍可以一起讨论。欢迎 fork、提 issue、提 PR。

- **遇到问题**：开 issue，附上 DSH 版本、插件版本、复现步骤和相关日志；请先脱敏。
- **想改代码**：fork 后从 `main` 开分支，保持精确 peer，跑 `node --test tests/*.test.ts` 和 `npm run build`，在 PR 里说明动机、取舍和验证。
- **想补来源 / 场景**：欢迎补适配和测试；请避免把 alpha 专有 API 带进来。

不要求一次写完整个功能。一个清楚的场景、一条测试、一段文案，都是有价值的贡献。

## 检索与索引

- GitHub 仓库：<https://github.com/Archaofan/dsh-source-deck>（可搜索 `dsh-plugin`、`source-deck`、`DeepSeek Harness`）
- 最新预发行：[0.4.0](https://github.com/Archaofan/dsh-source-deck/releases/tag/v0.4.0)；稳定版：[0.3.0](https://github.com/Archaofan/dsh-source-deck/releases/tag/v0.3.0)
- GitMCP 文档索引：<https://gitmcp.io/Archaofan/dsh-source-deck>
- 插件市场：[目录条目](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/data/plugins/Archaofan__dsh-source-deck.yml)（已收录；2026-10-23 指向 0.3.3）

## 开发

```sh
pnpm install
pnpm run build
node --test tests/*.test.ts
npm pack
```

产物为 Host `lib/index.js`、Client lazy-CJS `lib/client.js`、types、图标及中英 locale。精确 peer 保持不变，无新增依赖。

- [v3 设计](docs/superpowers/specs/2026-10-18-sourcedeck-v3-design.md)
- [已批准实施计划](docs/superpowers/plans/2026-10-18-sourcedeck-v3.md)
- [开发工作流调研](docs/research/2026-10-18-developer-workflow-review.md)
- [本轮同类工具调研](docs/research/2026-10-23-next-iteration-review.md) · [0.4.0 实施与验收](docs/implementation/2026-10-23-workflow-0.4.0.md)
- [交接](docs/HANDOFF.md) · [版本策略](docs/VERSION-POLICY.md)
