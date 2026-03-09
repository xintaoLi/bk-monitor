#!/bin/bash
# Vuex to Pinia 迁移脚本 - 简化版
# 用途：批量替换 import useStore 语句

set -e

WORK_DIR="/root/clawd/bk-monitor/bklog/web/packages/web-v3"
cd "$WORK_DIR"

echo "🔄 开始 Vuex → Pinia 迁移"
echo "工作目录: $WORK_DIR"
echo "-----------------------------------"

# 备份
BACKUP_DIR="./backup-pinia-$(date +%Y%m%d-%H%M%S)"
echo "📦 创建备份: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"
cp -r src "$BACKUP_DIR/"

echo ""
echo "📝 步骤 1: 统一替换 import 语句为多个 stores"
echo "-----------------------------------"

# 统计
count_before=$(grep -rl "from '@/hooks/use-store'" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l || echo "0")
echo "找到 $count_before 个文件需要处理"

if [ "$count_before" -gt 0 ]; then
  # 第一步：简单替换 import 语句，导入所有可能需要的 stores
  # 后续可以手动清理不需要的 imports
  find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i \
    "s|import useStore from '@/hooks/use-store';|import { useGlobalStore, useUserStore, useRetrieveStore, useCollectStore, useIndexFieldStore, useStorageStore, BK_LOG_STORAGE } from '@/stores';|g" {} +
  
  # 验证
  count_after=$(grep -rl "from '@/hooks/use-store'" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l || echo "0")
  replaced=$((count_before - count_after))
  
  echo "✅ 替换完成"
  echo "   处理文件: $count_before"
  echo "   剩余文件: $count_after"
  echo "   成功替换: $replaced"
fi

echo ""
echo "📝 步骤 2: 生成替换映射文档"
echo "-----------------------------------"

cat > PINIA_REPLACE_MAP.md << 'EOF'
# Pinia 迁移替换映射

## 实例化替换

### 旧代码
```typescript
const store = useStore();
```

### 新代码（根据实际使用选择）
```typescript
const globalStore = useGlobalStore();
const userStore = useUserStore();
const retrieveStore = useRetrieveStore();
const collectStore = useCollectStore();
const indexFieldStore = useIndexFieldStore();
const storageStore = useStorageStore();
```

## State 访问替换

| 旧代码 | 新代码 | Store |
|--------|--------|-------|
| `store.state.spaceUid` | `globalStore.spaceUid` | global |
| `store.state.bkBizId` | `globalStore.bkBizId` | global |
| `store.state.indexId` | `globalStore.indexSetId` | global |
| `store.state.isExternal` | `globalStore.isExternal` | global |
| `store.state.runVer` | `globalStore.runVer` | global |
| `store.state.featureToggle` | `globalStore.featureToggle` | global |
| `store.state.userMeta.bk_tenant_id` | `userStore.userInfo?.tenant_id` | user |
| `store.state.userMeta.username` | `userStore.username` | user |
| `store.state.indexFieldInfo` | `indexFieldStore.indexFieldInfo` | index-field |
| `store.state.indexFieldInfo.fields` | `indexFieldStore.indexFieldInfo.fields` | index-field |
| `store.state.indexFieldInfo.aggs_items` | `indexFieldStore.indexFieldInfo.aggs_items` | index-field |
| `store.state.globals.fieldTypeMap` | `indexFieldStore.fieldTypeMap` | index-field |
| `store.state.storage[BK_LOG_STORAGE.xxx]` | `storageStore[BK_LOG_STORAGE.xxx]` | storage |
| `store.state.cacheDatePickerValue` | `retrieveStore.cacheDatePickerValue` | retrieve |
| `store.state.cacheTimeRange` | `retrieveStore.cacheTimeRange` | retrieve |
| `store.state.indexSetList` | `retrieveStore.indexSetList` | retrieve |
| `store.state.indexSetLoading` | `retrieveStore.isIndexSetLoading` | retrieve |
| `store.state.indexSetQueryResult` | 需要补充到 retrieveStore | retrieve |
| `store.state.indexItem` | 需要补充到 retrieveStore | retrieve |
| `store.state.collect.curCollect` | `collectStore.curCollect` | collect |
| `store.state.collect.exportCollectObj` | `collectStore.exportCollectObj` | collect |
| `store.state.features` | `globalStore.featureToggle` | global |
| `store.state.showAlert` | 需要补充到 globalStore | global |
| `store.state.isShowGlobalDialog` | 需要补充到 globalStore | global |
| `store.state.authDialogData` | 需要补充到 globalStore | global |
| `store.state.storeIsShowClusterStep` | 需要补充到 retrieveStore | retrieve |
| `store.state.clusterParams` | 需要补充到 retrieveStore | retrieve |

## Commit 替换

| 旧代码 | 新代码 | Store |
|--------|--------|-------|
| `store.commit('updateStorage', payload)` | `storageStore.updateStorage(payload)` | storage |
| `store.commit('retrieve/updateCachePickerValue', val)` | `retrieveStore.updateCachePickerValue(val)` | retrieve |
| `store.commit('collect/updateExportCollectObj', obj)` | `collectStore.updateExportCollectObj(obj)` | collect |
| `store.commit('updateState', obj)` | 根据字段分发到对应 store | 多个 |
| `store.commit('updateAiMode', obj)` | 需要补充到 retrieveStore | retrieve |
| `store.commit('updateIndexItemParams', params)` | 需要补充到 retrieveStore | retrieve |
| `store.commit('updateIndexFieldEggsItems', items)` | `indexFieldStore.updateIndexFieldEggsItems(items)` | index-field |
| `store.commit('updateIndexSetCustomConfig', config)` | 需要补充到 retrieveStore | retrieve |

## 需要补充的 Store 字段和方法

### RetrieveStore 需要补充
```typescript
// state
indexItem: any;
indexSetQueryResult: any;
storeIsShowClusterStep: boolean;
clusterParams: any;
aiMode: any;
indexItemParams: any;

// actions
updateAiMode(mode: any): void;
updateIndexItemParams(params: any): void;
updateIndexSetCustomConfig(config: any): void;
```

### GlobalStore 需要补充
```typescript
// state
showAlert: boolean;
isShowGlobalDialog: boolean;
authDialogData: any;
features: any; // 或使用 featureToggle

// actions
updateState(state: Record<string, any>): void; // 通用更新方法
```

## 替换优先级

1. **P0 高优先级** - 核心检索功能
   - views/retrieve/
   - composables/use-field-*

2. **P1 中优先级** - 管理功能
   - views/manage/
   - components/business/

3. **P2 低优先级** - 通用组件
   - components/common/

## 注意事项

1. **Options API (`this.$store`)** - 需要改为 Composition API
2. **动态 state 访问** - `store.state[variable]` 需要特殊处理
3. **嵌套访问** - 注意空值检查，如 `userStore.userInfo?.tenant_id`
4. **Computed 依赖** - 使用 `computed(() => xxxStore.xxx)`
EOF

echo "✅ 已生成替换映射文档: PINIA_REPLACE_MAP.md"

echo ""
echo "-----------------------------------"
echo "✅ 第一步完成！"
echo ""
echo "⚠️  下一步手动操作："
echo "1. 查看 PINIA_REPLACE_MAP.md 了解替换规则"
echo "2. 根据文件实际使用情况，清理不需要的 import"
echo "3. 替换 const store = useStore() 为具体的 store"
echo "4. 替换 store.state.xxx 和 store.commit() 调用"
echo "5. 运行 npm run type-check 验证"
echo ""
echo "📦 备份位置: $BACKUP_DIR"
