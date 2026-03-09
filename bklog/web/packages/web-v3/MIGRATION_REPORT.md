# BKLog Web-v3 Vuex → Pinia 迁移报告

**生成时间**: 2026-03-02T03:14:21.360Z
**工作目录**: /root/clawd/bk-monitor/bklog/web/packages/web-v3

---

## 📊 迁移统计

- **总文件数**: 246
- **已修改文件数**: 101
- **错误数**: 0
- **成功率**: 41.06%

---

## ✅ 已修改的文件列表

1. `src/views/retrieve/favorite/collect-main.tsx`
2. `src/views/retrieve/favorite/components/collect-list/add-group.tsx`
3. `src/views/retrieve/favorite/components/collect-list/collect-list.tsx`
4. `src/views/retrieve/favorite/components/collect-list/edit-dialog.tsx`
5. `src/views/retrieve/favorite/hooks/use-favorite.ts`
6. `src/views/retrieve/grep/grep-cli.tsx`
7. `src/views/retrieve/grep/index.tsx`
8. `src/views/retrieve/index.tsx`
9. `src/views/retrieve/monitor/monitor.tsx`
10. `src/views/retrieve/monitor/use-monitor-app-init.ts`
11. `src/views/retrieve/search-bar/index.tsx`
12. `src/views/retrieve/search-result/index.tsx`
13. `src/views/retrieve/search-result/log-clustering/empty-cluster/index.tsx`
14. `src/views/retrieve/search-result/log-clustering/index.tsx`
15. `src/views/retrieve/search-result/log-clustering/log-table/content-table/cluster-popover/regex-match/index.tsx`
16. `src/views/retrieve/search-result/log-clustering/log-table/content-table/index.tsx`
17. `src/views/retrieve/search-result/log-clustering/log-table/content-table/remark-edit-tip/index.tsx`
18. `src/views/retrieve/search-result/log-clustering/log-table/content-table/utils.ts`
19. `src/views/retrieve/search-result/log-clustering/log-table/index.tsx`
20. `src/views/retrieve/search-result/log-clustering/quick-open-cluster/cluster-access/index.tsx`
21. `src/views/retrieve/search-result/log-clustering/top-operation/cluster-config/edit-config/index.tsx`
22. `src/views/retrieve/search-result/log-clustering/top-operation/cluster-config/edit-config/rule-operate/index.tsx`
23. `src/views/retrieve/search-result/log-clustering/top-operation/cluster-download/index.tsx`
24. `src/views/retrieve/search-result/log-clustering/top-operation/email-subscription/create-subscription/index.tsx`
25. `src/views/retrieve/search-result/log-clustering/top-operation/email-subscription/create-subscription/subscription-form/index.tsx`
26. `src/views/retrieve/search-result/log-clustering/top-operation/email-subscription/create-subscription/subscription-form/send-config/index.tsx`
27. `src/views/retrieve/search-result/log-clustering/top-operation/email-subscription/create-subscription/subscription-form/subscription-content/index.tsx`
28. `src/views/retrieve/search-result/log-clustering/top-operation/email-subscription/index.tsx`
29. `src/views/retrieve/search-result/log-clustering/top-operation/strategy/edit-strategy/index.tsx`
30. `src/views/retrieve/search-result/log-clustering/top-operation/strategy/index.tsx`
31. `src/views/retrieve/search-result/original-log/components/data-filter/fields-config/index.tsx`
32. `src/views/retrieve/search-result/original-log/components/origin-log-result/index.tsx`
33. `src/views/retrieve/search-result/original-log/context-log/index.tsx`
34. `src/views/retrieve/search-result/template-manage/create-template/index.tsx`
35. `src/views/retrieve/search-result/template-manage/template-list/create-template/index.tsx`
36. `src/views/retrieve/search-result/template-manage/template-list/index.tsx`
37. `src/views/retrieve/use-app-init.tsx`
38. `src/views/manage/archive/archive-list/index.tsx`
39. `src/views/manage/archive/archive-list/list-slider.tsx`
40. `src/views/manage/archive/archive-repository/index.tsx`
41. `src/views/manage/archive/archive-repository/repository-slider.tsx`
42. `src/views/manage/archive/archive-restore/index.tsx`
43. `src/views/manage/archive/archive-restore/restore-slider.tsx`
44. `src/views/manage/client-log/collection-deploy/collection-table.tsx`
45. `src/views/manage/client-log/collection-deploy/index.tsx`
46. `src/views/manage/client-log/collection-slider/index.tsx`
47. `src/views/manage/client-log/hooks/use-search-task.ts`
48. `src/views/manage/client-log/index.tsx`
49. `src/views/manage/client-log/user-report/index.tsx`
50. `src/views/manage/client-log/user-report/report-table.tsx`
51. `src/views/manage/cluster/cluster-manage/es-slider.tsx`
52. `src/views/manage/cluster/cluster-manage/index.tsx`
53. `src/views/manage/cluster/cluster-manage/intro-panel.tsx`
54. `src/views/manage/extract/extract-config/config-slider.tsx`
55. `src/views/manage/extract/extract-config/index.tsx`
56. `src/views/manage/extract/extract-config/module-select.tsx`
57. `src/views/manage/extract/extract-link/link-create.tsx`
58. `src/views/manage/extract/extract-link/link-list.tsx`
59. `src/views/manage/extract/extract-task/index.tsx`
60. `src/views/manage/extract/extract-task/task-create/index.tsx`
61. `src/views/manage/extract/extract-task/task-create/preview-files.tsx`
62. `src/views/manage/extract/extract-task/task-list/download-url.tsx`
63. `src/views/manage/extract/extract-task/task-list/index.tsx`
64. `src/views/manage/hooks/use-drag.ts`
65. `src/views/manage/log-collection/components/business-comp/step2/add-index-set.tsx`
66. `src/views/manage/log-collection/components/business-comp/step2/base-info.tsx`
67. `src/views/manage/log-collection/components/business-comp/step2/container-collection/config-cluster-box.tsx`
68. `src/views/manage/log-collection/components/business-comp/step2/container-collection/config-log-set-edit-item.tsx`
69. `src/views/manage/log-collection/components/business-comp/step2/container-collection/configuration-item-list.tsx`
70. `src/views/manage/log-collection/components/business-comp/step2/container-collection/workload-selection.tsx`
71. `src/views/manage/log-collection/components/business-comp/step2/index-config-import-dialog.tsx`
72. `src/views/manage/log-collection/components/business-comp/step2/log-filter.tsx`
73. `src/views/manage/log-collection/components/business-comp/step2/multiline-reg-dialog.tsx`
74. `src/views/manage/log-collection/components/business-comp/step2/third-party-logs/bkdata-select-dialog.tsx`
75. `src/views/manage/log-collection/components/business-comp/step2/third-party-logs/es-select-dialog.tsx`
76. `src/views/manage/log-collection/components/business-comp/step3/collect-issued-slider.tsx`
77. `src/views/manage/log-collection/components/business-comp/step3/field-list.tsx`
78. `src/views/manage/log-collection/components/business-comp/step4/cluster-table.tsx`
79. `src/views/manage/log-collection/components/create-operation/step2-bk-data-collection.tsx`
80. `src/views/manage/log-collection/components/create-operation/step2-configuration.tsx`
81. `src/views/manage/log-collection/components/create-operation/step2-custom-report.tsx`
82. `src/views/manage/log-collection/components/create-operation/step3-clean.tsx`
83. `src/views/manage/log-collection/components/create-operation/step4-storage.tsx`
84. `src/views/manage/log-collection/hook/useCollectList.ts`
85. `src/views/manage/log-collection/hook/useOperation.tsx`
86. `src/components/business/collection-access/components/index-import-modal/index.tsx`
87. `src/components/business/collection-access/components/log-filter/index.tsx`
88. `src/components/business/collection-access/step-masking.tsx`
89. `src/components/business/filter-rule/config-rule/index.tsx`
90. `src/components/business/log-masking/masking-add-rule.tsx`
91. `src/components/business/log-masking/masking-field.tsx`
92. `src/components/business/log-masking/masking-select-rule-table.tsx`
93. `src/components/business/log-masking/masking-setting.tsx`
94. `src/components/business/monitor-echarts/components/grade-option.tsx`
95. `src/components/common/global-setting/index.tsx`
96. `src/components/common/import-from-other-index-set/index.tsx`
97. `src/components/common/log-ip-selector/log-ip-selector.tsx`
98. `src/components/common/time-range/time-range.tsx`
99. `src/components/common/user-selector/index.tsx`
100. `src/composables/use-field-alias-request-params.tsx`
101. `src/composables/use-retrieve-params.ts`

---

## ❌ 错误列表

无错误

---

## 📝 替换规则

### 1. Import 替换
```typescript
// 旧代码
import { useStore } from 'vuex';

// 新代码
import { useGlobalStore } from '@/stores/global';
import { useRetrieveStore } from '@/stores/retrieve';
import { useUserStore } from '@/stores/user';
import { useCollectStore } from '@/stores/collect';
import { useIndexFieldStore } from '@/stores/index-field';
import { useStorageStore } from '@/stores/storage';
```

### 2. Store 实例化替换
```typescript
// 旧代码
const store = useStore();

// 新代码
const globalStore = useGlobalStore();
const retrieveStore = useRetrieveStore();
const userStore = useUserStore();
const collectStore = useCollectStore();
const indexFieldStore = useIndexFieldStore();
const storageStore = useStorageStore();
```

### 3. State 访问替换
- `store.state.spaceUid` → `globalStore.spaceUid`
- `store.state.indexSetList` → `retrieveStore.indexSetList`
- `store.state.userMeta` → `userStore.userInfo`
- 等等...

### 4. Commit 替换
- `store.commit('updateStorage', data)` → `storageStore.updateStorage(data)`
- `store.commit('updateAiMode', mode)` → `retrieveStore.updateAiMode(mode)`
- 等等...

---

## 🔍 后续工作

### 需要手动检查的项目
1. 动态 state 访问: `store.state[variable]`
2. Options API 中的 `this.$store`
3. 复杂的嵌套访问和条件判断

### 建议
1. 运行 `npm run type-check` 检查类型错误
2. 运行 `npm run lint --fix` 修复代码风格
3. 手动测试所有修改的功能
4. 检查 console 是否有运行时错误

---

**生成时间**: 2026-03-02T03:14:21.360Z
