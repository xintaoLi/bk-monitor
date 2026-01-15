# DomStructureAssert MCP Tool implementation
_Exported on 1/15/2026 at 21:03:03 GMT+8 from Cursor (2.3.35)_

---

**User**

@mcp-cli @AI-promote.md @ai-promote-2.md 参考 AI-promote.md 和 @bklog/web/docs/ai-promote-2.md 实现 这个 DomStructureAssert MCP Tool

---

**Cursor**

让我先了解一下现有的 MCP CLI 项目结构，然后实现这个 DomStructureAssert MCP Tool。

现在我理解了项目结构和需求。根据文档，我将实现 `dom-structure-assert-mcp.ts`，包含以下核心功能：

1. **DOM Snapshot 结构定义** - 运行态 DOM 快照
2. **ExpectedStructure 定义** - 预期结构模型
3. **组件 → DOM 映射** - 解决组件语义与 DOM 实现的差异
4. **结构对比引擎** - 执行 DOM ↔ AST 结构一致性校验
5. **Diff 输出** - 人类 + LLM 双友好的结构化 diff

现在让我检查 lint 错误并更新导出。

让我在 CLI 中添加 DOM 结构断言相关的命令，并更新 TODO。

已完成 `DomStructureAssert` MCP Tool 的实现。以下是实现的核心内容：

## 实现概要

### 1. 核心模块 (`dom-structure-assert-mcp.ts`)

**类型定义：**
- `DomNode` - 运行态 DOM 快照结构
- `ExpectedNode` - 预期结构模型（AST 生成）
- `StructureDiff` - 结构差异项（人类 + LLM 双友好）
- `AssertOptions` - 断言选项
- `AssertResult` - 断言结果

**核心类：**
- `DomStructureAssert` - 结构对比引擎
- `VueAstConverter` - Vue AST → ExpectedStructure 转换器
- `DomStructureAssertMCP` - MCP Tool 接口

### 2. 功能特性

| 功能 | 说明 |
|------|------|
| DOM Snapshot 抽取 | 通过 `Runtime.evaluate` 在浏览器执行，只提取结构与语义 |
| 组件 → DOM 映射 | 支持 Ant Design、Element Plus、BK UI 等组件库 |
| 结构对比 | 支持标签、类名、属性、子节点的多维度对比 |
| Diff 输出 | 精确定位 + 可被 LLM 理解 + 可驱动修复 |
| Vue AST 解析 | 使用 `@vue/compiler-dom` 提取组件层级 |

### 3. 新增 CLI 命令

```bash
# 获取页面 DOM 结构快照
mcp-e2e dom:snapshot --url http://localhost:8080/retrieve --output snapshot.json

# 执行 DOM 结构断言
mcp-e2e dom:assert --url http://localhost:8080/retrieve --expected expected.json

# 查看组件映射表
mcp-e2e dom:mapping --filter bk
```

### 4. 使用示例

```typescript
import {
  createDomStructureAssertMCP,
  generateDomSnapshotScript,
} from './mcp/dom-structure-assert-mcp.js';

// 1. 获取 DOM 快照
const script = generateDomSnapshotScript('.container');
const snapshot = await chromeMCP.evaluate(script);

// 2. 定义预期结构
const expected = {
  component: 'bk-form',
  children: [
    { component: 'bk-form-item', children: [{ component: 'bk-input' }] },
    { component: 'bk-form-item', children: [{ component: 'bk-date-picker' }] },
  ],
};

// 3. 执行断言
const assertMCP = createDomStructureAssertMCP();
const result = await assertMCP.assertDomStructure({
  domSnapshot: snapshot,
  expectedStructure: expected,
});

if (!result.pass) {
  console.log('差异:', result.diff);
}
```

### 5. Diff 输出格式

```typescript
{
  path: "root > bk-form-item > bk-date-picker",
  type: "CLASS_MISSING",
  expected: "bk-date-picker",
  actual: ["bk-picker-input"],
  message: "缺少必需类名: \"bk-date-picker\"",
  severity: "error"
}
```

该工具实现了文档中描述的「从"看起来对" → "结构一定对"」的自动化测试范式升级。

