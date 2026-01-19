下面是**整理后的「完整 AI 实施 Promote 规划」**，已**去除实施节奏 / 阶段划分**，只保留 **可直接落地的 AI 实施细节**。
该版本可直接用于 **Promote 评审 / 技术方案归档 / Cursor 落地执行参考**。

---

# AI 实施 Promote 规划

## 基于 MCP 的 DOM 结构感知自动化测试实施方案

---

## 一、实施目标（AI 能力边界明确）

构建一套 **基于 MCP 的结构感知自动化测试能力**，用于：

* 在自动测试执行过程中
* 基于 `chrome-devtools-mcp` 获取运行态 DOM
* 基于源码 AST 生成预期结构
* 通过结构对比完成自动断言
* 输出 **人类 + LLM 双友好的结构化 diff**

该能力作为 **断言型 AI Tool** 存在，不负责页面操作，不依赖视觉截图。

---

## 二、AI 能力拆解（可直接实现）

### AI 在系统中的职责

| 能力       | 说明                          |
| -------- | --------------------------- |
| AST 结构理解 | 从 Vue Template AST 提取组件层级语义 |
| 结构归一化    | 将组件语义映射为稳定 DOM 结构           |
| DOM 结构抽取 | 从浏览器运行态提取最小结构快照             |
| 结构对齐判断   | 执行 DOM ↔ AST 的结构一致性校验       |
| 结构差异表达   | 输出可用于定位与自动修复的 diff          |

---

## 三、AI 输入与输出定义（工程级）

### AI 输入

```ts
{
  domSnapshot: DomNode,
  expectedStructure: ExpectedNode,
  options?: {
    ignoreClasses?: string[]
    strictChildrenOrder?: boolean
  }
}
```

### AI 输出

```ts
{
  pass: boolean,
  diff: StructureDiff[],
  summary?: string
}
```

---

## 四、DOM Snapshot 设计（运行态）

### 设计原则

* 只提取结构与语义
* 不提取样式
* 不包含 textNode
* 排除动态噪声

### Snapshot 结构

```ts
interface DomNode {
  tag: string
  id?: string
  classes?: string[]
  attrs?: Record<string, any>
  children?: DomNode[]
}
```

### 抽取方式

* 通过 `Runtime.evaluate`
* 在浏览器上下文执行递归 snapshot 脚本
* 返回 JSON 对象（returnByValue）

---

## 五、Vue AST → 预期结构生成（AI 核心）

### AST 解析策略

* 使用 `@vue/compiler-dom`
* 只解析 template 区域
* 过滤非 ElementNode

### 预期结构模型

```ts
interface ExpectedNode {
  component: string
  tag?: string
  mustHaveClasses?: string[]
  attrs?: Record<string, any>
  children?: ExpectedNode[]
}
```

### AST 提取内容

* 组件标签名
* 静态属性
* 指令存在性（v-model / v-if / v-for）

---

## 六、组件语义 → DOM 结构映射（关键 AI 规则）

### 映射目的

解决：

> **源码语义组件 ≠ 浏览器真实 DOM**

### 映射形式

```ts
component → {
  tag,
  mustHaveClasses
}
```

### 示例

```ts
a-form-item   → div.ant-form-item
a-date-picker → div.ant-picker
```

### AI 参与点

* 映射规则集中维护
* 新组件缺失时，diff 可反推补充映射

---

## 七、结构对比逻辑（断言核心）

### 对比维度（由 AI 执行）

1. DOM tag 是否匹配
2. 必须存在的 class 是否包含
3. 子节点层级是否一致
4. 子节点数量是否符合预期
5. 子节点顺序（可配置）

### 忽略项

* 动态 class hash
* data-* 属性
* 样式相关属性

---

## 八、Diff 输出规范（AI 原生友好）

### Diff 数据结构

```ts
interface StructureDiff {
  path: string
  type:
    | 'TAG_MISMATCH'
    | 'CLASS_MISSING'
    | 'NODE_MISSING'
    | 'NODE_EXTRA'
  expected?: any
  actual?: any
  message: string
}
```

### Diff 设计目标

* 精确定位
* 可被 LLM 理解
* 可反向驱动修复

---

## 九、AI 与自动测试流程的协作方式

### 流程位置

```
页面操作（chrome-devtools-mcp）
        ↓
DOM Snapshot
        ↓
AI 结构断言（dom-structure-assert-mcp）
        ↓
pass / diff
        ↓
（可选）失败截图
```

### AI 不参与的内容

* 页面交互
* 时间等待
* 网络请求模拟

---

## 十、AI 失败场景处理策略

### 测试失败时 AI 提供

* 精确 diff
* 失败路径
* 结构缺失说明

### 后续可扩展

* LLM 自动生成修复建议
* 自动生成组件映射
* 自动生成测试期望修正

---

## 十一、工程化与可维护性设计

### 设计原则

* AI 能力模块化
* AST / DOM / Diff 解耦
* 映射表独立维护
* 失败结果可回放

### 可持续演进方向

* React / JSX AST 支持
* v-if / v-for 结构策略
* Shadow DOM 适配
* AI 自动 PR 修复链路

---

## 十二、结论

该 Promote 方案完成了自动化测试的一次 **范式升级**：

> 从「视觉近似判断」
> 到「结构一致性验证」

并且具备：

* AI 原生输入输出
* 工程可落地性
* 可持续演进空间

该方案适合作为：

* MCP 能力扩展示例
* AI 自动化测试基础设施
* 结构级 UI 回归测试标准实践

---

如果你需要，我可以：

* **直接帮你转成公司标准 Promote 模板**
* 或补一版 **AI 自动修复闭环设计**
* 或输出 **配合 Cursor 的最小执行规则**

你这个 Promote，已经是**可以直接推进的级别**了。

