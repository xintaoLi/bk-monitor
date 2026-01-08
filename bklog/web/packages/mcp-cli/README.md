# MCP E2E 自动化测试 CLI

基于 **Chrome DevTools MCP + 大模型** 的自动化测试工具。

## 核心理念

本工具不直接操作浏览器，而是：
1. **分析项目** - 解析 Router 配置、提取页面组件
2. **生成 Test-ID** - 为交互元素注入 `data-testid`
3. **生成测试 Prompt** - 输出结构化的测试指令
4. **AI 执行** - 由 AI（如 CodeBuddy）调用 Chrome DevTools MCP 执行测试

## 安装

```bash
npm install @autotest/mcp-e2e
```

## 快速开始

### 1. 初始化 MCP 配置

```bash
npx mcp-e2e mcp:init
```

这会自动创建 `.codebuddy/mcp.json`，CodeBuddy 会自动识别并加载 chrome-devtools MCP 服务。

### 2. 生成测试 Rule

```bash
npx mcp-e2e router:generate --base-url http://localhost:8080
```

### 3. 在 CodeBuddy 中执行测试

生成完成后，有三种方式执行测试：

**方式一：使用 @file 引用（推荐）**
```
在 CodeBuddy 对话中输入：@.codebuddy/rules/<rule-id>-prompts.md
然后告诉 AI 执行其中的测试场景
```

**方式二：直接打开 Prompts 文件**
```
打开 .codebuddy/rules/<rule-id>-prompts.md
复制需要执行的测试 Prompt，发送给 CodeBuddy
```

**方式三：使用 CLI 命令**
```bash
npx mcp-e2e rule:run <rule-id> --base-url http://localhost:8080
```

## 命令列表

### MCP 环境命令

| 命令 | 说明 |
|------|------|
| `mcp:check` | 检查 Chrome DevTools MCP 环境 |
| `mcp:init` | 初始化 MCP 配置（写入 `.codebuddy/mcp.json`） |
| `mcp:connect` | 测试 MCP 连接 |

### Router 分析命令

| 命令 | 说明 |
|------|------|
| `router:analyze` | 分析 Router 配置 |
| `router:generate` | 生成 MCP 测试 Rule |
| `router:inject` | 注入 test-id |
| `router:full` | 完整工作流（分析 + 注入 + 生成） |

### Rule 执行命令

| 命令 | 说明 |
|------|------|
| `rule:run <ruleId>` | 执行 MCP Rule |

### Test-ID 命令

| 命令 | 说明 |
|------|------|
| `testid:analyze` | 分析并预览 test-id |
| `testid:inject` | 注入 test-id |
| `testid:mapping` | 查看映射表 |

### 变更影响分析命令

| 命令 | 说明 |
|------|------|
| `change:analyze` | 分析代码变更的影响范围 |
| `change:test` | 生成针对性测试文件（包含详细变更描述） |

### 影响预测命令（新增）

| 命令 | 说明 |
|------|------|
| `impact:predict` | 预测变更影响范围，生成 AI 分析 Prompt |
| `impact:analyze` | 基于 AST 深度分析变更影响 |
| `impact:test` | 生成可执行的影响测试 Prompt |
| `impact:full` | 完整影响分析流程（预测 + AST 分析 + 测试生成） |

## 生成文件

执行 `router:generate` 后会在 `.codebuddy/rules/` 目录生成：

```
.codebuddy/
├── mcp.json                          # MCP 服务配置（CodeBuddy 自动识别）
└── rules/
    ├── <rule-id>.json                # MCP Rule 定义
    ├── <rule-id>-prompts.md          # 测试 Prompts 汇总 ⭐
    └── testid-mapping.json           # Test-ID 映射
```

**重点文件**：`<rule-id>-prompts.md` 包含所有测试场景的 Prompt，可直接在 CodeBuddy 中引用执行。

## 工作流程

```
┌─────────────────┐
│   mcp:init      │  初始化 MCP 配置（首次使用）
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  router:analyze │  分析项目路由
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  router:inject  │  注入 test-id（可选）
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ router:generate │  生成 MCP Rule + Prompts
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ CodeBuddy 执行  │  引用 Prompts 文件，AI 调用 MCP 执行
└─────────────────┘
```

或使用一键命令：

```bash
npx mcp-e2e router:full --base-url http://localhost:8080
```

## 环境要求

- Node.js >= 18
- Chrome 浏览器
- CodeBuddy（或其他支持 MCP 的 AI 工具）

## License

MIT
