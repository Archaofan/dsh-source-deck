# SourceDeck 交接（2026-10-18）

> 中文（默认） | [English](HANDOFF.en.md)

继续本项目时先读根 README.md / AGENTS.md、本项目 README.md、MARKETPLACE.md、本文、SETUP-VERIFICATION.md 夜-9、AGENTS.md，再检查共享沙箱 lease。

## 2026-10-23：0.4.0 本地预览交付

用户看到四项范围后选择「整体由你判断，优先减少操作阻力」。检索/排序、可见对比名单、撤销、研究判断及同主题入口草稿接续已实现，见[实施与验收](implementation/2026-10-23-workflow-0.4.0.md)；[调研](research/2026-10-23-next-iteration-review.md)中的待确认措辞是当时状态。94/94 单测、6/6 实际组件交互、构建、安装字节核对和最终 Host 中英深浅四宽/6、24、200 项验收通过；两轮实际研究暴露并修正默认六项盖过指定名单的问题，第二轮只返回指定两项，不代表普遍质量保证。原生缩放/IME/附件限制保留。包 187148 bytes，SHA256 `505B93611204D654BCAAB98C4637F09B785797F66B99EC1E305F6882B7014BAB`，路径 `E:/DSH-Desktop-Plugin-Dev/dsh-source-deck/dsh-source-deck-0.4.0.tgz`。分支 `feat/workflow-0.4.0`；未建新 Release，生产未操作，沙箱已恢复中文/浅色并释放。Git 同步以最终核对为准。

## 2026-10-20：0.3.3 已发布

用户确认本轮简短设计后，已完成卡片说明优先、全文详情和窄栏同维度对比。源码/tag commit `1554e79de632375c6eef4050b8460da8bedb1bc4`，已快进到 main、推送并发布 [v0.3.3 预发行](https://github.com/Archaofan/dsh-source-deck/releases/tag/v0.3.3)，保留 `feat/screening-readability-0.3.3`。Latest 仍为 v0.3.0。包 `E:/DSH-Desktop-Plugin-Dev/dsh-source-deck/dsh-source-deck-0.3.3.tgz` 为 177295 bytes，SHA256 `20E87669430F10052CCDBB9D41859352806BB739F7FC5F85FC9086AE0B61520C`；GitHub digest 及下载回验一致。

83/83 测试、构建、官方沙箱安装字节核对通过；实际 Host 深色中文/浅色英文分别检查 319/419/639/899px 面板，长名称/未知数据、键盘移除、返回焦点/查询、引用保留草稿且不发送通过。独立审查的首列表头语义问题已修复，实际 AX 树保留列头，不等同原生屏幕阅读器播报。没有新研究提示、模型调用、数据表、依赖或基线改动；旧原生125%/IME/附件和真人观察限制保留。中文/浅色/默认视口已恢复，临时页已关闭，只停止核对过隔离路径与 userData 的本次主进程17068，lease已释放。详见[中英实施记录](implementation/2026-10-20-screening-readability.md)及验收末节。

## 2026-10-19：体验与性能研究（历史）

**2026-10-20 发布收尾**：用户要求重试后，复用既有草稿上传原验收包并成功发布 [v0.3.2 预发行](https://github.com/Archaofan/dsh-source-deck/releases/tag/v0.3.2)。资产 `dsh-source-deck-0.3.2.tgz` 为 175531 bytes，GitHub digest 与下载回读 SHA256 均为 `B1AD8CB15AE9076ED6D2AAC0F0ECCFDA867B89CE41EECBCD09D924681BF26545`。标签 commit 为 `1a1103cc2d02f0cf918c71fad94661d499d111a8`，main 已包含本轮交付；Latest 仍为 v0.3.0。81/81 回归再次通过，不重建已验收资产。下一轮正在确认 0.3.3 的简短设计：卡片说明优先级和窄栏同维度对比；尚未实施，不将既有条件性 0.4.0 自动当作已批准。详情见验收末节。

用户要求继续深度调研同类工具并制定优化迭代，明确避免功能堆积。本轮仅交付[中英调研](research/2026-10-19-comparable-tools-experience-review.md)、[迭代提案](design/2026-10-19-experience-iteration-proposal.md)及纯内存[探针/原始数据](research/probes/2026-10-19-experience-baseline.json)。研究覆盖七类相关工具与 GitHub；官方文档研究不冒充竞品实操。

用户随后明确要求“按方案执行落地”。0.3.1 减少重复工作、0.3.2 收拢结果页已实施；0.4.0 未启动。当前交付分支 `feat/experience-optimization`，本地包 `E:/DSH-Desktop-Plugin-Dev/dsh-source-deck/dsh-source-deck-0.3.2.tgz`。81/81 测试和构建通过，独立审查四项问题已修复；深浅四宽矩阵、独立查询、筛选空态、取消保稿、对比焦点、原因保存后引用已在实际固定 RC Host 检查。420×800固定区占28.42%。详见[实施记录](implementation/2026-10-19-experience-optimization.md)及验收记录“2026-10-19 体验迭代”。

用户进一步要求自行完成验证、推送和发布，不再由用户测试。已追加真实200条回读、6/24/200条过滤/对比各30次、24条判定30次与暖返回；反馈p95最高76.1ms、暖返回上界p95最高302ms。完整60秒可见/收藏/隐藏分别2/0/0次完整读取，活动各30次，200条最大在途1。纯内存另覆盖6/24/200×1/100/1,000主题，不冒充Host历史规模矩阵。按0.3.2预发行交付，保留0.3.0稳定入口；原生125%/IME、真实附件和真人观察仍有限制。用户明确授权后上传仍被浏览器权限审核拒绝，未绕过。未改依赖/八表/基线或生产；发布结果、HEAD、包哈希以最新验收为准。

## 已有授权与交付

用户已批准 v3 设计与七项计划，选择当前会话执行，要求落地并推送 Git。不要重复要求设计/计划批准。产品 0.3.0，已按用户后续要求将交付内容快进至默认分支 `main`，原交付分支 `feat/sourcedeck-v3` 保留；精确 peer DSH 0.2.1-rc.2、Cordis 4.0.5。工作区唯一项目目录 `E:/DSH-Desktop-Plugin-Dev/dsh-source-deck`，远端 `https://github.com/Archaofan/dsh-source-deck.git`。

0.3.0 已于 2026-10-18 发布为 GitHub Release `v0.3.0`（tag `8f4b373`，资产 `dsh-source-deck-0.3.0.tgz`，SHA256 `216AAD7303CE72DEFA0AA90FB16D7A7237A051CC99E17C9947275821BF2EA8C5`）；README 中英版使用真实 Host 的主界面与对话联动浅色/深色截图 `docs/assets/screenshots/source-deck-{light,dark}.png`、`source-deck-linkage-{light,dark}.png`，截图中的账号信息已脱敏。

检索面：GitHub 描述与 topics 已补充（含 `source-deck`、`ai-agents`、`ai-research`）；GitMCP 返回 HTTP 200 并已写入 README；DeepWiki 状态仍为 `unknown`，已用用户 Edge 配置打开页面，但 Google 图片验证码阻断，用户于 2026-10-18 决定先跳过，未触发索引。市场 PR #7739 仍未合并，见 [MARKETPLACE.md](MARKETPLACE.md)。

功能：后台受管研究子会话、自然语言 deck_search、带参 /deck、原主题轮次绑定与幂等/并发保护、响应式图片卡片、stars/推送时间/查询证据、筛选原因/收藏/最多四项比较、不可变 @deck 引用与草稿保护、直接摘要确认投递、深浅主题和自定义图标。八表兼容旧数据，无新增依赖。

最终共 67 项测试，包含刷新活动重放及历史主题参数缺失的定位恢复回归。真实模型已完成 zap/zerolog 检索；左侧独立任务在研究期间完成，取消补搜时左侧仍运行；模型收到引用中的两个真实 URL。自然语言 React 组件库任务成功启动，重启后标为 interrupted。独立审查四个 Important 均有回归，之后 Host 发现的工具作用域、图像遮挡、刷新重放也已修复。详见夜-9，不把旧 35 项状态当当前结果。

## 产物与环境

- 包：`E:/DSH-Desktop-Plugin-Dev/dsh-source-deck/dsh-source-deck-0.3.0.tgz`；最终 SHA256 见夜-9。
- 沙箱：`E:/DSH-Desktop-Plugin-Dev/sandbox/dsh-desktop`，上游固定 `687f282e8625c6b8d11ff58211a90524be2e4317`。
- 安装只用 Install-Plugin.ps1。相同版本同一路径可能显示 Already up to date 并复用旧包，验证时使用哈希文件名并核对安装 lib 与项目 build 的哈希。
- 凭据由用户独立配置在沙箱；不复制生产，不输出 token。实际 Host UI 经其 loopback 页面验收，区别于独立 mock。
- 本地截图/矩阵：`sandbox/dsh-desktop/test-workspaces/dsh-source-deck/v3-acceptance/`，不进 Git。
- 生产 Desktop 0.2.1-rc.2；插件最后确认版本0.1.17。用户将使用给出的0.3.0绝对路径自行安装，本Agent未操作生产；安装后的实际版本需后续确认。

## 尚需人工/外部复核

重建时 CSS Modules 导出映射键顺序可能变化；固定交付 tar 与已验收安装字节一致。不要因重建哈希不同误报代码不一致，先比较映射顺序。

- Electron 原生 125% 缩放、系统下拉展开窗口的截图、真实中文 IME 与附件组合；当前浏览器控制只确认真实 Host DOM/样式/草稿协议，不宣称原生验收全通过。
- 离线 frozen lock 校验缺 registry metadata；依赖未变，构建可用，不关闭策略来绕过。
- 市场 PR #7739：年龄条件已到时间，但下午重查遇连接器故障/公开 API 限流；最后成功状态为10:43 open、旧年龄失败。复核自动 gate/合并后再确认市场可搜；不要关/重开或 force-push，不能冒称上架。

## 常用检查

```powershell
node --test tests/*.test.ts
npm run build
powershell -NoProfile -ExecutionPolicy Bypass -File ../sandbox/dsh-desktop/scripts/Get-SandboxStatus.ps1
```

Git 位于 `C:/Users/Administrator/AppData/Local/hermes/git/cmd/git.exe`，每次使用进程级 `-c safe.directory=E:/DSH-Desktop-Plugin-Dev/dsh-source-deck`。普通沙箱 push 的 keyring 受限时，按证据申请该条主机 push；不改全局 safe.directory，不 force push。每次阶段交付核对本地 HEAD=origin/交付分支，工作区干净。
