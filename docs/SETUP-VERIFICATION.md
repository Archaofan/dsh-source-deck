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

## 2026-10-17 夜-5：阶段 3/4/5 实现与验收（来源范围、模型链路、边界行为）

背景：用户要求继续阶段 3-5 直到验收；生产 Desktop 已由用户经 Codex 升级到 `0.2.1-rc.2`（与沙箱一致，见 `operations/production-upgrade-20261017/README.md`）。产品 `0.1.12`。未把插件安装到生产。

### 阶段 3（V7 来源范围配置）

| 项目 | 证据与结果 |
|---|---|
| 策略引擎 | `scope-policy.ts`：github/web/llm-freeform 三类；校验；`computeFlags`；`policySummary`。单元测试 8 例通过 |
| 操作/域 | `scope_policies` 表（键 `default`）；`getPolicy/setPolicy`；候选入库时算 `policyFlags`；`clearData` 覆盖六表。policy-ops 测试 5 例通过 |
| 全量测试 | `node --test tests/*.test.ts`：`tests 29 / pass 29 / fail 0` |
| 设置页 | 设置 → 资料台；编辑器加载默认 `minStars=500/6 个月/排除 fork/archived`；改为 800 保存后显示「已保存：GitHub · stars≥800 · 近6个月更新 · 排除 fork · 排除 archived」 |
| 策略落盘 | `home/storages/source_deck/scope_policies/default.json`：`{kind:'github',params:{minStars:800,updatedWithinMonths:6,excludeForks:true,excludeArchived:true},createdAt,updatedAt}` |
| 策略生效 | Agent 提交 `Bun`（78k stars, 2026-10）无标记；`Old Go Repo`（120 stars, 2024-01）域记录 `policyFlags:["stars-below","stale"]`；面板/卡片显示「星数不足」「久未更新」，仍可保留 |
| 改策略边界 | 单测 `a changed policy applies only to later candidates`：改策略前候选 flags 不重算，改后新候选按新策略标记 |
| 截图 | `logs/shots/stage3-policy/`（设置页、保存）、`stage3-4-model/`（卡片/面板标记） |

### 阶段 4（V3b 模型链路）

| 项目 | 证据与结果 |
|---|---|
| Agent 调工具 | 新会话提示后，助手序 19 包含 `tool-call deck_submit_sources` 及两个候选参数；工具返回后助手回复「已提交」 |
| 记录 | 会话日志 seq21/22 `set-snapshot`（含 policySummary 与 flags）、seq34 `selection-submitted`（kept:1 excluded:1） |
| 提交回传 | seq39 `user/message`：「用户已筛选资料集（共 2 条候选）：保留 1 条：1）《Bun》https://github.com/oven-sh/bun 排除 1 条：1）《Old Go Repo》…当前来源策略：GitHub · stars≥800…」 |
| 下一轮理解 | seq41 助手（turn 2）推理明确写「The user has kept Bun」，并基于 Bun 继续；随后向用户发问，已跳过 |
| UI | 面板显示策略条与两个标记；保留 Bun、排除 Old Go Repo，提交成功；卡片 DOM 文本「候选资料集 · 2 / 保留 1 · 排除 1 · 待处理 0 / 来源策略… / Bun 保留 / Old Go Repo 排除 星数不足 久未更新 / 在资料台打开」 |
| 截图 | `logs/shots/stage3-4-model/`（agent-card、agent-panel-flags、agent-submitted、chat-card） |

### 阶段 5（边界行为）

| 用例 | 证据与结果 |
|---|---|
| V4 重启恢复 | 停止后重启：卡片恢复为 `set-32881acd…`「候选资料集 · 2 / 保留 1 / 排除 1 / 策略 800 / 标记」；面板恢复同样内容。截图 `logs/shots/stage5-recovery/` |
| V5 多会话隔离 | 切换到「DSH插件机制资料继续」会话：面板仅 1 条（DSH 插件机制概述，保留）；切回「提交两个候选到 deck_submit_sources」：面板 2 条（Bun/Old Go Repo）。互不串数据。截图 `stage5-sessions/` |
| V6 清除数据 | 设置页点「清除资料台数据」（确认）→ 显示「已清除资料台数据。」；`storages/source_deck` 六张表文件数均为 0；会话日志保留。截图 `stage5-clear/` |
| V6 卸载/重装 | `Remove-Plugin.ps1` 卸载后：profile dependencies 为 null；启动后 composer 入口数 0、guide 无「资料筛选台」、无 deck body；重装 0.1.12 后入口数 1、deck body 恢复（empty） |
| V2 peer 负向 | 构造 peer `@deepseek-ai/dsh@0.2.0-rc.2` 的 `0.1.12-peer-old.tgz` 安装：CLI 拒绝「dsh-source-deck@0.1.12-peer-old is incompatible with dsh 0.2.1-rc.2: requirements {@deepseek-ai/dsh:0.2.0-rc.2}」并自动回滚 `package.json`/lockfile/node_modules；profile 保持 0.1.12 |
| 工具 | `Remove-Plugin.ps1`（沙箱脚本，加入 scripts 目录；不入项目 Git） |

## 2026-10-17 夜-6：UI / 默认配置 / 可用性迭代（产品 0.1.17）

背景：用户要求功能之外完善 UI、默认配置与舒适性，先调研高星项目的右侧面板实践再迭代。调研记录见 [research/2026-10-17-right-panel-ux-research.md](research/2026-10-17-right-panel-ux-research.md)（VS Code Views、Zotero 7 Item Pane、Plane side peek、Twenty side panel、Continue Chat、SiYuan/Obsidian/Logseq 右栏；星数经 GitHub API 核对）。

| 项目 | 证据与结果 |
|---|---|
| 默认策略 | `DEFAULT_POLICY` 改为 `llm-freeform`（指导语「优先官方文档、近期活跃的高星项目；排除营销与低质内容」）；GitHub 500★/6 月改为设置页预设。理由：不预设强门槛，避免新用户被误标记 |
| 面板结构 | 固定头部（进度条 + 策略 + 刷新）、过滤标签（全部/待处理/保留/排除 + 计数）、搜索、批量栏、可折叠添加表单、固定提交页脚、快捷键提示 |
| 交互 | 行内保留/排除/撤销；排除理由内联保存；6 秒撤销 toast；`全选当前` + 批量保留/排除；`K` 保留、`X` 排除、`U` 撤销、`/` 聚焦搜索、`Esc` 清空选择 |
| 空状态 | 标题 + 三步引导 + 直接可用的添加表单；加载时骨架屏 |
| 提交后 | 提交成功横幅；`继续筛选` 新建空集合（`newSet`），已提交集合不被继续修改；提交后再添加也自动新建集合 |
| 设置页 | 快速预设（GitHub 高星 / 官方文档优先 / LLM 自主 / 恢复默认）+ 标记图例；保存仍显式 |
| 卡片 | 每行内联保留/排除；决策后通过 set-snapshot 立即更新计数与行状态；仍保留「在资料台打开」 |

实测（0.1.17，沙箱 0.2.1-rc.2）：

```text
panel empty : 筛选 | 已处理 0 / 0 | LLM 自主… | 全部 0 待处理 0 保留 0 排除 0 |
              资料台已就绪 | 三步引导 | 加入候选
add x2      : 全部 2 / 待处理 2 / 保留 0 / 排除 0 | 全选当前 | 2 项
search Beta : 仅「示例文章 Beta」一行
K 键        : 保留 1 / 待处理 1；行显示「保留 | 撤销」
bulk keep   : 已处理 2 / 2 | 保留 2
exclude+reason: 示例文章 Beta | 排除 | 标题太泛 | 排除理由
toast undo  : 已更新《示例文章 Beta》→ 撤销 → 待处理 1
submit      : 提交给 Agent（2 条保留）→ 已提交，Agent 会收到筛选摘要。
continue    : 已处理 0 / 0（新集合），已选清空，显示空状态引导
settings    : 初始 kind=llm-freeform + guidance；GitHub 高星预设 → 500/6；
              保存 → 策略记录 minStars=500；恢复默认 → llm-freeform
card        : 「候选资料集 · 2 / 保留 0 / 待处理 2 / Gamma Docs / Delta Blog」；
              卡片内点「保留」→「保留 1 / 待处理 1」，Gamma 行变「保留 | 撤销」
tests       : 30 passed / 0 failed（新增 add-after-submission → 新集合）
截图        : logs/shots/ui-iteration/（panel-empty、panel-added、panel-bulk、
              panel-reason、panel-submitted、panel-016-*、settings-default、
              settings-github-saved、card-actions、card-after-keep）
```

已知未做（记录为后续）：入口按钮未读数 badge（需要新的订阅通道）、历史集合标签页、紧凑/舒适密度切换、长列表虚拟滚动、命令面板集成。

## 尚未验证

- **安装到生产 Desktop**：生产已升级到 `0.2.1-rc.2`，与产品 peer 匹配；但没有擅自安装，等待用户明确批准。安装走 App「设置 → 插件」或市场接口。
- **不带任何 LLM 凭据的 Desktop 启动**：仍未单独验证（当前启动均带沙箱 DeepSeek 凭据）。
- 停车后的正常菜单退出仍未验证（本轮为按记录 PID 的受控停止）。
- OS 安全隔离和全系统改动审计；本沙箱仅作开发目录与进程配置隔离。


## 接手

先读父目录 README.md / AGENTS.md、项目简报、VERSION-POLICY.md 与 HANDOFF.md。检查 Get-SandboxStatus.ps1、Start-Desktop.ps1 -CheckOnly 和 Git 同步状态；已通过的 RC 构建不必重复。方案必须以固定 RC 的真实公共接口为依据，资料和设计写入项目子目录，设计交用户审阅后再实现。

## 2026-10-17 夜-7：v2 LLM 搜索轮次 + 聊天联动（产品 0.2.0 → 0.2.5）

背景：用户验收 0.1.17 后明确要求“更简单、字体更大、不配站点/正则、由当前对话的 LLM 搜索并整理、GitHub 仓库直接出图标/简介/链接、勾叉与补充说明驱动下一轮、可跳过/填原因、收藏夹”，并追加“资料台必须和当前聊天联动，不能是独立窗口”。调研与决策见 [research/2026-10-17-chat-deck-linkage.md](research/2026-10-17-chat-deck-linkage.md) 与 [design/2026-10-17-solution-design.md §14](design/2026-10-17-solution-design.md)。

| 项目 | 证据与结果 |
|---|---|
| 首屏 | 0.2.0 沙箱实测：`资料台 | 收藏夹 | ↻ | 你想找什么？ | 直接说需求… | 示例 chips | 开始查找`；无站点/正则/策略配置 |
| 真实模型第一轮 | Go 日志库请求 → Agent 搜索并 `deck_submit_sources` → 6 条卡片，含 GitHub 头像 URL、简介、★25k/26k/13k、Go、打开链接 |
| 第二轮 | 勾选 2 条保留、排除 1 条并填原因、补充说明“只要 MIT/BSD，优先结构化日志” → `第 2 轮` 出现；Agent 用时 2 分 09 秒，提交 3 条新候选；旧 120 秒超时会误判并停止刷新，已放宽到 300 秒 |
| 卡片 | Rust 轮实测 6–7 条；`img.complete=true, naturalWidth=80`；卡片显示头像、描述、stars、语言、链接、☆ 收藏、✓ 保留、✕ 排除 |
| 跳过 | 排除后点「跳过」→ 候选记录 `verdict: "pending"`（可反悔，不进入保留/排除） |
| 原因 | 排除原因保存按钮 → 候选记录 `reason: "保存按钮测试-维护不活跃"`；下一轮 prompt 会带排除项与原因 |
| 收藏夹 | 收藏 smol 后打开收藏夹，显示 smol 与早前 zap；支持搜索、加入资料台、移除；重开仍在 |
| `/deck` | 输入 `/` 菜单出现「打开资料台 / deck / 把本轮对话的需求交给资料台搜索和筛选」；`/deck` + Enter 打开当前会话资料台 |
| 对话上下文 | Host 抽取最近对话写入 prompt；实测含 `用户：我在调研 Rust 异步运行时，偏好 tokio…`，且已过滤 `Current runtime context` / `Time sampled…` 等运行时噪声 |
| 对话卡片 | 卡片显示 `候选资料集 · 12 / 保留 1 / 待处理 11 / 第 2 轮 · 继续找 3 个类似的 Rust 异步运行时…`，与资料台共享状态 |
| 字体/布局 | 正文 13.5px、卡片标题 14px、轮次 13.5px；2 列自适应卡片网格 |
| 测试 | 35 passed / 0 failed（新增 rounds/favorites/conversation-context） |

```text
0.2.0 round1 : 6 cards (zap/logrus/zerolog/charmbracelet/tint/phuslu)
               avatars https://github.com/<owner>.png?size=80
0.2.0 round2 : note 只要 MIT/BSD，优先结构化日志 → 3 new candidates,
               completed in 2m09s (old poll stopped at 2m)
0.2.3 rust   : 6 cards, avatars naturalWidth=80
               exclude + reason → reason persisted
               skip → verdict pending
               favorite → 收藏夹 smol + zap
/deck        : menu row 打开资料台; Enter → data-deck-state=empty
context      : prompt includes 用户：我在调研 Rust… tokio; NOISE=false
card         : 第 2 轮 · 继续找 3 个类似的 Rust 异步运行…
tests        : 35 passed / 0 failed
截图          : logs/shots/deck-v2/（landing、round1、round1-decided、round2、
               favorites、round-rust、slash-menu、deck-from-command）
```

已知未做（后续）：`/deck <query>` 带参命令、模型主动 `deck_open` 工具（需要 Host→Client 推送通道）、把某条对话消息作为显式上下文附件、卡片内直接继续下一轮。


## 2026-10-18 夜-8：DSH 插件市场提交（dshmarket / awesome-dsh-plugin）

目标：让 SourceDeck 出现在 DSH Desktop 的插件市场，而不是只能本地 tgz 安装。

市场机制：安装的 `dshmarket`（1.66.28）读取精选目录 [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin) 生成的 `awesome-dsh-plugin.com/plugins.json`；收录 = 向该仓库 `data/plugins/` 提一个 YAML 条目的 PR。DSH 自带的实验性 Custom plugin markets 是另一套 index JSON，不用于这里。

| 项目 | 证据与结果 |
|---|---|
| 市场条目 | `data/plugins/Archaofan__dsh-source-deck.yml`，`url` 指向 `https://github.com/Archaofan/dsh-source-deck`，category `ui`，中英双语描述 |
| 仓库公开 | 原为 private；市场必须能读取，已改为 **public**；`gh api repos/Archaofan/dsh-source-deck --jq '.visibility'` → `public` |
| Topic | 添加 `dsh-plugin`、`deepseek-harness`、`dsh`、`plugin`、`ui` |
| 收录 PR | [awesome-dsh-plugin#7739](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/7739)，OPEN |
| PR check | SUCCESS（2026-10-17 13:23 UTC 完成，9m50s） |
| Submission gate | FAILURE，唯一原因：`repository is 0.4 days old (needs 1)` |
| 自动重跑 | gate 由 `regate.yml` 每 6 小时重跑；仓库创建于 2026-10-17 03:35:45 UTC，约 2026-10-18 11:35 北京时间满 1 天，之后自动转绿；不要关/重开或 force-push |
| 安全 | 公开前确认 Git 无凭据；`docs/security/2026-10-17-credential-exposure.md` 已脱敏（无账号标识/值）；沙箱、node_modules、tgz、日志不进 Git |
| 生产 | 未改动；生产 profile 仍为 0.1.17；市场收录不等于生产安装 |

当前结论：**已进入市场收录流程，尚未上架**。PR 合并后市场目录生成，通常一天内可搜到 `SourceDeck`；在此之前用本地 0.2.5 tgz。

复核命令：

```text
gh pr view 7739 --repo awesome-dsh-plugin/awesome-dsh-plugin --json state,statusCheckRollup
gh api repos/awesome-dsh-plugin/awesome-dsh-plugin/check-runs/<gate-id> --jq '{conclusion,output}'
gh api repos/Archaofan/dsh-source-deck --jq '{visibility,created_at,topics}'
```

详细记录见 [MARKETPLACE.md](MARKETPLACE.md)。


## 2026-10-18 夜-9：SourceDeck 0.3.0 开发者研究工作流

本节覆盖用户批准的 v3 设计、七项计划与当前会话执行。实现/交付分支 `feat/sourcedeck-v3`。先前夜-7 的“主会话执行搜索”和带参命令未实现等限制，已由本节替代。生产 Desktop/插件本轮未修改。

### 构建与交付

| 项目 | 证据 |
|---|---|
| 产品 | 0.3.0 |
| 精确基线 | DSH 0.2.1-rc.2、Cordis 4.0.5；上游 687f282e8625c6b8d11ff58211a90524be2e4317 |
| 自动测试 | `node --test tests/*.test.ts`：67 pass，0 fail |
| 构建 | `npm run build`：tsdown Host/Client + tsc 通过 |
| 静态差异 | `git diff --check` 通过 |
| 包内容 | npm dry-run + tar 核对 50 文件；含 Host/Client/types、自包含 SVG/PNG、zh/en locale；不含沙箱、缓存、node_modules、凭据 |
| Client 运行时 require | 仅 react、react/jsx-runtime、zod（固定 RC shell baseline） |
| 依赖 | 无新增依赖，无 pnpm-lock.yaml 图变化；离线 frozen 检查缺 registry metadata（binding-android-arm64），未关闭供应链策略，不能说该离线检查通过 |
| 产物 | `E:/DSH-Desktop-Plugin-Dev/dsh-source-deck/dsh-source-deck-0.3.0.tgz`（忽略，不进 Git） |
| SHA256 | `216AAD7303CE72DEFA0AA90FB16D7A7237A051CC99E17C9947275821BF2EA8C5` |
| 安装 | 仅官方沙箱 Install-Plugin.ps1；QA 同内容路径 `dsh-source-deck-0.3.0-verify-216aad73.tgz`，安装后 lib/index.js、lib/client.js、icon.svg、package.json 哈希与打包时构建相等 |
| 生产 | Desktop 0.2.1-rc.2、插件仍 0.1.17；0.3.0 未装生产 |

首次同版本安装回显 Already up to date，实际未更新。定位为本地同版本同路径缓存，改用内容哈希路径后逐文件核对成功。安装命令 exit 0 不单独作为产物更新证据。

### 真实 Host / 模型链路

官方开发 Desktop 启动成功，隔离 DSH_HOME/userData/APPDATA/LOCALAPPDATA/缓存/临时目录；仅启用 SourceDeck 外部插件及官方预设（团队/语音/自动授权/开发工具实验项关闭）。使用沙箱用户独立配置的 DeepSeek-V4.1-Flash High。原生窗口控制不可用时，通过该固定 RC 的实际 loopback Host 前端验收，**不是独立前端 mock**；不把这些结果表述为所有 Electron 原生系统行为已验收。

| 操作 | 观察结果 |
|---|---|
| `/deck <中文需求>` | 返回简短启动状态，打开对应资料集；裸 `/deck` 由 Host 命令路径处理，不调用研究模型（自动测试覆盖） |
| 普通中文“用资料台找适合 React 桌面应用的开源组件库，放到右侧比较…” | 模型调用 deck_search，新主题进入后台研究；主对话约5秒结束确认，可继续开发 |
| 真实仓库轮次 | 受管子会话提交 uber-go/zap、rs/zerolog；轮次 completed，候选2条；主对话没有内部搜索 user prompt |
| 图片 | zap 项目 Logo naturalWidth=290；zerolog owner 头像 naturalWidth=460；均加载成功。GitHub owner .png 路径此前有失败日志，因此“暂不可用”并非只能归因于模拟或没有实际调用 |
| metadata | 卡片显式展示 stars、代码推送、查询时间、GitHub API 来源。此次是模型查证后提交的快照，非 UI 自行刷新统计，不承诺永远实时 |
| 左右并行 | worker 运行期间，主模型约7秒完成独立 Go 日志接口/注入说明；已有候选可操作 |
| 停止隔离 | 第二轮启动后点击停止研究，主聊天停止生成按钮仍存在；右侧最终 cancelled，主模型继续完成约43秒的开发建议 |
| 补搜提示 | 需求/说明仅留子会话，左侧仅看到自己的开发提问与最终引用内容；没有新增内部补搜 user prompt |
| 筛选原因 | 原因输入后鼠标直接点排除，最终 reason 与 excluded 同时保留；改回 kept 正常；收藏/对比不改变 verdict |
| 引用 | 在已有中文开发草稿中插入 SourceDeck·2 标签，不自动发送；序列化含两真实URL、说明、metadata、筛选原因；主模型回答明确列出两URL并给建议 |
| @deck | 历史两条快照进入候选；点选后能续写开发说明，刷新后标签与续写均保留 |
| 历史定位 | 从第2轮对话卡打开原两仓库主题，未打开当前 React 新主题 |
| 冷恢复 | 重启后恢复原主会话，未恢复 worker 显示 interrupted / Host restarted，可继续查找；旧资料和筛选仍在 |
| 重复/空结果/超时/权限 | 运行中首批提交不判完成、全重复/0条完成、五分钟超时、错 worker/跨会话/迟到结果拒绝由自动测试覆盖；未将这些全部声称为新增真实模型场景 |
| 清除与投递 | 自动测试覆盖先停止研究再清除、可重新开始、不可变/失效引用、投递失败重试幂等；本轮未在 Host 删除整套历史数据 |

### 主题、布局与图标

| 场景 | 结果 |
|---|---|
| 深色与浅色，面板宽度约319/419px | 单列，根容器无横向溢出 |
| 深色与浅色，约639/899px | 双列，根容器无横向溢出；阈值按面板内容620px |
| 仓库头图 | 初测400px高图片超出112px头图区并拦截点击；修复后图片80px高，完整落在112px头图区，鼠标原因/收藏/对比恢复 |
| 状态保留 | 切宽/切主题不清除需求、说明、原因或对比选择；已提交 verdict 持久化；浏览器 sessionStorage 随 origin/生命周期而定，不承诺跨端口重启保留纯草稿 |
| 浅色设置 | select/option 前景 rgb(15,17,21)、背景 rgb(255,255,255)、color-scheme light |
| 深色设置 | 前景 rgb(249,250,251)、背景 rgb(35,35,36)、color-scheme dark；选中/禁用/焦点继承本地 Host token |
| 插件身份 | 安装列表显示自定义蓝青资料卡图标、SourceDeck·资料台及短中文描述；禁用后仍读取图标/名称，随后已恢复启用 |
| SVG/PNG | SVG自包含848 bytes，PNG256×256；真实安装页使用内嵌SVG，显示36px（原生Host控制），无远程图标请求 |

本地证据：`sandbox/dsh-desktop/test-workspaces/dsh-source-deck/v3-acceptance/`，含 width-matrix.json、deck-dark-900.jpg、deck-light-900.jpg、settings-light.jpg、settings-dark.jpg、installed-icon-light.jpg。截图/运行日志不进 Git。

### 独立审查与修复

一次完整独立审查发现四项 Important、无 Critical/Minor：终态竞态、迟到启动回包抢新主题、原因 blur 吞掉显式判定、并发 URL 去重。均先复现，再用逐 round/active/source 锁或候选队列修复。最终67测试全绿。最强审查席位遇额度限制，由可用模型完成独立审查，不冒称前者已审过。

真实 Host 另发现 scope-less tools.get 读不到继承 preset web 工具（补回归）；真实图片固有尺寸遮挡（以400px→80px测量验收）；历史浏览刷新时旧打开意图重放及 Host 丢失 tab 参数（补持久化消费与会话内定位回归）。没有改固定上游以适配。

### 明确未完成的原生验收与外部状态

- 当前浏览器控制未能改变真实 Electron 125% 缩放；快捷键未产生缩放，不能把等价 CSS 宽度当作原生125%已验收。
- 浏览器截图不包含 OS 的 select 弹出窗口；已确认真实 Host select/option 的深浅样式及键盘可用，但原生展开窗口仍需人工复核。
- 中文文本填写通过；真实 IME 正在组字、附件组合仅有抽象 draft/CAS 测试，未完成原生组合验收。
- 下午市场复核遇连接器传输失败、网页读取失败和 GitHub公开API限流；最后成功状态仍为10:43 open/旧年龄失败。不能声称已合并或已上架，未修改/关闭/重开 PR。

English summary: 0.3.0 keeps exact DSH RC peers and the eight-table domain, with 67 passing tests and a successful build/package check. Actual pinned Host checks covered command and natural-language background startup, real repository imagery/facts, concurrent parent work, worker-only cancellation, immutable references delivered with both URLs, history navigation, interruption recovery, and light/dark 320/420/640/900 width behavior. Native 125% zoom, OS popup rendering, real IME/attachment combinations, offline frozen policy metadata, and the afternoon marketplace state remain explicitly unverified. Production was untouched. The package SHA256 above is authoritative.

最终刷新复验：在当前 React 活动之外打开历史 Go 两仓库主题，填写需求/说明并选两项对比后刷新，仍为原主题、两项对比及原草稿。最终 tar 的 Client 与安装字节一致。额外发现重复构建时 CSS Modules 导出对象键顺序可能变化；仅排序这些映射即可证明重建与交付代码相同，其余内容无差异。该构建字节可重复性细节暂缓，不影响固定交付包哈希和已验收行为。

Final refresh check passed with historical topic, drafts, verdicts and both comparison choices retained. A deferred build detail is nondeterministic CSS export-map key order; the delivered tar equals installed bytes, and canonicalizing only these maps makes the fresh rebuild identical.


## 2026-10-18 交付补记：默认分支与生产安装包路径

用户后续要求同步Git/远端，并提供最新插件包绝对路径，准备自行在生产DSH安装。默认分支main从计划提交1043686快进至0.3.0源码交付388a39c，再提交本交接记录；原feature分支保留。源码未追加改动，67测试再次通过。生产未由Agent操作，安装后的实际状态未验收。

- 绝对路径：`E:\DSH-Desktop-Plugin-Dev\dsh-source-deck\dsh-source-deck-0.3.0.tgz`
- 包内版本0.3.0，精确支持DSH 0.2.1-rc.2；159706 bytes。
- SHA256：`216AAD7303CE72DEFA0AA90FB16D7A7237A051CC99E17C9947275821BF2EA8C5`。保留实际沙箱验收原包。

English: the user requested Git/remote synchronization and the absolute package path for their own production installation. Default main is fast-forwarded from1043686 to the tested0.3.0 source release388a39c, followed by this handoff note. The67 tests passed again; the unchanged sandbox-verified package path/version/size/hash are listed above. The agent has not modified production or confirmed post-installation state.
