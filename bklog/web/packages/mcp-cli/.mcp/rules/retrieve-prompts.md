# 日志检索页面 E2E 测试 Prompts

> 基于路由 `/retrieve/:indexId?` 生成的 Chrome DevTools MCP 测试用例
> 生成时间: 2025-12-24

---

## 页面信息

- **路由**: `/retrieve/:indexId?`
- **路由名称**: `retrieve`
- **页面标题**: 检索
- **主组件**: `RetrieveHub` → `RetrieveV3`

### 组件层级结构

```
RetrieveHub (路由入口，版本切换)
└── RetrieveV3 (主容器)
    ├── V3Collection (收藏夹侧边栏)
    ├── V3Toolbar (工具栏)
    │   ├── IndexSetChoice (索引集选择器)
    │   ├── TimeSetting (时间选择器)
    │   ├── QueryHistory (查询历史)
    │   └── MoreSetting (更多设置)
    ├── V3Searchbar (搜索栏)
    │   ├── V2SearchBar (UI/SQL 模式)
    │   └── V3AiMode (AI 模式)
    └── V3SearchResult (结果展示)
        ├── SearchResultTab (Tab 切换)
        ├── SearchResultPanel (原始日志)
        ├── LogClustering (日志聚类)
        ├── GraphAnalysis (图表分析)
        └── Grep (Grep 模式)
```

---

## 测试场景 Prompts

### 1. 页面加载冒烟测试

**类型**: smoke | **优先级**: critical

#### Prompt

```
作为测试工程师，请执行日志检索页面的冒烟测试：

1. 打开检索页面 http://localhost:8080/retrieve
2. 等待页面加载完成（检查 .v3-bklog-root 元素存在）
3. 验证以下核心组件已渲染：
   - 工具栏区域（索引集选择器、时间选择器）
   - 搜索栏区域
   - 结果展示区域
4. 验证页面无 JavaScript 错误
5. 截图保存当前页面状态

**预期结果**：页面正常加载，所有核心组件可见，无控制台错误
```

#### 可用选择器

- `.v3-bklog-root` - 主容器
- `.v3-bklog-toolbar` - 工具栏
- `.v3-search-bar-root` - 搜索栏
- `.v3-bklog-body` - 结果区域

---

### 2. 基础日志检索流程

**类型**: e2e | **优先级**: critical

#### Prompt

```
作为测试工程师，请执行完整的日志检索流程测试：

1. 打开检索页面
2. 等待索引集列表加载完成
3. 如果有索引集选择器，选择第一个可用的索引集
4. 在搜索栏中输入查询语句：*
5. 点击搜索按钮或按 Enter 键执行搜索
6. 等待搜索结果返回
7. 验证结果列表区域显示日志数据
8. 验证趋势图区域正常渲染

**可用 test-id**：
- v3-search-bar: 搜索栏
- search-btn: 搜索按钮
- index-set-choice: 索引集选择器

**预期结果**：成功执行搜索并显示日志结果
```

#### 可用选择器

- `[data-testid="v3-search-bar"]` - 搜索栏
- `.search-bar-container input` - 搜索输入框
- `.search-btn` - 搜索按钮
- `.result-table` - 结果表格
- `.log-item` - 日志条目

---

### 3. 搜索模式切换测试

**类型**: e2e | **优先级**: high

#### Prompt

```
作为测试工程师，请测试搜索模式切换功能：

1. 打开检索页面并等待加载完成
2. 确认当前处于 UI 模式（默认）
3. 点击模式切换按钮，切换到 SQL 模式
4. 验证搜索栏变为 SQL 输入模式
5. 输入 SQL 查询语句：log: error
6. 执行搜索
7. 再次点击模式切换，切回 UI 模式
8. 验证搜索栏恢复为 UI 模式

**可用 test-id**：
- mode-switch: 模式切换按钮
- v3-search-bar: 搜索栏

**预期结果**：UI/SQL 模式切换正常，搜索功能在两种模式下均可用
```

#### 可用选择器

- `.mode-icon` - 模式图标
- `.query-type-btn` - 模式切换按钮
- `.sql-query-input` - SQL 输入框
- `.bklog-icon.bklog-ui1` - UI 模式图标
- `.bklog-icon.bklog-yuju1` - SQL 模式图标

---

### 4. 结果 Tab 切换测试

**类型**: e2e | **优先级**: high

#### Prompt

```
作为测试工程师，请测试结果展示区域的 Tab 切换功能：

1. 打开检索页面并执行一次搜索
2. 确认当前处于「原始日志」Tab
3. 点击「日志聚类」Tab（如果可用）
4. 验证日志聚类视图正常显示
5. 点击「图表分析」Tab（如果可用）
6. 验证图表分析视图正常显示
7. 点击「Grep模式」Tab（如果可用）
8. 验证 Grep 模式视图正常显示
9. 点击「原始日志」Tab 返回

**可用 test-id**：
- search-result-tab: 结果 Tab 组件

**预期结果**：所有可用的 Tab 切换正常，对应视图正确渲染
```

#### 可用选择器

- `.tab-item` - Tab 项
- `[data-tab="origin"]` - 原始日志 Tab
- `[data-tab="clustering"]` - 日志聚类 Tab
- `[data-tab="graph_analysis"]` - 图表分析 Tab
- `[data-tab="grep"]` - Grep 模式 Tab

---

### 5. 收藏夹侧边栏测试

**类型**: e2e | **优先级**: medium

#### Prompt

```
作为测试工程师，请测试收藏夹侧边栏功能：

1. 打开检索页面
2. 找到收藏夹开关按钮（收藏夹图标）
3. 点击按钮展开收藏夹侧边栏
4. 验证侧边栏正常显示
5. 查看收藏夹列表是否有收藏项
6. 再次点击按钮收起侧边栏
7. 验证侧边栏已收起

**可用 test-id**：
- collection-box: 收藏夹开关按钮

**预期结果**：收藏夹侧边栏展开/收起功能正常
```

#### 可用选择器

- `.collection-box` - 收藏夹按钮容器
- `.bklog-shoucangjia` - 收藏夹图标
- `.v3-bklog-collection` - 收藏夹侧边栏

---

### 6. 时间范围选择测试

**类型**: e2e | **优先级**: high

#### Prompt

```
作为测试工程师，请测试时间范围选择功能：

1. 打开检索页面
2. 找到时间范围选择器
3. 点击打开时间选择下拉框
4. 选择「近 1 小时」选项
5. 验证时间范围已更新
6. 执行搜索
7. 验证搜索结果按新时间范围过滤

**可用 test-id**：
- time-setting: 时间选择器

**预期结果**：时间范围选择正常，搜索结果按时间过滤
```

#### 可用选择器

- `.time-setting` - 时间设置组件
- `.bk-date-picker` - 日期选择器
- `.shortcut-item` - 快捷时间选项
- `.bk-picker-panel` - 时间选择面板

---

### 7. 带索引集参数访问测试

**类型**: e2e | **优先级**: high

#### Prompt

```
作为测试工程师，请测试带索引集 ID 参数的页面访问：

1. 打开检索页面并带上索引集 ID 参数：http://localhost:8080/retrieve/1
2. 等待页面加载完成
3. 验证索引集选择器显示了对应的索引集
4. 验证页面正常渲染，无错误
5. 执行一次搜索验证功能正常

**预期结果**：带参数访问时自动选中对应索引集，页面功能正常
```

#### 可用选择器

- `.index-set-choice` - 索引集选择器
- `.index-set-name` - 索引集名称显示

---

## Test-ID 映射表

| Test-ID | 组件 | 描述 | 交互类型 |
|---------|------|------|----------|
| `v3-search-bar` | V3Searchbar | 搜索栏（普通模式） | 输入、搜索 |
| `v3-search-bar-ai` | V3Searchbar | 搜索栏（AI模式） | AI查询、模式切换 |
| `index-set-choice` | IndexSetChoice | 索引集选择器 | 选择、切换 |
| `time-setting` | TimeSetting | 时间范围选择器 | 选择时间 |
| `search-result-tab` | SearchResultTab | 结果Tab切换 | Tab切换 |
| `collection-box` | V3Toolbar | 收藏夹开关 | 展开/收起 |
| `query-history` | QueryHistory | 查询历史 | 查看、应用 |
| `search-btn` | V2SearchBar | 搜索按钮 | 执行搜索 |
| `clear-btn` | V2SearchBar | 清空按钮 | 清空条件 |
| `mode-switch` | V2SearchBar | 模式切换 | UI/SQL切换 |

---

## MCP 执行配置

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": [
        "chrome-devtools-mcp@latest",
        "--viewport", "1920x1080",
        "--executablePath", "/path/to/chrome"
      ]
    }
  }
}
```

## 使用方式

1. **CodeBuddy 中使用**：直接复制 Prompt 发送给 AI 助手
2. **MCP CLI 执行**：
   ```bash
   npx mcp-e2e rule:run retrieve-test-rule --base-url http://localhost:8080
   ```
3. **Python mcp-use 执行**：
   ```python
   result = await agent.run(prompt)
   ```
