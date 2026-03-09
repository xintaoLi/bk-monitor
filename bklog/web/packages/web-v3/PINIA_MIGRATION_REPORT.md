# 🔄 Vuex → Pinia 迁移报告

**开始时间**: 2026-03-02 11:15 GMT+8  
**状态**: 🚧 进行中

---

## 📊 迁移范围统计

### 文件影响统计
- **总计使用 useStore 的文件**: 77个
- **需要迁移的 state 访问**: ~150+ 处
- **需要迁移的 commit 调用**: ~50+ 处

### 已存在的 Pinia Stores
✅ `src/stores/global.ts` - 全局状态（空间、业务、索引集、UI）  
✅ `src/stores/user.ts` - 用户信息和权限  
✅ `src/stores/retrieve.ts` - 检索模块状态  
✅ `src/stores/collect.ts` - 采集模块状态  
✅ `src/stores/dashboard.ts` - 仪表盘状态

---

## 🎯 迁移映射表

### 1. Global Store 迁移

| Vuex 调用 | Pinia 调用 | 说明 |
|-----------|-----------|------|
| `store.state.spaceUid` | `globalStore.spaceUid` | 空间UID |
| `store.state.bkBizId` | `globalStore.bkBizId` | 业务ID |
| `store.state.indexId` | `globalStore.indexSetId` | 索引集ID |
| `store.state.isExternal` | `globalStore.isExternal` | 是否外部版 |
| `store.state.runVer` | `globalStore.runVer` | 运行版本 |
| `store.state.featureToggle` | `globalStore.featureToggle` | 功能开关 |

### 2. User Store 迁移

| Vuex 调用 | Pinia 调用 | 说明 |
|-----------|-----------|------|
| `store.state.userMeta.bk_tenant_id` | `userStore.userInfo?.tenant_id` | 租户ID |
| `store.state.userMeta.username` | `userStore.username` | 用户名 |

### 3. Retrieve Store 迁移

| Vuex 调用 | Pinia 调用 | 说明 |
|-----------|-----------|------|
| `store.state.indexSetList` | `retrieveStore.indexSetList` | 索引集列表 |
| `store.state.indexSetLoading` | `retrieveStore.isIndexSetLoading` | 加载状态 |
| `store.state.cacheDatePickerValue` | `retrieveStore.cacheDatePickerValue` | 缓存时间 |
| `store.state.cacheTimeRange` | `retrieveStore.cacheTimeRange` | 时间范围 |
| `store.state.indexFieldInfo` | - | **需要新增** |
| `store.state.indexSetQueryResult` | - | **需要新增** |
| `store.state.storage` | - | **需要迁移到 localStorage 或新 store** |
| `store.commit('retrieve/updateCachePickerValue', val)` | `retrieveStore.updateCachePickerValue(val)` | 更新缓存 |

### 4. Collect Store 迁移

| Vuex 调用 | Pinia 调用 | 说明 |
|-----------|-----------|------|
| `store.state.collect.curCollect` | `collectStore.curCollect` | 当前采集 |
| `store.state.collect.exportCollectObj` | `collectStore.exportCollectObj` | 导出配置 |
| `store.commit('collect/updateExportCollectObj', obj)` | `collectStore.updateExportCollectObj(obj)` | 更新导出 |

### 5. 需要新增的 Stores

#### IndexField Store（新增）
```typescript
// src/stores/index-field.ts
export const useIndexFieldStore = defineStore('indexField', {
  state: () => ({
    indexFieldInfo: {
      fields: [],
      aggs_items: {},
    },
    fieldTypeMap: {},
  }),
  actions: {
    updateIndexFieldInfo(info) { ... },
    updateIndexFieldEggsItems(items) { ... },
  },
});
```

#### Storage Store（新增）
```typescript
// src/stores/storage.ts
export const useStorageStore = defineStore('storage', {
  state: () => ({
    [BK_LOG_STORAGE.TEXT_ELLIPSIS_DIR]: 'end',
    [BK_LOG_STORAGE.SHOW_FIELD_ALIAS]: false,
    [BK_LOG_STORAGE.SEARCH_TYPE]: 1,
    [BK_LOG_STORAGE.CACHED_BATCH_LIST]: [],
  }),
  actions: {
    updateStorage(payload) { ... },
  },
  persist: {
    enabled: true,
    strategies: [{
      key: 'storage-store',
      storage: localStorage,
    }],
  },
});
```

---

## 🔧 迁移策略

### 阶段 1: 创建缺失的 Stores（20分钟）
1. ✅ 创建 `index-field.ts` store
2. ✅ 创建 `storage.ts` store  
3. ✅ 更新 `stores/index.ts` 导出

### 阶段 2: 批量替换导入语句（10分钟）
```bash
# 替换所有 useStore 导入为对应的 Pinia stores
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i \
  "s|import useStore from '@/hooks/use-store'|import { useGlobalStore } from '@/stores'|g" {} +
```

### 阶段 3: 替换 state 访问（40分钟）
手动或半自动替换：
```typescript
// 旧代码
const store = useStore();
const spaceUid = store.state.spaceUid;

// 新代码
const globalStore = useGlobalStore();
const spaceUid = globalStore.spaceUid;
```

### 阶段 4: 替换 commit 调用（30分钟）
```typescript
// 旧代码
store.commit('updateIndexSetList', list);

// 新代码
retrieveStore.updateIndexSetList(list);
```

### 阶段 5: 测试验证（20分钟）
1. TypeScript 类型检查
2. 编译测试
3. 运行时测试（重点模块）

**总计**: 约 120 分钟（2小时）

---

## ⚠️ 风险和注意事项

### 高风险点
1. **`this.$store` Options API 调用** - 需要手动改为 Composition API
2. **嵌套 state 访问** - `store.state.module.submodule.field`
3. **动态 state 访问** - `store.state[variable]`
4. **计算属性依赖** - 需要使用 `computed(() => xxxStore.xxx)`

### 兼容性处理
对于复杂的 Options API 组件，可以临时保留 Vuex 访问，后续再迁移。

### 渐进式迁移
按模块优先级迁移：
1. **P0**: Retrieve 检索模块（核心功能）
2. **P1**: Manage 管理模块  
3. **P2**: Components 共享组件

---

## 📝 迁移检查清单

### Retrieve 模块
- [ ] views/retrieve/index.tsx
- [ ] views/retrieve/search-bar/
- [ ] views/retrieve/search-result/
- [ ] views/retrieve/favorite/
- [ ] views/retrieve/toolbar/

### Manage 模块
- [ ] views/manage/log-collection/
- [ ] views/manage/extract/
- [ ] views/manage/archive/

### Components
- [ ] components/business/
- [ ] components/common/

### Composables
- [ ] composables/use-field-name.ts
- [ ] composables/use-field-egges.ts

---

**创建时间**: 2026-03-02 11:15 GMT+8  
**更新时间**: -  
**执行者**: OpenClaw Agent
