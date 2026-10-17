# 新对话接手提示词

将下面整段发送到新对话。建议让新对话的工作目录直接指向 E:/DSH-Desktop-Plugin-Dev/dsh-source-deck。

~~~text
继续 SourceDeck（dsh-source-deck / 资料筛选台）项目，先开始具体方案设计，不要直接实现。

工作区根目录：E:/DSH-Desktop-Plugin-Dev
项目目录：E:/DSH-Desktop-Plugin-Dev/dsh-source-deck
私有远端：https://github.com/Archaofan/dsh-source-deck
共用官方 Desktop 沙箱：E:/DSH-Desktop-Plugin-Dev/sandbox/dsh-desktop

先读取：
1. 工作区根 README.md 和 AGENTS.md；
2. 项目 README.md、AGENTS.md、docs/PROJECT-BRIEF.md；
3. docs/DEVELOPMENT.md、docs/SETUP-VERIFICATION.md；
4. sandbox/dsh-desktop/README.md、baseline.json、status.json；
5. docs/research/2026-10-17-reference-map.md。

名称、独立项目 Git 和私有 GitHub 仓库已确定，官方 Desktop 源码/运行时及隔离操作脚本已准备。先核对 Git 状态、远端同步和沙箱实际状态；不要重新建仓、完整重装或另建一个共享沙箱。当前没有插件产品代码、package.json 或已经批准的架构。

用户出于个人兴趣开发 AI / Agent 应用，明确选择“让 Agent 更好用的交互与功能插件”。不要再推荐控制、协议、嵌入式等职业专业工具；视频制作与审片也已挂起。

SourceDeck 必须做成 DeepSeek Harness 官方 Desktop 插件，有自己的 UI 控件，也能方便地在对话过程中使用。核心场景是：Agent 或用户带来一批资料，用户直接筛选，然后让 Agent 继续阅读、比较或排除。不要把收藏链接、自动搜索评分或普通文本列表当成完整方案。

这轮先做具体方案设计：优先查阅业界原始资料、现成 DSH 插件和沙箱中固定版本的官方接口，比较 2–3 种可落地方式，给出推荐理由。需要明确用户操作流程、对话内入口和自己的 UI、首版来源范围、资料/候选集/选择的身份与版本、重复项、持久化、Agent 接续、忙碌/取消/重启/多会话行为，以及首版验收。必要时给出可审阅草图。将设计写入本项目 docs/design/，让我审阅，再进入实现计划和开发。

所有插件安装和集成验证优先复用根目录共用沙箱，使用其脚本；不要修改日用 DSH 或自动复制它的账号、凭据、会话和配置。普通 npm CLI 不能管理 Desktop 托管 profile，须使用已准备的官方 Desktop 开发管理入口。共享沙箱一次只允许一个项目占用，测试材料使用 test-workspaces/dsh-source-deck。

后续项目修改完成必要检查后提交并推送对应远端，核对 HEAD 与 origin。GitHub CLI OAuth 已完成，凭据由系统 keyring 管理；受限 Agent 执行环境读不到 keyring 时申请该条命令的主机执行权限，不反复要求我重新设置 Token。不要上传沙箱、缓存、凭据或历史 Hindsight 摘录。

保持中文沟通，先结论后理由。已经授权的准备和必要调研直接推进，不重复询问是否可以读文件、查资料或检查沙箱。
~~~

本提示词描述的是前置准备后的工作入口；具体安装、启动和同步证据以 SETUP-VERIFICATION.md、沙箱 status.json 与实时检查为准。
