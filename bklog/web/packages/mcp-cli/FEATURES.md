# MCP-CLI 自动工具功能设计说明

## 1. 功能概述

MCP-CLI 提供了一套完整的自动化测试工具链，从项目分析到测试执行，再到规则学习和资产提升，形成了闭环的自动化测试体系。

## 2. 核心功能模块

### 2.1 项目分析功能

#### 2.1.1 Router 配置分析

**功能描述**：
自动识别并解析项目中的路由配置文件，提取路由信息、组件映射和页面结构。

**支持框架**：
- Vue Router
- React Router

**分析内容**：
- 路由路径和嵌套结构
- 页面组件映射
- Layout 组件识别
- 路由守卫提取
- 路由元数据解析

**输出结果**：
```typescript
{
  framework: 'vue-router' | 'react-router',
  routerFilePath: string,
  routes: RouteConfig[],
  flatRoutes: FlatRoute[],
  pageComponents: PageComponent[],
  layoutComponents: string[],
  guards: GuardInfo[]
}
```

**使用场景**：
- 初始化项目测试配置
- 生成测试规则前的准备工作
- 了解项目路由结构

**命令**：
```bash
mcp-e2e router:analyze
```

#### 2.1.2 页面组件分析

**功能描述**：
深度分析页面组件，识别交互元素（按钮、输入框、链接等），为测试用例生成提供基础。

**分析内容**：
- 组件类型识别（页面/布局/容器/组件）
- 交互元素提取
- 现有 Test-ID 检测
- Test-ID 建议生成

**输出结果**：
```typescript
{
  name: string,
  path: string,
  route: string,
  type: 'page' | 'layout' | 'container' | 'widget',
  interactiveElements: InteractiveElementInfo[],
  existingTestIds: string[],
  suggestedTestIds: TestIdSuggestion[]
}
```

**使用场景**：
- 了解页面交互元素
- 评估 Test-ID 覆盖率
- 生成测试用例

#### 2.1.3 依赖图分析

**功能描述**：
构建项目的组件依赖图，分析组件间的依赖关系，用于影响范围分析。

**分析内容**：
- 组件导入关系
- 组件依赖链
- 影响传播路径

**使用场景**：
- 变更影响分析
- 测试范围确定
- 重构风险评估

### 2.2 Test-ID 管理功能

#### 2.2.1 Test-ID 注入

**功能描述**：
为页面组件中的交互元素自动注入 `data-testid` 属性，提高测试的稳定性和可维护性。

**注入策略**：
- 优先使用语义化命名
- 基于组件路径和元素类型生成
- 支持自定义前缀
- 避免重复 ID

**注入范围**：
- 按钮（button）
- 输入框（input, textarea）
- 链接（a）
- 表单（form）
- 表格（table）
- 模态框（modal）

**输出结果**：
- 修改后的组件文件
- Test-ID 映射表（JSON）
- 注入报告

**使用场景**：
- 初始化项目时批量注入
- 新增页面时自动注入
- 手动补充缺失的 Test-ID

**命令**：
```bash
# 预览模式（不实际修改文件）
mcp-e2e testid:analyze

# 实际注入
mcp-e2e testid:inject

# 基于 Router 注入
mcp-e2e router:inject
```

#### 2.2.2 Test-ID 映射管理

**功能描述**：
维护 Test-ID 与页面元素的映射关系，为 AI 执行测试提供元素定位信息。

**映射内容**：
- Test-ID 值
- 所属组件
- 元素类型
- 选择器
- 描述信息

**使用场景**：
- 测试执行时的元素定位
- Test-ID 查询和统计
- 测试用例生成

**命令**：
```bash
mcp-e2e testid:mapping
```

### 2.3 测试规则生成功能

#### 2.3.1 MCP Rule 生成

**功能描述**：
基于 Router 分析结果，生成结构化的 MCP 测试规则，包含测试场景、Prompt 和元数据。

**生成内容**：
- 测试场景列表
- 自然语言测试 Prompt
- 结构化测试步骤
- Test-ID 映射信息
- 项目上下文信息

**输出文件**：
- `<rule-id>.json` - 完整 Rule 定义
- `<rule-id>-prompts.md` - 全量测试 Prompts
- `routes/` - 单路由测试文件
- `route-index.json` - 路由索引
- `testid-mapping.json` - Test-ID 映射

**使用场景**：
- 初始化项目测试规则
- 更新测试规则
- 生成测试文档

**命令**：
```bash
mcp-e2e router:generate --base-url http://localhost:8080
```

#### 2.3.2 测试场景分类

**场景类型**：
- `smoke` - 冒烟测试，快速验证基本功能
- `functional` - 功能测试，验证完整业务流程
- `regression` - 回归测试，验证已有功能
- `e2e` - 端到端测试，完整用户流程

**优先级**：
- `critical` - 关键功能，必须测试
- `high` - 重要功能，优先测试
- `medium` - 一般功能，常规测试
- `low` - 次要功能，可选测试

#### 2.3.3 Prompt 生成策略

**自然语言 Prompt**：
- 使用清晰的中文描述测试步骤
- 包含明确的元素定位信息（优先使用 Test-ID）
- 描述预期结果
- 包含前置条件说明

**结构化步骤**：
- 精确的 MCP 工具调用指令
- 选择器信息
- 超时配置
- 错误处理策略

### 2.4 变更影响分析功能

#### 2.4.1 变更检测

**功能描述**：
检测 Git 仓库中的代码变更，识别变更文件和变更类型。

**检测方式**：
- 与指定基准分支对比（默认 HEAD~1）
- 检测工作区未提交变更
- 支持自定义基准引用

**变更类型**：
- 新增文件
- 修改文件
- 删除文件
- 重命名文件

**命令**：
```bash
mcp-e2e change:analyze --base main
```

#### 2.4.2 影响范围分析

**功能描述**：
分析代码变更对项目的影响范围，识别受影响的路由和组件。

**分析维度**：
- 直接影响：变更文件直接关联的路由/组件
- 间接影响：通过依赖关系传播的影响
- 影响范围评估：小范围/大范围

**输出结果**：
```typescript
{
  changedFiles: ChangedFile[],
  affectedRoutes: AffectedRoute[],
  impactScope: 'small' | 'large',
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
}
```

**使用场景**：
- 代码审查前的风险评估
- 确定测试范围
- 生成针对性测试

#### 2.4.3 详细变更分析

**功能描述**：
获取变更的详细信息，包括函数名、行号、变更内容等。

**分析内容**：
- 变更的函数/方法
- 变更的组件
- 变更的行号范围
- 变更前后对比

**输出结果**：
```typescript
{
  changes: ChangeDetail[],
  summary: {
    affectedFunctions: number,
    affectedComponents: number,
    totalLinesChanged: number
  }
}
```

**使用场景**：
- 生成详细的测试说明
- 代码审查
- 变更文档生成

#### 2.4.4 AST 深度分析

**功能描述**：
基于 AST 分析变更的深层影响，包括调用链、组件依赖树、副作用等。

**分析内容**：
- 函数调用链
- 组件依赖树
- 副作用识别
- 测试路径建议

**输出结果**：
```typescript
{
  callChains: CallChain[],
  componentTree: ComponentTree,
  sideEffects: SideEffect[],
  testPathSuggestions: TestPathSuggestion[]
}
```

**使用场景**：
- 深度影响分析
- 测试路径规划
- 重构风险评估

**命令**：
```bash
mcp-e2e impact:analyze --base main
```

#### 2.4.5 影响预测

**功能描述**：
预测代码变更的影响范围，生成 AI 分析 Prompt。

**预测维度**：
- 受影响模块
- 受影响组件
- 风险等级
- 测试建议

**输出模式**：
- 模式一：AI 分析 Prompt（用于理解变更影响）
- 模式二：AST 详细分析 Prompt（包含调用链和组件树）
- 模式三：可执行测试 Prompt（用于 MCP 测试）

**命令**：
```bash
# 模式一：AI 分析
mcp-e2e impact:predict --base main

# 模式二：AST 详细分析
mcp-e2e impact:analyze --base main

# 模式三：可执行测试
mcp-e2e impact:test --base main

# 完整流程
mcp-e2e impact:full --base main
```

### 2.5 测试执行功能

#### 2.5.1 MCP 自动执行

**功能描述**：
直接调用 Chrome DevTools MCP 执行测试，无需 AI 介入。通过解析 Prompt 文本，转换为 MCP 工具调用。

**执行流程**：
1. 解析 Prompt 文本为测试步骤
2. 连接 Chrome DevTools MCP
3. 按顺序执行测试步骤
4. 收集执行结果
5. 生成测试报告

**支持的步骤类型**：
- `navigate` - 导航到 URL
- `click` - 点击元素
- `type` - 输入文本
- `wait` - 等待元素出现
- `screenshot` - 截图
- `assert` - 断言验证
- `hover` - 悬停
- `select` - 选择选项
- `scroll` - 滚动
- `delay` - 延迟

**执行选项**：
- `--headless` - 无头模式
- `--continue-on-error` - 遇到错误继续执行
- `--delay` - 步骤间延迟
- `--route` - 指定路由
- `--type` - 指定测试类型
- `--priority` - 指定优先级
- `--scenario` - 指定场景 ID

**命令**：
```bash
mcp-e2e test:run --rule <rule-id> --base-url http://localhost:8080
```

#### 2.5.2 Prompt 文件执行

**功能描述**：
从 Prompt 文件（Markdown）自动执行测试。

**使用场景**：
- 执行生成的测试 Prompt
- 执行自定义测试 Prompt
- 快速验证测试步骤

**命令**：
```bash
mcp-e2e test:run-prompt <prompt-file> --base-url http://localhost:8080
```

#### 2.5.3 测试报告生成

**功能描述**：
生成详细的测试执行报告，包含执行结果、截图、错误信息等。

**报告内容**：
- 测试汇总（总数、通过、失败、通过率）
- 每个场景的执行结果
- 每个步骤的执行详情
- 错误信息和截图
- 执行时间统计

**报告格式**：
- JSON 格式（机器可读）
- 控制台输出（人类可读）

**报告位置**：
`.codebuddy/reports/auto-test-<timestamp>.json`

### 2.6 规则引擎功能

#### 2.6.1 失败反馈处理

**功能描述**：
当测试失败时，规则引擎自动分析失败原因，查找适用的规则，执行学习动作。

**失败分类**：
- `selector-not-found` - 选择器未找到
- `timeout` - 超时
- `navigation-failed` - 导航失败
- `script-error` - 脚本错误
- `unexpected-route` - 意外路由

**学习动作**：
- `infer-alternative-selector` - 推断备选选择器
- `extend-timeout` - 延长超时时间
- `try-alternative-route` - 尝试备选路由

**工作流程**：
```
测试失败 → 分类失败原因 → 查找适用规则 → 执行学习动作 → 更新规则权重
```

#### 2.6.2 规则权重管理

**功能描述**：
根据规则的成功/失败历史，动态调整规则权重和置信度。

**权重更新策略**：
- 成功：权重上升（`weight = weight + (1 - weight) * 0.15`）
- 失败：权重下降（`weight = weight * 0.7`）
- 置信度同步更新
- 权重过低（< 0.25）的规则自动禁用

**使用场景**：
- 规则有效性评估
- 规则优先级调整
- 规则自动淘汰

#### 2.6.3 组件记忆

**功能描述**：
记录组件的选择器策略，用于后续的智能推断。

**记忆内容**：
- 组件名称
- 选择器策略列表
- 置信度
- 关联规则

**使用场景**：
- 备选选择器推断
- 选择器策略复用
- 组件测试经验积累

### 2.7 Promote 引擎功能

#### 2.7.1 Promote 评估

**功能描述**：
评估测试决策是否应该被 Promote 为可复用的测试资产。

**评估条件**：
- 任务必须成功
- 任务置信度达到阈值（默认 0.7）
- 规则置信度达到阈值（默认 0.6）
- 连续成功次数达到要求（默认 3 次）

**使用场景**：
- 识别稳定的测试决策
- 提升测试资产质量
- 建立测试知识库

#### 2.7.2 资产提升

**功能描述**：
将成功的测试决策提升为 Promoted Asset，用于后续的回归测试。

**资产类型**：
- `regression` - 回归测试资产
- `smoke` - 冒烟测试资产
- `critical` - 关键功能资产

**资产内容**：
- 测试意图（intent）
- 测试步骤
- 来源信息（任务 ID、置信度、成功次数）
- 执行统计（总运行次数、成功次数、失败次数）

**使用场景**：
- 建立回归测试套件
- 积累测试经验
- 提高测试效率

#### 2.7.3 资产统计

**功能描述**：
跟踪 Promoted Asset 的执行历史，更新统计信息。

**统计内容**：
- 总运行次数
- 成功运行次数
- 失败运行次数
- 最后执行时间
- 成功率

**使用场景**：
- 资产质量评估
- 资产有效性监控
- 资产维护决策

### 2.8 MCP 环境管理功能

#### 2.8.1 MCP 配置初始化

**功能描述**：
初始化 Chrome DevTools MCP 配置，创建 CodeBuddy 可识别的配置文件。

**配置内容**：
- MCP 服务器命令
- 启动参数（headless、viewport 等）
- 环境变量

**配置文件位置**：
- `.codebuddy/mcp.json`（CodeBuddy 识别）
- `.mcp/servers.json`（备用）

**命令**：
```bash
mcp-e2e mcp:init --headless --viewport 1920x1080
```

#### 2.8.2 MCP 环境检查

**功能描述**：
检查 Chrome DevTools MCP 环境是否配置正确。

**检查项**：
- Node.js 版本
- Chrome 浏览器路径
- npx 可用性
- chrome-devtools-mcp 包
- MCP 配置文件

**命令**：
```bash
mcp-e2e mcp:check
```

#### 2.8.3 MCP 连接测试

**功能描述**：
测试与 Chrome DevTools MCP 的连接。

**测试内容**：
- 连接建立
- 可用工具列表
- 基本操作（导航）

**命令**：
```bash
mcp-e2e mcp:connect --headless
```

### 2.9 集成功能

#### 2.9.1 CodeBuddy 任务管理

**功能描述**：
管理 CodeBuddy 的自动化任务，支持文件变更触发、提交前触发等。

**任务类型**：
- `on_change` - 文件变更时触发
- `on_commit` - 提交前触发
- `manual` - 手动触发
- `scheduled` - 定时触发

**默认任务**：
- MCP E2E Analysis - 文件变更时分析组件依赖
- MCP E2E Generate Tests - 分析后生成测试
- MCP E2E Run Tests on Commit - 提交前运行测试
- MCP E2E Run Tests (Manual) - 手动运行测试

#### 2.9.2 测试 Prompt 生成

**功能描述**：
根据 Rule 文件生成测试 Prompt 文件，供 CodeBuddy 执行。

**生成选项**：
- `--route` - 指定路由
- `--type` - 指定测试类型
- `--priority` - 指定优先级
- `--all` - 生成全量测试 Prompt

**快捷命令**：
- `test:smoke` - 生成冒烟测试 Prompt
- `test:critical` - 生成关键测试 Prompt

**命令**：
```bash
mcp-e2e test:gen --type smoke --output .codebuddy/prompts
```

## 3. 工作流程

### 3.1 初始化流程

```
1. mcp:init          → 初始化 MCP 配置
2. router:analyze    → 分析路由配置
3. router:inject     → 注入 Test-ID（可选）
4. router:generate   → 生成测试规则
```

或使用一键命令：
```bash
mcp-e2e router:full --base-url http://localhost:8080
```

### 3.2 变更测试流程

```
1. change:analyze    → 分析代码变更
2. change:test       → 生成针对性测试
3. test:run-prompt   → 执行测试
```

### 3.3 影响分析流程

```
1. impact:predict    → 预测影响范围
2. impact:analyze    → AST 深度分析
3. impact:test       → 生成可执行测试
```

或使用完整流程：
```bash
mcp-e2e impact:full --base main
```

### 3.4 自动执行流程

```
1. test:run          → 自动执行测试
2. 规则引擎处理失败   → 学习并调整
3. Promote 引擎评估   → 提升成功资产
```

## 4. 输出文件结构

```
.codebuddy/
├── mcp.json                    # MCP 服务配置
├── rules/
│   ├── <rule-id>.json          # MCP Rule 定义
│   ├── <rule-id>-prompts.md    # 全量测试 Prompts
│   ├── routes/                 # 单路由测试文件
│   │   ├── <route>.md
│   ├── route-index.json        # 路由索引
│   └── testid-mapping.json     # Test-ID 映射
├── prompts/                    # 测试 Prompt 文件
│   ├── smoke-<timestamp>.md
│   └── critical-<timestamp>.md
├── reports/                     # 测试报告
│   └── auto-test-<timestamp>.json
├── rules.json                   # 规则引擎配置
├── memory.json                  # 组件记忆
└── promote/                     # Promoted Assets
    └── <intent>.asset.json
```

## 5. 使用场景示例

### 5.1 新项目初始化

```bash
# 1. 初始化 MCP 配置
mcp-e2e mcp:init

# 2. 分析路由并生成测试规则
mcp-e2e router:full --base-url http://localhost:8080 --inject

# 3. 在 CodeBuddy 中执行测试
# 引用生成的 Prompt 文件：@.codebuddy/rules/<rule-id>-prompts.md
```

### 5.2 代码变更后测试

```bash
# 1. 分析变更影响
mcp-e2e change:analyze --base main

# 2. 生成针对性测试
mcp-e2e change:test --base main --base-url http://localhost:8080

# 3. 执行测试
mcp-e2e test:run-prompt .codebuddy/rules/changes/<change-id>.md
```

### 5.3 深度影响分析

```bash
# 完整影响分析流程
mcp-e2e impact:full --base main --base-url http://localhost:8080

# 在 CodeBuddy 中使用：
# 1. @.codebuddy/rules/impact/ai-analysis-<timestamp>.md（理解变更）
# 2. @.codebuddy/rules/impact/ast-analysis-<timestamp>.md（深入分析）
# 3. @.codebuddy/rules/impact/test-execution-<timestamp>.md（执行测试）
```

### 5.4 自动执行测试

```bash
# 执行所有测试
mcp-e2e test:run --rule <rule-id> --base-url http://localhost:8080

# 执行特定路由的测试
mcp-e2e test:run --rule <rule-id> --route /login

# 执行冒烟测试
mcp-e2e test:run --rule <rule-id> --type smoke
```

## 6. 最佳实践

### 6.1 Test-ID 管理

- 优先使用语义化命名
- 保持 Test-ID 的唯一性
- 定期检查 Test-ID 覆盖率
- 在代码审查中检查 Test-ID 注入

### 6.2 测试规则维护

- 定期更新测试规则
- 根据业务变化调整测试场景
- 保持 Prompt 的清晰和准确
- 及时清理过时的规则

### 6.3 变更测试策略

- 小范围变更：使用针对性测试
- 大范围变更：使用全量冒烟测试
- 关键功能变更：使用深度影响分析
- 定期执行回归测试

### 6.4 规则引擎优化

- 定期审查规则权重
- 清理无效规则
- 积累组件记忆
- 优化学习策略

### 6.5 Promote 资产管理

- 定期评估资产质量
- 清理低质量资产
- 建立资产分类体系
- 跟踪资产执行统计

## 7. 限制和注意事项

### 7.1 框架支持

- 目前主要支持 Vue Router 和 React Router
- 其他框架需要自定义分析器

### 7.2 浏览器要求

- 需要安装 Chrome 浏览器
- 需要 Node.js >= 18

### 7.3 AI 依赖

- 部分功能需要 AI Agent（如 CodeBuddy）支持
- Prompt 质量影响测试执行效果

### 7.4 性能考虑

- 大型项目的分析可能较慢
- 建议使用增量分析
- 并行执行需要合理配置

## 8. 故障排查

### 8.1 MCP 连接失败

- 检查 Chrome 浏览器是否安装
- 检查 Node.js 版本
- 检查网络连接
- 查看 MCP 服务器日志

### 8.2 测试执行失败

- 检查测试服务器是否运行
- 检查 Test-ID 是否正确
- 查看测试报告中的错误信息
- 检查规则引擎的学习动作

### 8.3 规则生成失败

- 检查路由配置文件是否存在
- 检查路由配置格式是否正确
- 查看分析器日志
- 检查项目结构是否符合预期
