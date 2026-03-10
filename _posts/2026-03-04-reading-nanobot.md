# Nanobot 深度分析总结

## 一、项目定位

**Nanobot** 是香港大学数据科学实验室 (HKUDS) 开源的一个**超轻量级个人 AI 助手框架**，灵感来自 OpenClaw/Clawdbot，但用约 **~4,000 行核心代码**实现了其 99% 的功能[[Nanobot GitHub]](https://github.com/HKUDS/nanobot)。它的设计哲学是"极简但完整"——一个 `config.json` + 一条命令就能启动一个支持多平台聊天、工具调用、持久化记忆、定时任务的 AI Agent。

---

## 二、整体架构

Nanobot 采用**消息总线 + Agent Loop** 的事件驱动架构，所有组件通过异步队列解耦：

```
┌──────────────────────────────────────────────────────────────────┐
│                     Chat Channels (10+)                          │
│  Telegram │ Discord │ WhatsApp │ Feishu │ Slack │ Email │ QQ ... │
└─────────────────────────┬────────────────────────────────────────┘
                          │ InboundMessage
                    ┌─────▼─────┐
                    │ MessageBus │  (asyncio.Queue × 2)
                    └─────┬─────┘
                          │
                    ┌─────▼─────┐
                    │ AgentLoop  │  ← 核心引擎
                    │            │
                    │  ┌─────────┤
                    │  │ Context  │ → System Prompt + Memory + Skills + History
                    │  ├─────────┤
                    │  │ LLM Call │ → Provider (OpenRouter/Anthropic/OpenAI/...)
                    │  ├─────────┤
                    │  │ Tools    │ → exec, read_file, web_search, spawn, cron...
                    │  ├─────────┤
                    │  │ Session  │ → JSONL 持久化对话历史
                    │  ├─────────┤
                    │  │ Memory   │ → MEMORY.md (长期) + HISTORY.md (可搜索日志)
                    │  └─────────┤
                    └─────┬─────┘
                          │ OutboundMessage
                    ┌─────▼─────┐
                    │ MessageBus │
                    └─────┬─────┘
                          │
              ┌───────────▼───────────┐
              │ Chat Channel.send()    │
              └────────────────────────┘
```

---

## 三、程序启动入口

Nanobot 的入口由 `pyproject.toml` 中一行配置决定：

```toml
[project.scripts]
nanobot = "nanobot.cli.commands:app"
```

无论执行 `nanobot agent`、`nanobot gateway` 还是 `nanobot onboard`，**一切都从 [`nanobot/cli/commands.py`](https://github.com/HKUDS/nanobot/blob/main/nanobot/cli/commands.py) 开始**——它是整个项目的**唯一入口文件**，使用 [Typer](https://typer.tiangolo.com/) 框架定义所有 CLI 命令。

---

## 四、两条核心执行链路

### 链路 A：`nanobot agent` — CLI 直接对话

适合学习核心 Agent 逻辑，最简单的执行路径：

```
nanobot agent -m "Hello"
│
▼ commands.py → agent() 函数
│
├─ 1. _load_runtime_config()          加载 ~/.nanobot/config.json
├─ 2. _make_provider(config)          创建 LLM Provider
├─ 3. AgentLoop(bus, provider, ...)   构造 Agent Loop 实例
│     └─ _register_default_tools()    注册 10 个内置工具
│
├─ [单消息模式] -m "Hello"
│   └─ agent_loop.process_direct("Hello")
│       ├─ _connect_mcp()                         懒加载 MCP 工具
│       ├─ _process_message(msg)                  处理消息
│       │   ├─ sessions.get_or_create(key)        获取/创建 Session
│       │   ├─ context.build_messages(...)         构建 prompt
│       │   ├─ _run_agent_loop(messages)           ★ 核心循环 ★
│       │   │   └─ while iteration < 40:
│       │   │       ├─ provider.chat(messages, tools)    调 LLM
│       │   │       ├─ if tool_calls → tools.execute()   执行工具
│       │   │       └─ else → return final_content       返回结果
│       │   ├─ _save_turn(session, messages)       保存对话
│       │   └─ return OutboundMessage
│       └─ 打印结果
```

### 链路 B：`nanobot gateway` — 多 Channel 网关模式

在链路 A 基础上增加 Channel 层和定时任务：

```
nanobot gateway
│
▼ commands.py → gateway() 函数
│
├─ CronService(store_path)                   创建定时任务服务
├─ AgentLoop(bus, provider, cron_service=cron, mcp_servers=...)
├─ ChannelManager(config, bus)               创建 Channel 管理器
├─ HeartbeatService(...)                     创建心跳服务
│
└─ asyncio.gather(
       agent.run(),              Agent Loop 消费 inbound 队列
       channels.start_all(),     所有 Channel 开始监听
   )
```

---

## 五、核心模块深度拆解

### 5.1 `agent/loop.py` — Agent Loop 核心引擎（~400 行）

整个系统的**大脑**，`AgentLoop` 类编排消息处理的全生命周期。

**核心循环 `_run_agent_loop()`：**

```python
while iteration < max_iterations (默认 40):
    1. 调用 LLM → provider.chat(messages, tools)
    2. if 有 tool_calls:
         执行工具 → tools.execute(name, args)
         将结果追加到 messages → 继续循环
    3. else:
         获取最终文本回复 → break
```

| 关键方法 | 作用 |
|---------|------|
| `run()` | 主事件循环，从 MessageBus 消费消息 |
| `_process_message()` | 构建 context → Agent Loop → 保存 session |
| `_run_agent_loop()` | 核心迭代：LLM ↔ 工具调用交替，最多 40 轮 |
| `_handle_stop()` | `/stop` 命令：取消所有运行中的 task 和 subagent |
| `_consolidate_memory()` | 未整合消息超阈值时触发 LLM 总结 → 写入 MEMORY.md |
| `_save_turn()` | 存入 Session，截断过长 tool result（500 字符），过滤 base64 |
| `process_direct()` | CLI / Cron 直接调用入口，不走 MessageBus |

**设计亮点：**

- **全局锁** `_processing_lock` 保证同一时间只处理一条消息
- `/new` 命令先归档未整合消息到 Memory 再清空 session
- 自动剥离 `<think>...</think>` 标签（兼容 DeepSeek-R1 等思考链模型）
- 工具调用中有 `on_progress` 回调实现流式打字效果

---

### 5.2 `agent/context.py` — Prompt 构建器（~180 行）

负责组装发给 LLM 的完整 messages 数组。

**System Prompt 层次结构：**

```
# nanobot 🐈 (identity + runtime info + workspace path + platform policy)
---
## AGENTS.md / SOUL.md / USER.md / TOOLS.md (bootstrap files)
---
# Memory (从 MEMORY.md 读取的长期记忆)
---
# Active Skills (always=true 的 skill 内容)
---
# Skills (所有 skill 的 XML 摘要列表)
```

**Messages 拼装：**

```json
[Runtime Context]\nCurrent Time: ...\nChannel: ...\n\n<用户消息>"}
]
```

**关键设计：**

- Runtime Context 与用户消息合并为一条 user message，避免部分 provider 拒绝连续同角色消息
- 多模态支持：图片以 base64 data URL 嵌入 `image_url` 块
- Bootstrap Files（`AGENTS.md`, `SOUL.md` 等）允许用户自定义 Agent 人格

---

### 5.3 `agent/memory.py` — 两层记忆系统（~130 行）

Nanobot 最精巧的设计之一：

| 层级 | 文件 | 用途 | 格式 |
|-----|------|------|------|
| **长期记忆** | `memory/MEMORY.md` | 持久化的关键事实、偏好、知识 | 自由 Markdown |
| **历史日志** | `memory/HISTORY.md` | 可 grep 搜索的时间线日志 | `[YYYY-MM-DD HH:MM] 摘要段落` |

**整合流程 `consolidate()`：**

```
unconsolidated 消息数 ≥ memory_window 时触发:
  1. 取出已过期的旧消息
  2. 构造 prompt：当前 MEMORY.md + 待整合对话
  3. 调用 LLM，强制其调用 save_memory 工具
  4. save_memory(history_entry, memory_update)
  5. 写入 HISTORY.md（追加）+ MEMORY.md（覆盖）
  6. 更新 session.last_consolidated 指针
```

**核心洞察：** Session 消息是 **append-only**（只增不删），通过 `last_consolidated` 指针标记已整合位置。这对 LLM 的 KV cache 非常友好——旧的 prompt prefix 不变，只追加新内容。

---

### 5.4 `agent/tools/` — 工具系统

**Tool 基类 (`base.py`, ~160 行)：**

```python
class Tool(ABC):
    name: str          # 工具名
    description: str   # 描述
    parameters: dict   # JSON Schema
    execute(**kwargs)   # 异步执行
    validate_params()   # Schema 验证
    cast_params()       # 类型自动转换
    to_schema()        # 转 OpenAI function calling 格式
```

**ToolRegistry (`registry.py`, ~60 行)：** `register()` / `unregister()` 动态注册；`execute()` 自动 cast → validate → execute → 错误追加 hint。

**内置工具一览（10 个）：**

| 工具 | 文件 | 功能 |
|-----|------|------|
| `exec` | `shell.py` | Shell 命令执行，内置安全守卫（deny rm -rf、fork bomb、dd 等） |
| `read_file` | `filesystem.py` | 读取文件 |
| `write_file` | `filesystem.py` | 写入文件 |
| `edit_file` | `filesystem.py` | 精确编辑（搜索/替换） |
| `list_dir` | `filesystem.py` | 列目录 |
| `web_search` | `web.py` | Brave Search API |
| `web_fetch` | `web.py` | 抓取网页内容 |
| `message` | `message.py` | 主动发消息到指定 channel/chat |
| `spawn` | `spawn.py` | 启动后台 subagent |
| `cron` | `cron.py` | 创建/管理定时任务 |

**MCP 扩展：** 支持通过 `config.json` 配置外部 MCP Server（Stdio 或 HTTP），自动发现注册为 Agent 工具。配置格式兼容 Claude Desktop / Cursor。

---

### 5.5 `agent/subagent.py` — 后台子 Agent（~190 行）

通过 `spawn` 工具启动的独立 Agent，在后台异步执行长任务：

- 独立 ToolRegistry（仅文件/Shell/Web 工具，无 message/spawn）
- 最多 15 轮迭代
- 完成后通过 MessageBus 发送 `system` 消息回主 Agent
- 支持按 session 批量取消（`/stop` 命令触发）

---

### 5.6 `bus/` — 消息总线（~50 行）

极简的异步事件系统：

```python
class MessageBus:
    inbound:  asyncio.Queue[InboundMessage]   # Channel → Agent
    outbound: asyncio.Queue[OutboundMessage]   # Agent → Channel
```

| 字段 | InboundMessage | OutboundMessage |
|------|---------------|-----------------|
| channel | telegram/discord/cli/system | 同左 |
| sender_id/chat_id | 用户标识 | 目标标识 |
| content | 用户消息 | Agent 回复 |
| media | 本地文件路径列表 | 同左 |
| session_key | `channel:chat_id` | — |

---

### 5.7 `session/manager.py` — 会话管理（~170 行）

- 每个 `channel:chat_id` 对应一个 Session
- JSONL 文件持久化（首行 metadata，后续消息）
- `get_history()` 只返回 `last_consolidated` 之后的消息，自动对齐 user turn
- 内存缓存 + 磁盘写入

---

### 5.8 `agent/skills.py` — 技能系统（~200 行）

Nanobot 的技能是**纯 Markdown 文件**（`SKILL.md`）。

**技能来源优先级：**

1. `workspace/skills/{name}/SKILL.md` — 用户自定义（最高）
2. `nanobot/skills/{name}/SKILL.md` — 内置技能

**加载策略（渐进式加载 Progressive Loading）：**

- 启动时仅加载 `always=true` 的技能全文
- 其余技能仅生成 XML 摘要（名称 + 描述 + 路径）
- Agent 按需通过 `read_file` 加载完整内容

---

### 5.9 `providers/` — LLM Provider 抽象层

**统一接口：**

```python
class LLMProvider(ABC):
    async chat(messages, tools, model, ...) -> LLMResponse

@dataclass
class LLMResponse:
    content: str | None          # 文本回复
    tool_calls: list[ToolCallRequest]  # 工具调用
    finish_reason: str           # stop / error
    reasoning_content: str       # 思考过程（DeepSeek-R1）
    thinking_blocks: list[dict]  # Anthropic 扩展思考
```

**支持 17+ Provider：**

| 类别 | Provider |
|------|---------|
| **聚合网关** | OpenRouter（推荐）、AIHubMix |
| **直连** | Anthropic、OpenAI、DeepSeek、Gemini、Groq |
| **国内** | Dashscope（通义千问）、Moonshot（Kimi）、Zhipu（智谱）、Volcengine（火山引擎）、SiliconFlow、MiniMax |
| **企业** | Azure OpenAI |
| **本地** | vLLM（任意 OpenAI 兼容服务器） |
| **OAuth** | OpenAI Codex、GitHub Copilot |
| **自定义** | Custom（任意 OpenAI 兼容端点） |

---

### 5.10 `channels/` — 聊天平台适配层

以 Telegram (`telegram.py`, ~500 行) 为代表：

- 继承 `BaseChannel`，实现 `start()` / `stop()` / `send()`
- Long Polling 模式，无需公网 IP
- Markdown → Telegram HTML 转换
- 语音消息自动转写（Groq Whisper）
- 图片/文件下载 → 本地存储 → 作为 media 传递
- 打字状态指示器（`typing...` 循环发送）
- 模拟流式输出（draft → persist）
- Media Group 缓冲聚合（多图合并为一条消息）
- 话题（Topic/Forum）作用域 Session

---

### 5.11 `cron/service.py` — 定时任务服务（~250 行）

| 调度模式 | 示例 | 说明 |
|---------|------|------|
| `at` | `atMs: 1709280000000` | 一次性定点执行 |
| `every` | `everyMs: 3600000` | 固定间隔循环 |
| `cron` | `expr: "0 9 * * *"` | 标准 cron 表达式（支持时区） |

- 持久化到 `cron/jobs.json`
- 自动检测外部修改（mtime 监控）并热重载
- Agent 可通过 `cron` 工具自主创建/管理定时任务

---

## 六、完整数据流示例

以 `nanobot agent -m "今天天气如何"` 为例：

```
用户输入 "今天天气如何"
    │
    ▼
cli/commands.py: agent() → process_direct("今天天气如何")
    │
    ▼
agent/loop.py: _process_message()
    │
    ├─ session/manager.py: get_or_create("cli:direct")    ← 加载历史
    │
    ├─ agent/context.py: build_messages()                  ← 构建 messages
    │   ├─ build_system_prompt()
    │   │   ├─ _get_identity()                 "You are nanobot..."
    │   │   ├─ _load_bootstrap_files()         AGENTS.md, SOUL.md...
    │   │   ├─ memory.get_memory_context()     MEMORY.md
    │   │   └─ skills.build_skills_summary()   <skills>...</skills>
    │   └─ 合并: [system, ...history, user(runtime_ctx + 用户消息)]
    │
    ├─ agent/loop.py: _run_agent_loop(messages)            ← 核心循环
    │   │
    │   ├─ 第 1 轮: provider.chat() → LLM 返回 tool_call: web_search("今天天气")
    │   │   └─ tools.execute("web_search", {...})
    │   │       └─ agent/tools/web.py: WebSearchTool.execute()
    │   │
    │   └─ 第 2 轮: provider.chat() → LLM 返回最终文本 "今天北京晴，25°C..."
    │
    ├─ agent/loop.py: _save_turn(session, messages)        ← 保存 Session
    │   └─ session/manager.py: save() → 写 JSONL 文件
    │
    └─ 返回 "今天北京晴，25°C..."
    │
    ▼
cli/commands.py: _print_agent_response() → Rich Markdown 渲染输出
```

---

## 七、最小核心阅读路线（5 文件理解 80%）

| 优先级 | 文件 | 行数 | 作用 |
|--------|------|------|------|
| ★★★ | [`cli/commands.py`](https://github.com/HKUDS/nanobot/blob/main/nanobot/cli/commands.py) | ~600 | **总入口**：`agent()` 和 `gateway()` 两个函数 |
| ★★★ | [`agent/loop.py`](https://github.com/HKUDS/nanobot/blob/main/nanobot/agent/loop.py) | ~400 | **核心引擎**：`_run_agent_loop()` 是灵魂 |
| ★★☆ | [`agent/context.py`](https://github.com/HKUDS/nanobot/blob/main/nanobot/agent/context.py) | ~180 | **Prompt 构建**：System Prompt + Memory + Skills |
| ★★☆ | [`agent/tools/registry.py`](https://github.com/HKUDS/nanobot/blob/main/nanobot/agent/tools/registry.py) | ~60 | **工具注册与执行**：register → validate → execute |
| ★☆☆ | [`agent/memory.py`](https://github.com/HKUDS/nanobot/blob/main/nanobot/agent/memory.py) | ~130 | **记忆整合**：LLM 自动摘要 → MEMORY.md |

**总计约 1,370 行**，读完即可理解整个 Nanobot 的运行机制。

---

## 八、关键设计理念总结

| 设计点 | 实现方式 |
|--------|---------|
| **极简架构** | 消息总线 + Agent Loop + Tool Registry，核心 ~4,000 行 |
| **完全解耦** | Channel ↔ Bus ↔ Agent 三层通过 asyncio.Queue 通信 |
| **渐进式记忆** | Session append-only + LLM 自动整合 → MEMORY.md + HISTORY.md |
| **Provider 无关** | 统一 `LLMProvider` 接口，17+ 后端可切换 |
| **安全守卫** | Shell 工具 deny pattern + workspace 沙箱 + Channel ACL |
| **Skill 即 Markdown** | 纯文本技能文件，Agent 按需 `read_file` 加载 |
| **MCP 原生支持** | 配置兼容 Claude Desktop / Cursor，自动发现注册 |
| **可组合** | Bootstrap Files + Skills + Memory 三层 prompt 叠加 |

---

## 九、与 ClawWork 的关系

ClawWork 的 `clawmode_integration/` 模块将经济生存系统**嫁接到 Nanobot** 上运行[[ClawWork GitHub]](https://github.com/HKUDS/ClawWork)：

| ClawWork 组件 | 对接 Nanobot 组件 |
|--------------|------------------|
| `ClawWorkAgentLoop` | 继承/包装 `AgentLoop` |
| `TrackedProvider` | 包装 `LLMProvider`，拦截每次调用扣费 |
| `TaskClassifier` | 使用 Nanobot 的 LLM 调用能力分类任务 |
| `/clawwork` 命令 | 通过 Nanobot 的 Skill 系统注册 |
