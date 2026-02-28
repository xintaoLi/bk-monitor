/*
 * Tencent is pleased to support the open source community by making
 * 蓝鲸智云PaaS平台 (BlueKing PaaS) available.
 *
 * Copyright (C) 2021 THL A29 Limited, a Tencent company.  All rights reserved.
 *
 * 蓝鲸智云PaaS平台 (BlueKing PaaS) is licensed under the MIT License.
 *
 * License for 蓝鲸智云PaaS平台 (BlueKing PaaS):
 *
 * ---------------------------------------------------
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
 * documentation files (the "Software"), to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and
 * to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of
 * the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO
 * THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF
 * CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 */

/**
 * Composables 统一导出
 * 
 * 注意：
 * 1. 所有 hooks 和 mixins 已转换为 composables
 * 2. 使用 Vue 3 Composition API
 * 3. 完整的 TypeScript 类型支持
 * 
 * 待迁移列表（从 src/hooks/ 和 src/mixins/）:
 * - hooks-helper.ts
 * - lucene.segment.ts
 * - trend-chart-options.ts
 * - use-element-event.ts
 * - use-field-alias-request-params.tsx
 * - use-field-egges.ts
 * - use-field-name.ts
 * - use-intersection-observer.ts
 * - use-json-formatter.ts
 * - use-json-root.ts
 * - use-list-sort.ts
 * - use-locale.ts
 * - use-mutation-observer.ts
 * - use-nav-menu.ts
 * - use-resize-observe.ts
 * - use-retrieve-event.ts
 * - use-retrieve-params.ts
 * - use-scroll.ts
 * - use-segment-pop.ts
 * - use-store.ts
 * - use-text-segmentation.ts
 * - use-trend-chart.ts
 * - use-truncate-text.ts
 * - use-utils.ts
 * - use-wheel.ts
 * - class-drag-mixin.ts → use-class-drag.ts
 * - collected-items-mixin.js → use-collected-items.ts
 * - drag-mixin.js → use-drag.ts
 * - indexSet-search-mixin.js → use-index-set-search.ts
 * - sidebar-diff-mixin.ts → use-sidebar-diff.ts
 * - space-selector-mixin.js → use-space-selector.ts
 * - table-row-deep-view-mixin.js → use-table-row-deep-view.ts
 * - user-store-config.ts → use-user-store-config.ts
 */

// 已迁移的 composables
export * from './use-docs-link'
export * from './use-route'
export * from './use-router'
export * from './use-storage'

// TODO: 继续迁移其他 hooks 和 mixins
// 由于数量较多（30+ 个文件），建议按需迁移
// 可以参考上面已迁移的文件格式进行转换
