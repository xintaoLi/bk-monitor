# 🧠 Autonomous Front-end QA System

> **自适应前端测试系统**  
> 100% AI + MCP + CodeBuddy | 无 Cypress | 无手写测试 | 会学习的测试系统

## 📋 快速开始

### 1. 前置准备

确保已安装依赖：
```bash
cd bklog/web
npm install
```

### 2. 构建 MCP CLI 工具

```bash
# 构建 MCP CLI
cd packages/mcp-cli
npm install
npm run build
cd ../..
```

### 3. 初始化测试环境

```bash
# 初始化 MCP E2E 环境（首次运行）
npm run test:init
```

这会创建以下结构：
```
bklog/web/
├── .mcp/
│   ├── servers.json      # MCP 服务器配置
│   └── analysis.json     # 组件分析结果（生成）
├── .codebuddy/
│   ├── tasks.json        # 自动化任务配置
│   ├── rules.json        # 代码规则配置
│   └── promote.json      # 测试提升配置（生成）
└── tests/mcp/
    ├── flows/            # 手动编写的测试流程
    ├── generated/        # 自动生成的测试流程
    ├── utils/            # 测试工具函数
    └── screenshots/      # 测试截图（生成）
```

## 🚀 日常使用

### 分析组件变更

```bash
# 分析代码变更，构建依赖图
npm run test:analyze
```

**输出示例：**
```
=================================================
  Analyzing Component Dependencies
=================================================

[1/5] Getting changed files from Git...
Found 3 changed files:
  - src/views/dashboard/index.tsx
  - src/components/common/auth-dialog.vue
  - src/global/head-navi/index.tsx

[2/5] Building TypeScript project...
Loaded 147 source files

[3/5] Building dependency graph...
Built dependency graph with 147 nodes

[4/5] Finding affected components...
Found 8 affected files

[5/5] Analyzing components and selectors...
✅ Analysis complete! Found 5 testable components
```

### 生成测试流程

```bash
# 基于分析结果生成测试流程
npm run test:generate
```

自动生成的测试会保存在 `tests/mcp/generated/` 目录。

### 执行测试

```bash
# 启动开发服务器
npm run dev

# 在新终端执行测试
npm run test:run
```

### 一键执行完整流程

```bash
# 分析 → 生成 → 执行
npm run test:e2e
```

### 提升稳定测试

```bash
# 将稳定的测试提升为永久资产
npm run test:promote
```

## 📝 为组件添加测试 ID

### Vue 组件示例

**推荐方式（使用 data-testid）：**

```vue
<template>
  <div data-testid="authorization-list">
    <bk-button 
      data-testid="create-authorization-btn"
      @click="handleCreate"
    >
      创建授权
    </bk-button>
    
    <bk-table
      data-testid="authorization-table"
      :data="tableData"
    >
      <bk-table-column 
        data-testid="auth-name-column"
        prop="name" 
        label="名称"
      />
    </bk-table>
  </div>
</template>
```

### TSX 组件示例

```tsx
export default defineComponent({
  setup() {
    return () => (
      <div data-testid="dashboard-container">
        <div 
          data-testid="dashboard-header"
          class="dashboard-header"
        >
          <h1 data-testid="dashboard-title">仪表板</h1>
        </div>
        
        <div 
          data-testid="dashboard-content"
          class="dashboard-content"
        >
          {/* 内容 */}
        </div>
      </div>
    );
  }
});
```

### 命名规范

推荐使用以下命名模式：

- **容器/页面**: `{page-name}-container`
  - 例：`dashboard-container`, `authorization-container`

- **按钮**: `{action}-{target}-btn`
  - 例：`create-authorization-btn`, `delete-log-btn`

- **表单**: `{form-name}-form`
  - 例：`login-form`, `search-form`

- **输入框**: `{field-name}-input`
  - 例：`username-input`, `keyword-input`

- **表格**: `{data-type}-table`
  - 例：`authorization-table`, `log-list-table`

- **列表项**: `{item-type}-item`
  - 例：`menu-item`, `log-item`

## 🎯 测试优先级

根据项目配置 `mcp-e2e.config.js`，优先测试：

1. **视图组件** (`src/views/**`)
   - Dashboard (仪表板)
   - Authorization (授权管理)
   - Manage (管理页面)
   - Retrieve (检索页面)

2. **公共组件** (`src/components/common/**`)
   - AuthDialog (授权弹窗)
   - GlobalSetting (全局设置)

3. **全局组件** (`src/global/**`)
   - HeadNav (顶部导航)

## 📊 查看测试报告

测试报告保存在：
- JSON: `.mcp/test-report.json`
- 截图: `tests/mcp/screenshots/`

**报告内容：**
```json
{
  "timestamp": "2025-12-17T10:30:00Z",
  "summary": {
    "passed": 5,
    "failed": 1,
    "errors": 0,
    "total": 6
  },
  "results": [
    {
      "name": "dashboard",
      "file": "tests/mcp/flows/dashboard.flow.js",
      "status": "PASS",
      "duration": 2341
    }
  ]
}
```

## 🔧 配置选项

### MCP 配置 (.mcp/servers.json)

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["chrome-devtools-mcp"],
      "env": {
        "CHROME_HEADLESS": "true",
        "CHROME_TIMEOUT": "30000"
      }
    }
  },
  "config": {
    "baseUrl": "http://localhost:8081",
    "testTimeout": 30000,
    "screenshotOnFailure": true
  }
}
```

### CodeBuddy 任务配置 (.codebuddy/tasks.json)

启用/禁用自动化任务：

```json
{
  "tasks": [
    {
      "id": "mcp-e2e-analyze",
      "enabled": true,  // 改为 true 启用自动分析
      "trigger": "on_change",
      "debounce": 2000
    }
  ]
}
```

## 🎨 自定义测试流程

### 创建自定义测试

在 `tests/mcp/flows/` 创建新文件：

```javascript
// tests/mcp/flows/custom-test.flow.js
import { 
  openApp, 
  waitForElement, 
  clickAndWait,
  fillForm,
  takeScreenshot 
} from "../utils/browser.js";

export default async function run(ctx) {
  const { browser, page } = await openApp(
    ctx, 
    "http://localhost:8081/your-page"
  );

  try {
    // 1. 等待页面加载
    await waitForElement(page, '[data-testid="page-container"]');
    
    // 2. 填充表单
    await fillForm(page, {
      '[data-testid="username-input"]': 'admin',
      '[data-testid="password-input"]': 'password123'
    });
    
    // 3. 点击提交
    await clickAndWait(
      page,
      '[data-testid="submit-btn"]',
      '[data-testid="success-message"]'
    );
    
    // 4. 验证结果
    const successMsg = await page.$('[data-testid="success-message"]');
    if (!successMsg) {
      throw new Error('Submit failed');
    }
    
    console.log('✅ Test passed');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    await takeScreenshot(page, 'custom-test-error');
    throw error;
  } finally {
    await browser.close();
  }
}
```

## 🐛 常见问题

### Q: 分析时找不到组件？
A: 确保：
1. 组件有 `data-testid` 属性
2. 文件在 `src/` 目录下
3. 使用了 `.tsx` 或 `.vue` 扩展名

### Q: 测试超时？
A: 调整超时配置：
- `.mcp/servers.json` 中的 `testTimeout`
- 浏览器工具函数中的 `timeout` 参数

### Q: 无法连接开发服务器？
A: 确保：
1. 开发服务器已启动 (`npm run dev`)
2. 端口是 7002
3. `.mcp/servers.json` 中的 `baseUrl` 正确

### Q: 自动生成的测试不准确？
A: 可以：
1. 手动编辑 `tests/mcp/generated/` 中的文件
2. 提升为永久测试 (`npm run test:promote`)
3. 移动到 `tests/mcp/flows/` 手动维护

## 📚 扩展阅读

- [MCP 协议文档](https://modelcontextprotocol.io/)
- [chrome-devtools-mcp](https://github.com/your-org/chrome-devtools-mcp)
- [CodeBuddy 文档](https://docs.codebuddy.ai/)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 License

MIT