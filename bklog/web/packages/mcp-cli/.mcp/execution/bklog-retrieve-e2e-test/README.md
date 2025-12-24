# 日志检索页面 E2E 测试 - 执行说明

## 方式一：CodeBuddy + Chrome DevTools MCP（推荐）

1. 确保已在 CodeBuddy 中配置 Chrome DevTools MCP 服务
2. 打开 `codebuddy-rule.json` 文件
3. 告诉 AI："请执行这个测试规则"
4. AI 将自动使用 Chrome DevTools MCP 执行所有测试场景

## 方式二：手动复制 Prompt 执行

1. 打开 `all-prompts.md` 文件
2. 复制任意场景的 Prompt
3. 粘贴给 AI（需要已连接 Chrome DevTools MCP）
4. AI 将执行对应的测试操作

## 方式三：Playwright 脚本执行（无需 MCP）

```bash
# 安装依赖
npm install playwright

# 执行测试
npx playwright test playwright-tests.spec.ts
```

## 配置信息

- **Base URL**: http://appdev.woa.com:8001/
- **超时时间**: 30000ms
- **场景数量**: 7

## 测试场景列表

1. **页面加载冒烟测试** (critical) - smoke
2. **基础日志检索流程** (critical) - e2e
3. **搜索模式切换测试** (high) - e2e
4. **结果Tab切换测试** (high) - e2e
5. **收藏夹侧边栏测试** (medium) - e2e
6. **时间范围选择测试** (high) - e2e
7. **带索引集参数访问测试** (high) - e2e
