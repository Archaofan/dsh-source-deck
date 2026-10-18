# SourceDeck 项目约定

同时遵守父目录 README.md、AGENTS.md。唯一项目目录为 `E:/DSH-Desktop-Plugin-Dev/dsh-source-deck`，远端 `https://github.com/Archaofan/dsh-source-deck.git`。

## 当前状态（2026-10-18）

用户已批准 v3 设计、七项实施计划及当前会话执行，并要求落地后推送 Git；不再要求重复评审。用户随后要求同步 Git 与远端并提供生产安装包，已将 0.3.0 交付快进到 `main`；原交付分支 `feat/sourcedeck-v3` 保留。交付记录见 [验收](docs/SETUP-VERIFICATION.md) 夜-9、[交接](docs/HANDOFF.md)。旧版本/设计提案说明不能覆盖当前实现。

- 保留八表与旧数据。研究绑定 parent/set/round/worker/request；终态和来源去重有并发锁。
- 官方 managed spawn 子会话后台研究，继承主模型策略，仅允许 web_search/web_fetch/deck_submit_sources。左右独立；取消只停止对应 worker，清除数据先停止研究。
- `/deck query` 启动，裸 `/deck` 打开；自然语言通过 deck_search。活动定向打开且避免旧回包抢主题和刷新重放。
- 双列卡片按面板宽度 <620px 自动单列；真实图/Logo→owner 头像→字标；stars、代码推送、查询时间和来源分列。最多四项对比，支持收藏、原因和筛选。
- 主按钮插入不可变资料引用，保留正文/附件，不自动发送；支持 @deck。次要直接摘要采用幂等投递确认。提交集合只读。
- 完整局部主题 token、设置 select/option、自包含图标和中英 metadata。
- 自动测试现为 67 项；最终命令结果及真实 Host 范围以夜-9记录为准。独立审查四项 Important 已复现修复；实际 Host 又发现并修复工具作用域、图片遮挡和活动重放。

## 固定环境与权限

产品 peer 精确 `@deepseek-ai/dsh@0.2.1-rc.2`、Cordis `4.0.5`；上游 commit `687f282e8625c6b8d11ff58211a90524be2e4317`。不得升级基线、使用 alpha API 或改上游产品源码。

全部安装只用共享 `sandbox/dsh-desktop/scripts/Install-Plugin.ps1`，启动只用 Start-Desktop.ps1，隔离 DSH_HOME/userData/APPDATA/LOCALAPPDATA/缓存/临时目录。先检查 baseline/status/实时 lease，一次一个项目。测试材料限本项目 test-workspaces。停止进程前核对准确 PID、路径和隔离 userData，不按名称批量结束。

生产 Desktop 为 0.2.1-rc.2；插件最后确认版本为 0.1.17。用户已要求提供 0.3.0 安装包绝对路径，拟自行在生产安装；本 Agent 未操作生产或验收安装后的状态。不导入生产配置或凭据，不输出 bootstrap token/API key。

开发同版本本地 tgz 会被包管理器缓存；沙箱验证使用内容哈希路径，经官方脚本安装后核对 lib 字节。交付包仍为 dsh-source-deck-0.3.0.tgz，哈希见夜-9。

## 验证与同步

- 真实 Host 已覆盖带参命令、自然语言、模型并行、停止隔离、仓库结果、引用发送、重启中断与深浅宽度矩阵。
- 当前控制端无法完成 Electron 原生 125% 缩放、OS 原生展开菜单截图及真实中文 IME/附件组合的完整验收；不能把 DOM/抽象草稿测试说成这些都已通过。
- 没有新增依赖或 lock 图变化；离线 frozen 校验缺少 registry metadata，明确记录，不能禁用供应链策略绕过。
- [市场 PR #7739](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/7739) 最新确认仍停留在10:43 open/年龄 gate 失败；下午复核受连接器和 API 限流阻断。不能声称已上架，不关/重开/force-push。见 docs/MARKETPLACE.md。
- 中文默认、英文同步。检查后提交并推送本项目交付分支，核对 HEAD 与 origin 一致；失败记 pending。
- Git 使用进程级 safe.directory；不改全局配置或关闭 TLS。沙箱、node_modules、tgz、日志、缓存、凭据和个人记忆摘录不提交。
