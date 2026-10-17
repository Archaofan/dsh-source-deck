# 新对话接手提示词

将下面整段发送到新对话。建议让新对话的工作目录直接指向 E:/DSH-Desktop-Plugin-Dev/dsh-source-deck。

~~~text
继续 SourceDeck（dsh-source-deck / 资料筛选台）项目。方案 A 已获用户批准（2026-10-17），不要重新设计，不要改动已批准的设计决策；确需变更先说明理由再改文档。

当前进度（2026-10-17 夜，最终）：
- 阶段 1（R1 冒烟）已完成并推送。
- 阶段 1.5（沙箱升级与适配）已完成：共用沙箱最终为官方 dsh-v0.2.1-rc.2（commit 687f282e8625c6b8d11ff58211a90524be2e4317，release 2026-10-17T08:16:33Z）。先按用户指示升级到 rc.1 验证，再按“升级沙箱中的内容，确保适配新版本”升级到 rc.2；两次都通过官方构建，阶段 1 三项验收在 rc.2 复验通过。
- 生产 DSH 仍是 0.2.0-rc.2，未动；产品 peer 仍是 @deepseek-ai/dsh@0.2.0-rc.2（未切换，不宣称 0.2.1 RC 兼容）。沙箱里装的是仅用于适配验证的 0.1.3-adapt.1（peer 0.2.1-rc.2、cordis 4.0.5、rc.2 类型包），不是产品发布。
- 下一步：阶段 2（V3a 无模型链路）。

工作区根目录：E:/DSH-Desktop-Plugin-Dev
项目目录：E:/DSH-Desktop-Plugin-Dev/dsh-source-deck
私有远端：https://github.com/Archaofan/dsh-source-deck
共用官方 Desktop 沙箱：E:/DSH-Desktop-Plugin-Dev/sandbox/dsh-desktop
git：本机有 git，位于 C:\Users\Administrator\AppData\Local\hermes\git\cmd\git.exe（Hermes 自带，git 2.54.0），未加入会话 PATH。仓库由另一账号创建，需按命令加进程级 safe.directory，例如：
  & 'C:\Users\Administrator\AppData\Local\hermes\git\cmd\git.exe' -c safe.directory=E:/DSH-Desktop-Plugin-Dev/dsh-source-deck -C E:/DSH-Desktop-Plugin-Dev/dsh-source-deck status
不要改全局 safe.directory。

接手第一步：读以下文件
1. 工作区根 README.md 和 AGENTS.md（升级纪律与沙箱独占规则）；
2. 项目 README.md、AGENTS.md、docs/PROJECT-BRIEF.md；
3. docs/design/2026-10-17-solution-design.md（主设计 v1.1）、docs/design/wireframes.md；
4. docs/DEVELOPMENT.md、docs/VERSION-POLICY.md、docs/SETUP-VERIFICATION.md（夜段=rc.1，夜-2 段=rc.2 最终）；
5. docs/research/2026-10-17-rc-interface-evidence.md（0.2.0-rc.2 基线证据）与 docs/research/2026-10-17-0.2.1-rc.2-interface-delta.md（新 RC 差异与适配结论）；
6. docs/implementation/2026-10-17-implementation-plan.md（阶段 1 与 1.5 结果）；
7. sandbox/dsh-desktop/README.md、baseline.json、status.json（开始前先跑 Get-SandboxStatus.ps1 确认占用）。

阶段 2（V3a 无模型链路）按已批准设计推进：
- Host：defineDomain('source_deck') 五表、deck_submit_sources 工具、sourceDeck Remote 命名空间（addSource/listSets/getSet/decide/commitSelection/clearData）、log-only 事件（set-opened/candidate-decided/selection-submitted）。
- Client：资料台面板（待处理/保留/排除分组、添加资料表单、提交按钮、策略摘要条占位）、对话流候选卡片、input.right 入口按钮。
- 交付：手动添加→卡片→筛选→提交全链路；域文件可查；队列/steer 消息出现在会话投影；截图。
- 沙箱开发构建每次都要 bump 版本再 pack/install；当前 profile 依赖指向项目目录里的 dsh-source-deck-0.1.3-adapt.1.tgz（沙箱测试产物，*.tgz 被 Git 忽略）。产品 package.json 仍 0.1.1，不要被沙箱测试包的版本带走。

待用户确认的决策（不得自行决定）：
- 产品 peerDependencies 是否切换支持基线：保持 0.2.0-rc.2 / 切到 0.2.1-rc.2（精确 peer）/ 改用 engines.dsh 表达范围（0.2.1 兼容门优先读 engines.dsh 并完全替代 dsh peer 检查）。
- 用户确认前不改 peer、不发布、不宣称新 RC 兼容。目前 rc.2 是 npm next 的最新 RC；无需再升级沙箱，除非用户明确指示。

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
