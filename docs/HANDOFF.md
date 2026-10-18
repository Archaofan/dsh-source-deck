# SourceDeck 交接（2026-10-18）

> 中文（默认） | [English](HANDOFF.en.md)

继续本项目时先读根 README.md / AGENTS.md、本项目 README.md、MARKETPLACE.md、本文、SETUP-VERIFICATION.md 夜-9、AGENTS.md，再检查共享沙箱 lease。

## 已有授权与交付

用户已批准 v3 设计与七项计划，选择当前会话执行，要求落地并推送 Git。不要重复要求设计/计划批准。产品 0.3.0，已按用户后续要求将交付内容快进至默认分支 `main`，原交付分支 `feat/sourcedeck-v3` 保留；精确 peer DSH 0.2.1-rc.2、Cordis 4.0.5。工作区唯一项目目录 `E:/DSH-Desktop-Plugin-Dev/dsh-source-deck`，远端 `https://github.com/Archaofan/dsh-source-deck.git`。

0.3.0 已于 2026-10-18 发布为 GitHub Release `v0.3.0`（tag `8f4b373`，资产 `dsh-source-deck-0.3.0.tgz`，SHA256 `216AAD7303CE72DEFA0AA90FB16D7A7237A051CC99E17C9947275821BF2EA8C5`）；README 中英版使用真实 Host 的主界面与对话联动浅色/深色截图 `docs/assets/screenshots/source-deck-{light,dark}.png`、`source-deck-linkage-{light,dark}.png`，截图中的账号信息已脱敏。

检索面：GitHub 描述与 topics 已补充（含 `source-deck`、`ai-agents`、`ai-research`）；GitMCP 返回 HTTP 200 并已写入 README；DeepWiki 状态仍为 `unknown`，触发索引需要可信浏览器里的 reCAPTCHA，本次环境被 Vercel/连接重置阻断，未完成。市场 PR #7739 仍未合并，见 [MARKETPLACE.md](MARKETPLACE.md)。

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
