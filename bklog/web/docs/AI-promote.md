下面是一份 **可直接用于落地执行的 AI 实施 Promote（实施推进方案）**。
它不是概念文档，而是**“拿去就能干活”的版本**，你可以直接放进：

* 技术推进评审
* AI / 自动化专项立项
* 内部分享 / 执行 Promote
* 或作为 MCP Tool 落地蓝图

---

# AI 实施 Promote

## 基于 MCP 的 DOM 结构感知自动化测试方案

---

## 一、背景与问题陈述

### 现状

当前基于 `chrome-devtools-mcp` 的自动测试流程，默认以：

> **take_screenshot → LLM 视觉分析 → 判断是否符合预期**

作为核心断言手段。

### 存在问题

1. **截图对比不稳定**

   * 像素抖动
   * 样式变化即失败
2. **无法验证结构正确性**

   * DOM 层级
   * 组件嵌套关系
   * 关键属性
3. **无法与源码形成强关联**

   * 测试结果不可回溯
   * 无法自动修复

---

## 二、实施目标（明确可验收）

### 核心目标

构建一套 **基于 MCP 的结构感知自动化测试能力**，实现：

> **“源码结构 ≈ 运行时 DOM 结构” 的自动校验**

### 验收标准

* 不依赖截图即可完成断言
* 测试失败可输出明确结构 diff
* diff 可被 LLM 理解并用于自动修复
* 可无侵入接入现有 chrome-devtools-mcp 流程

---

## 三、整体方案概述

### 技术路线（确定）

```
Vue 源码 AST
   ↓
ExpectedStructure（语义结构）
   ↓
组件 → DOM 映射
   ↓
结构化预期模型
   ↑
DOM Snapshot（运行态）
   ↑
chrome-devtools-mcp
```

### 测试定位

* **结构回归测试（Structural Regression Test）**
* 非视觉测试、非像素对比

---

## 四、系统架构设计

### 核心模块

| 模块                       | 职责                          |
| ------------------------ | --------------------------- |
| chrome-devtools-mcp      | 页面操作 & DOM 运行态获取            |
| dom-structure-assert-mcp | 结构断言 MCP Tool               |
| AST Converter            | Vue AST → ExpectedStructure |
| Component Mapping        | 组件语义 → DOM 表现               |
| Diff Engine              | DOM ↔ AST 结构差异分析            |

---

## 五、MCP Tool 实现方案

### Tool 名称

```
dom-structure-assert-mcp
```

### MCP 能力定义

```ts
assertDomStructure({
  domSnapshot,
  expectedStructure,
  options
}) => {
  pass: boolean
  diff: StructureDiff[]
}
```

---

## 六、关键实现说明

### 1️⃣ DOM Snapshot 获取（运行态）

* 通过 `Runtime.evaluate`
* 仅提取结构与关键属性
* 忽略样式与动态噪声

```js
{
  tag,
  id,
  classes,
  attrs,
  children
}
```

---

### 2️⃣ Vue AST → ExpectedStructure

* 使用 `@vue/compiler-dom`
* 提取：

  * 组件层级
  * 指令（v-model / v-if）
  * 静态属性

输出示例：

```json
{
  "component": "a-form-item",
  "children": [
    {
      "component": "a-date-picker"
    }
  ]
}
```

---

### 3️⃣ 组件 → DOM 映射层（关键）

解决：

> “组件语义 ≠ DOM 实现”

```ts
a-form-item   → div.ant-form-item
a-date-picker → div.ant-picker
```

---

### 4️⃣ 结构对比策略

#### 对比维度

1. DOM Tag
2. 必须存在的 Class
3. 子节点层级
4. 子节点顺序（可配置）

#### 非对比项

* 动态 class hash
* data-* 属性
* 样式属性

---

## 七、Diff 输出设计（人 + AI 双友好）

### Diff 结构

```ts
{
  path: "root > a-form-item > a-date-picker",
  type: "CLASS_MISSING",
  expected: "ant-picker",
  actual: ["ant-picker-input"],
  message: "Expected class not found"
}
```

### 使用方式

* 人类：直接定位问题
* LLM：自动分析 → 生成修复建议

---

## 八、测试执行流程（标准化）

```
1. chrome-devtools-mcp：页面操作
2. chrome-devtools-mcp：DOM Snapshot
3. dom-structure-assert-mcp：结构断言
4. pass → 继续
5. fail → 生成 diff →（可选）截图
```

📌 **截图仅用于失败辅助调试**

---

## 九、实施计划（Promote 执行节奏）

### 阶段一：基础能力（1 周）

* Vue AST 转换器
* DOM Snapshot 提取
* 基础结构对比

### 阶段二：工程化（1 周）

* MCP Tool 封装
* 组件映射表
* Diff 输出标准化

### 阶段三：集成 & 推广（1 周）

* 接入现有自动测试流程
* 编写使用示例
* 内部分享 & 推广

---

## 十、风险与应对

| 风险          | 应对          |
| ----------- | ----------- |
| 组件 DOM 实现差异 | 映射表解耦       |
| 动态渲染        | 忽略策略 + 宽松匹配 |
| 学习成本        | 提供模板 & 示例   |

---

## 十一、预期收益（可量化）

* ❌ 截图测试占比下降 ≥ 80%
* ✅ 测试稳定性显著提升
* ✅ 测试失败定位时间下降 ≥ 60%
* ✅ 为 AI 自动修复提供结构化输入

---

## 十二、结论

本 Promote 实施后，将完成一次 **自动化测试范式升级**：

> **从“看起来对” → “结构一定对”**

该方案具备：

* 高稳定性
* 强可扩展性
* AI 原生友好

可作为：

* MCP 自动化能力样板
* AI 测试基础设施长期建设方向

---

如果你愿意，我可以 **下一步直接帮你**：

* 把这份 Promote 改成 **公司内部标准模板**
* 或拆成 **Jira / OKR / Milestone 执行任务**
* 或补一版 **架构图 + 时序图**

你现在这套方案，已经完全值得“推进落地”了。
