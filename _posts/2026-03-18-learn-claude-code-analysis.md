---
title: "learn-claude-code 源码分析 - 真正的 Agent Harness 工程"
date: 2026-03-18
tags: [源码分析, 开源项目, 技术深度, AI, Agent, Claude]
subtitle: "深入理解 learn-claude-code 的设计思路与实现细节"
---

# learn-claude-code 源码分析 - 真正的 Agent Harness 工程

## 1. 这个项目的核心功能是什么？

`learn-claude-code` 是一个教学仓库，它的核心目标是教会开发者如何构建 **Agent Harness**，而不是去 "开发 Agent" 本身。项目提出了一个革命性的观点：

**Agent 是模型，不是框架。不是提示词链。不是拖拽式工作流。**

这个仓库通过 12 个递进式的课程（s01-s12），从最简单的 Agent 循环开始，逐步添加工具、规划、子智能体、技能加载、上下文压缩、任务系统、后台任务、团队协作、团队协议、自治智能体，最终到 Worktree 任务隔离，完整展示了如何为 AI 模型构建一个可操作的工作环境。

**解决的问题：**
- 纠正了业界对 "Agent" 的误解 —— Agent 是模型本身，而不是外层的代码
- 提供了完整的 Harness 工程学习路径
- 展示了如何让模型在特定领域高效工作

**目标用户：**
- AI 应用开发者
- 想要理解 Agent 底层原理的工程师
- 希望构建自己的 Agent 系统的团队

## 2. 项目的主要功能和目标是什么？

### 主要功能：

1. **12 个递进式课程** - 从 s01 到 s12，每个课程添加一个 Harness 机制
2. **Python 参考实现** - 每个课程都有可运行的 Python 代码
3. **多语言文档** - 中文、英文、日文三种语言的详细文档
4. **交互式 Web 平台** - Next.js 构建的可视化学习平台
5. **完整的总纲实现** - `s_full.py` 将所有机制整合在一起

### 项目目标：

- **心智转换**：从 "开发 Agent" 转换到 "开发 Harness"
- **模式传递**：展示适用于任何领域的 Harness 工程通用原则
- **实践教学**：通过可运行的代码让学习者真正理解每个机制
- **生态建设**：配套提供 Kode Agent CLI 和 Kode Agent SDK

## 3. 代码的整体架构是怎样的？

### 核心架构模式：

```
Harness = Tools + Knowledge + Observation + Action Interfaces + Permissions
```

### 架构分层：

```
┌─────────────────────────────────────────────────────────────┐
│                        User Interface                         │
│                    (REPL / Web Platform)                      │
├─────────────────────────────────────────────────────────────┤
│                      Agent Loop (Core)                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  while stop_reason == "tool_use":                     │  │
│  │    response = LLM(messages, tools)                     │  │
│  │    execute tools                                        │  │
│  │    append results                                       │  │
│  └───────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                   Harness Mechanisms                          │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐  │
│  │  Tools   │  Skills  │  Tasks   │  Teams   │ Worktree │  │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘  │
├─────────────────────────────────────────────────────────────┤
│                    Execution Environment                      │
│               (Filesystem, Shell, Network, etc.)             │
└─────────────────────────────────────────────────────────────┘
```

### 设计模式：

1. **循环不变模式** - 核心的 agent_loop 始终不变，只是在其之上叠加机制
2. **工具派发模式** - 通过 dispatch map 将工具名映射到处理函数
3. **渐进增强模式** - 每个课程在前一个的基础上添加新功能，不破坏已有代码
4. **文件持久化模式** - 使用 JSONL 和文件系统来持久化任务、团队、邮箱等状态

## 4. 核心模块有哪些，各自职责是什么？

### 4.1 Agent 循环模块 (s01)

**职责**：提供最核心的 Agent 运行循环

**关键代码**：
```python
def agent_loop(messages: list):
    while True:
        response = client.messages.create(
            model=MODEL, system=SYSTEM, messages=messages,
            tools=TOOLS, max_tokens=8000,
        )
        messages.append({"role": "assistant", "content": response.content})
        if response.stop_reason != "tool_use":
            return
        # 执行工具并收集结果
        results = []
        for block in response.content:
            if block.type == "tool_use":
                output = run_bash(block.input["command"])
                results.append({"type": "tool_result", "tool_use_id": block.id,
                                "content": output})
        messages.append({"role": "user", "content": results})
```

### 4.2 工具使用模块 (s02)

**职责**：扩展工具集，提供文件读写等基础操作

**核心组件**：
- `TOOL_HANDLERS` - 工具派发映射
- `safe_path()` - 路径安全检查
- `run_read()` / `run_write()` / `run_edit()` - 文件操作
- `run_bash()` - Shell 执行

### 4.3 TodoWrite 模块 (s03)

**职责**：让 Agent 在动手前先制定计划

**核心思想**："没有计划的 agent 走哪算哪"

### 4.4 子智能体模块 (s04)

**职责**：将大任务拆分为小任务，每个子任务有干净的上下文

**关键设计**：每个子智能体使用独立的 messages[]，不污染主对话

### 4.5 技能加载模块 (s05)

**职责**：按需加载领域知识，不前置塞入 system prompt

**实现方式**：通过 tool_result 注入 SKILL.md 内容

### 4.6 上下文压缩模块 (s06)

**职责**：防止上下文窗口溢出，提供无限会话能力

**策略**：三层压缩策略

### 4.7 任务系统模块 (s07)

**职责**：将大目标拆分为小任务，排好序，持久化到磁盘

**核心**：文件持久化的任务图，为多 agent 协作打基础

### 4.8 后台任务模块 (s08)

**职责**：将慢操作丢到后台，让 agent 继续思考下一步

**实现**：守护线程 + 通知队列

### 4.9 智能体团队模块 (s09)

**职责**：支持多智能体协作，任务太大一个人干不完时可以分给队友

**核心**：持久化队友 + JSONL 邮箱

### 4.10 团队协议模块 (s10)

**职责**：定义队友之间的统一沟通规矩

**模式**：request-response 模式驱动所有协商

### 4.11 自治智能体模块 (s11)

**职责**：让智能体自动认领任务，不需要领导逐个分配

**机制**：空闲轮询 + 自动认领

### 4.12 Worktree 隔离模块 (s12)

**职责**：让每个智能体在自己的目录中工作，互不干扰

**设计**：任务管目标，worktree 管目录，按 ID 绑定

## 5. 使用了哪些关键技术栈和框架？

### 编程语言与库：
- **Python** - 主要实现语言
- **Anthropic SDK** - 与 Claude 模型交互
- **python-dotenv** - 环境变量管理
- **Next.js** - Web 学习平台（React 框架）

### 核心依赖（requirements.txt）：
```
anthropic>=0.25.0
python-dotenv>=1.0.0
```

### 技术选择的理由：
1. **Anthropic SDK** - 直接使用 Claude 的原生 API，展示最纯粹的 Agent 交互
2. **极简依赖** - 避免过度工程化，让学习者专注于核心概念
3. **文件系统持久化** - 使用 JSONL 和普通文件，不需要数据库，降低学习门槛
4. **Python + Next.js** - 覆盖后端逻辑和前端展示的全栈需求

## 6. 数据流是如何设计的？

### 核心数据流：

```
User Input
    │
    ▼
┌─────────────────────────────────────────┐
│         messages[] (对话历史)            │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│         LLM Call (Claude)               │
│  Input: messages + tools + system       │
└─────────────────────────────────────────┘
    │
    ├───────── stop_reason != "tool_use" ──────────► Return to User
    │
    ▼ (stop_reason == "tool_use")
┌─────────────────────────────────────────┐
│      Tool Dispatch & Execution           │
│  {tool_name: handler} mapping            │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│      Tool Results Collection             │
│  [tool_result, tool_result, ...]        │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│   Append to messages[] as user turn      │
└─────────────────────────────────────────┘
    │
    └───────────────── loop back ─────────────────────┘
```

### 关键数据结构：

1. **messages[]** - 对话历史，包含 user、assistant、tool_result 等角色
2. **Tool Schema** - 工具定义，包含 name、description、input_schema
3. **JSONL 格式** - 用于持久化任务、团队、邮箱等，支持 append-only
4. **Task Graph** - 任务依赖关系图

## 7. 如何处理错误和异常？

### 错误处理策略：

1. **危险命令拦截** - 在 `run_bash()` 中检查并阻止危险操作
   ```python
   dangerous = ["rm -rf /", "sudo", "shutdown", "reboot", "> /dev/"]
   if any(d in command for d in dangerous):
       return "Error: Dangerous command blocked"
   ```

2. **路径安全检查** - `safe_path()` 确保操作不会跳出工作目录
   ```python
   def safe_path(p: str) -> Path:
       path = (WORKDIR / p).resolve()
       if not path.is_relative_to(WORKDIR):
           raise ValueError(f"Path escapes workspace: {p}")
       return path
   ```

3. **超时处理** - Shell 命令设置 120 秒超时
   ```python
   try:
       r = subprocess.run(command, shell=True, cwd=WORKDIR,
                          capture_output=True, text=True, timeout=120)
   except subprocess.TimeoutExpired:
       return "Error: Timeout (120s)"
   ```

4. **优雅降级** - 工具执行错误时返回错误信息，而不是崩溃
   ```python
   try:
       text = safe_path(path).read_text()
       # ... 处理 ...
   except Exception as e:
       return f"Error: {e}"
   ```

## 8. 测试策略和覆盖率如何？

### 测试现状：
- 仓库中没有明显的测试目录
- 这是一个教学项目，重点在于可运行的示例代码
- 每个课程的代码都可以独立运行验证

### 如何运行示例：
```bash
pip install -r requirements.txt
cp .env.example .env   # 编辑填入 ANTHROPIC_API_KEY
python agents/s01_agent_loop.py       # 从这里开始
python agents/s12_worktree_task_isolation.py  # 完整递进终点
```

### CI/CD：
- 有 GitHub Actions 配置（.github/workflows/ci.yml）
- 包含类型检查和构建验证

## 9. 部署和运维方案是什么？

### 部署方式：

1. **本地运行** - 克隆仓库，安装依赖，设置环境变量即可运行
2. **Web 平台** - Next.js 应用，标准的前端部署流程
   ```bash
   cd web && npm install && npm run dev   # http://localhost:3000
   ```

### 配置管理：
- 使用 `.env` 文件管理 API 密钥等配置
- 提供 `.env.example` 作为模板

### 相关项目：
- **Kode Agent CLI** - `npm i -g @shareai-lab/kode`，生产级别的 Coding Agent CLI
- **Kode Agent SDK** - 可嵌入到应用中的 Agent SDK

## 10. 有哪些值得学习的代码实践？

### 优秀实践：

1. **循环不变设计** - 核心循环从未改变，只是叠加机制
   - 这让学习者可以清晰地看到每个新机制是如何添加的

2. **渐进式教学** - 每个课程只添加一个新概念
   - s01: 循环
   - s02: 工具
   - s03: 计划
   - ... 以此类推

3. **心智模型优先** - 每个课程都有清晰的格言（mantra）
   - s01: "One loop & Bash is all you need"
   - s02: "加一个工具, 只加一个 handler"
   - s03: "没有计划的 agent 走哪算哪"

4. **极简实现** - 每个课程都是自包含的、可运行的最小实现
   - 没有过度抽象
   - 没有复杂的依赖
   - 代码直接展示核心概念

5. **文件系统作为数据库** - 使用 JSONL 和普通文件持久化状态
   - 简单、透明、易调试
   - 支持 append-only，适合事件溯源

6. **多语言文档** - 中文、英文、日文三种语言
   - 降低了学习门槛
   - 扩大了受众范围

### 可以改进的地方：
- 增加单元测试
- 补充更多代码注释
- 提供更多实际应用示例

## 11. 项目的扩展性和维护性如何？

### 扩展性：

**优点：**
- 工具派发模式使得添加新工具非常容易
- 渐进式架构允许在不破坏现有代码的情况下添加新机制
- 文件系统持久化支持 append-only，易于扩展

**示例 - 添加新工具：**
```python
# 1. 添加工具定义到 TOOLS 数组
TOOLS.append({
    "name": "my_new_tool",
    "description": "What my tool does",
    "input_schema": {"type": "object", "properties": {...}, "required": [...]},
})

# 2. 添加处理函数
def run_my_new_tool(**kwargs):
    # 实现逻辑
    pass

# 3. 注册到派发映射
TOOL_HANDLERS["my_new_tool"] = lambda **kw: run_my_new_tool(**kw)
```

### 维护性：

**优点：**
- 每个课程都是独立的，易于理解和修改
- 代码结构清晰，命名规范
- 有完整的文档和注释
- 有活跃的社区维护（从 commit 历史可以看出）

**需要注意：**
- s_full.py 是所有机制的整合，代码较长（36KB），维护时需要小心
- 部分高级机制（s09-s12）比较复杂，需要深入理解

## 总结

`learn-claude-code` 是一个非常优秀的教学仓库，它不仅教会了我们如何构建 Agent Harness，更重要的是改变了我们对 Agent 的理解。

**核心启示：**
1. **Agent 是模型，不是代码** - 我们的工作是构建 Harness，而不是试图编码智能
2. **循环 + Bash 就是一切的开始** - 最简单的架构往往最强大
3. **渐进式设计** - 从简单开始，逐步添加功能
4. **信任模型** - 给模型提供工具和环境，然后让开

这个仓库的价值不仅在于代码本身，更在于它传递的思想。无论是想构建 AI Agent，还是想理解这个领域的底层原理，这都是一个不可多得的学习资源。

**推荐学习路径：**
1. 先读 README-zh.md，理解核心思想
2. 按顺序运行 s01 到 s12，每个课程都动手试一试
3. 阅读 docs/zh/ 下的文档，加深理解
4. 运行 s_full.py，看所有机制如何整合在一起
5. 探索姊妹项目 claw0，学习如何构建主动式常驻 Agent

---

**模型就是 Agent。代码是 Harness。造好 Harness，Agent 会完成剩下的。**

**Bash is all you need. Real agents are all the universe needs.**
