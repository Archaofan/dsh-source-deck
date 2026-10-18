# SourceDeck / 资料台

> 中文（默认） | [English](README.en.md)

SourceDeck 是 DeepSeek Harness Desktop 的开发资料工作台。用对话启动后台研究，筛选和对比开源库，把选好的仓库引用到聊天草稿，再续写开发要求。

## 界面预览

真实 Host 截图（浅色 / 深色），展示后台研究结果、逐条保留 / 排除、筛选原因与引用入口：

| 浅色 | 深色 |
|---|---|
| ![资料台浅色界面](docs/assets/screenshots/source-deck-light.png) | ![资料台深色界面](docs/assets/screenshots/source-deck-dark.png) |

## 适配与安装

| 项目 | 精确版本 |
|---|---|
| 本插件 | 0.3.0 |
| DeepSeek Harness Desktop | 0.2.1-rc.2 |
| @deepseek-ai/cordis | 4.0.5 |

只使用该 RC 的公共接口。沙箱与生产 Desktop 基线相同，**本轮只在沙箱安装，生产仍为插件 0.1.17**。

在 Desktop 的插件管理页选择本地安装 `dsh-source-deck-0.3.0.tgz`，按提示重启。安装列表显示自定义资料卡图标及「SourceDeck · 资料台」。重复开发安装应使用新版本或带内容哈希的新 tgz 路径；同路径同版本可能被包管理器缓存。

市场收录 PR [#7739](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/7739) 尚需复核合并与目录同步，当前不声称已上架。详见 [市场记录](docs/MARKETPLACE.md)。

## 从聊天开始

- 直接说：`用资料台找两个 Go 日志库，比较维护情况与结构化日志 API`。模型通过 `deck_search` 启动研究；自然语言触发取决于模型是否调用工具。
- 确定性入口：`/deck 找 Markdown 编辑器，优先开源和可扩展`。带参数开始后台研究，单独 `/deck` 只打开面板。
- 也可点输入框「资料台」、右栏 `+ → 资料台` 或对话卡片「在资料台打开」。历史卡片定位原主题。

研究由官方受管子会话执行，默认继承主会话的模型配置与凭据策略，会产生额外并发模型请求。Host 读取最近主对话作为资料理解上下文。搜索和补搜的内部提示留在子会话；主聊天可继续开发，保留简短的命令/工具状态及资料卡片。

研究工具仅允许 `web_search`、`web_fetch`、`deck_submit_sources`。需要官方网页工具和 spawn provider 可用；无法安全启动时显示失败原因，不自动改配置或升级基线。

## 筛选与比较

1. 卡片展示仓库图/Logo，失败时尝试 GitHub owner 头像，再显示字标。GitHub 的 stars、最近代码推送时间、查询时间与来源链接分别显示。未知数据明确显示未知，0 stars 保留为 0。
2. `✓ 保留` / `✕ 排除`，再次点击同一选项恢复待处理；可展开填写原因。收藏、对比与筛选互相独立。
3. 点「加入对比」后打开「对比」，最多四个来源，可比较简介、stars、更新时间、语言、许可证及筛选理由。
4. 默认双列；面板内容宽度小于 620px 自动单列。深浅模式跟随 Host，包括设置下拉选项。需求、补充说明、原因草稿和对比选择按会话/主题保留在浏览器 sessionStorage。
5. 底部补充要求后「继续查找」启动同主题的新轮次，携带保留项、排除项与原因；「新主题」创建新集合，旧结果仍可从对话卡片查看。
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
- [交接](docs/HANDOFF.md) · [版本策略](docs/VERSION-POLICY.md)
