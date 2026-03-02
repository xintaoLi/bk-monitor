# BKLog Web-v3 全量功能迁移计划

## 执行时间
- 开始时间：2026-03-02 10:27 GMT+8
- 执行人：OpenClaw Agent

## 当前状态分析

### 文件数量对比
| 类型 | 旧版(src/) | 新版(web-v3/) | 差距 |
|------|-----------|--------------|------|
| Views页面 | 376 | 25 | 351 |
| Components组件 | 80 | 11 | 69 |
| **合计** | **456** | **36** | **420** |

### 完成度
- 组件迁移：11/80 = **13.75%**
- 页面迁移：25/376 = **6.65%**
- 总体进度：36/456 = **7.89%**

## 模块功能清单

### 1. Views 页面模块

#### ✅ 已完成 (25个)
- authorization/ - 权限管理 (1个)
- dashboard/ - 仪表盘 (1个)
- error/ - 错误页面 (3个: 403, 404, 500)
- manage/ - 管理模块骨架 (9个占位)
  - archive/
  - clean/
  - client-log/
  - cluster/
  - collection/
  - extract/
  - index-set/
  - log-collection/
  - index.tsx
- monitor/ - 监控模块骨架 (3个占位)
  - apm/
  - trace/
  - index.tsx
- retrieve/ - 检索模块骨架 (5个占位)
  - container/
  - favorite/
  - search-bar/
  - search-result/
  - toolbar/
- share/ - 分享 (1个)
- placeholder.tsx (占位页)

#### ❌ 待迁移 (351个)

##### A. retrieve 检索模块 (大量文件需整合)
**旧版有三个版本：retrieve/, retrieve-v2/, retrieve-v3/**

**retrieve-v3/** (最新版本，优先参考):
- container/
- favorite/
- grep/
- monitor/
- search-bar/
- search-result/
- toolbar/

**retrieve-v2/** (v2版本):
- collect/
- components/
- condition-comp/
- field-filter-comp/
- hooks/
- monitor/
- result-comp/
- search-bar/
- search-comp/
- search-result-chart/
- search-result-panel/
- search-result-tab/
- setting-modal/
- sub-bar/

**retrieve-core/** (核心功能):
- condition/
- original-log/
- result-comp/
- result-table-panel/

##### B. manage 管理模块 (需整合 manage/ 和 manage-v2/)

**manage/** (旧版):
- es-cluster-status/ - ES集群状态
  - es-cluster-mess/
- field-masking-separate/ - 字段脱敏
- log-archive/ - 日志归档
  - archive-list/
  - archive-repository/
  - archive-restore/
- log-clean/ - 日志清洗
  - clean-manage/
  - clean-template/
- manage-access/ - 采集接入 ⚠️ 核心模块
  - 大量子组件
- manage-data-link/ - 数据链路
- manage-extract/ - 日志提取管理
- report-management/ - 报表管理
- trace-track/ - 链路追踪
- index.vue

**manage-v2/** (新版):
- client-log/ - 客户端日志
  - collection-deploy/
  - collection-slider/
  - user-report/
- es-cluster/ - ES集群
  - cluster-manage/
- log-archive/ - 日志归档
  - archive-list/
  - archive-repository/
  - archive-restore/
- log-collection/ - 日志采集 ⚠️ 核心模块
  - components/ (大量子组件)
  - hooks/
- log-extract/ - 日志提取
  - index-set-manage/

##### C. extract 日志提取模块
- create/ - 创建提取任务
  - files-input.vue
  - index.vue
  - ip-select.vue
  - preview-files.vue
  - test-filter.vue
- home/ - 提取任务列表
  - download-url.vue
  - file-date-picker.vue
  - index.vue
  - list-box.vue
  - task-status-detail.vue
  - text-filter-detail.vue
- index.vue

##### D. authorization 权限管理 (部分完成)
- authorization-dialog.tsx
- authorization-list.tsx

##### E. dashboard 仪表盘 (部分完成)
- home.tsx
- old-index.vue

##### F. 其他模块
- data-id-url/ - 数据ID URL
- playground/ - 测试页面
- un-authorized/ - 未授权页面

### 2. Components 组件模块

#### ✅ 已完成 (11个)
**common/**:
- basic-tab.tsx ✅
- empty-status.tsx ✅
- log-button.scss ✅
- log-button.tsx ✅
- log-icon.scss ✅
- log-icon.tsx ✅
- step-box.scss ✅
- step-box.tsx ✅
- table-status.scss ✅
- table-status.tsx ✅
- welcome-page.scss ✅
- welcome-page.tsx ✅

#### ❌ 待迁移 (69个)

##### A. 基础组件 (优先级高)
- **bklog-popover/** - 弹出提示
- **ellipsis-tag-list/** - 省略标签列表
- **log-button/** - 日志按钮 (Vue 版本)

##### B. 导航组件
- **nav/**
  - manage-nav.vue - 管理页导航
  - top-nav.vue - 顶部导航

##### C. 对话框/弹窗组件
- **global-dialog/** - 全局对话框
- **global-setting/** - 全局设置
- **import-from-other-index-set/** - 从其他索引集导入

##### D. 表单组件
- **time-range/** - 时间范围选择
- **user-selector/** - 用户选择器
- **ip-select/** - IP选择器
- **log-ip-selector/** - 日志IP选择器
- **index-set-label-select/** - 索引集标签选择

##### E. 通用组件
- **common/**
  - auth-container-page.vue - 权限容器页
  - auth-dialog.vue - 权限对话框
  - fields-config.vue - 字段配置
  - welcome-page.vue - 欢迎页 (Vue版本)

##### F. 业务组件 - collection-access (⚠️ 核心模块，18个文件)
- advance-clean-land.vue
- field-table.vue
- index.vue
- issued-slider.vue
- step-add.vue
- step-capacity.vue
- step-field.vue
- step-issued.vue
- step-masking.tsx
- step-result.vue
- step-storage.vue
- **components/**
  - cluster-table.vue
  - index-import-modal/
  - log-filter/
  - step-add/ (9个子组件)

##### G. 业务组件 - log-masking (字段脱敏，6个文件)
- masking-add-rule.tsx
- masking-extract.tsx
- masking-field-input.tsx
- masking-field.tsx
- masking-select-rule-table.tsx
- masking-setting.tsx

##### H. 业务组件 - filter-rule (过滤规则，4个文件)
- index.tsx
- config-rule/index.tsx
- config-rule/control-operate/index.tsx
- config-rule/rule-trigger/index.tsx

##### I. 业务组件 - rule-table (规则表，3个文件)
- index.tsx
- add-rule/index.tsx
- regex-popover/index.tsx

##### J. 业务组件 - rule-config-operate (规则配置操作，2个文件)
- index.tsx
- debug-tool/index.tsx

##### K. 业务组件 - log-view (日志查看，3个文件)
- index.vue
- log-view-control/index.tsx
- highlight-html.js

##### L. 业务组件 - monitor-echarts (监控图表，13个文件)
- monitor-echarts-new.vue
- trend-chart.vue
- **components/**
  - chart-annotation.vue
  - chart-legend.vue
  - chart-menu.vue
  - chart-title-new.vue
  - chart-title-old.vue
  - chart-title-v2.vue
  - chart-title.vue
  - chart-tools.vue
  - grade-option.tsx
  - status-chart.vue
  - text-chart.vue

##### M. 业务组件 - 其他
- **log-import/** - 日志导入
  - log-import.tsx
  - log-import.scss

## 迁移策略

### 阶段 1：基础设施完善 (高优先级)
**目标：确保基础组件和通用功能完整**

1. **基础组件补全** (预计：30分钟)
   - [ ] bklog-popover
   - [ ] ellipsis-tag-list
   - [ ] log-button (Vue版本升级)
   - [ ] time-range
   - [ ] user-selector

2. **通用组件** (预计：20分钟)
   - [ ] auth-container-page
   - [ ] auth-dialog
   - [ ] fields-config
   - [ ] welcome-page (Vue版本升级)

3. **导航组件** (预计：30分钟)
   - [ ] manage-nav
   - [ ] top-nav

4. **对话框组件** (预计：20分钟)
   - [ ] global-dialog
   - [ ] global-setting
   - [ ] import-from-other-index-set

### 阶段 2：核心业务组件 (关键路径)
**目标：完成核心业务功能的组件支撑**

1. **collection-access 采集接入** (预计：1小时) ⚠️ 最复杂
   - 18个组件文件
   - step-add 下9个子组件
   - 核心采集配置流程

2. **log-masking 字段脱敏** (预计：30分钟)
   - 6个组件文件
   - 脱敏规则配置

3. **filter-rule 过滤规则** (预计：20分钟)
   - 4个组件文件
   - 规则配置和触发

4. **rule-table 规则表** (预计：15分钟)
   - 3个组件文件
   - 规则管理表格

5. **log-view 日志查看** (预计：30分钟)
   - 3个组件文件
   - 日志高亮显示

6. **monitor-echarts 监控图表** (预计：1小时)
   - 13个组件文件
   - 图表展示和交互

### 阶段 3：Views 页面完整迁移
**目标：完成所有页面功能，整合多版本代码**

1. **retrieve 检索模块** (预计：2小时) ⚠️ 最大模块
   - 整合 retrieve-v3 (最新)
   - 参考 retrieve-v2 和 retrieve-core
   - 完整的检索功能
   - 字段过滤、结果展示、收藏夹等

2. **manage 管理模块** (预计：2.5小时) ⚠️ 功能最多
   - 整合 manage 和 manage-v2
   - ES集群管理
   - 日志归档
   - 日志清洗
   - 日志采集 (核心)
   - 客户端日志
   - 数据链路
   - 字段脱敏
   - 报表管理

3. **extract 日志提取** (预计：45分钟)
   - 创建提取任务
   - 任务列表管理
   - 文件预览和过滤

4. **dashboard 仪表盘** (预计：30分钟)
   - 主页展示
   - 数据统计

5. **authorization 权限管理** (预计：20分钟)
   - 权限申请
   - 权限列表

6. **其他页面** (预计：30分钟)
   - share 分享
   - data-id-url
   - un-authorized

### 阶段 4：配套设施
**目标：完善路由、Store、工具类**

1. **路由配置** (预计：30分钟)
   - 对比旧版路由
   - 补全所有路由定义
   - 路由守卫和权限

2. **Store 迁移** (预计：45分钟)
   - Vuex → Pinia
   - 所有 store 模块迁移
   - 状态管理完整性

3. **工具类和API** (预计：30分钟)
   - 工具函数补全
   - API 接口检查
   - 常量和类型定义

### 阶段 5：验证和文档
**目标：确保无功能遗漏**

1. **功能对比清单** (预计：30分钟)
   - 逐模块对比
   - 生成对比表格
   - 标记技术债务

2. **文档更新** (预计：20分钟)
   - 更新迁移进度文档
   - 记录已知问题
   - 添加开发说明

## 技术规范

### 代码规范
- ✅ Vue3 Composition API
- ✅ TypeScript 严格模式
- ✅ TSX 语法 (优先)
- ✅ TDesign Vue Next 组件库
- ✅ JSDoc 注释
- ✅ ESLint 规范

### 迁移检查清单
每个组件/页面迁移时必须确认：
- [ ] Composition API (setup)
- [ ] TypeScript 类型定义完整
- [ ] Props 类型和默认值
- [ ] Emits 明确定义
- [ ] bkui-vue → TDesign 组件替换
- [ ] 事件命名 (on-xxx → onXxx)
- [ ] v-model 适配 (value → modelValue)
- [ ] $listeners → attrs
- [ ] $slots 正确使用
- [ ] i18n 国际化处理
- [ ] Store 状态管理 (Pinia)
- [ ] 样式文件迁移
- [ ] 业务逻辑保持一致
- [ ] 交互行为一致

## 预计总时间
- 阶段1：2小时
- 阶段2：3.5小时
- 阶段3：6.5小时
- 阶段4：1.75小时
- 阶段5：50分钟
- **总计：约 14.5 小时**

## 注意事项
1. ⚠️ 不遗留任何占位符或 TODO
2. ⚠️ 保持与旧版功能完全一致
3. ⚠️ 每完成一个模块提交代码
4. ⚠️ 遇到依赖问题立即记录
5. ⚠️ 复杂组件先写单元测试

## 已知依赖问题
需要在迁移过程中解决：
1. PopInstanceUtil - 弹窗实例工具
2. useResizeObserve - 响应式尺寸监听
3. @blueking/date-picker - 日期选择器 Vue3 版本
4. @blueking/bk-user-selector - 用户选择器 Vue3 版本
5. vue-class-component → Composition API

---

**状态：执行中**  
**最后更新：2026-03-02 10:27 GMT+8**
