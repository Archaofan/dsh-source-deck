# DSH Desktop 插件开发工作区

本工作区用于个人兴趣驱动的 AI / Agent 插件开发。各插件独立建仓，统一使用工作区内的官方 DSH Desktop 沙箱试验。日用 DSH 的程序、配置、凭据和数据不作为开发环境。

## 目录与归属

| 路径 | 用途 |
|---|---|
| `dsh-source-deck/` | SourceDeck 项目；独立 Git 仓库，后续设计、开发和项目资料都在这里 |
| `sandbox/dsh-desktop/` | 所有插件共用的官方 Desktop 开发沙箱，独立源码、依赖、缓存、状态和浏览器数据 |
| `research/2026-10-17-dsh-plugin-opportunities/` | 选题阶段历史资料；含个人记忆摘录，不自动复制到插件仓库或上传 |

新插件使用根目录下独立的项目文件夹和 Git 仓库，不在本根目录建立统一产品仓库，也不把上游 DSH、缓存或沙箱数据纳入插件 Git。

## 当前项目

名称：**SourceDeck**；中文名：资料筛选台；仓库：[`Archaofan/dsh-source-deck`](https://github.com/Archaofan/dsh-source-deck)，私有。

目标：为官方 DSH Desktop 提供自己的资料筛选 UI，以及对话过程中方便使用的入口，让用户挑选资料后交给 Agent 继续阅读、比较或排除。当前仅完成项目与环境准备；具体方案设计由新对话继续，见 [项目简报](dsh-source-deck/docs/PROJECT-BRIEF.md) 和 [接手提示词](dsh-source-deck/docs/HANDOFF.md)。

## 共用沙箱约定

1. 只使用与用户生产环境一致的官方 RC / 正式发布基线。当前生产目标为 `dsh-v0.2.0-rc.2`，commit `639ed015397290b3745d163aafe02ffee4aa3f84`，对应日用 Desktop 的 `0.2.0-rc.2`。**唯一例外**：2026-10-17 用户明确批准共用沙箱先行升级到 `dsh-v0.2.1-rc.1`（commit `1600d8a1e140dcde43a1a0941940a0480712c011`）作开发环境，生产与产品 `peerDependencies` 仍为 `0.2.0-rc.2`；该例外记录在 `sandbox/dsh-desktop/baseline.json` 的 `upgradeApproval`，且由 `Assert-SandboxBaseline` 校验。官方仍将 RC 标记为预发行版；**不维护 alpha 兼容、不使用 alpha 专有接口、不因出现新发布自动升级**。
2. 采用官方未打包 Desktop 开发启动器，不运行覆盖安装器。安装位置、Harness home、Electron userData、缓存、临时文件和日志均在 `sandbox/dsh-desktop/`。`DSH_HOME` 单独设置不能隔离 Electron 数据，必须一并使用本工作区启动脚本。RC Host 使用官方配置分配独立回环端口，避免与生产实例默认 19387 冲突。
3. 所有插件优先在此测试。共享同一份上游源码和运行时；同一时间只允许一个项目占用交互测试。用启动脚本中的项目标识及运行锁管理占用，跨项目测试前关闭上一实例。
4. 试验材料放在 `sandbox/dsh-desktop/test-workspaces/<项目名>/`。不要默认把 Agent 指向日用资料、其他项目或整块磁盘；不要从日用 DSH 自动复制凭据、会话和全部配置。
5. 插件通过沙箱脚本安装到沙箱的 `desktop` profile；不得用未限定 home 的全局 `dsh plugin add`，不得改变日用 DSH 的插件列表、PATH、文件关联或 `dsh://` 默认处理程序。
6. 上游版本固定记录在 [baseline.json](sandbox/dsh-desktop/baseline.json)。仅在用户明确选择新的生产 RC / 正式版后调整支持目标；届时保存当前基线和验证记录，关闭实例，核对官方来源，再执行构建、启动和插件兼容验证。2026-10-17 已按用户要求将先前 alpha 沙箱可恢复归档，RC 使用全新 home/userData，不将 alpha 数据降级加载到 RC。
7. 这是**开发隔离目录**，不是防恶意代码的 OS 安全边界。插件仍通过官方权限链访问文件和工具，不关闭系统防护或 TLS 校验。首次模型登录由用户在沙箱单独配置。

入口与命令见 [沙箱操作说明](sandbox/dsh-desktop/README.md)。真实验证状态以 [status.json](sandbox/dsh-desktop/status.json) 为准；下载、构建、启动、Host 就绪和模型调用分别记录，不能互相冒充。

## Git 与远端同步

每个项目只操作自己的仓库。阶段性修改先检查、提交，再推送对应远端；用户已要求 SourceDeck 后续 Git 更新同步到 GitHub。成功后核对本地 HEAD 与远端分支；推送失败时说明未同步的提交，不将本地提交说成已推送。禁止默认 force push、改写远端历史或创建不相关仓库。

GitHub CLI 使用系统凭据管理器，凭据不写入仓库、提示词或日志。自动执行环境若不能读取系统 keyring，应申请该条 GitHub/Git 命令的主机执行权限，不反复要求用户轮换 Token。沙箱账号创建的 Git 目录在主机运行时可能触发所有权检查；仅对准确的项目/上游目录使用进程级 `safe.directory`，不得设置全局 `*`。

## 必须遵守

所有后续项目先读取根 [AGENTS.md](AGENTS.md)，再读取项目自己的指令。项目设计、开发和验证在对应子目录执行；本根目录只维护跨项目约定和共享环境。任何对日用 DSH 的部署都需要用户另外明确指示，不能从“沙箱验证通过”推定可安装到日用环境。
