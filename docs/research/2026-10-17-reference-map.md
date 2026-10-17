# 前置调研来源地图

日期：2026-10-17。这里记录已读的原始参考和可借鉴的问题，不等于选定方案或完成源码审计。

| 原始来源 | 可参考的做法 | 设计时要区分 |
|---|---|---|
| [Zotero collections/tags](https://www.zotero.org/support/collections_and_tags) | 同一资料可属于多个集合，资料身份与集合归属分离 | 候选集成员不应等于复制一份原始资料；筛选状态与正文状态分开 |
| [Zotero duplicate detection](https://www.zotero.org/support/duplicate_detection) | 发现重复并合并，保留原有归属和标签 | 同 URL、相似标题和内容不同版本不能一律删除 |
| [Notion Web Clipper](https://www.notion.com/help/web-clipper) | 选择保存位置、保留原页面 URL、编辑标签和属性 | 收藏一条链接不代表 Agent 已读正文或事实已验证 |
| [LangGraph interrupts](https://docs.langchain.com/oss/javascript/langgraph/interrupts) | 持久状态、明确恢复身份、人工输入后继续 | 借鉴交互和恢复语义，不因此引入整个 LangGraph 或阻塞 DSH 全局工具流水线 |
| [SearchSieve](https://github.com/rangrongg/SearchSieve) | 搜索覆盖度、冗余等可视卡片 | 继续核对是否已有用户多选、动作回传和续研闭环，不能按 README 没写就断言不存在 |
| [dsh-search-enhance](https://github.com/umineko987/dsh-search-enhance) | 多来源搜索、来源列表、摘要与抓取正文区分 | 搜索后端可复用，SourceDeck 的价值需要落在人工筛选与 Agent 协作 |

官方代码已固定拉取到 `E:/DSH-Desktop-Plugin-Dev/sandbox/dsh-desktop/upstream`，版本与 commit 见沙箱 baseline.json。优先读取实际目标版本：

- `apps/desktop/README.zh.md` 与 `apps/desktop/scripts/dev.ts`：独立 Desktop 开发模式和完整数据隔离。
- `docs/cookbook/adding-a-tool.zh.md`、`adding-a-remote-api.zh.md`：Host 工具、Remote 和生命周期。
- `docs/subsystems/sidebar-right.zh.md`、`slots.zh.md`：原生 UI 扩展与布局。
- `packages/core/agent/README.md`：followup、steer、inbox 和会话身份；Client 使用必须再核对入口。
- `packages/storage/storage-domain/README.md`：Host 持久状态及其模型可见性边界。
- `docs/tool-execution-pipeline.zh.md`：最终结果观察与前后置改写的区别。

之前的大范围选题记录位于工作区根 `research/2026-10-17-dsh-plugin-opportunities/`。17–18 号文档是最近的 AI 交互预研，14–16 的专业工具方向已撤下。不要把包含个人记忆的整个资料目录上传到插件仓库。
