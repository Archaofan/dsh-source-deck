# 新对话接手提示词

将下面整段发送到新对话。建议让新对话的工作目录直接指向 E:/DSH-Desktop-Plugin-Dev/dsh-source-deck。

~~~text
继续 SourceDeck（dsh-source-deck / 资料筛选台）项目。方案 A 已获用户批准（2026-10-17），不要重新设计，不要改动已批准的设计决策；确需变更先说明理由再改文档。

**最新用户指示（2026-10-17，优先于本文其余内容）**：DSH 最近发布了新 RC `0.2.1-rc.1`（npm `next` tag，GitHub tag `dsh-v0.2.1-rc.1`，发布于 2026-10-17 05:22 UTC，是 0.2.1 系列首个 RC，汇总自 `0.2.0-rc.2` 以来的变更）。用户要求：**先把共用沙箱升级到 0.2.1-rc.1，完成适配后再继续阶段 2 开发**；**生产环境仍在用的 DSH（0.2.0-rc.2）不受影响、绝不动**。沙箱升级属环境操作，必须先说明理由、影响与验证方式，遵守工作区 AGENTS.md 的升级纪律。

工作区根目录：E:/DSH-Desktop-Plugin-Dev
项目目录：E:/DSH-Desktop-Plugin-Dev/dsh-source-deck
私有远端：https://github.com/Archaofan/dsh-source-deck
共用官方 Desktop 沙箱：E:/DSH-Desktop-Plugin-Dev/sandbox/dsh-desktop

当前进度：阶段 1（R1 冒烟）已完成并推送（commit f0d747916d82c482f8d865eb37305f3287860ffe，远端已核对）。阶段 1 实测记录与已固化的实现事实见 docs/implementation/2026-10-17-implementation-plan.md、docs/DEVELOPMENT.md、docs/SETUP-VERIFICATION.md（傍晚两段记录）。下一步原计划是阶段 2（V3a 无模型链路），但现在**先做沙箱升级与适配**。

接手第一步：读以下文件
1. 工作区根 README.md 和 AGENTS.md（升级纪律与沙箱独占规则）；
2. 项目 README.md、AGENTS.md、docs/PROJECT-BRIEF.md；
3. docs/design/2026-10-17-solution-design.md（主设计 v1.1）、docs/design/wireframes.md；
4. docs/DEVELOPMENT.md、docs/VERSION-POLICY.md、docs/SETUP-VERIFICATION.md；
5. docs/research/2026-10-17-rc-interface-evidence.md；
6. sandbox/dsh-desktop/README.md、baseline.json、status.json（升级前先跑 Get-SandboxStatus.ps1 确认占用）。

沙箱升级到 0.2.1-rc.1 的建议步骤（先规划再执行，每步留证据）：
a. 完整读 0.2.1-rc.1 release notes（GitHub releases 的 dsh-v0.2.1-rc.1），摘出与插件系统相关的变更：自定义插件索引源、插件启用/停用/卸载与依赖同步、启用热重载、实验性 Session 状态记录接口、pi-ai 路由（系统提示词更新/工具动态增删）等；
b. 按沙箱 README 的升级流程更新 upstream 到新 tag 并更新 baseline.json（Assert-SandboxBaseline 会校验 commit 一致，不要绕过；不要静默升级共享基线），重新走官方构建；
c. 升级后用 0.1.1 插件包重装沙箱 profile（版本 bump 纪律见 DEVELOPMENT.md），启动 Desktop 复验阶段 1 验收项：guide 入口「资料筛选台」、tab chip「资料台」、placeholder body；记录新启动日志与截图到 sandbox/dsh-desktop/logs/shots/upgrade-0.2.1-rc.1/；
d. 输出适配结论：哪些 0.2.0-rc.2 接口假设仍然成立（重点是两步 tab 注册、dsh.client manifest/bundle patch 装载链路、PLATFORM_MODULES 基线、clientBundle lazy-CJS 预设），哪些变了；
e. **待用户确认的决策**：产品 peerDependencies 是否切到 0.2.1-rc.1（用户明确生产仍用 0.2.0-rc.2；工作区 AGENTS.md 要求支持基线切换需用户明确选择）。在用户确认前，沙箱升级只作为开发环境，不要改 peer 声明、不要宣称对 0.2.1-rc.1 的兼容。

硬约束：
- 绝不启动或重启日用 DSH（127.0.0.1:19387）、不跑 dsh plugin --profile desktop；最终装到本 DSH 必须经用户明确批准。
- 沙箱 Desktop 启动：powershell -NoProfile -ExecutionPolicy Bypass -File sandbox/dsh-desktop/scripts/Start-Desktop.ps1 -Project dsh-source-deck；启动日志在 sandbox/dsh-desktop/logs/，内含 dsh web URL（动态端口 + token）。
- 沙箱 scripts 注释用 ASCII（曾因中文注释导致 PowerShell 解析器行合并）。
- 凭据：沙箱已配好 DeepSeek API；不要再输出任何凭据值；用户已决定不轮换 2026-10-17 泄露的 key（记录见 docs/security/）。注意 0.2.1-rc.1 新增"已发送消息密钥脱敏"能力，与既有凭据纪律方向一致。
- 提交推送后核对 HEAD 与 origin；不提交沙箱、缓存、凭据；失败记录 pending 不隐瞒。
- 共用沙箱一次只一个项目占用；停进程只停本次记录的沙箱 PID（先校验命令行含 sandbox 路径）。

阶段 1 已固化的实现事实（改插件骨架前必读，详见 DEVELOPMENT.md 与实现计划）：
- 构建=tsdown（lib/*.js）+ tsc（lib/types）；`/client` 必须是 `window.__ModuleLoader__.load({id, factory})` lazy-CJS 格式，本地 tsdown.config.ts 复刻了该预设；外部请求=基线 PLATFORM_MODULES，非基线 @deepseek-ai/* 值导入会被纯度门拒绝（类型 import type 擦除除外）。
- ctx 上的 `slots`/`locale`/`sidebarRightTabs` 属性来自 `import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'`、`'@deepseek-ai/dsh-client-ui-sidebar-right/client'`、`'@deepseek-ai/dsh-client-ui-slots'` 的声明合并，缺一个 tsc 就报 Property does not exist。
- tab 类型必须带 guide 条目，否则右栏 guide 页无入口、tab 不可达。
- 每次改插件都要 bump version 再 pack/install（pnpm 同版本 file: 包不更新）。
- 阶段 1 环境修复（沙箱资产，不进 Git）：desktop CLI 的 runtime/pnpm 已补齐；Common.ps1 的 $LASTEXITCODE 与 ErrorActionPreference 已修。

保持中文沟通，先结论后理由，结论附真实命令输出。
~~~

本提示词描述的是"沙箱升级 + 适配 + 继续实现"的入口；具体安装、启动和同步证据以 SETUP-VERIFICATION.md、沙箱 status.json 与实时检查为准。历史阶段（环境准备、方案设计、阶段 1 实现）的入口提示词见 Git 历史。

保持中文沟通，先结论后理由，结论附真实命令输出。
~~~

本提示词描述的是实现阶段的工作入口；具体安装、启动和同步证据以 SETUP-VERIFICATION.md、沙箱 status.json 与实时检查为准。历史阶段（环境准备与方案设计）的入口提示词见 Git 历史。
