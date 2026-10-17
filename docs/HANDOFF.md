# 新对话接手提示词

将下面整段发送到新对话。建议让新对话的工作目录直接指向 E:/DSH-Desktop-Plugin-Dev/dsh-source-deck。

~~~text
继续 SourceDeck（dsh-source-deck / 资料筛选台）项目，进入实现阶段。方案 A 已获用户批准（2026-10-17），不要重新设计，不要改动已批准的设计决策；确需变更先说明理由再改文档。

工作区根目录：E:/DSH-Desktop-Plugin-Dev
项目目录：E:/DSH-Desktop-Plugin-Dev/dsh-source-deck
私有远端：https://github.com/Archaofan/dsh-source-deck
共用官方 Desktop 沙箱：E:/DSH-Desktop-Plugin-Dev/sandbox/dsh-desktop

先读取：
1. 工作区根 README.md 和 AGENTS.md；
2. 项目 README.md、AGENTS.md、docs/PROJECT-BRIEF.md（含方案批准结论）；
3. docs/design/2026-10-17-solution-design.md（主设计 v1.1，§5.5 来源范围配置是用户新要求）、docs/design/wireframes.md；
4. docs/DEVELOPMENT.md、docs/VERSION-POLICY.md、docs/SETUP-VERIFICATION.md（下午记录含沙箱 LLM API 配置与启动链路修复）；
5. docs/research/2026-10-17-rc-interface-evidence.md；
6. E:/DSH-Desktop-Plugin-Dev/sandbox/dsh-desktop/README.md、baseline.json、status.json。

实现顺序按设计 §9 验收表：先做 R1 冒烟（最小 client half + 右栏空 tab 进 desktop boot graph，V0/V1），再做无模型链路（V3a）、策略配置（V7）、模型链路（V3b，沙箱 DeepSeek API 已就绪）、恢复/多会话/停用（V4–V6）、负向兼容（V2）。

硬约束：
- 只维护 0.2.0-rc.2，peer 精确写 "0.2.0-rc.2"；不用 alpha 专有接口。
- 所有安装与集成验证只用共用沙箱的 Install-Plugin.ps1 / Start-Desktop.ps1；绝不启动或重启日用 DSH（127.0.0.1:19387）、不跑 dsh plugin --profile desktop；最终装到本 DSH 必须经用户明确批准。
- 沙箱 Desktop 启动：powershell -NoProfile -ExecutionPolicy Bypass -File sandbox/dsh-desktop/scripts/Start-Desktop.ps1 -Project dsh-source-deck；启动日志在 sandbox/dsh-desktop/logs/，内含 dsh web URL（动态端口 + token）。
- 沙箱 scripts 注释用 ASCII（曾因中文注释导致 PowerShell 解析器行合并）。
- 凭据：沙箱已按用户指示配好 DeepSeek API；不要再输出任何凭据值；用户已被建议轮换 2026-10-17 泄露的 key。
- 提交推送后核对 HEAD 与 origin；不提交沙箱、缓存、凭据；失败记录 pending 不隐瞒。

保持中文沟通，先结论后理由，结论附真实命令输出。
~~~

本提示词描述的是实现阶段的工作入口；具体安装、启动和同步证据以 SETUP-VERIFICATION.md、沙箱 status.json 与实时检查为准。历史阶段（环境准备与方案设计）的入口提示词见 Git 历史。
