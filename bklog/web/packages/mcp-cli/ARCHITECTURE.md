# MCP-CLI 自动工具架构设计

## 1. 系统概述

### 1.1 核心理念

MCP-CLI 是一个基于 **Chrome DevTools MCP + 大模型** 的自动化测试工具。其核心设计理念是：

- **不直接操作浏览器**：工具本身不包含浏览器控制逻辑
- **生成结构化 Prompt**：将测试意图转换为 AI 可理解的指令
- **AI 执行测试**：由 AI Agent（如 CodeBuddy）调用 Chrome DevTools MCP 执行测试
- **自进化能力**：通过规则引擎实现失败反馈和规则自学习

### 1.2 技术栈

- **语言**: TypeScript
- **框架**: Commander.js (CLI)
- **AST 解析**: ts-morph
- **MCP 协议**: Chrome DevTools MCP
- **文件系统**: fs-extra
- **Git 集成**: simple-git

### 1.3 系统边界

```
┌─────────────────────────────────────────────────────────┐
│                    MCP-CLI 工具层                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │  分析器   │  │  生成器   │  │  执行器   │           │
│  └──────────┘  └──────────┘  └──────────┘           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │ 规则引擎  │  │ Promote  │  │ 任务管理  │           │
│  └──────────┘  └──────────┘  └──────────┘           │
└─────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   项目代码库     │  │  Chrome DevTools│  │   AI Agent      │
│  (Router/组件)   │  │      MCP        │  │  (CodeBuddy)    │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

## 2. 架构分层

### 2.1 命令层 (Commands)

**位置**: `src/index.ts`

负责 CLI 命令的定义和路由，使用 Commander.js 框架。

**主要命令分类**：

1. **MCP 环境命令**
   - `mcp:check` - 检查 Chrome DevTools MCP 环境
   - `mcp:init` - 初始化 MCP 配置
   - `mcp:connect` - 测试 MCP 连接

2. **Router 分析命令**
   - `router:analyze` - 分析 Router 配置
   - `router:generate` - 生成 MCP 测试 Rule
   - `router:inject` - 注入 test-id
   - `router:full` - 完整工作流

3. **Rule 执行命令**
   - `rule:run` - 执行 MCP Rule

4. **Test-ID 命令**
   - `testid:analyze` - 分析并预览 test-id
   - `testid:inject` - 注入 test-id
   - `testid:mapping` - 查看映射表

5. **变更影响分析命令**
   - `change:analyze` - 分析代码变更的影响范围
   - `change:test` - 生成针对性测试文件

6. **影响预测命令**
   - `impact:predict` - 预测变更影响范围
   - `impact:analyze` - 基于 AST 深度分析
   - `impact:test` - 生成可执行的影响测试 Prompt
   - `impact:full` - 完整影响分析流程

7. **自动执行命令**
   - `test:run` - 自动执行 MCP 测试
   - `test:run-prompt` - 从 Prompt 文件自动执行

### 2.2 分析器层 (Analyzers)

**位置**: `src/analyzer/`

负责项目结构分析和代码理解。

#### 2.2.1 Router 分析器 (`router-analyzer.ts`)

**功能**：
- 解析 Vue Router / React Router 配置
- 提取路由路径、组件映射、元数据
- 识别页面组件和业务容器
- 分析交互元素（按钮、输入框、链接等）

**输出**：
```typescript
interface RouterAnalysisResult {
  framework: 'vue-router' | 'react-router' | 'unknown';
  routerFilePath: string;
  routes: RouteConfig[];
  flatRoutes: FlatRoute[];
  pageComponents: PageComponent[];
  layoutComponents: string[];
  guards: GuardInfo[];
}
```

#### 2.2.2 变更分析器 (`change-analyzer.ts`)

**功能**：
- 分析 Git 变更文件
- 识别受影响的路由和组件
- 评估变更影响范围（小范围/大范围）
- 计算风险等级

#### 2.2.3 变更详情分析器 (`change-detail-analyzer.ts`)

**功能**：
- 获取详细的代码变更（行号、函数名等）
- 分析受影响的函数和组件
- 提取变更上下文

#### 2.2.4 AST 影响分析器 (`ast-impact-analyzer.ts`)

**功能**：
- 基于 AST 分析函数调用链
- 构建组件依赖树
- 识别副作用
- 生成测试路径建议

#### 2.2.5 影响预测器 (`impact-predictor.ts`)

**功能**：
- 预测变更影响范围
- 评估风险等级
- 生成影响摘要

#### 2.2.6 依赖图分析器 (`dependencyGraph.ts`)

**功能**：
- 构建项目依赖图
- 分析组件依赖关系
- 识别影响传播路径

#### 2.2.7 项目分析器 (`project.ts`)

**功能**：
- 项目结构分析
- 框架检测
- 配置文件识别

### 2.3 生成器层 (Generators)

**位置**: `src/generator/`

负责生成测试规则、Prompt 和执行脚本。

#### 2.3.1 DevTools MCP Rule 生成器 (`devtools-mcp-rule.ts`)

**功能**：
- 基于 Router 分析结果生成 MCP Rule
- 生成自然语言测试 Prompt
- 生成结构化测试步骤
- 输出 Test-ID 映射表

**输出格式**：
```typescript
interface DevToolsMCPRule {
  id: string;
  name: string;
  projectContext: {
    framework: string;
    baseUrl: string;
    routes: RouteDescription[];
    testIdMapping: TestIdMapping[];
  };
  scenarios: TestScenario[];
  mcpConfig: {
    headless: boolean;
    viewport: string;
    timeout: number;
  };
}
```

#### 2.3.2 变更测试生成器 (`change-test-generator.ts`)

**功能**：
- 基于变更分析生成针对性测试
- 包含详细的变更描述
- 生成可执行的测试 Prompt

#### 2.3.3 影响 Prompt 生成器 (`impact-prompt-generator.ts`)

**功能**：
- 生成 AI 分析 Prompt（模式一）
- 生成 AST 详细分析 Prompt（模式二）
- 生成可执行测试 Prompt（模式三）

#### 2.3.4 Flow 模板生成器 (`flowTemplate.ts`, `flowWriter.ts`)

**功能**：
- 生成测试流程模板
- 写入 Flow 文件

### 2.4 执行器层 (Runtime Executors)

**位置**: `src/runtime/`

负责测试执行和运行时管理。

#### 2.4.1 MCP 自动执行器 (`mcp-auto-executor.ts`)

**核心功能**：
- 直接调用 Chrome DevTools MCP 执行测试
- 解析 Prompt 文本为测试步骤
- 执行测试场景并收集结果
- 生成测试报告

**工作流程**：
```
Prompt 文本 → 解析为 TestStep[] → 调用 MCP 工具 → 执行步骤 → 收集结果
```

**支持的步骤类型**：
- `navigate` - 导航到 URL
- `click` - 点击元素
- `type` - 输入文本
- `wait` - 等待元素
- `screenshot` - 截图
- `assert` - 断言验证
- `hover` - 悬停
- `select` - 选择选项
- `scroll` - 滚动
- `delay` - 延迟

#### 2.4.2 DevTools MCP 执行器 (`devtools-mcp-executor.ts`)

**功能**：
- 执行 MCP Rule JSON 文件
- 生成 CodeBuddy 脚本
- 生成 MCP 命令脚本
- 保存执行报告

#### 2.4.3 CLI 测试执行器 (`cli-test-executor.ts`)

**功能**：
- 从命令行执行测试
- 加载测试配置
- 生成测试 Prompt 文件

#### 2.4.4 集成测试执行器 (`integrated-test-executor.ts`)

**功能**：
- 集成多种执行方式
- 统一执行接口

#### 2.4.5 任务执行器 (`task-executor.ts`)

**功能**：
- 执行 Runtime Task
- 验证前置条件
- 检查 Signal（代替断言）
- 失败分类

**Signal 类型**：
- `dom-visible` - DOM 元素可见
- `dom-hidden` - DOM 元素隐藏
- `route-match` - 路由匹配
- `network-idle` - 网络空闲
- `no-error-toast` - 无错误提示
- `api-success` - API 成功
- `state-match` - 状态匹配

### 2.5 规则引擎层 (Rule Engine)

**位置**: `src/runtime/rule-engine.ts`

**核心功能**：
- 失败反馈处理
- 规则自学习
- 权重管理
- 组件记忆

**工作流程**：
```
测试失败 → 查找适用规则 → 执行学习动作 → 更新规则权重
```

**学习动作类型**：
- `infer-alternative-selector` - 推断备选选择器
- `extend-timeout` - 延长超时时间
- `try-alternative-route` - 尝试备选路由

**规则结构**：
```typescript
interface Rule {
  id: string;
  name: string;
  enabled: boolean;
  scope: 'global' | 'route' | 'component' | 'signal';
  onFailure?: Outcome['reason'];
  learn?: LearningAction;
  weight: number;
  confidence: number;
}
```

### 2.6 Promote 引擎层

**位置**: `src/runtime/promote-engine.ts`

**核心功能**：
- 评估测试决策是否应该被 Promote
- 将成功的测试决策提升为资产
- 管理 Promote 历史记录

**Promote 条件**：
- 任务必须成功
- 任务置信度达到阈值
- 规则置信度达到阈值
- 连续成功次数达到要求

**Promoted Asset 结构**：
```typescript
interface PromotedAsset {
  id: string;
  intent: string;
  steps: RuntimeTask['steps'];
  scope: 'regression' | 'smoke' | 'critical';
  derivedFrom: {
    taskId: string;
    confidence: number;
    successCount: number;
  };
  metadata: {
    createdAt: string;
    totalRuns: number;
    successRuns: number;
    failureRuns: number;
  };
}
```

### 2.7 CodeBuddy 集成层

**位置**: `src/codebuddy/`

负责与 CodeBuddy 的集成。

#### 2.7.1 Test-ID 注入器 (`testid-injector.ts`, `router-testid-injector.ts`)

**功能**：
- 为组件注入 `data-testid` 属性
- 生成 Test-ID 映射表
- 支持预览模式（dry-run）

#### 2.7.2 变更影响分析器 (`change-impact-analyzer.ts`)

**功能**：
- 分析变更对测试的影响
- 生成测试建议

#### 2.7.3 项目分析规则 (`project-analyzer-rule.ts`)

**功能**：
- 定义项目分析规则
- 生成分析报告

#### 2.7.4 任务管理 (`tasks.ts`)

**功能**：
- 管理 CodeBuddy 任务
- 定义默认任务
- 任务触发条件配置

#### 2.7.5 Promote (`promote.ts`)

**功能**：
- Promote 操作集成
- 资产管理

#### 2.7.6 规则定义 (`rules.ts`)

**功能**：
- 定义测试规则
- 规则配置管理

### 2.8 MCP 客户端层

**位置**: `src/mcp/`

#### 2.8.1 Chrome DevTools MCP (`chrome-devtools-mcp.ts`)

**功能**：
- 连接 Chrome DevTools MCP 服务器
- 封装 MCP 工具调用
- 浏览器操作封装

**主要方法**：
- `connect()` - 连接 MCP 服务器
- `navigate(url)` - 导航到 URL
- `click(selector)` - 点击元素
- `type(selector, text)` - 输入文本
- `waitForSelector(selector)` - 等待元素
- `screenshot(path)` - 截图
- `evaluate(script)` - 执行脚本
- `isVisible(selector)` - 检查元素可见性

#### 2.8.2 智能选择器 (`smart-selector.ts`)

**功能**：
- 智能元素定位
- 选择器策略管理

### 2.9 选择器层

**位置**: `src/selectors/`

#### 2.9.1 React 选择器 (`reactSelector.ts`)

**功能**：
- React 组件选择器生成
- React 特定元素定位

#### 2.9.2 Vue 选择器 (`vueSelector.ts`)

**功能**：
- Vue 组件选择器生成
- Vue 特定元素定位

### 2.10 工具层 (Utils)

**位置**: `src/utils/`

#### 2.10.1 文件系统工具 (`fs.ts`)

**功能**：
- 文件操作封装
- 目录管理

#### 2.10.2 Git 工具 (`git.ts`)

**功能**：
- Git 操作封装
- 变更检测

#### 2.10.3 日志工具 (`log.ts`)

**功能**：
- 统一日志输出
- 格式化日志

#### 2.10.4 Prompt 工具 (`prompt.ts`)

**功能**：
- 交互式提示
- 用户输入处理

## 3. 数据流

### 3.1 完整工作流

```
┌─────────────────┐
│  项目代码库      │
│  (Router/组件)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Router 分析器   │
│  - 解析路由配置  │
│  - 提取组件信息  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Test-ID 注入器   │
│  - 注入 data-testid│
│  - 生成映射表    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Rule 生成器     │
│  - 生成测试场景  │
│  - 生成 Prompt   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  MCP 执行器      │
│  - 解析 Prompt   │
│  - 调用 MCP 工具 │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  规则引擎        │
│  - 失败反馈      │
│  - 规则学习      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Promote 引擎    │
│  - 评估决策      │
│  - 提升资产      │
└─────────────────┘
```

### 3.2 变更影响分析流程

```
┌─────────────────┐
│  Git 变更检测    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  变更分析器      │
│  - 识别变更文件  │
│  - 分析影响范围  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  AST 影响分析器  │
│  - 调用链分析    │
│  - 组件依赖树    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  测试生成器      │
│  - 生成针对性测试│
│  - 包含变更详情  │
└─────────────────┘
```

## 4. 核心设计模式

### 4.1 策略模式

- **选择器策略**：不同框架使用不同的选择器生成策略
- **学习策略**：规则引擎支持多种学习动作策略

### 4.2 模板方法模式

- **执行流程**：统一的测试执行流程模板
- **生成流程**：统一的 Rule 生成流程模板

### 4.3 观察者模式

- **规则引擎**：监听测试失败事件，触发学习动作
- **Promote 引擎**：监听测试成功事件，评估是否 Promote

### 4.4 工厂模式

- **执行器工厂**：根据配置创建不同的执行器
- **选择器工厂**：根据框架类型创建不同的选择器

## 5. 扩展点

### 5.1 自定义分析器

可以通过实现 `Analyzer` 接口添加自定义分析器。

### 5.2 自定义生成器

可以通过实现 `Generator` 接口添加自定义生成器。

### 5.3 自定义执行器

可以通过实现 `Executor` 接口添加自定义执行器。

### 5.4 自定义规则

可以通过配置文件添加自定义规则。

## 6. 配置管理

### 6.1 MCP 配置

**位置**: `.codebuddy/mcp.json`

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["chrome-devtools-mcp@latest"],
      "env": {}
    }
  }
}
```

### 6.2 Rule 配置

**位置**: `.codebuddy/rules/<rule-id>.json`

包含完整的 MCP Rule 定义。

### 6.3 规则引擎配置

**位置**: `.codebuddy/rules.json`

包含规则定义和权重信息。

### 6.4 Promote 配置

**位置**: `.codebuddy/promote.json`

包含 Promote 条件和输出配置。

## 7. 错误处理

### 7.1 分层错误处理

- **命令层**：捕获并显示用户友好的错误信息
- **执行器层**：捕获执行错误，分类失败原因
- **规则引擎层**：处理失败反馈，触发学习动作

### 7.2 失败分类

- `selector-not-found` - 选择器未找到
- `timeout` - 超时
- `navigation-failed` - 导航失败
- `script-error` - 脚本错误
- `unexpected-route` - 意外路由

## 8. 性能优化

### 8.1 缓存机制

- AST 解析结果缓存
- 路由分析结果缓存
- 依赖图缓存

### 8.2 并行处理

- 多路由并行分析
- 多场景并行执行（可选）

### 8.3 增量分析

- 只分析变更文件
- 增量更新依赖图

## 9. 安全考虑

### 9.1 代码注入防护

- 所有用户输入都经过验证
- 脚本执行使用沙箱环境

### 9.2 文件系统安全

- 限制文件操作范围
- 验证文件路径

### 9.3 MCP 通信安全

- 验证 MCP 服务器身份
- 加密通信（如果支持）

## 10. 未来扩展方向

### 10.1 多框架支持

- 支持更多前端框架（Angular、Svelte 等）
- 支持更多路由库

### 10.2 AI 增强

- 更智能的选择器推断
- 更准确的变更影响预测
- 自动测试用例生成

### 10.3 可视化

- 测试执行可视化
- 依赖图可视化
- 变更影响可视化

### 10.4 集成扩展

- CI/CD 集成
- 测试报告集成
- 监控告警集成
