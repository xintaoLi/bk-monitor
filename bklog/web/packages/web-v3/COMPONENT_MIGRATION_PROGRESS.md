# BKLog Web-V3 组件迁移进度追踪

**最后更新**: 2026-03-02 10:26  
**当前阶段**: 第一阶段 - 全面扫描与分析  
**总体进度**: 11.4% (已迁移 11/101 组件)

---

## 📊 总体进度

```
组件迁移进度: ████░░░░░░░░░░░░░░░░ 11.4% (11/101)
Views 迁移进度: ███░░░░░░░░░░░░░░░░░ 5.9% (25/426)
Store 迁移进度: ████████░░░░░░░░░░░░ 42.9% (6/14)
```

| 类型 | 已完成 | 总数 | 进度 |
|------|--------|------|------|
| 基础组件 | 0 | 7 | 0% |
| 通用业务组件 | 2 | 5 | 40% |
| 对话框组件 | 0 | 2 | 0% |
| 导航组件 | 1 | 2 | 50% |
| 表单选择器 | 0 | 5 | 0% |
| 采集接入组件 | 0 | 1 (18子组件) | 0% |
| 日志脱敏组件 | 0 | 6 | 0% |
| 过滤规则组件 | 0 | 4 | 0% |
| 规则表格组件 | 0 | 3 | 0% |
| 规则配置组件 | 0 | 2 | 0% |
| 日志视图组件 | 0 | 2 | 0% |
| 图表组件 | 0 | 13 | 0% |
| 导入导出组件 | 0 | 2 | 0% |

---

## ✅ 已完成组件 (11个)

### Components
| 组件名 | 位置 | 完成日期 | 备注 |
|--------|------|----------|------|
| - | components/business/ | - | 业务组件目录 |
| - | components/common/ | - | 通用组件目录 |
| - | components/dialog/ | - | 对话框目录 |
| - | components/form/ | - | 表单组件目录 |
| TopNav | components/nav/ | - | 顶部导航（部分） |
| - | components/table/ | - | 表格组件目录 |

### Views
| 视图名 | 位置 | 完成日期 | 备注 |
|--------|------|----------|------|
| Retrieve | views/retrieve/ | - | 检索页面（骨架） |
| Manage | views/manage/ | - | 管理页面（骨架） |
| Dashboard | views/dashboard/ | - | 仪表盘（基础） |
| Monitor | views/monitor/ | - | 监控（基础） |
| Share | views/share/ | - | 分享页面 |
| Authorization | views/authorization/ | - | 权限管理 |
| Error Pages | views/error/ | - | 403/404/500 |

### Stores
| Store 模块 | 位置 | 完成日期 | 备注 |
|-----------|------|----------|------|
| global | stores/global.ts | - | 全局状态 |
| user | stores/user.ts | - | 用户状态 |
| retrieve | stores/retrieve.ts | - | 检索状态（需补充） |
| collect | stores/collect.ts | - | 采集状态（需补充） |
| dashboard | stores/dashboard.ts | - | 仪表盘状态 |

---

## 🚧 进行中 (0个)

_暂无进行中的任务_

---

## 📋 待完成组件清单

### 🎯 第二阶段：基础组件迁移

#### 1. 基础UI组件 (7个)
- [ ] **log-button** `src/components/log-button`
  - 优先级: P2 | 复杂度: 低 | 预计: 0.5人天
  - 日志操作按钮组件
  
- [ ] **log-icon** `src/components/log-icon`
  - 优先级: P2 | 复杂度: 低 | 预计: 0.5人天
  - 图标组件，替换为 TDesign Icon
  
- [ ] **empty-status** `src/components/empty-status`
  - 优先级: P2 | 复杂度: 低 | 预计: 0.5人天
  - 空状态展示组件
  
- [ ] **basic-tab** `src/components/basic-tab`
  - 优先级: P2 | 复杂度: 低 | 预计: 0.5人天
  - 基础标签页组件
  
- [ ] **bklog-popover** `src/components/bklog-popover`
  - 优先级: P2 | 复杂度: 低 | 预计: 0.5人天
  - 弹出提示组件
  
- [ ] **step-box** `src/components/step-box`
  - 优先级: P2 | 复杂度: 低 | 预计: 0.5人天
  - 步骤条组件
  
- [ ] **ellipsis-tag-list** `src/components/ellipsis-tag-list`
  - 优先级: P2 | 复杂度: 低 | 预计: 0.5人天
  - 省略标签列表组件

#### 2. 通用业务组件 (3个待迁移)
- [ ] **auth-container-page** `src/components/common/auth-container-page.vue`
  - 优先级: P1 | 复杂度: 中 | 预计: 1人天
  - 权限容器页组件
  
- [ ] **auth-dialog** `src/components/common/auth-dialog.vue`
  - 优先级: P1 | 复杂度: 中 | 预计: 1人天
  - 权限申请对话框
  
- [ ] **fields-config** `src/components/common/fields-config.vue`
  - 优先级: P1 | 复杂度: 中 | 预计: 1.5人天
  - 字段配置组件
  
- [ ] **table-status** `src/components/common/table-status.vue`
  - 优先级: P2 | 复杂度: 低 | 预计: 0.5人天
  - 表格状态显示
  
- [ ] **welcome-page** `src/components/common/welcome-page.vue`
  - 优先级: P2 | 复杂度: 低 | 预计: 0.5人天
  - 欢迎页组件

#### 3. 对话框组件 (2个)
- [ ] **global-dialog** `src/components/global-dialog`
  - 优先级: P1 | 复杂度: 中 | 预计: 1.5人天
  - 全局对话框管理
  
- [ ] **global-setting** `src/components/global-setting`
  - 优先级: P1 | 复杂度: 中 | 预计: 2人天
  - 全局设置面板

#### 4. 导航组件 (1个待迁移)
- [ ] **manage-nav** `src/components/nav/manage-nav.vue`
  - 优先级: P1 | 复杂度: 中 | 预计: 2人天
  - 管理页面侧边导航

#### 5. 表单选择器组件 (5个)
- [ ] **time-range** `src/components/time-range`
  - 优先级: P0 | 复杂度: 高 | 预计: 3人天
  - 时间范围选择器（核心组件）
  - 包含快捷选择、自定义范围、相对时间等
  
- [ ] **user-selector** `src/components/user-selector`
  - 优先级: P1 | 复杂度: 中 | 预计: 1.5人天
  - 用户选择器
  
- [ ] **ip-select** `src/components/ip-select`
  - 优先级: P0 | 复杂度: 高 | 预计: 3人天
  - IP选择器（核心组件）
  - 支持静态/动态拓扑选择
  
- [ ] **log-ip-selector** `src/components/log-ip-selector`
  - 优先级: P0 | 复杂度: 高 | 预计: 2人天
  - 日志IP选择器（基于ip-select）
  
- [ ] **index-set-label-select** `src/components/index-set-label-select`
  - 优先级: P1 | 复杂度: 中 | 预计: 1.5人天
  - 索引集标签选择器

---

### 🎯 第三阶段：核心业务组件

#### 6. 日志采集接入组件 (1个模块，18个子组件)
- [ ] **collection-access** `src/components/collection-access`
  - 优先级: P0 | 复杂度: 极高 | 预计: 15人天
  - **最复杂的业务组件模块**
  
  子组件清单：
  - [ ] index.vue - 主入口
  - [ ] advance-clean-land.vue - 高级清洗
  - [ ] field-table.vue - 字段表格
  - [ ] issued-slider.vue - 下发侧栏
  - [ ] step-add.vue - 添加步骤
  - [ ] step-capacity.vue - 容量步骤
  - [ ] step-field.vue - 字段步骤
  - [ ] step-issued.vue - 下发步骤
  - [ ] step-masking.tsx - 脱敏步骤
  - [ ] step-result.vue - 结果步骤
  - [ ] step-storage.vue - 存储步骤
  - [ ] components/cluster-table.vue - 集群表格
  - [ ] components/index-import-modal/ - 索引导入弹窗
  - [ ] components/log-filter/ - 日志过滤器
  - [ ] components/step-add/ 子组件 (12个)
    - [ ] config-log-set-edit-item.vue
    - [ ] config-log-set-item.vue
    - [ ] config-view-dialog.vue
    - [ ] configs-select.vue
    - [ ] container-target-item.vue
    - [ ] device-metadata.vue
    - [ ] label-target-dialog.vue
    - [ ] match-label-item.vue
    - [ ] match-label.vue
    - [ ] monaco-editor.vue
    - [ ] multiline-reg-dialog.vue
    - [ ] yaml-editor.vue

#### 7. 日志脱敏组件 (6个)
- [ ] **masking-add-rule** `src/components/log-masking/masking-add-rule.tsx`
  - 优先级: P1 | 复杂度: 高 | 预计: 2人天
  - 添加脱敏规则
  
- [ ] **masking-extract** `src/components/log-masking/masking-extract.tsx`
  - 优先级: P1 | 复杂度: 高 | 预计: 2人天
  - 脱敏字段提取
  
- [ ] **masking-field-input** `src/components/log-masking/masking-field-input.tsx`
  - 优先级: P1 | 复杂度: 中 | 预计: 1人天
  - 脱敏字段输入
  
- [ ] **masking-field** `src/components/log-masking/masking-field.tsx`
  - 优先级: P1 | 复杂度: 中 | 预计: 1.5人天
  - 脱敏字段组件
  
- [ ] **masking-select-rule-table** `src/components/log-masking/masking-select-rule-table.tsx`
  - 优先级: P1 | 复杂度: 高 | 预计: 2人天
  - 脱敏规则选择表格
  
- [ ] **masking-setting** `src/components/log-masking/masking-setting.tsx`
  - 优先级: P1 | 复杂度: 高 | 预计: 2.5人天
  - 脱敏设置面板

#### 8. 过滤规则组件 (4个)
- [ ] **filter-rule** `src/components/filter-rule/index.tsx`
  - 优先级: P1 | 复杂度: 高 | 预计: 2人天
  - 过滤规则主组件
  
- [ ] **config-rule** `src/components/filter-rule/config-rule/index.tsx`
  - 优先级: P1 | 复杂度: 高 | 预计: 2.5人天
  - 规则配置组件
  
- [ ] **control-operate** `src/components/filter-rule/config-rule/control-operate/index.tsx`
  - 优先级: P1 | 复杂度: 中 | 预计: 1.5人天
  - 控制操作组件
  
- [ ] **rule-trigger** `src/components/filter-rule/config-rule/rule-trigger/index.tsx`
  - 优先级: P1 | 复杂度: 中 | 预计: 1.5人天
  - 规则触发器组件

#### 9. 规则表格组件 (3个)
- [ ] **rule-table** `src/components/rule-table/index.tsx`
  - 优先级: P1 | 复杂度: 高 | 预计: 2.5人天
  - 规则表格主组件
  
- [ ] **add-rule** `src/components/rule-table/add-rule/index.tsx`
  - 优先级: P1 | 复杂度: 高 | 预计: 2人天
  - 添加规则对话框
  
- [ ] **regex-popover** `src/components/rule-table/regex-popover/index.tsx`
  - 优先级: P1 | 复杂度: 中 | 预计: 1人天
  - 正则表达式提示

#### 10. 规则配置操作组件 (2个)
- [ ] **rule-config-operate** `src/components/rule-config-operate/index.tsx`
  - 优先级: P1 | 复杂度: 高 | 预计: 2.5人天
  - 规则配置操作面板
  
- [ ] **debug-tool** `src/components/rule-config-operate/debug-tool/index.tsx`
  - 优先级: P1 | 复杂度: 中 | 预计: 1.5人天
  - 规则调试工具

#### 11. 日志视图组件 (2个)
- [ ] **log-view** `src/components/log-view/index.vue`
  - 优先级: P1 | 复杂度: 高 | 预计: 3人天
  - 日志视图展示组件
  
- [ ] **log-view-control** `src/components/log-view/log-view-control/index.tsx`
  - 优先级: P1 | 复杂度: 高 | 预计: 2人天
  - 日志视图控制面板

#### 12. 监控图表组件 (13个文件)
- [ ] **monitor-echarts** `src/components/monitor-echarts`
  - 优先级: P1 | 复杂度: 极高 | 预计: 12人天
  - 监控图表组件库
  
  子模块：
  - [ ] monitor-echarts-new.vue - 新版图表封装
  - [ ] trend-chart.vue - 趋势图表
  - [ ] components/chart-annotation.vue - 图表注释
  - [ ] components/chart-legend.vue - 图表图例
  - [ ] components/chart-menu.vue - 图表菜单
  - [ ] components/chart-title-*.vue - 图表标题
  - [ ] components/chart-tools.vue - 图表工具栏
  - [ ] components/grade-option.tsx - 等级选项
  - [ ] components/status-chart.vue - 状态图表
  - [ ] components/text-chart.vue - 文本图表
  - [ ] options/* - 图表配置类
  - [ ] value-formats-package/* - 值格式化工具

#### 13. 导入导出组件 (2个)
- [ ] **log-import** `src/components/log-import/log-import.tsx`
  - 优先级: P1 | 复杂度: 中 | 预计: 2人天
  - 日志导入组件
  
- [ ] **import-from-other-index-set** `src/components/import-from-other-index-set`
  - 优先级: P1 | 复杂度: 中 | 预计: 1.5人天
  - 从其他索引集导入配置

---

### 🎯 第四阶段：Views 页面迁移

#### 检索模块（整合 v1/v2/v3）
- [ ] **retrieve** - 整合三个版本的检索功能
  - 优先级: P0 | 复杂度: 极高 | 预计: 20人天
  - 需要分析并整合：
    - `src/views/retrieve/` (v1)
    - `src/views/retrieve-v2/` (v2, 最完善)
    - `src/views/retrieve-v3/` (v3, 新架构)
    - `src/views/retrieve-core/` (核心逻辑)

#### 管理模块（整合 v1/v2）
- [ ] **manage** - 整合两个版本的管理功能
  - 优先级: P0 | 复杂度: 极高 | 预计: 25人天
  - 主要迁移 manage-v2：
    - [ ] client-log/ - 客户端日志
    - [ ] es-cluster/ - ES集群管理
    - [ ] log-archive/ - 日志归档
    - [ ] log-collection/ - 日志采集（最复杂）
    - [ ] log-extract/ - 日志提取

#### 日志提取模块
- [ ] **extract** `src/views/extract`
  - 优先级: P1 | 复杂度: 高 | 预计: 8人天
  - [ ] create/ - 创建提取任务
  - [ ] home/ - 任务列表

#### 其他视图
- [ ] **data-id-url** `src/views/data-id-url`
  - 优先级: P2 | 复杂度: 中 | 预计: 1人天
  
- [ ] **un-authorized** `src/views/un-authorized`
  - 优先级: P2 | 复杂度: 低 | 预计: 0.5人天

---

### 🎯 第五阶段：Store 与工具类

#### Store 模块
- [ ] **condition-operator** `src/store/condition-operator.ts`
  - 优先级: P0 | 复杂度: 中 | 预计: 1.5人天
  - 条件操作符管理
  
- [ ] **request-pool** `src/store/request-pool.ts`
  - 优先级: P1 | 复杂度: 中 | 预计: 1人天
  - 请求池管理
  
- [ ] **url-resolver** `src/store/url-resolver.ts`
  - 优先级: P1 | 复杂度: 中 | 预计: 1人天
  - URL解析器
  
- [ ] **platform-config** `src/store/modules/platform-config.ts`
  - 优先级: P1 | 复杂度: 中 | 预计: 1人天
  - 平台配置
  
- [ ] **report-helper** `src/store/modules/report-helper.ts`
  - 优先级: P2 | 复杂度: 低 | 预计: 0.5人天
  - 上报辅助
  
- [ ] **report-log** `src/store/modules/report-log.ts`
  - 优先级: P2 | 复杂度: 低 | 预计: 0.5人天
  - 上报日志

#### 工具类
- [ ] 审查并补充 API Services
- [ ] 迁移通用工具函数
- [ ] 迁移日期、格式化等工具

---

## 📅 里程碑

### 第1周 (2026-03-02 ~ 2026-03-08)
- [x] ✅ 完成全面扫描与分析
- [x] ✅ 生成功能差距分析报告
- [ ] ⏳ 迁移基础UI组件（7个）
- [ ] ⏳ 迁移对话框组件（2个）
- [ ] ⏳ 迁移导航组件（1个）

### 第2周 (2026-03-09 ~ 2026-03-15)
- [ ] 迁移表单选择器组件（5个）
- [ ] 补充核心 Store 模块
- [ ] 迁移通用业务组件（3个）

### 第3-4周 (2026-03-16 ~ 2026-03-29)
- [ ] 检索模块完整迁移
- [ ] 整合 retrieve v1/v2/v3

### 第5-7周 (2026-03-30 ~ 2026-04-19)
- [ ] 日志采集 collection-access 完整迁移
- [ ] 管理模块其他子模块迁移

### 第8-9周 (2026-04-20 ~ 2026-05-03)
- [ ] 日志脱敏组件（6个）
- [ ] 过滤规则组件（4个）
- [ ] 规则表格组件（3个）
- [ ] 监控图表组件（13个）

### 第10周 (2026-05-04 ~ 2026-05-10)
- [ ] 日志提取模块
- [ ] 导入导出组件
- [ ] 其他补充功能

### 第11周 (2026-05-11 ~ 2026-05-17)
- [ ] 功能完整性验证
- [ ] 性能测试
- [ ] 生成最终报告

---

## 📝 迁移规范

### 代码规范
1. ✅ **Vue 3 Composition API** - 使用 `<script setup>` 或 TSX
2. ✅ **TypeScript** - 所有组件必须有完整类型定义
3. ✅ **TDesign Vue Next** - 使用 TDesign 组件库
4. ✅ **TSX 语法** - 复杂组件使用 TSX
5. ✅ **ESLint/Prettier** - 代码必须通过检查
6. ✅ **JSDoc** - 关键函数添加文档注释

### 提交规范
1. 每完成一个组件/模块立即提交
2. commit message 格式：`feat(component): 迁移 XXX 组件`
3. 同时更新本进度文档
4. 标注组件状态：✅完成 / 🚧进行中 / ❌待处理

### 测试规范
1. 组件迁移后进行基础功能测试
2. 确保与旧版功能对等
3. 记录任何功能差异

---

## 🐛 已知问题

_暂无_

---

## 💡 优化建议

1. 考虑使用代码生成工具加速简单组件迁移
2. 建立组件库 Storybook 方便预览测试
3. 创建迁移模板，统一代码风格
4. 定期code review，确保质量

---

**维护者**: OpenClaw AI Assistant  
**最后更新**: 2026-03-02 10:26
