# BKLog Web-V3 功能差距分析报告

生成时间：2026-03-02
旧版源码路径：`/root/clawd/bk-monitor/bklog/web/src`
新版源码路径：`/root/clawd/bk-monitor/bklog/web/packages/web-v3/src`

## 📊 总体统计

### 文件数量对比
| 类型 | 旧版 (src) | 新版 (web-v3) | 迁移率 |
|------|-----------|--------------|--------|
| 总文件数 | 1076 | 123 | 11.4% |
| Components | 101 | 11 | 10.9% |
| Views | 426 | 25 | 5.9% |
| Store | 14 | 6 | 42.9% |

### 架构对比
| 特性 | 旧版 | 新版 |
|------|-----|------|
| 框架 | Vue 2 | Vue 3 |
| 语言 | JavaScript + 部分 TypeScript | 完全 TypeScript |
| 组件语法 | Options API + SFC | Composition API + TSX |
| UI 库 | bkui-vue | TDesign Vue Next |
| 状态管理 | Vuex | Pinia |
| 构建工具 | Webpack | Vite |

---

## 🧩 组件迁移差距分析

### ✅ 已迁移组件 (11个)
位置：`packages/web-v3/src/components`
```
components/
├── business/       # 业务组件
├── common/         # 通用组件
├── dialog/         # 对话框组件
├── form/           # 表单组件
├── nav/            # 导航组件
└── table/          # 表格组件
```

### ❌ 待迁移组件 (25个模块)

#### 1. 基础组件 (7个)
| 组件名 | 路径 | 优先级 | 复杂度 | 说明 |
|--------|------|--------|--------|------|
| basic-tab | src/components/basic-tab | P2 | 低 | 基础标签页组件 |
| bklog-popover | src/components/bklog-popover | P2 | 低 | 弹出提示组件 |
| empty-status | src/components/empty-status | P2 | 低 | 空状态展示 |
| log-button | src/components/log-button | P2 | 低 | 日志按钮组件 |
| log-icon | src/components/log-icon | P2 | 低 | 图标组件 |
| step-box | src/components/step-box | P2 | 低 | 步骤条组件 |
| ellipsis-tag-list | src/components/ellipsis-tag-list | P2 | 低 | 省略标签列表 |

#### 2. 通用业务组件 (4个)
| 组件名 | 路径 | 优先级 | 复杂度 | 说明 |
|--------|------|--------|--------|------|
| common/auth-container-page | src/components/common | P1 | 中 | 权限容器页 |
| common/auth-dialog | src/components/common | P1 | 中 | 权限对话框 |
| common/fields-config | src/components/common | P1 | 中 | 字段配置 |
| common/table-status | src/components/common | P2 | 低 | 表格状态 |
| common/welcome-page | src/components/common | P2 | 低 | 欢迎页 |

#### 3. 对话框/弹窗组件 (2个)
| 组件名 | 路径 | 优先级 | 复杂度 | 说明 |
|--------|------|--------|--------|------|
| global-dialog | src/components/global-dialog | P1 | 中 | 全局对话框 |
| global-setting | src/components/global-setting | P1 | 中 | 全局设置 |

#### 4. 导航组件 (2个)
| 组件名 | 路径 | 优先级 | 复杂度 | 说明 |
|--------|------|--------|--------|------|
| nav/manage-nav | src/components/nav | P1 | 中 | 管理导航 |
| nav/top-nav | src/components/nav | P1 | 中 | 顶部导航 |

#### 5. 表单选择器组件 (4个)
| 组件名 | 路径 | 优先级 | 复杂度 | 说明 |
|--------|------|--------|--------|------|
| time-range | src/components/time-range | P1 | 高 | 时间范围选择器 |
| user-selector | src/components/user-selector | P1 | 中 | 用户选择器 |
| ip-select | src/components/ip-select | P1 | 高 | IP 选择器 |
| log-ip-selector | src/components/log-ip-selector | P1 | 高 | 日志 IP 选择器 |
| index-set-label-select | src/components/index-set-label-select | P1 | 中 | 索引集标签选择 |

#### 6. 日志采集接入组件 (18个文件)
| 组件模块 | 路径 | 优先级 | 复杂度 | 说明 |
|----------|------|--------|--------|------|
| collection-access | src/components/collection-access | P0 | 极高 | **核心业务组件模块** |

子组件清单：
- `index.vue` - 主入口
- `advance-clean-land.vue` - 高级清洗
- `field-table.vue` - 字段表格
- `issued-slider.vue` - 下发侧栏
- `step-add.vue` - 添加步骤
- `step-capacity.vue` - 容量步骤
- `step-field.vue` - 字段步骤
- `step-issued.vue` - 下发步骤
- `step-masking.tsx` - 脱敏步骤
- `step-result.vue` - 结果步骤
- `step-storage.vue` - 存储步骤
- `components/cluster-table.vue` - 集群表格
- `components/index-import-modal/` - 索引导入弹窗
- `components/log-filter/` - 日志过滤
- `components/step-add/` - 添加步骤子组件(9个)
  - `config-log-set-edit-item.vue`
  - `config-log-set-item.vue`
  - `config-view-dialog.vue`
  - `configs-select.vue`
  - `container-target-item.vue`
  - `device-metadata.vue`
  - `label-target-dialog.vue`
  - `match-label-item.vue`
  - `match-label.vue`
  - `monaco-editor.vue`
  - `multiline-reg-dialog.vue`
  - `yaml-editor.vue`

#### 7. 日志脱敏组件 (6个)
| 组件名 | 路径 | 优先级 | 复杂度 | 说明 |
|--------|------|--------|--------|------|
| log-masking/masking-add-rule | src/components/log-masking | P1 | 高 | 添加脱敏规则 |
| log-masking/masking-extract | src/components/log-masking | P1 | 高 | 脱敏提取 |
| log-masking/masking-field-input | src/components/log-masking | P1 | 中 | 脱敏字段输入 |
| log-masking/masking-field | src/components/log-masking | P1 | 中 | 脱敏字段 |
| log-masking/masking-select-rule-table | src/components/log-masking | P1 | 高 | 脱敏规则表格 |
| log-masking/masking-setting | src/components/log-masking | P1 | 高 | 脱敏设置 |

#### 8. 过滤规则组件 (4个)
| 组件名 | 路径 | 优先级 | 复杂度 | 说明 |
|--------|------|--------|--------|------|
| filter-rule/index | src/components/filter-rule | P1 | 高 | 过滤规则主组件 |
| filter-rule/config-rule | src/components/filter-rule | P1 | 高 | 规则配置 |
| filter-rule/control-operate | src/components/filter-rule | P1 | 中 | 控制操作 |
| filter-rule/rule-trigger | src/components/filter-rule | P1 | 中 | 规则触发器 |

#### 9. 规则表格组件 (3个)
| 组件名 | 路径 | 优先级 | 复杂度 | 说明 |
|--------|------|--------|--------|------|
| rule-table/index | src/components/rule-table | P1 | 高 | 规则表格主组件 |
| rule-table/add-rule | src/components/rule-table | P1 | 高 | 添加规则 |
| rule-table/regex-popover | src/components/rule-table | P1 | 中 | 正则表达式提示 |

#### 10. 规则配置操作组件 (2个)
| 组件名 | 路径 | 优先级 | 复杂度 | 说明 |
|--------|------|--------|--------|------|
| rule-config-operate/index | src/components/rule-config-operate | P1 | 高 | 规则配置操作 |
| rule-config-operate/debug-tool | src/components/rule-config-operate | P1 | 中 | 调试工具 |

#### 11. 日志视图组件 (3个)
| 组件名 | 路径 | 优先级 | 复杂度 | 说明 |
|--------|------|--------|--------|------|
| log-view/index | src/components/log-view | P1 | 高 | 日志视图主组件 |
| log-view/log-view-control | src/components/log-view | P1 | 高 | 日志视图控制 |

#### 12. 图表组件 (13个)
| 组件模块 | 路径 | 优先级 | 复杂度 | 说明 |
|----------|------|--------|--------|------|
| monitor-echarts | src/components/monitor-echarts | P1 | 极高 | **监控图表组件库** |

子组件清单：
- `monitor-echarts-new.vue` - 新版图表
- `trend-chart.vue` - 趋势图
- `components/chart-annotation.vue` - 图表注释
- `components/chart-legend.vue` - 图表图例
- `components/chart-menu.vue` - 图表菜单
- `components/chart-title-*.vue` - 图表标题(4个版本)
- `components/chart-tools.vue` - 图表工具
- `components/grade-option.tsx` - 等级选项
- `components/status-chart.vue` - 状态图表
- `components/text-chart.vue` - 文本图表
- `options/` - 图表配置(多个文件)
- `value-formats-package/` - 值格式化工具

#### 13. 导入导出组件 (2个)
| 组件名 | 路径 | 优先级 | 复杂度 | 说明 |
|--------|------|--------|--------|------|
| log-import | src/components/log-import | P1 | 中 | 日志导入 |
| import-from-other-index-set | src/components/import-from-other-index-set | P1 | 中 | 从其他索引集导入 |

---

## 📄 页面视图迁移差距分析

### ✅ 已迁移视图模块 (7个)
```
packages/web-v3/src/views/
├── retrieve/          # 检索页面（部分）
├── manage/            # 管理页面（骨架）
├── dashboard/         # 仪表盘（基础）
├── monitor/           # 监控（基础）
├── share/             # 分享页面
├── authorization/     # 权限管理
└── error/             # 错误页面
```

### ❌ 待迁移视图模块

#### 1. 检索模块 (3个版本需整合)
| 模块 | 路径 | 文件数 | 优先级 | 复杂度 | 说明 |
|------|------|--------|--------|--------|------|
| retrieve | src/views/retrieve | ~20 | P0 | 高 | 旧版检索 |
| retrieve-v2 | src/views/retrieve-v2 | ~80 | P0 | 极高 | V2版本检索 |
| retrieve-v3 | src/views/retrieve-v3 | ~60 | P0 | 极高 | V3版本检索 |
| retrieve-core | src/views/retrieve-core | ~10 | P0 | 高 | 检索核心逻辑 |

**retrieve-v2 子模块清单：**
- `collect/` - 采集相关
- `components/` - 检索组件
- `condition-comp/` - 条件组件
- `field-filter-comp/` - 字段过滤
- `hooks/` - 组合式函数
- `monitor/` - 监控
- `result-comp/` - 结果组件
- `search-bar/` - 搜索栏
- `search-comp/` - 搜索组件
- `search-result-chart/` - 结果图表
- `search-result-panel/` - 结果面板
- `search-result-tab/` - 结果标签页
- `setting-modal/` - 设置弹窗
- `sub-bar/` - 子栏

**retrieve-v3 子模块清单：**
- `container/` - 容器
- `favorite/` - 收藏
- `grep/` - 检索
- `monitor/` - 监控
- `search-bar/` - 搜索栏
- `search-result/` - 搜索结果
- `toolbar/` - 工具栏

#### 2. 管理模块 (2个版本需整合)
| 模块 | 路径 | 子模块数 | 优先级 | 复杂度 | 说明 |
|------|------|----------|--------|--------|------|
| manage | src/views/manage | 9 | P0 | 极高 | 旧版管理 |
| manage-v2 | src/views/manage-v2 | 6 | P0 | 极高 | V2版本管理 |

**manage 子模块清单：**
- `es-cluster-status/` - ES集群状态
- `field-masking-separate/` - 字段脱敏
- `log-archive/` - 日志归档
- `log-clean/` - 日志清洗
- `manage-access/` - 管理接入
- `manage-data-link/` - 数据链路
- `manage-extract/` - 日志提取
- `report-management/` - 上报管理
- `trace-track/` - 链路追踪

**manage-v2 子模块清单：**
- `client-log/` - 客户端日志（~10个文件）
- `es-cluster/` - ES集群管理（~5个文件）
- `log-archive/` - 日志归档（~10个文件）
- `log-collection/` - 日志采集（~100个文件）⚠️ **最复杂**
- `log-extract/` - 日志提取（~10个文件）
- `hooks/` - 共享hooks

#### 3. 日志提取模块
| 模块 | 路径 | 文件数 | 优先级 | 复杂度 | 说明 |
|------|------|--------|--------|--------|------|
| extract | src/views/extract | ~15 | P1 | 高 | 日志提取完整流程 |

子模块：
- `create/` - 创建提取任务（6个文件）
- `home/` - 提取任务列表（8个文件）

#### 4. 其他视图模块
| 模块 | 路径 | 优先级 | 复杂度 | 说明 |
|------|------|--------|--------|------|
| data-id-url | src/views/data-id-url | P2 | 中 | 数据ID URL |
| playground | src/views/playground | P3 | 低 | 测试场地 |
| un-authorized | src/views/un-authorized | P2 | 低 | 未授权页面 |

---

## 🗂️ Store 状态管理迁移

### 旧版 Store (Vuex)
位置：`src/store/`
```
store/
├── index.js                    # Store 主入口
├── globals.js                  # 全局状态
├── collect.js                  # 采集状态
├── retrieve.js                 # 检索状态
├── constant.js                 # 常量
├── condition-operator.ts       # 条件操作符
├── default-values.ts           # 默认值
├── helper.ts                   # 辅助函数
├── request-pool.ts             # 请求池
├── store.type.ts               # 类型定义
├── url-resolver.ts             # URL解析器
└── modules/
    ├── platform-config.ts      # 平台配置
    ├── report-helper.ts        # 上报辅助
    └── report-log.ts           # 上报日志
```

### 新版 Store (Pinia)
位置：`packages/web-v3/src/stores/`
```
stores/
├── index.ts                    # Store 导出
├── global.ts                   # 全局状态
├── user.ts                     # 用户状态
├── retrieve.ts                 # 检索状态
├── collect.ts                  # 采集状态
└── dashboard.ts                # 仪表盘状态
```

### 待迁移 Store 模块
| 模块 | 迁移状态 | 优先级 | 说明 |
|------|---------|--------|------|
| ✅ global | 已迁移 | P0 | 全局状态 |
| ✅ user | 已迁移 | P0 | 用户状态 |
| ✅ retrieve | 已迁移 | P0 | 检索状态（需补充完整） |
| ✅ collect | 已迁移 | P0 | 采集状态（需补充完整） |
| ✅ dashboard | 已迁移 | P1 | 仪表盘状态 |
| ❌ condition-operator | 未迁移 | P0 | 条件操作符 |
| ❌ request-pool | 未迁移 | P1 | 请求池管理 |
| ❌ url-resolver | 未迁移 | P1 | URL解析器 |
| ❌ platform-config | 未迁移 | P1 | 平台配置 |
| ❌ report-helper | 未迁移 | P2 | 上报辅助 |
| ❌ report-log | 未迁移 | P2 | 上报日志 |

---

## 🛠️ 工具类与 API 迁移

### API 服务
| 类型 | 旧版路径 | 新版路径 | 迁移状态 |
|------|---------|---------|---------|
| API Services | `src/api/` | `packages/web-v3/src/api/services/` | 部分迁移 |
| HTTP Client | `src/api/http.js` | `packages/web-v3/src/utils/http.ts` | 已迁移 |

### 工具函数
| 类型 | 旧版路径 | 新版路径 | 迁移状态 |
|------|---------|---------|---------|
| 通用工具 | `src/common/` | `packages/web-v3/src/utils/` | 部分迁移 |
| 日期工具 | `src/common/date.js` | `packages/web-v3/src/utils/date.ts` | 需迁移 |
| 格式化工具 | `src/common/formatter.js` | `packages/web-v3/src/utils/formatter.ts` | 需迁移 |

---

## 📋 迁移优先级矩阵

### P0 - 核心功能（必须完成）
1. **检索模块** - retrieve-v2/v3 整合迁移
2. **日志采集** - collection-access 完整迁移
3. **管理模块** - manage-v2 核心功能迁移
4. **Store** - condition-operator, request-pool 迁移

### P1 - 重要功能（高优先级）
1. **时间范围选择器** - time-range
2. **IP选择器** - ip-select, log-ip-selector
3. **日志脱敏** - log-masking 全套组件
4. **过滤规则** - filter-rule 全套组件
5. **规则表格** - rule-table 全套组件
6. **监控图表** - monitor-echarts 全套组件
7. **日志视图** - log-view 组件
8. **导航组件** - manage-nav, top-nav
9. **对话框** - global-dialog, global-setting
10. **日志提取** - extract 完整流程
11. **权限相关** - auth-container-page, auth-dialog

### P2 - 一般功能（中优先级）
1. 基础UI组件（7个）
2. 表格状态、字段配置等
3. 导入导出组件
4. 数据ID URL视图

### P3 - 可选功能（低优先级）
1. playground 测试场地
2. 旧版兼容代码

---

## 🎯 迁移策略建议

### 阶段一：核心基础（第1-2周）
1. ✅ 完善路由配置
2. ✅ 迁移核心 Store（condition-operator, request-pool）
3. ✅ 迁移基础组件库（time-range, ip-select, 导航等）
4. ✅ 迁移对话框和全局设置

### 阶段二：检索模块（第3-4周）
1. ✅ 整合 retrieve-v2 和 retrieve-v3
2. ✅ 迁移搜索栏、结果展示、条件筛选
3. ✅ 迁移收藏、监控等子功能
4. ✅ 整合日志视图组件

### 阶段三：管理模块（第5-7周）
1. ✅ 迁移日志采集 collection-access（最复杂，需2周）
2. ✅ 迁移日志清洗配置
3. ✅ 迁移归档管理
4. ✅ 迁移ES集群管理
5. ✅ 迁移客户端日志

### 阶段四：业务组件（第8-9周）
1. ✅ 迁移日志脱敏 log-masking（6个组件）
2. ✅ 迁移过滤规则 filter-rule（4个组件）
3. ✅ 迁移规则表格 rule-table（3个组件）
4. ✅ 迁移监控图表 monitor-echarts（13个文件）

### 阶段五：补充功能（第10周）
1. ✅ 迁移日志提取 extract
2. ✅ 迁移导入导出功能
3. ✅ 补充权限相关组件
4. ✅ 迁移其他辅助功能

### 阶段六：测试验证（第11周）
1. ✅ 功能完整性对比验证
2. ✅ 性能测试
3. ✅ 兼容性测试
4. ✅ 生成最终报告

---

## 🔍 技术债务与风险

### 高风险项
1. **多版本整合**
   - retrieve 存在 v1/v2/v3 三个版本，需仔细整合最佳实现
   - manage 存在 v1/v2 两个版本，功能有重叠和差异
   
2. **组件库替换**
   - bkui-vue → TDesign 替换工作量大
   - 部分组件可能无直接对应，需自定义实现

3. **复杂业务逻辑**
   - collection-access 包含18个子组件，业务逻辑复杂
   - monitor-echarts 图表配置复杂，格式化逻辑多

### 中风险项
1. **类型定义**
   - 需为所有组件添加完整的 TypeScript 类型
   - 部分旧代码类型不明确，需推断

2. **状态管理重构**
   - Vuex → Pinia 模式转换
   - 需保持状态管理的一致性

### 技术依赖
| 依赖 | 旧版 | 新版 | 兼容性 |
|------|-----|------|--------|
| Vue | 2.x | 3.x | 需重写 |
| Vue Router | 3.x | 4.x | 语法变更 |
| Vuex | 3.x | 移除 | 改用 Pinia |
| Pinia | - | 2.x | 新增 |
| TypeScript | 部分 | 完全 | 需补充类型 |
| Vite | - | 4.x | 新构建工具 |
| bkui-vue | 2.x | 移除 | 改用 TDesign |
| TDesign | - | 1.x | 新UI库 |

---

## 📊 工作量评估

### 按复杂度统计
| 复杂度 | 组件数 | 预计工时（人天） |
|--------|--------|------------------|
| 极高 | 4 | 40 |
| 高 | 15 | 60 |
| 中 | 20 | 40 |
| 低 | 10 | 10 |
| **总计** | **49** | **150** |

### 按模块统计
| 模块 | 工作量（人天） | 占比 |
|------|----------------|------|
| 检索模块 | 35 | 23% |
| 管理模块（采集） | 40 | 27% |
| 管理模块（其他） | 25 | 17% |
| 业务组件 | 30 | 20% |
| Store & Utils | 10 | 7% |
| 测试验证 | 10 | 7% |
| **总计** | **150** | **100%** |

---

## ✅ 下一步行动计划

### 立即开始（今日）
1. ✅ 创建组件迁移追踪文档 `COMPONENT_MIGRATION_PROGRESS.md`
2. ✅ 迁移基础组件（log-button, log-icon, empty-status 等）
3. ✅ 迁移对话框组件（global-dialog, global-setting）

### 本周计划（第1周）
1. ✅ 迁移导航组件（manage-nav, top-nav）
2. ✅ 迁移时间范围选择器（time-range）
3. ✅ 迁移 IP 选择器（ip-select, log-ip-selector）
4. ✅ 补充 Store（condition-operator, request-pool）

### 后续计划
- 第2周：检索模块基础架构
- 第3-4周：检索模块完整迁移
- 第5-7周：管理模块迁移
- 第8-9周：业务组件迁移
- 第10周：补充功能
- 第11周：测试验证

---

## 📝 备注

1. **文件统计基于当前代码库**，实际数量可能有细微差异
2. **工时评估**基于单人全职开发，实际进度受团队规模和技术栈熟悉度影响
3. **优先级**可根据实际业务需求动态调整
4. **所有新代码必须符合**：
   - Vue 3 Composition API
   - TypeScript 严格模式
   - TSX 语法（组件部分）
   - TDesign Vue Next 组件库
   - ESLint/Prettier 代码规范

---

**报告生成者**: OpenClaw AI Assistant  
**更新时间**: 2026-03-02 10:26  
**版本**: v1.0
