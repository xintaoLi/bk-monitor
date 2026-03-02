# BKLog Web-v3 精准迁移计划

## 当前状态 (2026-03-02 10:28)

### 生产版本实际使用
- **src/views/retrieve-v3/** - 检索模块 V3 (91个文件) ✅ 生产使用
- **src/views/manage-v2/** - 管理模块 V2 (92个文件) ✅ 生产使用
- **src/components/** - 共享组件 (80个文件)

### 已迁移到 web-v3
- **components/common/** - 7个基础组件 ✅
- **views/** - 25个占位页面（多数为空骨架）

### 迁移差距
- **Retrieve模块**: 91个文件待迁移
- **Manage模块**: 92个文件待迁移
- **Components**: 73个组件待迁移
- **合计**: ~256个文件需完整实现

---

## 实际迁移任务清单

### 阶段 1：Retrieve 检索模块 (91个文件)

#### 1.1 主入口和容器 (3个)
- [ ] index.tsx - 主入口
- [ ] index.type.tsx - 类型定义
- [ ] container/index.tsx - 容器组件

#### 1.2 Search Bar 搜索栏 (3个)
- [ ] search-bar/index.tsx
- [ ] search-bar/types.ts
- [ ] search-bar/ai-mode/index.tsx - AI搜索模式

#### 1.3 Toolbar 工具栏 (1个)
- [ ] toolbar/index.tsx

#### 1.4 Favorite 收藏夹 (13个)
- [ ] favorite/index.tsx
- [ ] favorite/collect-main.tsx
- [ ] favorite/hooks/use-favorite.ts
- [ ] favorite/types/index.ts
- [ ] favorite/utils/index.ts
- [ ] favorite/components/collect-head/collect-head.tsx
- [ ] favorite/components/collect-list/collect-list.tsx
- [ ] favorite/components/collect-list/add-group.tsx
- [ ] favorite/components/collect-list/edit-dialog.tsx
- [ ] favorite/components/collect-tab/collect-tab.tsx
- [ ] favorite/components/collect-tool/collect-tool.tsx
- [ ] favorite/components/drag-container/drag-container.tsx

#### 1.5 Grep CLI搜索 (7个)
- [ ] grep/index.tsx
- [ ] grep/grep-cli.tsx
- [ ] grep/grep-cli-editor.tsx
- [ ] grep/grep-cli-result.tsx
- [ ] grep/grep-cli-total.tsx
- [ ] grep/grep-highlighter.ts
- [ ] grep/grep-validator.ts
- [ ] grep/types.ts

#### 1.6 Monitor 监控集成 (4个)
- [ ] monitor/monitor.tsx
- [ ] monitor/apm.ts
- [ ] monitor/trace.ts
- [ ] monitor/use-monitor-app-init.ts

#### 1.7 Search Result 搜索结果 (60个)

##### 1.7.1 主结构 (1个)
- [ ] search-result/index.tsx

##### 1.7.2 Original Log 原始日志 (12个)
- [ ] search-result/original-log/components/common-header/index.tsx
- [ ] search-result/original-log/components/data-filter/index.tsx
- [ ] search-result/original-log/components/data-filter/fields-config/index.tsx
- [ ] search-result/original-log/components/data-filter/highlight-control/index.tsx
- [ ] search-result/original-log/components/origin-log-result/index.tsx
- [ ] search-result/original-log/components/origin-log-result/render-json-cell/index.tsx
- [ ] search-result/original-log/context-log/index.tsx
- [ ] search-result/original-log/real-time-log/index.tsx

##### 1.7.3 Log Clustering 日志聚类 (38个) ⚠️ 核心功能
- [ ] search-result/log-clustering/index.tsx
- [ ] search-result/log-clustering/cluster-start-fail/index.tsx
- [ ] search-result/log-clustering/empty-cluster/index.tsx
- [ ] search-result/log-clustering/quick-open-cluster/index.tsx
- [ ] search-result/log-clustering/quick-open-cluster/cluster-access/index.tsx
- [ ] search-result/log-clustering/quick-open-cluster/cluster-access/preview-result/index.tsx

**Log Table 日志表格 (16个)**
- [ ] search-result/log-clustering/log-table/index.tsx
- [ ] search-result/log-clustering/log-table/content-table/index.tsx
- [ ] search-result/log-clustering/log-table/content-table/utils.ts
- [ ] search-result/log-clustering/log-table/content-table/remark-edit-tip/index.tsx
- [ ] search-result/log-clustering/log-table/content-table/cluster-popover/index.tsx
- [ ] search-result/log-clustering/log-table/content-table/cluster-popover/regex-match/index.tsx
- [ ] search-result/log-clustering/log-table/content-table/cluster-popover/regex-match/occupy-input/index.tsx
- [ ] search-result/log-clustering/log-table/content-table/cluster-popover/regex-match/regex-preview/index.tsx
- [ ] search-result/log-clustering/log-table/content-table/cluster-popover/regex-match/regex-preview/custom-highlight/index.tsx
- [ ] search-result/log-clustering/log-table/content-table/cluster-popover/regex-match/regex-table/index.tsx
- [ ] search-result/log-clustering/log-table/content-table/cluster-popover/regex-match/regex-table/validate-input/index.tsx
- [ ] search-result/log-clustering/log-table/content-table/cluster-popover/regex-match/regex-table/validate-input/use-validtor.ts
- [ ] search-result/log-clustering/log-table/content-table/cluster-popover/regex-match/second-confirm/index.tsx
- [ ] search-result/log-clustering/log-table/main-header/index.tsx
- [ ] search-result/log-clustering/log-table/main-header/head-column.tsx
- [ ] search-result/log-clustering/log-table/main-header/filter-operate/index.tsx
- [ ] search-result/log-clustering/log-table/main-header/sort-operate/index.tsx

**Top Operation 顶部操作 (16个)**
- [ ] search-result/log-clustering/top-operation/index.tsx
- [ ] search-result/log-clustering/top-operation/cluster-config/index.tsx
- [ ] search-result/log-clustering/top-operation/cluster-config/edit-config/index.tsx
- [ ] search-result/log-clustering/top-operation/cluster-config/edit-config/rule-operate/index.tsx
- [ ] search-result/log-clustering/top-operation/cluster-config/edit-config/rule-operate/util.ts
- [ ] search-result/log-clustering/top-operation/cluster-download/index.tsx
- [ ] search-result/log-clustering/top-operation/email-subscription/index.tsx
- [ ] search-result/log-clustering/top-operation/email-subscription/create-subscription/index.tsx
- [ ] search-result/log-clustering/top-operation/email-subscription/create-subscription/subscription-form/index.tsx
- [ ] search-result/log-clustering/top-operation/email-subscription/create-subscription/subscription-form/email-config/index.tsx
- [ ] search-result/log-clustering/top-operation/email-subscription/create-subscription/subscription-form/send-config/index.tsx
- [ ] search-result/log-clustering/top-operation/email-subscription/create-subscription/subscription-form/subscription-content/index.tsx
- [ ] search-result/log-clustering/top-operation/quick-filter/index.tsx
- [ ] search-result/log-clustering/top-operation/quick-filter/dimension-split/index.tsx
- [ ] search-result/log-clustering/top-operation/quick-filter/temporary-group/index.tsx
- [ ] search-result/log-clustering/top-operation/quick-filter/time-compare/index.tsx
- [ ] search-result/log-clustering/top-operation/strategy/index.tsx
- [ ] search-result/log-clustering/top-operation/strategy/config-item/index.tsx
- [ ] search-result/log-clustering/top-operation/strategy/edit-strategy/index.tsx

##### 1.7.4 Template Manage 模板管理 (9个)
- [ ] search-result/template-manage/index.tsx
- [ ] search-result/template-manage/create-template/index.tsx
- [ ] search-result/template-manage/index-set-list/index.tsx
- [ ] search-result/template-manage/template-list/index.tsx
- [ ] search-result/template-manage/template-list/create-template/index.tsx
- [ ] search-result/template-manage/template-list/template-item/index.tsx
- [ ] search-result/template-manage/template-list/template-item/delete-template/index.tsx
- [ ] search-result/template-manage/template-list/template-item/edit-template/index.tsx

#### 1.8 App初始化 (1个)
- [ ] use-app-init.tsx

---

### 阶段 2：Manage 管理模块 (92个文件)

#### 2.1 Client Log 客户端日志 (11个)
- [ ] client-log/index.tsx
- [ ] client-log/collection-deploy/index.tsx
- [ ] client-log/collection-deploy/collection-table.tsx
- [ ] client-log/collection-deploy/types.ts
- [ ] client-log/collection-slider/index.tsx
- [ ] client-log/user-report/index.tsx
- [ ] client-log/user-report/report-table.tsx
- [ ] client-log/user-report/types.ts
- [ ] client-log/user-report/upload-result.tsx
- [ ] client-log/hooks/use-search-task.ts
- [ ] client-log/hooks/use-table-setting.ts

#### 2.2 ES Cluster ES集群 (4个)
- [ ] es-cluster/cluster-manage/index.tsx
- [ ] es-cluster/cluster-manage/es-dialog.tsx
- [ ] es-cluster/cluster-manage/es-slider.tsx
- [ ] es-cluster/cluster-manage/intro-panel.tsx

#### 2.3 Log Archive 日志归档 (7个)
- [ ] log-archive/archive-list/index.tsx
- [ ] log-archive/archive-list/list-slider.tsx
- [ ] log-archive/archive-list/state-table.tsx
- [ ] log-archive/archive-repository/index.tsx
- [ ] log-archive/archive-repository/repository-slider.tsx
- [ ] log-archive/archive-restore/index.tsx
- [ ] log-archive/archive-restore/restore-slider.tsx

#### 2.4 Log Collection 日志采集 (58个) ⚠️ 最大模块
- [ ] log-collection/index.tsx
- [ ] log-collection/type.ts
- [ ] log-collection/utils.ts
- [ ] log-collection/hook/useCollectList.ts
- [ ] log-collection/hook/useOperation.tsx

##### 2.4.1 List Main 列表主页 (3个)
- [ ] log-collection/components/list-main/left-list.tsx
- [ ] log-collection/components/list-main/list-item.tsx
- [ ] log-collection/components/list-main/table-list.tsx

##### 2.4.2 Common Components 通用组件 (7个)
- [ ] log-collection/components/common-comp/classify-card.tsx
- [ ] log-collection/components/common-comp/drag-tag.tsx
- [ ] log-collection/components/common-comp/host-detail.tsx
- [ ] log-collection/components/common-comp/info-tips.tsx
- [ ] log-collection/components/common-comp/input-add-group.tsx
- [ ] log-collection/components/common-comp/table-component.tsx
- [ ] log-collection/components/common-comp/tag-more.tsx
- [ ] log-collection/components/common-comp/tree-component.tsx

##### 2.4.3 Create Operation 创建操作 (6个)
- [ ] log-collection/components/create-operation/index.tsx
- [ ] log-collection/components/create-operation/defaultConfig.ts
- [ ] log-collection/components/create-operation/step1-classify.tsx
- [ ] log-collection/components/create-operation/step2-bk-data-collection.tsx
- [ ] log-collection/components/create-operation/step2-configuration.tsx
- [ ] log-collection/components/create-operation/step2-custom-report.tsx
- [ ] log-collection/components/create-operation/step3-clean.tsx
- [ ] log-collection/components/create-operation/step4-storage.tsx

##### 2.4.4 Business Components Step2 配置步骤 (21个)
- [ ] log-collection/components/business-comp/step2/add-index-set.tsx
- [ ] log-collection/components/business-comp/step2/base-info.tsx
- [ ] log-collection/components/business-comp/step2/device-metadata.tsx
- [ ] log-collection/components/business-comp/step2/event-filter.tsx
- [ ] log-collection/components/business-comp/step2/index-config-import-dialog.tsx
- [ ] log-collection/components/business-comp/step2/index-set-select.tsx
- [ ] log-collection/components/business-comp/step2/line-rule-config.tsx
- [ ] log-collection/components/business-comp/step2/log-filter.tsx
- [ ] log-collection/components/business-comp/step2/log-path-config.tsx
- [ ] log-collection/components/business-comp/step2/multiline-reg-dialog.tsx
- [ ] log-collection/components/business-comp/step2/validator-input.tsx

**Container Collection 容器采集 (9个)**
- [ ] log-collection/components/business-comp/step2/container-collection/append-log-tags.tsx
- [ ] log-collection/components/business-comp/step2/container-collection/config-cluster-box.tsx
- [ ] log-collection/components/business-comp/step2/container-collection/config-log-set-edit-item.tsx
- [ ] log-collection/components/business-comp/step2/container-collection/config-view-dialog.tsx
- [ ] log-collection/components/business-comp/step2/container-collection/configuration-item-list.tsx
- [ ] log-collection/components/business-comp/step2/container-collection/label-choose-dialog.tsx
- [ ] log-collection/components/business-comp/step2/container-collection/label-item-choose.tsx
- [ ] log-collection/components/business-comp/step2/container-collection/workload-selection.tsx

**Third Party Logs 第三方日志 (2个)**
- [ ] log-collection/components/business-comp/step2/third-party-logs/bkdata-select-dialog.tsx
- [ ] log-collection/components/business-comp/step2/third-party-logs/es-select-dialog.tsx

##### 2.4.5 Business Components Step3-4 (3个)
- [ ] log-collection/components/business-comp/step3/collect-issued-slider.tsx
- [ ] log-collection/components/business-comp/step3/field-list.tsx
- [ ] log-collection/components/business-comp/step3/report-log-slider.tsx
- [ ] log-collection/components/business-comp/step4/cluster-table.tsx

#### 2.5 Log Extract 日志提取 (12个)
- [ ] log-extract/extract-config/index.tsx
- [ ] log-extract/extract-config/config-slider.tsx
- [ ] log-extract/extract-config/module-select.tsx
- [ ] log-extract/extract-config/validate-input.tsx
- [ ] log-extract/extract-link/link-create.tsx
- [ ] log-extract/extract-link/link-list.tsx
- [ ] log-extract/extract-task/index.tsx
- [ ] log-extract/extract-task/task-create/index.tsx
- [ ] log-extract/extract-task/task-create/file-date-picker.tsx
- [ ] log-extract/extract-task/task-create/files-input.tsx
- [ ] log-extract/extract-task/task-create/preview-files.tsx
- [ ] log-extract/extract-task/task-create/text-filter.tsx
- [ ] log-extract/extract-task/task-list/index.tsx
- [ ] log-extract/extract-task/task-list/download-url.tsx
- [ ] log-extract/extract-task/task-list/list-box.tsx
- [ ] log-extract/extract-task/task-list/task-status-detail.tsx
- [ ] log-extract/extract-task/task-list/text-filter-detail.tsx

#### 2.6 Hooks 通用钩子 (3个)
- [ ] hooks/use-drag.ts
- [ ] hooks/use-sidebar-diff.ts
- [ ] hooks/use-space-selector.ts

#### 2.7 工具类 (1个)
- [ ] manage-helper.ts

---

### 阶段 3：Components 共享组件 (73个)

#### 3.1 基础组件 (已完成7个，待补充3个)
- [x] common/basic-tab.tsx ✅
- [x] common/empty-status.tsx ✅
- [x] common/log-button.tsx ✅
- [x] common/log-icon.tsx ✅
- [x] common/step-box.tsx ✅
- [x] common/table-status.tsx ✅
- [x] common/welcome-page.tsx ✅
- [ ] common/auth-container-page (Vue版本需升级)
- [ ] common/auth-dialog (Vue版本需升级)
- [ ] common/fields-config (Vue版本需升级)

#### 3.2 表单组件 (5个)
- [ ] time-range/
- [ ] user-selector/
- [ ] ip-select/right-panel.vue
- [ ] log-ip-selector/log-ip-selector.tsx
- [ ] index-set-label-select/

#### 3.3 弹窗组件 (5个)
- [ ] bklog-popover/
- [ ] global-dialog/
- [ ] global-setting/
- [ ] import-from-other-index-set/
- [ ] ellipsis-tag-list/

#### 3.4 导航组件 (2个)
- [ ] nav/manage-nav.vue
- [ ] nav/top-nav.vue

#### 3.5 业务组件 - Collection Access (18个) ⚠️ 核心
见旧计划 - 采集接入完整流程组件

#### 3.6 业务组件 - Log Masking (6个)
见旧计划 - 字段脱敏组件

#### 3.7 业务组件 - Filter Rule (4个)
见旧计划 - 过滤规则组件

#### 3.8 业务组件 - Rule Table (3个)
见旧计划 - 规则表组件

#### 3.9 业务组件 - Log View (3个)
见旧计划 - 日志查看组件

#### 3.10 业务组件 - Monitor Echarts (13个)
见旧计划 - 监控图表组件

#### 3.11 其他业务组件 (2个)
- [ ] log-import/log-import.tsx
- [ ] log-button/index.vue (Vue版本)

---

## 执行策略

### 优先级排序
1. **P0 - 关键路径** (先让系统跑起来)
   - Retrieve主框架 (3个)
   - Manage主框架 (1个)
   - Search Bar (3个)
   - Search Result框架 (1个)
   - Original Log基础功能 (8个)
   
2. **P1 - 核心功能** (完整的业务功能)
   - Log Clustering聚类 (38个)
   - Log Collection采集 (58个)
   - Log Extract提取 (12个)
   
3. **P2 - 扩展功能**
   - Favorite收藏 (13个)
   - Grep搜索 (7个)
   - Template模板 (9个)
   - Client Log (11个)
   - ES Cluster (4个)
   - Log Archive (7个)
   
4. **P3 - 支撑组件**
   - 共享组件补全 (73个)

### 执行计划
**阶段1：骨架搭建** (2小时)
- 主入口和路由
- 基本框架组件
- 原始日志查看

**阶段2：核心功能** (6小时)
- 日志聚类完整功能
- 日志采集完整流程
- 日志提取功能

**阶段3：扩展功能** (4小时)
- 收藏夹、Grep、模板
- 客户端日志、归档、集群

**阶段4：组件补全** (3小时)
- 共享组件迁移

**总计：约15小时**

---

**状态：准备执行**  
**最后更新：2026-03-02 10:35 GMT+8**
