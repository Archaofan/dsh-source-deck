# 体验与性能优化实施记录（2026-10-19）

用户已批准[迭代提案](../design/2026-10-19-experience-iteration-proposal.md)并要求落地；在当前会话执行[计划](../superpowers/plans/2026-10-19-experience-optimization.md)。0.4.0 条件范围未启动。

## 0.3.1 阶段

- 完整读取串行、写后合并补读、活动约 2 秒、终态 30 秒；使用固定 RC 的 `useTabInfo().tab.visible`，结合文档可见性/收藏模式暂停。打开意图观察器未停用。
- 最近一次新鲜响应文本相同则复用对象；仍然每次请求 Host，不跳过网络或使用过期结果。单次分组、收藏查找、Intl 复用及对比每项一次格式化；不改 Host/八表/依赖。
- 测试 75/75、构建通过。新增 scheduler、JSON 与 projection 测试均先失败再通过。
- 纯格式化探针（同机器/输入）200 次 p50/p95 为 0.456/0.495ms；原始基线为 18.080/20.661ms。这只衡量格式化，不是 Electron/UI/INP 提速。
- 0.3.1 tgz SHA256：`1774BE246AE262C2F185C61BB6DB94E9461DA965A3A9E6906220D7EEB0568BD8`。通过官方脚本安装；安装 lib/index.js、lib/client.js、package.json 哈希与构建相同。
- 受限环境 npm 默认缓存写入失败后改用命令级沙箱缓存；官方启动遇 userInfo 限制，仅为启动命令申请主机执行。基线未改，生产未动。
- 固定 RC 实际 loopback Host 已验证手动加入六个真实来源、复用既有 metadata、保留两项/排除一项及回读；无新研究模型调用。截图留在沙箱 experience-acceptance。
- 改动前结果态 2 个 textarea；候选查询 zap→收藏查询 zerolog→返回后候选查询变为 zerolog，已真实复现，作为 0.3.2 验证依据。完整读取频次、隐藏场景和最终布局矩阵留到最终验收记录，不提前宣称通过。

English: the user approved implementation of the written proposal. The 0.3.1 milestone serializes/coalesces full reads and follows the pinned RC's real tab visibility, with two-second active and thirty-second idle cadence. Fresh identical payloads reuse object identity without skipping requests. Presentation work now reuses formatters, grouping and per-source comparison facts. All 75 tests and the build passed; package/installed hashes match. The isolated real Host verified a six-source manual screening task without new model calls. Pure formatter timings are not UI speedups. Real read-frequency/visibility and final layout acceptance are recorded separately after the UI batch. Production and the upstream baseline remain untouched.
