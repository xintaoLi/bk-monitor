# 测试任务说明

## 📁 任务文件列表

### 1. **main-retrieve-flow.task.json** ⭐ 主业务流程

**测试目标**：日志检索完整业务流程

**测试步骤**：
1. 打开日志检索页面
2. 等待页面完全渲染
3. 尝试切换索引集（可选）
4. UI 模式查询
5. 验证结果

**特点**：
- ✅ 智能容错（optional 步骤）
- ✅ 多重选择器策略
- ✅ 适应异常场景

**预计耗时**：~10 秒

---

### 2. demo-simple-navigation.task.json

简单的导航演示任务。

---

### 3. v3-index-selection.task.json

索引集选择功能测试。

---

### 4. v3-log-retrieval-basic.task.json

日志检索基础测试。

---

### 5. v3-search-input-validation.task.json

搜索输入验证测试。

---

## 📖 详细文档

- **[TESTING-GUIDE.md](./TESTING-GUIDE.md)** - 主业务流程详解
- **[../EXECUTION-GUIDE.md](../EXECUTION-GUIDE.md)** - 执行指南

---

## 🚀 运行测试

```bash
# 运行所有任务
npm run test:now

# 只运行主业务流程
cd ../packages/mcp-cli
node bin/run-visual.js
```
