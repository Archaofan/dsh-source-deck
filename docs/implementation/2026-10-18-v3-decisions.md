# v3 执行决策与代价（2026-10-18）

本文件同步执行 ledger 的 Ruling，便于交付后复核；不是新的产品设计。

1. 在唯一项目目录使用 feature 分支：遵守工作区单目录约定；代价是分支隔离不隔离用户可见文件。
2. 公共服务使用结构类型，不重复导入 Agent 核心运行时：保持真实对象身份与 Client 纯度；代价是公共服务形状需真实固定 RC 验收，不能只靠编译。
3. 命令注入 getStore，补 SidebarRightTabParamsMap：用于持久化打开意图与准确导航；代价是依赖固定 RC 导航协议，未来升级须复核。
4. 逐 store 锁、内容哈希快照身份、ctx.conversation.input：修复异步重试并使用实际公开草稿入口；代价是键级串行，快照按完整保留记录内容计算，等价资料变化可能新增快照。
5. 任务5/6视觉合并进打包后沙箱矩阵；最多四项比较、sessionStorage 保存各主题草稿，新查询证据替换旧metadata：避免反复验证半成品；代价是视觉缺陷稍后暴露，纯草稿不保证跨端口/浏览器生命周期保存。
6. 审查未判断的模型/IME/图片/主题，交由实际 Host 验证：结果与证据见夜-9；代价是不能把抽象草稿测试等同真实 IME 验收。
7. 同版本包采用不可变内容哈希 QA 路径：官方包管理器缓存相同路径；代价是沙箱依赖文件名与交付下载名不同，必须核对相同tar内容及安装字节。
8. 当前控制面无法完成原生125%/OS弹窗/IME与附件组合，保留计划未勾选并明确交付边界：核心实现有真实Host证据；代价是这些原生组合还需人工验收。
9. 离线 frozen 校验缺 registry metadata 时保留原lock及供应链策略：依赖图未变，不强行关闭策略；代价是此环境的离线可复现安装未证明。

独立审查没有提出待延后的 Minor；四项 Important 都已修复。验收另发现 CSS 导出映射键顺序的非确定性，暂缓构建字节稳定性优化；已证明固定交付包与安装字节一致，重建仅该顺序不同。额外真实 Host 缺陷也有回归/直接布局测量。用户已授权推送计划中的交付分支，因此沿用 feat/sourcedeck-v3，不另设集成审批。

English: decisions preserve the sole-directory feature branch, public structural APIs, durable typed navigation, keyed serialization and immutable hashed snapshots, one combined packaged visual matrix, explicit real-Host versus native acceptance boundaries, immutable QA tar paths, and the unchanged lock/policy under unavailable offline registry metadata. Costs are filesystem co-visibility, runtime API verification, RC navigation coupling, keyed serialization/extra snapshots, later visual discovery and sessionStorage lifetime, manual native acceptance, QA filename differences requiring byte checks, and unproven offline installation. No independent-review minors were deferred.
