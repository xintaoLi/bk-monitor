# Composables 迁移指南

## 概述

本目录包含从 Vue 2 Options API (mixins/hooks) 转换为 Vue 3 Composition API 的 composables。

## 已完成迁移

✅ `use-route.ts` - 路由对象 hook
✅ `use-router.ts` - 路由实例 hook
✅ `use-storage.ts` - localStorage 存储 hook（从 storage-mixin.js 转换）
✅ `use-docs-link.ts` - 文档链接 hook（从 docs-link-mixin.js 转换）

## 待迁移列表

### 从 `src/hooks/` 迁移（20+ 文件）

- [ ] `hooks-helper.ts`
- [ ] `lucene.segment.ts`
- [ ] `trend-chart-options.ts`
- [ ] `use-element-event.ts`
- [ ] `use-field-alias-request-params.tsx`
- [ ] `use-field-egges.ts`
- [ ] `use-field-name.ts`
- [ ] `use-intersection-observer.ts`
- [ ] `use-json-formatter.ts`
- [ ] `use-json-root.ts`
- [ ] `use-list-sort.ts`
- [ ] `use-locale.ts`
- [ ] `use-mutation-observer.ts`
- [ ] `use-nav-menu.ts`
- [ ] `use-resize-observe.ts`
- [ ] `use-retrieve-event.ts`
- [ ] `use-retrieve-params.ts`
- [ ] `use-scroll.ts`
- [ ] `use-segment-pop.ts`
- [ ] `use-store.ts`
- [ ] `use-text-segmentation.ts`
- [ ] `use-trend-chart.ts`
- [ ] `use-truncate-text.ts`
- [ ] `use-utils.ts`
- [ ] `use-wheel.ts`

### 从 `src/mixins/` 转换（6 个剩余）

- [ ] `class-drag-mixin.ts` → `use-class-drag.ts`
- [ ] `collected-items-mixin.js` → `use-collected-items.ts`
- [ ] `drag-mixin.js` → `use-drag.ts`
- [ ] `indexSet-search-mixin.js` → `use-index-set-search.ts`
- [ ] `sidebar-diff-mixin.ts` → `use-sidebar-diff.ts`
- [ ] `space-selector-mixin.js` → `use-space-selector.ts`
- [ ] `table-row-deep-view-mixin.js` → `use-table-row-deep-view.ts`
- [ ] `user-store-config.ts` → `use-user-store-config.ts`

## 转换规范

### Mixin 转 Composable

**Vue 2 Mixin 示例:**
```javascript
export default {
  data() {
    return {
      count: 0
    }
  },
  methods: {
    increment() {
      this.count++
    }
  }
}
```

**Vue 3 Composable 转换:**
```typescript
import { ref } from 'vue'

export function useCounter() {
  const count = ref(0)
  
  const increment = () => {
    count.value++
  }
  
  return {
    count,
    increment
  }
}
```

### Hook 直接迁移

大部分 hooks 已经是 Composition API 格式，只需：
1. 检查 Vue 2 特有的导入（如 `vue-router/composables`）
2. 替换为 Vue 3 导入（如 `vue-router`）
3. 更新类型定义
4. 添加 JSDoc 注释

## 命名规范

- 所有文件使用 kebab-case: `use-xxx-xxx.ts`
- 所有函数使用 camelCase: `useXxxXxx()`
- 导出函数名与文件名对应

## 类型安全

所有 composables 必须：
1. 完整的 TypeScript 类型定义
2. 参数类型明确
3. 返回值类型明确
4. JSDoc 注释完整

## 使用示例

```typescript
import { useStorage, useDocsLink } from '@/composables'

// 在组件中使用
export default defineComponent({
  setup() {
    const { value: theme, setValue: setTheme } = useStorage('theme', 'light')
    const { gotoDocLink } = useDocsLink()
    
    return {
      theme,
      setTheme,
      gotoDocLink
    }
  }
})
```

## 注意事项

1. **保持业务逻辑不变** - 只转换格式，不修改逻辑
2. **Vue 3 兼容** - 确保使用 Vue 3 API
3. **依赖处理** - 检查外部依赖是否需要更新
4. **测试** - 转换后需要测试功能是否正常
