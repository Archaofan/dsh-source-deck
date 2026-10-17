# 新对话接手提示词

将下面整段发送到新对话。建议让新对话的工作目录直接指向 E:/DSH-Desktop-Plugin-Dev/dsh-source-deck。

~~~text
继续 SourceDeck（dsh-source-deck / 资料筛选台）项目。方案 A 已获用户批准（2026-10-17），不要重新设计，不要改动已批准的设计决策；确需变更先说明理由再改文档。

当前进度（2026-10-17 最终）：
- 阶段 1（R1 冒烟）、1.5（沙箱升级与适配，基线 0.2.1-rc.2）、1.6（产品 peer 切换）均已完成。
- **阶段 2（V3a 无模型链路）已完成**：0.1.11 起实现 source_deck 域、deck_submit_sources、sourceDeck Remote、ignorable 会话记录、资料台面板、对话卡片、input.right 入口。
- **阶段 3（V7 来源范围配置）已完成**：0.1.12 增加 scope_policies 表、三种策略（GitHub/web/LLM 自主）、设置页编辑器、策略摘要与 candidate.policyFlags；29 个单元测试全绿。
- **阶段 4（V3b 模型链路）已完成**：Agent 实际调用 deck_submit_sources（会话日志 seq19），提交后 session.prompt 摘要含保留 Bun 与策略，下一轮助手明确基于 Bun 继续（seq41）。
- **阶段 5（V4/V5/V6/V2）已完成**：重启恢复、多会话隔离、设置页清除数据、卸载/重装、peer 负向安装拒绝（0.2.1-rc.2 主机拒绝 peer 0.2.0-rc.2 的包并回滚）。
- 生产 Desktop 已由用户经 Codex 升级到 0.2.1-rc.2，与沙箱一致；**插件尚未安装到生产**，等待用户明确批准。
- 证据：docs/SETUP-VERIFICATION.md 夜-4、夜-5 段；截图在 sandbox/dsh-desktop/logs/shots/（stage2-*、stage3-*、stage4-*、stage5-*），不进 Git。
- 下一步：用户验收；如批准，按生产安装流程安装 0.1.12。

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
4. docs/DEVELOPMENT.md、docs/VERSION-POLICY.md、docs/SETUP-VERIFICATION.md（夜-2=rc.2，夜-3=peer 切换，夜-4=阶段 2 验收）；
5. docs/research/2026-10-17-rc-interface-evidence.md（0.2.0-rc.2 基线证据）与 docs/research/2026-10-17-0.2.1-rc.2-interface-delta.md（新 RC 差异与适配结论）；
6. docs/implementation/2026-10-17-implementation-plan.md（阶段 1 / 1.5 / 1.6 / 2 结果）；
7. sandbox/dsh-desktop/README.md、baseline.json、status.json（开始前先跑 Get-SandboxStatus.ps1 确认占用）。

验收与后续（全部阶段已完成）：
- 用户验收：按 docs/SETUP-VERIFICATION.md 夜-4/夜-5 段与截图逐项确认；可重新跑 `node --test tests/*.test.ts`（29 例）。
- 生产安装（需用户明确批准）：生产已是 0.2.1-rc.2，与 peer 匹配；按生产安装流程走 App「设置 → 插件」或市场接口，不要用 `dsh plugin --profile desktop`。
- 沙箱开发构建每次都要 bump 版本再 pack/install；当前 profile 依赖指向项目目录里的 dsh-source-deck-0.1.12.tgz（产品 0.1.12，已被 Git 忽略）。

已决定的基线（2026-10-17，用户）：
- 产品 peerDependencies 已切换到最新基线：@deepseek-ai/dsh@0.2.1-rc.2、@deepseek-ai/cordis@4.0.5，精确声明；产品版本 0.1.12。
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
