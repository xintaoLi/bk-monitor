# MCP 测试配置说明

## 📁 目录结构

```
.mcp/
├── servers.json          # 主配置文件（修改 URL 在这里）
├── tasks/               # 测试任务定义
│   ├── demo-simple-navigation.task.json
│   ├── v3-index-selection.task.json
│   ├── v3-log-retrieval-basic.task.json
│   └── v3-search-input-validation.task.json
├── reports/             # 测试报告（自动生成）
├── rules/               # Rule Engine 规则
└── memory/              # Rule Engine 记忆

## ⚙️ 配置服务器地址

### 主配置文件：`servers.json`

```json
{
  "config": {
    "baseUrl": "http://localhost:8081/",  // ← 修改这里
    "testTimeout": 30000,
    "headless": false,
    "viewport": {
      "width": 1920,
      "height": 1080
    }
  }
}
```

### 测试任务文件：`tasks/*.task.json`

每个任务文件中的 `navigate` 步骤也需要更新：

```json
{
  "steps": [
    {
      "type": "navigate",
      "url": "http://localhost:8081/#/retrieve",  // ← 修改这里
      "waitUntil": "networkidle2"
    }
  ]
}
```

## 🔄 如何更换服务器地址

### 方法 1：修改配置文件（推荐）

1. 编辑 `.mcp/servers.json`：
   ```json
   {
     "config": {
       "baseUrl": "http://your-server.com:port/"
     }
   }
   ```

2. 批量替换所有任务文件中的 URL：
   - 使用编辑器的全局替换功能
   - 查找：`http://localhost:8081`
   - 替换为：`http://your-server.com:port`

### 方法 2：使用环境变量（未来优化）

未来可以支持环境变量：
```bash
TEST_BASE_URL=http://other-server.com:9000 npm run test:now
```

## 📝 常用服务器地址

根据您的环境选择：

| 环境 | 地址 |
|------|------|
| 本地开发 | `http://localhost:8081` |
| 本地 localhost | `http://localhost:8081` |
| 测试环境 | `http://bklog.bk-dev.woa.com` |
| 预发布环境 | `http://bklog-stag.woa.com` |

## 🎯 当前配置

- **服务器地址**：`http://localhost:8081`
- **测试超时**：30 秒
- **浏览器模式**：可视化（headless: false）
- **视口大小**：1920x1080

## 💡 提示

1. 修改配置后无需重启，直接运行测试即可
2. 确保服务器地址可访问（在浏览器中测试）
3. 所有任务文件中的 URL 应保持一致
4. 端口号不要忘记添加
