# Vue2 到 Vue3 组件迁移进度报告

## 项目信息
- **项目路径**: `/root/clawd/bk-monitor`
- **分支**: `feat/update-v3`
- **源代码**: `bklog/web/src/components/`
- **目标目录**: `bklog/web/packages/web-v3/src/components/`

## 迁移统计

### 总体进度
- **源组件总数**: 80 个文件
- **已迁移**: 5 个
- **进行中**: 0 个
- **待迁移**: 75 个
- **完成度**: 6.25%

## 已完成迁移

### 1. 通用基础组件 (common/)
已完成 5 个组件的迁移，均已转换为 Vue3 Composition API + TSX 格式：

#### ✅ LogIcon (log-icon.tsx)
- **状态**: 已完成
- **类型**: 图标组件
- **功能**: 支持 SVG 和 iconfont 两种图标方式
- **Props**: svg, type, common
- **Emits**: click
- **样式**: log-icon.scss
- **依赖**: 无外部依赖

#### ✅ EmptyStatus (empty-status.tsx)
- **状态**: 已完成
- **类型**: 空状态组件
- **功能**: 支持多种空状态展示（empty, search-empty, 500, 403）
- **Props**: emptyType, scene, showOperation, showText
- **Emits**: operation
- **样式**: empty-status.scss
- **依赖**: vue-i18n (需要配置)

#### ✅ StepBox (step-box.tsx)
- **状态**: 已完成
- **类型**: 步骤提示框组件
- **功能**: 引导步骤提示，支持多方向箭头（left, right, top, bottom）
- **Props**: placement, tipStyles, hasBorder
- **Slots**: title, content, action
- **样式**: step-box.scss
- **依赖**: 无外部依赖

#### ✅ BasicTab (basic-tab.tsx)
- **状态**: 已完成
- **类型**: 标签页组件
- **功能**: 基于 TDesign Tabs 封装的基础标签页
- **Props**: value, placement, theme
- **Emits**: change, update:value
- **样式**: basic-tab.scss
- **依赖**: tdesign-vue-next

#### ✅ TableStatus (table-status.tsx)
- **状态**: 已完成
- **类型**: 表格状态组件
- **功能**: 在表格中显示成功/失败状态
- **Props**: isError
- **样式**: table-status.scss
- **依赖**: tdesign-vue-next (Icon), vue-i18n

### Git 提交记录
```bash
commit 4820b9b39
feat: 迁移通用基础组件（LogIcon, EmptyStatus, StepBox, BasicTab）
```

## 待迁移组件分类

### 2. 通用基础组件 - 待迁移 (3个)
- [ ] **bklog-popover** (index.tsx) - 依赖 PopInstanceUtil
- [ ] **ellipsis-tag-list** (index.tsx) - 依赖 PopInstanceUtil, useResizeObserve
- [ ] **log-button** (index.vue) - 简单组件

### 3. 导航组件 (2个)
- [ ] **manage-nav** (nav/manage-nav.vue)
- [ ] **top-nav** (nav/top-nav.vue)

### 4. 表单相关组件 (5个)
- [ ] **time-range** (time-range.tsx) - 依赖 @blueking/date-picker
- [ ] **user-selector** (index.tsx) - 依赖 @blueking/bk-user-selector
- [ ] **ip-select** (right-panel.vue)
- [ ] **log-ip-selector** (log-ip-selector.tsx)
- [ ] **index-set-label-select** (index.tsx)

### 5. 对话框/弹窗组件 (3个)
- [ ] **global-dialog** (index.tsx)
- [ ] **global-setting** (index.tsx)
- [ ] **import-from-other-index-set** (index.tsx)

### 6. 公共组件 (common/) (4个)
- [ ] **auth-container-page** (auth-container-page.vue)
- [ ] **auth-dialog** (auth-dialog.vue)
- [ ] **fields-config** (fields-config.vue)
- [ ] **welcome-page** (welcome-page.vue)

### 7. 业务组件 - collection-access (18个)
- [ ] advance-clean-land.vue
- [ ] field-table.vue
- [ ] index.vue
- [ ] issued-slider.vue
- [ ] step-add.vue
- [ ] step-capacity.vue
- [ ] step-field.vue
- [ ] step-issued.vue
- [ ] step-masking.tsx
- [ ] step-result.vue
- [ ] step-storage.vue
- [ ] components/cluster-table.vue
- [ ] components/index-import-modal/index.tsx
- [ ] components/log-filter/index.tsx
- [ ] components/log-filter/validator-input.tsx
- [ ] components/step-add/* (9个子组件)

### 8. 业务组件 - log-masking (6个)
- [ ] masking-add-rule.tsx
- [ ] masking-extract.tsx
- [ ] masking-field-input.tsx
- [ ] masking-field.tsx
- [ ] masking-select-rule-table.tsx
- [ ] masking-setting.tsx

### 9. 业务组件 - filter-rule (4个)
- [ ] index.tsx
- [ ] config-rule/index.tsx
- [ ] config-rule/control-operate/index.tsx
- [ ] config-rule/rule-trigger/index.tsx

### 10. 业务组件 - rule-table (3个)
- [ ] index.tsx
- [ ] add-rule/index.tsx
- [ ] regex-popover/index.tsx

### 11. 业务组件 - rule-config-operate (2个)
- [ ] index.tsx
- [ ] debug-tool/index.tsx

### 12. 业务组件 - log-view (3个)
- [ ] index.vue
- [ ] log-view-control/index.tsx
- [ ] highlight-html.js

### 13. 业务组件 - monitor-echarts (10个)
- [ ] monitor-echarts-new.vue
- [ ] trend-chart.vue
- [ ] components/chart-annotation.vue
- [ ] components/chart-legend.vue
- [ ] components/chart-menu.vue
- [ ] components/chart-title-new.vue
- [ ] components/chart-title-old.vue
- [ ] components/chart-title-v2.vue
- [ ] components/chart-title.vue
- [ ] components/chart-tools.vue
- [ ] components/grade-option.tsx
- [ ] components/status-chart.vue
- [ ] components/text-chart.vue

### 14. 业务组件 - 其他 (2个)
- [ ] log-import/log-import.tsx

## 技术难点与依赖问题

### 外部依赖需要处理
1. **PopInstanceUtil** - 用于 popover 功能，需要检查 Vue3 版本是否已实现
2. **useResizeObserve** - 响应式监听钩子，需要检查是否已迁移
3. **@blueking/date-picker** - 日期选择器，需要 Vue3 版本
4. **@blueking/bk-user-selector** - 人员选择器，需要 Vue3 版本
5. **vue-class-component** - 部分组件使用类组件，需要完全转换为 Composition API

### 复杂业务组件
- **collection-access** 模块：包含 18 个组件，是采集接入的核心功能
- **monitor-echarts** 模块：包含 13 个组件，图表相关功能
- **log-view** 模块：日志查看核心组件

## 下一步计划

### 优先级 1 - 简单组件（立即处理）
1. log-button - 简单按钮组件
2. welcome-page - 欢迎页组件
3. auth-dialog - 权限对话框

### 优先级 2 - 对话框组件
1. global-dialog
2. global-setting
3. import-from-other-index-set

### 优先级 3 - 导航组件
1. manage-nav
2. top-nav

### 优先级 4 - 表单组件（需要处理外部依赖）
1. time-range
2. user-selector
3. index-set-label-select

### 优先级 5 - 业务组件（批量处理）
1. log-masking 模块 (6个)
2. filter-rule 模块 (4个)
3. rule-table 模块 (3个)
4. collection-access 模块 (18个)
5. monitor-echarts 模块 (13个)

## 迁移检查清单

每个组件完成后需确认：
- [x] 转换为 Composition API
- [x] 使用 TSX 语法
- [x] 完整的 TypeScript 类型定义
- [x] Props 类型定义
- [x] Emits 定义
- [x] JSDoc 注释
- [x] 响应式处理正确
- [x] bkui-vue2 → TDesign Vue Next 组件替换
- [x] 事件处理适配（on-xxx → onXxx）
- [x] v-model 适配（value → modelValue）
- [x] $listeners → attrs
- [x] $slots 正确使用
- [x] 样式文件迁移
- [ ] 单元测试（可选）

## 注意事项
1. 保持业务逻辑不变
2. 保持交互行为一致
3. 保持样式一致
4. 处理 i18n 国际化
5. 处理 store 依赖（需要 Pinia 适配）
