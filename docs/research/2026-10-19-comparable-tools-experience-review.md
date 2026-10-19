# 同类工具深度调研：让资料台更轻、更顺、更快

> 中文（默认） | [English](2026-10-19-comparable-tools-experience-review.en.md)

日期：2026-10-19（北京时间）。基于 SourceDeck **0.3.0 / `bdaae38`**。本轮交付调研与[优化迭代提案](../design/2026-10-19-experience-iteration-proposal.md)，不修改产品代码、依赖、产品版本或部署状态。

## 结论

下一阶段应优化“找到候选后做决定”的过程：**更快看到结果，更容易判断适不适合，选完顺手带回对话**。新增入口、标签体系、知识图谱或自动报告都不能直接解决当前最明显的摩擦。

最有依据的三个方向：

1. 将开始研究、阅读筛选、补搜三个阶段分开呈现，收起结果页上常驻的新需求框和补搜编辑器。
2. 让卡片优先解释与本次需求的关系；保留真实图片、stars 和代码更新时间，但降低装饰标签与重复说明的视觉权重。
3. 先减少无变化时的重复读取、重复格式化和整页更新，再依据真实 Host 数据决定是否需要索引或列表虚拟化。

这些是结合文档、现有截图与代码作出的产品判断；没有竞品实操计时或 SourceDeck 用户实验，不能称为已证明的体验提升。

## 调研问题与证据边界

沿用已确认的主要场景：开发者找开源库、比较技术方案，并把选择交给当前 Agent。用户本轮新增约束：不能以功能堆积换取“升级”，应细化体验与使用性能。

逐项研究七个相关工具及 GitHub 这个直接检索入口，比较五个任务：开始、浏览、筛选、比较、交回。没有按功能数量、厂商声称的准确率或 GitHub stars 排名。

- **外部证据**：本日重新读取的官方帮助、官方开发文档和官方产品说明；属于文档研究，未登录付费产品或逐一操作其应用。厂商说明只能证明其描述的行为，不能证明其效率优于 SourceDeck。
- **内部证据**：0.3.0 当前源码、既有真实 Host 截图 `docs/assets/screenshots/source-deck-light.png`，以及本轮新增的纯内存探针。
- **环境证据**：已检查共享 `baseline.json`、`status.json` 与实时 `Get-SandboxStatus.ps1`；RC `0.2.1-rc.2`，`occupied=false`。旧 status 的阶段记录不替代项目夜-9验收。本轮没有启动 Desktop 或调用研究模型。
- **推断与目标**：建议、风险、性能预算和版本划分均单独标明，不作为当前已实现能力。

## 同类工具：借鉴机制与适用边界

所有链接访问日期均为 2026-10-19。表中的“借鉴”与“不迁入”是 SourceDeck 的取舍，不是对竞品能力的负面评价。

| 工具 / 相关任务 | 官方可核对行为 | 值得借鉴的机制 | 在 SourceDeck 的适用边界 |
|---|---|---|---|
| **Zotero / 浏览与归档** | [集合与标签](https://www.zotero.org/support/collections_and_tags)：同一条目可属于多个集合，集合归属不等于复制条目。[7.0 变更记录](https://www.zotero.org/support/7.0_changelog)：条目面板采用可折叠纵向分区 | 区分资料本身与本轮决定；次要详情按需展开 | SourceDeck 已有 source / candidate / favorite 边界，应保持；不新增文件夹树和标签管理器，也不把 Zotero 7 的历史记录称为其当前最新版 |
| **Raindrop.io / 快速找回资料** | [书签](https://help.raindrop.io/bookmarks/)支持预览、备注与收藏；[筛选](https://help.raindrop.io/filters/)随内容显示相关项，并区分全库和集合范围 | 搜索作用域清楚；少量筛选即可缩小当前集合 | 修正候选与收藏共用搜索词、筛选后空白误导；保留固定的全部/待处理/保留/排除位置，零项可显示 0，不照搬动态隐藏造成跳位 |
| **Readwise Reader / 连续处理** | [Library 配置](https://docs.readwise.io/reader/guides/workflows/library-configuration)将新增资料进入队列，再处理到 Later / Archive；另有 Shortlist 配置 | 用户知道哪些尚未处理，完成判断后可以继续下一项 | 复用现有 pending / kept / excluded；不增加“稍后读/已读/短名单”第二套状态，也不增加工作流设置选择器 |
| **Raycast / 低干扰操作** | [Action Panel](https://developers.raycast.com/api-reference/user-interface/action-panel)按当前条目组织动作，区分主次；[List](https://developers.raycast.com/api-reference/user-interface/list)支持本地过滤、加载状态及异步搜索节流 | 高频动作直接可见，低频动作按上下文出现；区分本地筛选与远程操作 | 保留/排除不能只藏在悬停或菜单；直接发送摘要可放进现有区域的次要操作。不能把 macOS 快捷键直接搬到 Windows/聊天输入框 |
| **NotebookLM / 资料范围与引用** | 本次旧帮助地址跳转到 [Gemini Notebook 官方帮助](https://support.google.com/gemininotebook/answer/16179559?hl=en)：可选择使用哪些来源，引用可定位原文 | 范围明确，事实有可追溯入口，引用能返回资料 | 明确“引用的是当前主题的已保留项”，并继续保护快照；SourceDeck 的 URL 引用不等于原文逐句定位，不能承诺限制主 Agent 只使用这些资料 |
| **Elicit / 筛选理由与证据** | [官方系统综述说明](https://elicit.com/blog/evaluating-elicit-slr)描述筛选排除原因与支持引文；[当前工作流帮助](https://support.elicit.com/en/articles/14757543-getting-started-with-elicit-which-workflow-should-i-use)区分不同研究深度 | 让“为什么推荐/为什么排除”能被理解和复查 | 用户原因仍可选；模型相关性判断与仓库事实分开。暂不引入严格评审流程、评分、自动判定或自定义抽取列；厂商准确率不能外推到开源库选型 |
| **ResearchRabbit / 有方向地补搜** | [官方指南](https://www.researchrabbit.ai/articles/guide-to-using-researchrabbit)从种子资料探索 Similar / References / Cited By，再迭代查询 | 以已有判断约束下一轮，补搜无需重新叙述全部需求 | 用已有保留、排除、原因及补充要求；引用关系适用于论文，不能假设仓库之间存在同等可信的图边。不引入网络图或后台推荐订阅 |
| **GitHub / 开源方案事实** | [仓库检索](https://docs.github.com/en/search-github/searching-on-github/searching-for-repositories)支持 stars、pushed、language、archived 等限定 | 判断热度、维护时间与状态时保留可核对事实 | stars 不等于适用性，最近 push 不等于最近发布；只展示已取得的字段。首轮不增加一排高级过滤器或插件自建 GitHub 凭据 |

### 共同点背后的取舍

**先完成当前任务，再组织长期知识。** SourceDeck 的价值在当前会话，跨会话收藏只是辅助。因此先优化“六个候选中选两个”，不增加知识库首页、收藏层级或项目管理。

**逐步披露需要保留可发现性。** 折叠的是补搜编辑器、查询细节和低频直接投递操作，不是把保留/排除、对比选择、错误、归档警告一并隐藏。收起后仍应有文字入口、数量、键盘路径与明确焦点。

**不同工具的术语不能直接拼装。** Zotero 的多集合归属与 Raindrop 的单集合书签并不相同；Reader 的 Later / Archive 也不是 SourceDeck 的保留/排除。采用一个稳定的资料模型比兼容所有竞品分类更容易理解。

**结果够用后应允许离开。** 已有引用路径足够完成交回，不应先要求收藏、完成全部待处理项、运行更多分析或生成报告。补搜仍由用户明确发起，不为“深度”自动加轮次。

## 当前 0.3.0 的具体摩擦

以下均指本日源码与既有截图。没有把 10 月 18 日已修复的轮次归属、投递幂等、后台隔离问题重新列为待修。

| 证据 | 对使用者的影响 / 尚待验证之处 | 收敛方向 |
|---|---|---|
| `src/client/DeckBody.tsx:170`：有结果时新需求编辑器仍展开；`195` 起 footer 常驻补搜 textarea、继续、引用、直接摘要及说明 | 浏览结果时仍面对多个阶段的动作；截图可见大块上下空间用于输入而非候选 | 有结果后改为紧凑主题/状态；新需求由“新搜索”明确展开；补搜点击再展开 |
| `CandidateCard.tsx:35` 优先 `meta.description`，其次才 `note`；`search-prompt.ts:88` 仅要求一句简介 | 容易看到项目宣传语，却看不到为何适合当前问题；是信息契约不足，不能单靠 CSS 解决 | 利用已有 note 写简短相关性解释；事实描述放详情；不凭空补推断 |
| 卡片最多展示语言、license 和 3 个 topics，另有状态、查询日期、来源、原因 | 若标签大多重复，阅读密度增长但决策信息没有增长；实际影响需要任务测试 | 保留许可证/语言与明确限制，topics 收详情；查询来源收成一个文字入口 |
| `DeckBody.tsx:29` 只有一个 query；`:130` 搜索不含 URL 和原因 | 收藏输入会影响返回候选后的显示；用户按来源域名或已写原因找不到项 | 两种作用域独立记忆；本地匹配标题、URL、说明、原因，不增加新搜索栏 |
| `DeckBody.tsx:189` 在 group 被过滤为空时也显示“没有新结果” | 容易把“被筛选隐藏”误解为研究没找到资料 | 区分未开始、进行中、零新增、当前筛选无匹配与失败；局部给清除筛选入口 |
| `ComparePanel.tsx:11` 固定六个维度，CSS 中每列有最低宽度；表格插在整个 feed 前 | 窄面板要横移；在页面深处打开对比时，是否能立即看到需要真实 Host 复核 | 对比作为有明确返回路径的聚焦区；窄栏按维度纵向展示；保持 2–4 项上限 |
| `DeckBody.tsx:62` 定时 2 秒完整 refresh；无 running / mode / 可见性条件；操作后也 refresh | 挂载期间，即便在收藏模式或研究完成，也继续完整读取；隐藏页是否仍挂载需确认 | 区分活动同步与静置；串行、合并、退避；保留恢复可见时的刷新 |
| `ops.ts:322` 的 getSet 扫 candidates / selections / rounds；`source-presentation.ts:26` 每次新建 Intl；ComparePanel 每维度重复调用 | 读取受全 profile 历史量影响；格式化成本随卡片与刷新增长 | 先减少重复工作；量化后再决定缓存/索引，不能据此宣称现有 UI 已严重卡顿 |
| `CandidateMutations` 已串行化同卡写入，但卡片 busy 来自 favorite 操作 | 不能把并发安全理解为已有逐条“保存中”反馈；快速点击等待感还没测量 | 小范围操作反馈与失败保留草稿；先保留可靠写入语义，不直接引入乐观状态回滚系统 |

图片当前已有 `loading="lazy"`、固定高度画框和降级顺序；不能将它们当作尚未实现的优化。v3 已确认的图文卡片、620px 自动单列、stars/代码更新时间/查询时间区分继续保留。

## 性能基线：测到了什么

执行：[探针](probes/2026-10-19-experience-baseline.mjs)。原始结果：[JSON](probes/2026-10-19-experience-baseline.json)，2026-10-19 **09:33:57 北京时间**，Node `v26.7.0`。

合成 fixture 每个主题 24 个候选、3 轮、1 个 reference selection；当前主题固定为最后一个。调用真实 `getSet`，使用计数的内存 store；fixture 构建不计入计时，10 次预热、60 次采样。访问数量仅统计 `entries()` 迭代，不含 `get()` 次数。

| profile 主题总数（含当前） | 当前返回候选 | 一次读取遍历记录数 | p50 / p95（ms） | 假定每 2 秒读取的理论遍历次数/分钟 |
|---:|---:|---:|---:|---:|
| 1 | 24 | 28 | 0.008 / 0.021 | 840 |
| 100 | 24 | 2,800 | 0.113 / 0.195 | 84,000 |
| 1,000（压力样本） | 24 | 28,000 | 0.817 / 0.895 | 840,000 |

结论：确认了**历史量放大扫描工作**，但这台机器上的纯内存读取仍快。不能用 840,000 次遍历推导 CPU 百分比、磁盘读次数、电量或整页延迟，也不足以优先重做存储层。响应 JSON 约 16KB，不随全部历史等比例放大。

另用真实 `formatSourceFacts`（中文 locale、有效 stars 和两个日期）测量，10 次预热、30 次采样：

| 每次连续格式化次数 | p50 / p95（ms） | 解释 |
|---:|---:|---|
| 6 | 0.524 / 0.626 | 常见首批规模 |
| 24 | 2.062 / 2.456 | 当前四项对比、六个维度会做 24 次格式化 |
| 200（压力样本） | 18.080 / 20.661 | 放大重复 Intl 构建的成本；不等于 200 卡片的 React 耗时 |

优先考虑复用 locale formatter、一次生成每项展示事实和避免无变化替换整份 view。`React.memo` 只有配合稳定数据/回调并测到收益才有意义；给全部函数加 memo 并不是优化依据。

`DeckActivityObserver` 也有两秒轮询，但 `getDeckActivity` 使用 `session_active` / round 的按键读取，**不是第二次 getSet 全表扫描**；它负责命令/自然语言定向打开，不能为了减少请求把它直接停掉。其 `openRevision` 只是打开意图，不能当作候选内容版本来缓存。

本轮未测量：Electron 主线程、Remote 网络/序列化、Host 实际存储、首屏、滚动、内存、模型耗时与 token。没有优化后数据，不能宣称提速比例。

## 评价方式

建议同时追踪使用体验与技术成本，避免“请求更少但结果不更新”或“首屏更快但更难理解”。

- 主任务：从 6 个候选中找出 2 个适合当前需求的项目，说明 1 个排除原因，插入引用并续写；记录完成时间、返回查找次数、误操作与引用内容。
- 连续任务：补搜一轮、筛掉无关项、打开对比再返回、收藏后切换会话，检查输入、滚动和决定是否仍在原处。
- 技术链路：分别记录点击反馈、Host 写入确认、可见更新与模型首批结果；模型时间不能归因于面板性能。
- [INP 官方定义](https://web.dev/articles/inp)覆盖交互至下一次绘制；实验室动作延迟不能冒称真实用户 INP。图片空间保留参考 [CLS 实践](https://web.dev/articles/optimize-cls)，当前实现已有基础。
- 折叠菜单按 [WAI Menu Button](https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/)复核键盘与焦点；[WCAG 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)的 24 CSS px 是有例外的最低要求，产品主要操作继续以至少 32px 为目标。

详细版本范围、复杂度预算、验收预算与停止条件见[迭代提案](../design/2026-10-19-experience-iteration-proposal.md)。它们是建议，等待后续设计评审；本轮调研任务不包含实现或生产部署。

## 本轮交付检查

- 纯内存探针执行成功，原始 JSON 已保留；扫描计数断言通过。计时可变，不把精确小数当作回归门槛。
- `node --test tests/*.test.ts`：**67 passed / 0 failed**，本日重新执行；只说明现有逻辑回归结果，不是新 UI 验收。
- 8 份中英文档的 53 个本地链接存在；双语实测值与 JSON 一致，产品版本仍为 0.3.0；`git diff --check` 通过。
- 改动仅文档与研究探针，未重建/打包产品，未进行新的真实 Host 或模型验收。
