# 新对话接手提示词

> **执行阶段更新（2026-10-18，优先于下方历史状态）**：用户已批准 v3 书面设计并要求落地、推送 Git。[实施计划](superpowers/plans/2026-10-18-sourcedeck-v3.md)（[English](superpowers/plans/2026-10-18-sourcedeck-v3.en.md)）已完成自审，待计划评审及执行方式确认后按 executing-plans 实施；推荐当前会话 Native。计划覆盖身份/幂等、受管后台、带参命令/自然语言、引用草稿、开发者 UI、主题/图标及固定 RC 沙箱交付 0.3.0。产品代码尚未变更，仍 0.2.5；不重新要求用户批准已确认设计。生产继续不动。

> **最新进展（2026-10-18，优先读取）**：用户已选择“后台研究子会话”，接受并发模型请求，要求主聊天不再反复出现补搜 prompt，左右独立工作；要求全功能深浅色适配（含设置下拉选项）、自然语言启动和将已筛选结果插入主聊天草稿引用后续写开发要求。[v3 完整书面设计](superpowers/specs/2026-10-18-sourcedeck-v3-design.md)（[English](superpowers/specs/2026-10-18-sourcedeck-v3-design.en.md)）已写，等待书面审阅后进入实施计划；旧“不要 child session”的说明已由本轮用户选择修订。`assets/icon.svg`/`icon.png` 已生成（蓝青资料卡+勾选，本地自包含），尚未接 package.json、打包或安装。当前产品仍 0.2.5；不把设计或素材当已实现功能。内嵌图片被用户观察到失败，虽然本地浏览器曾成功，不算完成真实宿主图片验收。

> **视觉要求已重申（2026-10-18）**：保留仓库对应头图/缩略图或图标/头像；GitHub 卡片必须显眼展示 stars 和最近代码更新时间（按最后代码推送，查询时间单列）。默认双列、窄面板自动单列不变。最新调研记录包含 10:57 北京时间核对的 zap/zerolog GitHub 数据与真实图片来源。不要再用纯文字卡片替代这些既有需求；本轮仍是设计更新，未修改产品代码。

> **布局已确认（2026-10-18 用户评审反馈）**：默认双列卡片，资料台面板变窄时自动切单列，放宽后恢复双列；按面板自身宽度自适应，不能让用户手动选择两个方案。其余工作流仍待整体设计评审，不把这一局部反馈视为全部功能获批。

> **2026-10-18 最新补充（优先于下方旧提示中的“不要重新设计”）**：用户已要求调研并优化开发者工作流、UI 与触发方式，明确优先“找开源库、比较技术方案”。[调研与评审提案](research/2026-10-18-developer-workflow-review.md)（[English](research/2026-10-18-developer-workflow-review.en.md)）已完成，推荐同一会话内的选型工作台方向。产品仍 0.2.5，无产品代码/版本/依赖改动；当前停在设计评审，不能把候选方案当批准决定。后续先查看用户对本轮提案的反馈，再完成正式 spec 和实施计划。基线 35 测试通过；运行 `node docs/research/probes/2026-10-18-workflow-probe.mjs` 可复现现有轮次归属与提交幂等问题，输出 true 表示仍观察到问题。沙箱 baseline/CheckOnly 已复核且空闲，本轮未启动 Desktop/调用模型。市场约 10:43 北京时间仍 open/年龄 gate failure，满 24h 的准确时间为 11:35:45，之后需重新检查；生产未改。

将下面整段发送到新对话。建议让新对话的工作目录直接指向 E:/DSH-Desktop-Plugin-Dev/dsh-source-deck。

~~~text
继续 SourceDeck（dsh-source-deck / 资料筛选台）项目。方案 A 已获用户批准（2026-10-17），不要重新设计，不要改动已批准的设计决策；确需变更先说明理由再改文档。

当前进度（2026-10-18：v2 完成 + 市场提交中）：
- 阶段 1（R1 冒烟）、1.5（沙箱升级与适配，基线 0.2.1-rc.2）、1.6（产品 peer 切换）均已完成。
- **阶段 2（V3a 无模型链路）已完成**：source_deck 域、deck_submit_sources、sourceDeck Remote、ignorable 会话记录、资料台面板、对话卡片、input.right 入口。
- **阶段 3（V7 来源范围配置）已完成**：scope_policies 表、三种策略（GitHub/web/LLM 自主）、设置页编辑器、策略摘要与 candidate.policyFlags；现降为可选高级项。
- **阶段 4（V3b 模型链路）已完成**：Agent 实际调用 deck_submit_sources，提交后 session.prompt 摘要含保留项，下一轮助手基于保留项继续。
- **阶段 5（V4/V5/V6/V2）已完成**：重启恢复、多会话隔离、设置页清除数据、卸载/重装、peer 负向安装拒绝。
- **阶段 6（0.1.17 UI 迭代）已完成**：固定头部/进度、过滤+搜索、批量操作、行内理由、折叠添加、快捷键等。
- **阶段 7（0.2.x v2，用户 2026-10-17 当天修订）已完成**：八表域（新增 rounds/favorites）；首屏自然语言需求，当前会话 LLM 用自身工具搜索；结果按轮次渲染 GitHub 可视化卡片（头像/简介/stars/语言/链接）；✓/✕/跳过/可选原因、补充说明驱动下一轮；收藏夹搜索/加入资料台/移除；`/deck` 命令、Host 抽取最近对话作为搜索上下文、对话卡片显示最近轮次；字体放大、2 列卡片、5 分钟轮询。35 个单元测试全绿。
- **阶段 8（2026-10-18 市场提交）进行中**：DSH 市场 `dshmarket` 通过 awesome-dsh-plugin 精选目录收录。PR [#7739](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/7739) 已开，条目 `data/plugins/Archaofan__dsh-source-deck.yml`；仓库已 public 并加 `dsh-plugin` topic。PR check 已通过；Submission gate 仅差仓库创建满 24 小时（约 2026-10-18 11:35 北京时间），gate 自动重跑。未合并前不算上架；合并后市场搜 `SourceDeck` 安装。详见 docs/MARKETPLACE.md。
- 生产 Desktop 已由用户经 Codex 升级到 0.2.1-rc.2，与沙箱一致；**0.2.5 尚未安装到生产**，生产仍为 0.1.17。交付包 `dsh-source-deck-0.2.5.tgz` 由用户自行安装。
- 证据：docs/SETUP-VERIFICATION.md 夜-4 至夜-8 段；截图在 sandbox/dsh-desktop/logs/shots/（stage2-*、stage3-*、stage4-*、stage5-*、ui-iteration/、deck-v2/），不进 Git。
- 聊天联动调研：docs/research/2026-10-17-chat-deck-linkage.md；设计修订：docs/design/2026-10-17-solution-design.md §14；市场记录：docs/MARKETPLACE.md。
- 下一步：等 PR #7739 的年龄 gate 自动转绿并合并；合并后确认市场可搜到；生产安装仍等用户明确批准。

工作区根目录：E:/DSH-Desktop-Plugin-Dev
项目目录：E:/DSH-Desktop-Plugin-Dev/dsh-source-deck
远端（public，市场收录需要）：https://github.com/Archaofan/dsh-source-deck
共用官方 Desktop 沙箱：E:/DSH-Desktop-Plugin-Dev/sandbox/dsh-desktop
git：本机有 git，位于 C:\Users\Administrator\AppData\Local\hermes\git\cmd\git.exe（Hermes 自带，git 2.54.0），未加入会话 PATH。仓库由另一账号创建，需按命令加进程级 safe.directory，例如：
  & 'C:\Users\Administrator\AppData\Local\hermes\git\cmd\git.exe' -c safe.directory=E:/DSH-Desktop-Plugin-Dev/dsh-source-deck -C E:/DSH-Desktop-Plugin-Dev/dsh-source-deck status
不要改全局 safe.directory。

接手第一步：读以下文件
1. 工作区根 README.md 和 AGENTS.md（升级纪律与沙箱独占规则）；
2. 项目 README.md、AGENTS.md、docs/PROJECT-BRIEF.md；
3. docs/design/2026-10-17-solution-design.md（主设计 v1.1）、docs/design/wireframes.md；
4. docs/DEVELOPMENT.md、docs/VERSION-POLICY.md、docs/SETUP-VERIFICATION.md（夜-2=rc.2，夜-3=peer 切换，夜-4=阶段 2 验收，夜-7=v2，夜-8=市场提交）；
5. docs/research/2026-10-17-rc-interface-evidence.md（0.2.0-rc.2 基线证据）与 docs/research/2026-10-17-0.2.1-rc.2-interface-delta.md（新 RC 差异与适配结论）；
6. docs/implementation/2026-10-17-implementation-plan.md（阶段 1 / 1.5 / 1.6 / 2 结果）；
7. docs/MARKETPLACE.md（市场收录机制、PR #7739、gate 状态）；
8. sandbox/dsh-desktop/README.md、baseline.json、status.json（开始前先跑 Get-SandboxStatus.ps1 确认占用）。

验收与后续（全部阶段已完成）：
- 用户验收：按 docs/SETUP-VERIFICATION.md 夜-4 至夜-8 段与截图逐项确认；可重新跑 `node --test tests/*.test.ts`（35 例）。
- 市场收录：PR #7739 已开，PR check 通过；只需等仓库满 24h 后 gate 自动转绿，再由维护者合并；不要关/重开或 force-push。合并后用 dshmarket 搜 `SourceDeck` 确认。
- 生产安装（需用户明确批准）：生产已是 0.2.1-rc.2，与 peer 匹配；按生产安装流程走 App「设置 → 插件」并选择本地 tgz，不要用 `dsh plugin --profile desktop`。
- 沙箱开发构建每次都要 bump 版本再 pack/install；当前 profile 依赖指向项目目录里的 dsh-source-deck-0.2.5.tgz（产品 0.2.5，已被 Git 忽略）。

已决定的基线（2026-10-17，用户）：
- 产品 peerDependencies 已切换到最新基线：@deepseek-ai/dsh@0.2.1-rc.2、@deepseek-ai/cordis@4.0.5，精确声明；当前产品版本 0.2.5。
- 生产 Desktop 已由用户经 Codex 升级到 0.2.1-rc.2，与产品 peer 匹配；安装到生产仍须用户明确批准。若以后需要同时支持多个版本，需要用户另行选择 engines.dsh 范围方案，不能自行放宽。
- rc.2 是目前 npm next 的最新 RC；无需再升级沙箱，除非用户明确指示。

硬约束：
- 绝不启动或重启日用 DSH（127.0.0.1:19387）、不跑 dsh plugin --profile desktop；最终装到本 DSH 必须经用户明确批准。
- 沙箱 Desktop 启动：powershell -NoProfile -ExecutionPolicy Bypass -File sandbox/dsh-desktop/scripts/Start-Desktop.ps1 -Project dsh-source-deck；日志在 sandbox/dsh-desktop/logs/，内含 dsh web URL（动态端口 + token，不要把 token 写进文档/提交）。
- 沙箱 scripts 注释用 ASCII。
- 凭据：沙箱已配好 DeepSeek API；不要输出任何凭据值；用户已决定不轮换 2026-10-17 泄露的 key（记录见 docs/security/）。0.2.1 新增“已发送消息密钥脱敏”，与既有纪律一致。
- 提交推送后核对 HEAD 与 origin；不提交沙箱、缓存、凭据、*.tgz；失败记录 pending 不隐瞒。
- 共用沙箱一次只一个项目占用；停进程只停本次记录的沙箱 PID（先校验命令行含 sandbox 路径）。0.2.1 Desktop 主进程是 electron.exe（GUI 子系统），沙箱脚本已用 Start-Process 读取退出码。

已固化的实现与环境事实：
- 构建=tsdown（lib/*.js）+ tsc（lib/types）；/client 必须是 window.__ModuleLoader__.load({id, factory}) lazy-CJS（本地 tsdown.config.ts 复刻；rc.2 仍接受）。
- 外部请求=基线 PLATFORM_MODULES（rc.2 含 zod、@tanstack/react-virtual；当前插件不 import 二者），非基线 @deepseek-ai/* 值导入被纯度门拒绝（类型 import type 擦除除外）。
- ctx 上的 slots/locale/sidebarRightTabs 来自声明合并 import type（dsh-client-ui-renderer/client、dsh-client-ui-sidebar-right/client、dsh-client-ui-slots），缺一个 tsc 报错。
- tab 类型必须带 guide 条目，否则右栏 guide 页无入口。
- 兼容门（0.2.1）：engines.dsh 优先且声明后替代 dsh peer 检查；未声明时按 peer。0.1.1（peer 0.2.0-rc.2）在新 RC 下安装保留但启动拒绝，诊断明确。
- 构建需要 git commit；沙箱以 DSH_CLIENT_COMMIT_HASH 注入 baseline commit（rc.2 实测 687f282），避免 PATH/worktree 状态影响产物。
- 沙箱脚本已修：$LASTEXITCODE 局部遮蔽（改读 $global:）；Desktop CLI 用 Start-Process -Wait -PassThru；Assert-SandboxBaseline 支持“用户批准的沙箱先行版”；Get-SandboxStatus/Get-SandboxPaths 以 UTF-8 读取 JSON。
- 工具链：pnpm 11.28.5、Electron 44.7.0、primary runtime Node 24.21.0 / Python 3.12.14；runtime/pnpm 已补齐（desktop CLI 需要）。
- rc.2 构建：9 gate 全过（75.00s）、325 client artifacts、构建记录 commit 687f282 / version 0.2.1-rc.2、digest cf3a2784…。
- 证据与接口差异：docs/SETUP-VERIFICATION.md 夜-2 段、docs/research/2026-10-17-0.2.1-rc.2-interface-delta.md。

保持中文沟通，先结论后理由，结论附真实命令输出。
~~~

本提示词描述的是“沙箱已升级到 0.2.1-rc.2 并完成适配、准备进入阶段 2”的入口；具体安装、启动和同步证据以 SETUP-VERIFICATION.md、沙箱 status.json 与实时检查为准。历史阶段（环境准备、方案设计、阶段 1 实现）的入口提示词见 Git 历史。
