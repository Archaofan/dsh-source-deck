# 前置准备验证记录

日期：2026-10-17。当前有效基线是用户生产同版 **0.2.0-rc.2**，不再使用 alpha。交付仍限于项目、共用沙箱、操作约定与接手资料，未开始 SourceDeck 产品设计或实现。版本维护规则见 [VERSION-POLICY.md](VERSION-POLICY.md)。

## 当前 RC 的实测结果

| 项目 | 证据与结果 |
|---|---|
| 项目与远端 | dsh-source-deck 独立 Git，main 分支，私有远端 Archaofan/dsh-source-deck；修改检查后提交推送并核对 SHA，最新同步见沙箱 status.json |
| 官方基线 | tag dsh-v0.2.0-rc.2，commit 639ed015397290b3745d163aafe02ffee4aa3f84，与生产程序文件版本一致；官方源码未打包开发版 |
| 冻结安装 | RC 官方 pnpm 11.7.0；冻结 lockfile 安装通过，24.6 秒；官方脚本策略检查通过 |
| RC 官方完整构建 | pnpm run build 退出码 0；完成 native、Host compiler/bundle、Desktop bundle、Client compiler/bundle、Web；记录 347 个 Client artifacts。RC 不存在 alpha 的 build:artifacts / build:check，未套用它们的历史结果 |
| Desktop runtime | Electron 44.0.0 安装成功；primary-runtime manifest 的 desktopVersion 为 0.2.0-rc.2，Node 24.21.0 / Python 3.12.14 / pnpm 11.7.0；依赖检查和 Office 文档往返 smoke 通过 |
| 真实 Desktop / Host 启动 | Electron 主进程和 Host 成功运行；认证令牌交换 HTTP 303，携带内存中的会话 Cookie 后前端 HTTP 200，HTML 35,577 bytes |
| 同时运行隔离 | RC 默认 Host 端口 19387 与生产冲突；通过官方 webserver 配置 host=127.0.0.1、port=0 解决，实测沙箱监听 9580，生产 19387 仍由原进程 20816 监听。9580 是本次分配值，不应硬编码 |
| 默认工作区与状态 | 使用全新 RC home/userData；默认工作区实际位于 test-workspaces/dsh-source-deck/deepseek-harness/default-workspace；对应 session.v4.jsonl.zstd 只有头记录，0 个任务事件 |
| 版本与隔离防护 | Test-Sandbox.ps1 通过：接受当前生产 RC，拒绝 alpha / 生产版本不匹配，隔离路径、真实子进程环境、调用者环境还原、排他占用锁 |
| Desktop 插件管理 | 官方 runDesktopCli 的开发路径适配入口在 RC desktop profile 执行 list，退出码 0；尚无 SourceDeck 插件 |
| 生产观察 | 实际生产账号对照回退前保留的主机快照：三个配置文件、HKCU dsh 协议命令及用户 PATH 未变；生产版本仍为 0.2.0-rc.2，原日用进程仍运行。范围不等于全系统审计 |
| 收尾 | 确认测试会话无任务事件后，仅停止路径/userData 完全匹配的沙箱主进程 37912；Host 随断开清理，共享占用锁释放 |

当前日志位于沙箱 logs/：install.log、build.log、electron-install.log、primary-runtime.log、desktop.log、frontend-check.json、plugin-list.log、production-host-after.json、production-paths-after.json。日志可能含瞬时本地访问令牌，不纳入 Git、不上传。结构化当前状态见沙箱 status.json。

## 2026-10-17 下午：沙箱 LLM API 复用与启动链路修复（方案设计阶段）

背景：用户明确指示"沙箱内 desktop 的 API，直接用本 DSH 已配置的 DeepSeek API"（2026-10-17 原话）。这是对"不从日用 DSH 导入密钥"惯例的**用户授权例外**，仅限 DeepSeek 相关条目，最小化复制。

| 项目 | 证据与结果 |
|---|---|
| 沙箱凭据配置 | 从日用 `E:\DSH-Desktop\.dsh\.credentials.yaml` 仅提取 3 条 DeepSeek 相关条目（`refs.DEEPSEEK_API_KEY`、`records.deepseek-account-platform/default`、`records.deepseek-account-platform/device`），合并写入沙箱 `sandbox/dsh-desktop/home/.credentials.yaml`（写入前备份为 `.bak-<时间戳>`，权限 0600）。沙箱原有记录 `client-connection/browser-session` 保留。全程未输出任何凭据值；脚本见沙箱 tmp/gitpush/credential-sync.mjs（仅报键名与长度） |
| DeepSeek API 实际调用 | 用沙箱 key 打 `https://api.deepseek.com/v1/chat/completions`（deepseek-chat，max_tokens=1）：**HTTP 200**，返回 response id `e5899001-5cda-4383-9e59-ddf3740d6e5a`，model `deepseek-flash`，usage total 6 tokens。证明 key 有效、沙箱可完成真实模型调用 |
| 沙箱 Desktop 启动 | `Start-Desktop.ps1 -Project dsh-source-deck` 成功启动 Electron（pid 31740 主进程 + 31656 Host）；inspect 端口 19329/19322/19330 就位；日用 19387 仍由原进程 20816 监听，未受影响。GUI 地址由启动日志给出（本次 `dsh web: http://127.0.0.1:10138/?token=...`，端口动态分配、带本地访问令牌，401 属未带 token，非故障） |
| 凭据在 Desktop 内生效 | 启动日志中 `[deepseek-account]` 系列请求全部 200（`/auth-api/v0/users/current`、`/api/v0/users/get_user_summary`、`get_unnotified_bonuses`），证明沙箱 Desktop 已加载 DeepSeek 账号授权并成功调用 platform.deepseek.com |
| 启动链路修复 1 | `Assert-SandboxBaseline` 原来强制调用 `git`，本机无 git → 启动失败。改为 `Get-UpstreamCommit`：git 可用时用 git，否则回退解析 `.git/HEAD` 与 `packed-refs`。实测 upstream HEAD `639ed015397290b3745d163aafe02ffee4aa3f84` = baseline.commit，断言 PASS |
| 启动链路修复 2 | `start:desktop` 脚本嵌套调用 `pnpm`，沙箱 PATH 无 pnpm → 失败。按 pnpm 官方惯例在 `tools/pnpm-home/pnpm.cmd` 建 shim（转发到固定 pnpm 11.7.0），并在 `Push-SandboxEnvironment` 将 PNPM_HOME 加入进程 PATH。实测 `pnpm --version` → `11.7.0` |
| 编辑事故记录 | 用 edit 工具写 Common.ps1 时，一行中文注释曾造成 PowerShell 解析器行合并（报 `Unexpected token '}'`）；改为 ASCII 注释后正常。后续沙箱脚本注释一律用 ASCII |
| 验证后收尾 | 验证完成后按记录的沙箱 PID（31740/31656/41932/12508/10252，均校验命令行含 sandbox 路径）精确停止，日用 19387 进程 20816 未受影响；主进程退出码 -1 为被强杀的预期结果，启动阶段日志显示 Desktop 已稳定运行并通过 deepseek-account 链路 |

凭据事故（已按用户决定处置）：同日调试"脱敏"正则时一次失误把日用 `.credentials.yaml` 的多条真实密钥明文打印进对话记录（含 `DEEPSEEK_API_KEY`、`STEPFUN_API_KEY` 与 CODEARTS/TRAE/QODERCN/LOOMY 账号授权、`deepseek-account-platform`）。**用户 2026-10-17 明确决定不轮换，由我负责记录与后续纪律**；完整记录见 [security/2026-10-17-credential-exposure.md](security/2026-10-17-credential-exposure.md)（仅键名，无值）。暴露面仅限本机会话记录，未进任何仓库或沙箱文件。沙箱侧后续只做键级操作，不再输出任何值。

## 2026-10-17 傍晚：阶段 1 插件冒烟的安装链路（实现阶段 R1/V1）

背景：实现阶段开始（方案 A 已批准）。首次通过 `Install-Plugin.ps1` 把第三方插件包装进沙箱 desktop profile，暴露三处沙箱资产问题并修复；均在沙箱内、不进 Git、不碰日用安装。

| 项目 | 证据与结果 |
|---|---|
| 官方 CLI 的 pnpm 依赖 | desktop CLI 的 packageManager 硬编码 `<runtime>/pnpm/bin/pnpm.mjs`，沙箱未打包开发构建的 `upstream/apps/desktop/.desktop-build/targets/win-x64/runtime` 只有 bin/office-skills/primary-runtime。复制沙箱 `tools/pnpm-11.7.0/package` 到该 `runtime/pnpm` 后 `node .../pnpm.cjs --version` → `11.7.0`，`dsh plugin --profile desktop add/list` 恢复工作 |
| StrictMode 下 $LASTEXITCODE | `Invoke-SandboxPnpm`/`Invoke-SandboxDesktopCli`/`Get-UpstreamCommit` 在子进程未设置退出码时读 `$LASTEXITCODE` 抛错；调用前置 `$LASTEXITCODE = 0` 后正常 |
| 调用方 ErrorActionPreference=Stop | native command 的 stderr 行会变成终止错误导致启动脚本假失败；两个 Invoke 函数内置 `Continue` 并 finally 恢复原值。修复后 `Start-Desktop.ps1` 可重复成功启动 |
| 版本 bump 纪律 | pnpm 对相同 name@version 的 `file:` tgz 不替换已安装内容（第一次 0.1.0 重装无效）；必须 bump 版本再 pack/install。实测 0.1.1 后 profile 与 node_modules 一致 |
| 插件安装结果 | profile `dependencies` 增加 `dsh-source-deck: file:...tgz`，`dsh.profile.bundles` 增加 `dsh-source-deck`；官方 CLI add 输出 `Packages: +1` 与 list 表格 |
| 无密钥冒烟 | 阶段 1 验收不依赖 LLM 凭据；Desktop 启动后 guide 页出现插件入口、tab 打开、placeholder body 渲染（详见实现计划阶段 1 实测记录） |

## 2026-10-17 傍晚-2：新 RC 0.2.1-rc.1 发布与沙箱先行升级计划（实现阶段入口变更）

| 项目 | 证据与结果 |
|---|---|
| 新 RC 发布事实 | `npm view @deepseek-ai/dsh dist-tags`：`latest` = `0.2.0-rc.2`（生产在用）、`next` = `0.2.1-rc.1`、`alpha` = `0.2.1-alpha.5`；GitHub release `dsh-v0.2.1-rc.1`（prerelease）`published_at` = `2026-10-17T05:22:10Z`，为 0.2.1 系列首个 RC |
| 用户指示 | 沙箱先更新到新 RC，完成适配后再继续开发；生产用的 DSH（0.2.0-rc.2）不受影响。产品支持基线切换（peer 声明）留待用户另行明确选择 |
| 与插件开发相关的变更要点（release notes 摘录） | 自定义插件索引源；插件启用/停用/卸载及更新后依赖同步、启用热重载；实验性 Session 状态记录接口（插件写读自己的会话记录）；实验性 Claude Code Mods 兼容层；实验性开发者工具组合包；pi-ai 路由按模型能力处理系统提示词更新与工具动态增删；识别已发送消息中的密钥/令牌并默认脱敏按需查看 |
| 升级执行口径 | 沙箱 upstream 更新到 `dsh-v0.2.1-rc.1` 并更新 baseline.json（不绕过 Assert-SandboxBaseline、不静默升级共享基线）→ 官方构建 → 0.1.1 插件重装复验阶段 1 验收项 → 证据落 `sandbox/dsh-desktop/logs/shots/upgrade-0.2.1-rc.1/` 与本文档；步骤与决策点见 HANDOFF.md |
| 尚未验证 | 0.2.1-rc.1 沙箱升级本身及其对两步 tab 注册、dsh.client 装载链路、PLATFORM_MODULES 基线、clientBundle lazy-CJS 预设的影响；沙箱升级属开发环境，不改变产品 peer 声明与日用安装 |

## 2026-10-17 夜：沙箱升级到 0.2.1-rc.1（用户批准，仅开发环境）

背景：用户指示先把共用沙箱升级到新 RC、完成适配后再继续阶段 2；生产 DSH（0.2.0-rc.2）绝不动，产品 `peerDependencies` 在用户明确选择前不变。升级按沙箱 README 流程执行，未改上游产品源码，未碰日用安装。

| 项目 | 证据与结果 |
|---|---|
| 官方来源 | tag `dsh-v0.2.1-rc.1`，GitHub tag ref 指向 commit `1600d8a1e140dcde43a1a0941940a0480712c011`；release `published_at=2026-10-17T05:22:10Z`，`prerelease=true`。npm dist-tags 当时为 `latest=0.2.0-rc.2`、`next=0.2.1-rc.1`、`alpha=0.2.1-alpha.5` |
| 升级后新事实 | 稍后再次查询 npm：`next` 已变为 `0.2.1-rc.2`（同时存在 `0.2.1-rc.1`）。本次按用户指示固定在 rc.1，未再次升级；是否跟随属于用户决策（见 HANDOFF） |
| 源码取得 | 当时本会话 PATH 中没有 git（后确认 Hermes 自带 `git 2.54.0`，只是未加入 PATH），isomorphic-git shallow clone 两次在 pack 传输阶段被 `ECONNRESET`；改用官方源码包 `codeload.../tar.gz/refs/tags/dsh-v0.2.1-rc.1`（34,674,893 bytes，SHA-256 `F36815915141E36C1308B95BC92CA47B8557CCC059600D95709F8A8CAF21C610`） |
| 对象级校验 | 从 GitHub git data API 取 commit 与递归 tree，按官方 SHA 写入 16,248 个 blob、2,451 个 tree、1 个 commit 对象；全部哈希一致，commit 对象精确复现 `1600d8a…`（author/committer 时区 +0800），`.git/HEAD` 指向该 commit。`*.cmd` 按 `.gitattributes` 的 `eol=crlf` 导出形式还原为 LF blob 后通过校验 |
| 基线记录 | `baseline.json` 更新为 `version/tag=0.2.1-rc.1`、commit 上述、`pnpm=11.28.5`、`productionVersion=0.2.0-rc.2`、`sandboxRelation=ahead-of-production`，并记录 `upgradeApproval`（approvedBy=user、approvedOn=2026-10-17、productPeerUnchanged=0.2.0-rc.2）与来源校验字段；旧基线/日志/profile 清单归档于 `archives/rc-0.2.0-rc.2-20261017T080338Z/` |
| 基线断言适配 | `Assert-SandboxBaseline` 现在接受两种状态：沙箱与生产同版，或“明确记录用户批准、且 approval 逐项钉住版本”的沙箱先行版；alpha 与未记录批准的新版仍拒绝。`Test-Sandbox.ps1` 增加“无批准的更新版”负例并通过 |
| 退出码缺陷修复 | 原 `Invoke-SandboxPnpm`/`Invoke-SandboxDesktopCli` 在函数内先赋 `$LASTEXITCODE=0`，遮蔽了自动变量，导致子进程失败被当成成功（本轮首次 `Prepare-Desktop` 因此误报成功）。已改为读取 `$global:LASTEXITCODE`；Desktop CLI 的 `electron.exe` 是 GUI 子系统，改为 `Start-Process -Wait -PassThru` 读取退出码。实测失败命令现在抛出 `Command failed with exit 1` |
| 构建环境适配 | 0.2.1 的 client build 调用 `git rev-parse HEAD`。本会话 PATH 中没有 git；按上游支持的非 Git 构建路径，在沙箱进程环境注入 `DSH_CLIENT_COMMIT_HASH=<baseline.commit>`。`.dsh-build/client-build-environment.json` 实测 `{"DSH_CLIENT_COMMIT_HASH":"1600d8a","DSH_CLIENT_VERSION":"0.2.1-rc.1"}` |
| 工具链 | RC packageManager 变为 `pnpm@11.28.5`（沙箱已有该本地副本）；Electron 44.7.0；primary runtime Node 24.21.0 / Python 3.12.14 / pnpm 11.28.5。首次 `prepare:primary-runtime` 因 `fetch failed` 失败，复用旧基线已校验的下载缓存（锁文件版本一致）后成功，smoke 通过 |
| 官方构建 | `pnpm run build`（9 个 gate）：`9 passed, 0 failed, 0 skipped in 131.90s`；`build: recorded 323 client artifact(s) with 2 public value(s)`（旧基线为 347 artifacts）。构建记录 digest `cc7c5c9f…` |
| 0.1.1 安装（负向） | `Install-Plugin.ps1` 用 0.1.1（peer `0.2.0-rc.2`）安装：pnpm 显示 `Already up to date`，CLI 输出两条 `Plugin dsh-source-deck@0.1.1 is incompatible with dsh 0.2.1-rc.1: requirements {"@deepseek-ai/dsh":"0.2.0-rc.2"}`，并提示 `it stays installed but profile startup denies it until you grant an exemption`。启动后 guide 无「资料筛选台」入口，旧布局中遗留的「资料台」标签显示“这类内容还没有可用的查看方式” |
| 适配测试包（仅沙箱） | 在 `sandbox/dsh-desktop/tmp/adapt-plugin` 以同一份 `src/` 构建 `0.1.2-adapt.1`：peer 改 `0.2.1-rc.1`、cordis 改 `4.0.5`，产物 `.tgz` 放项目目录（`*.tgz` 被 Git 忽略）。产品 `package.json` 未改（仍 `0.1.1` / peer `0.2.0-rc.2`）。安装退出码 0，profile 依赖指向该 tgz，`dsh.profile.bundles` 保留 `dsh-source-deck` |
| 阶段 1 复验（新 RC） | 启动日志含 `dsh web: http://127.0.0.1:12649/?token=…`（端口动态）；guide 页文本 `开始 \| 资料筛选台 \| 收集候选资料，逐条筛选后交回 Agent \| …`；点击入口后 `data-deck-state="placeholder"`，正文「资料台已就绪 \| 候选资料会出现在这里。Agent 提交或手动添加后即可筛选。」；tab chip 文本「资料台」。截图 `logs/shots/upgrade-0.2.1-rc.1/`（desktop-right-sidebar.png、deck-tab-open.png、deck-tab-chip.png；不进 Git） |
| 适配结论 | 逐项见 [research/2026-10-17-0.2.1-rc.2-interface-delta.md](research/2026-10-17-0.2.1-rc.2-interface-delta.md)：两步 tab 注册、`dsh.client`/bundle patch 装载、lazy-CJS 预设、工具/Remote/存储/会话事件接口均成立；兼容门改为 `engines.dsh` 优先、`PLATFORM_MODULES` 新增 `zod` 与 `@tanstack/react-virtual`、cordis 升 4.0.5、pnpm/Electron 升级 |
| 未受影响 | 日用 DSH 19387 未启动/重启；未运行 `dsh plugin --profile desktop`；产品 peer 声明与版本未改；沙箱升级未进 Git |

## 2026-10-17 夜-2：沙箱再升级到 0.2.1-rc.2（用户指示“升级沙箱中的内容，确保适配新版本”）

背景：rc.1 工作完成后，用户要求把沙箱内容升级到新版本。确认 GitHub tag `dsh-v0.2.1-rc.2` 存在（commit `687f282e8625c6b8d11ff58211a90524be2e4317`，release `published_at=2026-10-17T08:16:33Z`，npm `next` 指向它），且工具链与 rc.1 相同。

| 项目 | 证据与结果 |
|---|---|
| 真实 git | 本机 git 位于 `C:\Users\Administrator\AppData\Local\hermes\git\cmd\git.exe`（Hermes 自带，`git version 2.54.0.windows.1`），只是未加入本会话 PATH。之前“本机无 git”的结论只对本会话 PATH 成立，已在各文档更正 |
| 源码更新 | 用真实 git 对 upstream 执行 `fetch --depth 1 origin refs/tags/dsh-v0.2.1-rc.2` 成功，`checkout --detach` 后 `git status --short` 为空、`git rev-parse HEAD` = `687f282…`。同时 `git reset` 为 rc.1 重建的仓库补了 index，`git status` 复核工作树与官方 commit 一致 |
| 基线记录 | `baseline.json` 更新为 `dsh-v0.2.1-rc.2` / `687f282…` / `releasePublishedAtUtc=2026-10-17T08:16:33Z`，`upgradeApproval.sandboxVersion=0.2.1-rc.2`，`priorSandboxArchiveRelative=archives/rc-0.2.1-rc.1-20261017T090812Z`；rc.1 的 baseline/status/日志/脚本/profile 清单已归档 |
| 工具链 | 与 rc.1 相同：pnpm 11.28.5、Electron 44.7.0、primary runtime Node 24.21.0 / Python 3.12.14；复用已校验的下载缓存，未新增下载 |
| 官方构建 | `pnpm run build`：`9 passed, 0 failed, 0 skipped in 75.00s`；`build: recorded 325 client artifact(s) with 2 public value(s)`；构建记录 `{"DSH_CLIENT_COMMIT_HASH":"687f282","DSH_CLIENT_VERSION":"0.2.1-rc.2"}`，digest `cf3a2784…` |
| rc.1 适配包处置 | profile 中的 `0.1.2-adapt.1`（peer 0.2.1-rc.1）在 rc.2 下不兼容，按版本 bump 纪律换装新构建 `0.1.3-adapt.1`（peer 0.2.1-rc.2、cordis 4.0.5、devDependencies 全部 `0.2.1-rc.2`）。安装退出码 0，无兼容警告 |
| 阶段 1 复验（rc.2） | guide 页含 `开始 \| 资料筛选台 \| 收集候选资料，逐条筛选后交回 Agent \| …`；点击入口后 `data-deck-state="placeholder"`、正文「资料台已就绪 \| 候选资料会出现在这里。Agent 提交或手动添加后即可筛选。」；tab strip 含「资料台」。截图 `logs/shots/upgrade-0.2.1-rc.2/`（3 张；不进 Git） |
| 未受影响 | 日用 DSH 19387 未启动/重启；`dsh plugin --profile desktop` 未运行；产品 `package.json` 当时仍 `0.1.1` / peer `0.2.0-rc.2`（夜-3 已切换）；上游产品源码未改 |

## 2026-10-17 夜-3：产品 peer 切换到 0.2.1-rc.2（用户决定）

用户指示：“产品 peerDependencies 切换到最新基线。”

| 项目 | 证据与结果 |
|---|---|
| 清单变更 | `package.json`：`version 0.1.1 → 0.1.2`；`peerDependencies` = `@deepseek-ai/dsh@0.2.1-rc.2`、`@deepseek-ai/cordis@4.0.5`（精确）；devDependencies 的 9 个官方 Client 包全部 `0.2.1-rc.2`，cordis `4.0.5`。`pnpm-lock.yaml` 同步更新 |
| 依赖安装 | 沙箱 pnpm 11.28.5：`Done in 8.7s`（复用 store） |
| 构建 | `tsdown` + `tsc` 均退出码 0；`lib/client.js` 首行仍为 `window.__ModuleLoader__.load({`；`npm pack` 产出 `dsh-source-deck-0.1.2.tgz`（6,713 bytes） |
| 沙箱安装 | `Install-Plugin.ps1` 装入 0.1.2（替换 `0.1.3-adapt.1`），退出码 0，无兼容警告；profile 依赖指向 `dsh-source-deck-0.1.2.tgz` |
| 阶段 1 复验 | 启动后 guide 含 `资料筛选台`（5 个匹配节点），点击入口后 `data-deck-state="placeholder"`、正文「资料台已就绪 \| 候选资料会出现在这里。Agent 提交或手动添加后即可筛选。」。截图 `logs/shots/peer-switch-0.1.2/`（desktop-right-sidebar.png、deck-tab-open.png；不进 Git） |
| 已知后果 | 生产 Desktop 仍 `0.2.0-rc.2`；精确 peer `0.2.1-rc.2` 的 0.1.2 在生产升级前不会被其加载。用户已明确选择该基线；未做宽范围或双版本兼容 |
| 未受影响 | 日用 DSH 19387 未启动/重启；沙箱升级、适配包与测试产物不入 Git；上游产品源码未改 |

## 2026-10-17 夜-4：阶段 2（V3a 无模型链路）实现与验收

背景：按已批准方案 A 实现 `source_deck` 域、`deck_submit_sources` 工具、自建 Remote、log-only 会话记录与资料台 UI。验证环境为沙箱 `0.2.1-rc.2`（开发先行基线），产品版本 `0.1.11`。

| 项目 | 证据与结果 |
|---|---|
| Host 数据层 | `source_deck` 五表（per-record）；单元测试 `node --test`：dedupe 7 例 + ops 9 例，`pass 16 / fail 0` |
| Remote | 单 `request(op, bodyJson)` namespace `sourceDeck`；`addSource/getActiveSet/getSet/decide/commitSelection/clearData` 分派；手写 Typert 贡献 + 协议同款原型 marker（tsdown 不降级装饰器） |
| 工具 | `deck_submit_sources` 注册成功；会话日志 `request/header`（seq17）的工具目录包含 `deck_submit_sources`，证明模型可见 |
| 会话记录 | 日志 seq4/seq6 `plugin:dsh-source-deck/set-snapshot`、seq5 `candidate-decided`、seq7 `selection-submitted`，均 `ignorable:true`；解压 25 个 zstd frame 后核对 |
| 面板流程 | CDP 驱动：初始 empty（3 个输入）→ 添加后待处理 1 → 保留后 保留 1 → 提交显示「已提交，Agent 会收到筛选摘要。」 |
| 域记录 | `sets.set-…` status=submitted；`candidates.cand-…` verdict=kept、decidedAt；`selections.sel-…` kept=[cand-…]；`sources.src-…` dedupeKey=`url:https://example.com/dsh-plugin-guide`（utm 已剥离） |
| 回传 Agent | seq13 `user/message` 文本为「用户已筛选资料集（共 1 条候选）：保留 1 条：1）《DSH 插件机制概述》…请基于保留资料继续。」；来源为 `session.prompt` queue |
| 对话卡片 | 会话内 `[data-deck-card=set-…]` 渲染「候选资料集 · 1 / 保留 1 · 排除 0 · 待处理 0 / DSH 插件机制概述 / 在资料台打开」；点击后资料台 `data-deck-state=ready` |
| 输入区入口 | composer 存在按钮「资料台」（aria「资料筛选台」）；关闭资料台后点击入口，`data-deck-state` 由 null 变为 ready |
| 截图 | `logs/shots/stage2-panel/`（添加、已提交）、`logs/shots/stage2-card/`（卡片、卡片打开资料台）、`logs/shots/stage2-final/`（最终卡片与面板）；均不进 Git |
| 未受影响 | 日用 DSH 19387 未启动/重启；产品 peer 仍 `0.2.1-rc.2`；未做模型链路专项验收（属阶段 4 / V3b） |

## 尚未验证

- **生产 Desktop 升级到 0.2.1-rc.2**：未进行，也不在本次范围内；在升级前 0.1.x 不会在日用环境加载。
- **带模型的完整筛选链路（V3b）**：未做专项验收；本轮提交后 `session.prompt` 会唤醒 Agent，属设计内的“提交即唤醒”，但未验证 Agent 后续正确引用保留资料。
- **不带任何 LLM 凭据的 Desktop 启动**：仍未单独验证（当前启动均带沙箱 DeepSeek 凭据）；阶段 5 附加验证。
- 停车后的正常菜单退出仍未验证（本轮为按记录 PID 的受控停止）。
- OS 安全隔离和全系统改动审计；本沙箱仅作开发目录与进程配置隔离。


## 接手

先读父目录 README.md / AGENTS.md、项目简报、VERSION-POLICY.md 与 HANDOFF.md。检查 Get-SandboxStatus.ps1、Start-Desktop.ps1 -CheckOnly 和 Git 同步状态；已通过的 RC 构建不必重复。方案必须以固定 RC 的真实公共接口为依据，资料和设计写入项目子目录，设计交用户审阅后再实现。
