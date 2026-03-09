#!/bin/bash

# 批量修复剩余的 store 未定义错误
# 策略：检查文件是否已经导入了 stores，如果没有则添加，然后替换 store 引用

set -e

TARGET_FILES=(
  "src/composables/use-field-alias-request-params.tsx"
  "src/views/manage/archive/archive-list/list-slider.tsx"
  "src/views/manage/archive/archive-repository/index.tsx"
  "src/views/manage/archive/archive-restore/restore-slider.tsx"
  "src/views/manage/client-log/collection-deploy/collection-table.tsx"
  "src/views/manage/client-log/collection-deploy/index.tsx"
  "src/views/manage/client-log/collection-slider/index.tsx"
  "src/views/manage/client-log/user-report/index.tsx"
  "src/views/manage/cluster/cluster-manage/es-slider.tsx"
  "src/views/manage/cluster/cluster-manage/index.tsx"
  "src/views/manage/cluster/cluster-manage/intro-panel.tsx"
  "src/views/manage/extract/extract-config/index.tsx"
  "src/views/manage/extract/extract-link/link-create.tsx"
  "src/views/manage/extract/extract-link/link-list.tsx"
  "src/views/manage/extract/extract-task/task-create/index.tsx"
  "src/views/manage/extract/extract-task/task-list/download-url.tsx"
  "src/views/manage/extract/extract-task/task-list/index.tsx"
  "src/views/manage/hooks/use-drag.ts"
  "src/views/manage/log-collection/components/business-comp/step2/base-info.tsx"
  "src/views/manage/log-collection/components/business-comp/step2/container-collection/configuration-item-list.tsx"
  "src/views/manage/log-collection/components/business-comp/step2/log-filter.tsx"
  "src/views/manage/log-collection/components/business-comp/step3/field-list.tsx"
  "src/views/manage/log-collection/components/create-operation/step2-bk-data-collection.tsx"
  "src/views/manage/log-collection/components/create-operation/step2-configuration.tsx"
  "src/views/manage/log-collection/components/create-operation/step2-custom-report.tsx"
  "src/views/manage/log-collection/components/create-operation/step3-clean.tsx"
  "src/views/manage/log-collection/components/create-operation/step4-storage.tsx"
  "src/views/manage/log-collection/hook/useCollectList.ts"
  "src/views/retrieve/favorite/collect-main.tsx"
  "src/views/retrieve/favorite/hooks/use-favorite.ts"
  "src/views/retrieve/grep/index.tsx"
  "src/views/retrieve/index.tsx"
  "src/views/retrieve/monitor/monitor.tsx"
  "src/views/retrieve/monitor/use-monitor-app-init.ts"
  "src/views/retrieve/search-bar/index.tsx"
  "src/views/retrieve/search-result/index.tsx"
  "src/views/retrieve/search-result/log-clustering/empty-cluster/index.tsx"
  "src/views/retrieve/search-result/log-clustering/index.tsx"
  "src/views/retrieve/search-result/log-clustering/log-table/content-table/cluster-popover/regex-match/index.tsx"
  "src/views/retrieve/search-result/log-clustering/log-table/content-table/index.tsx"
  "src/views/retrieve/search-result/log-clustering/top-operation/cluster-config/edit-config/index.tsx"
  "src/views/retrieve/search-result/log-clustering/top-operation/cluster-config/edit-config/rule-operate/index.tsx"
  "src/views/retrieve/search-result/log-clustering/top-operation/email-subscription/create-subscription/subscription-form/send-config/index.tsx"
  "src/views/retrieve/search-result/log-clustering/top-operation/email-subscription/create-subscription/subscription-form/subscription-content/index.tsx"
  "src/views/retrieve/search-result/original-log/components/data-filter/fields-config/index.tsx"
  "src/views/retrieve/search-result/original-log/components/origin-log-result/index.tsx"
  "src/views/retrieve/use-app-init.tsx"
)

FIXED=0
SKIPPED=0

for file in "${TARGET_FILES[@]}"; do
  if [ ! -f "$file" ]; then
    echo "⚠️  文件不存在: $file"
    ((SKIPPED++))
    continue
  fi
  
  echo "📝 处理: $file"
  
  # 检查是否有 store.xxx 引用（排除已经是 xxxStore 的情况）
  if ! grep -q '\bstore\.' "$file" || grep -q 'Store\.' "$file"; then
    echo "   跳过（已经修复或无需修复）"
    ((SKIPPED++))
    continue
  fi
  
  # 检查需要哪些 stores
  needs_global=$(grep -c 'store\.state\.spaceUid\|store\.state\.bkBizId\|store\.state\.isExternal\|store\.getters\.spaceUid\|store\.getters\.bkBizId\|store\.dispatch.*getApplyData' "$file" || true)
  needs_retrieve=$(grep -c 'store\.state\.indexSetList\|store\.state\.cacheDatePickerValue\|store\.state\.cacheTimeRange' "$file" || true)
  needs_storage=$(grep -c 'store\.state\.storage' "$file" || true)
  needs_collect=$(grep -c 'store\.state\.collect' "$file" || true)
  needs_user=$(grep -c 'store\.state\.userMeta' "$file" || true)
  needs_index_field=$(grep -c 'store\.state\.indexFieldInfo\|store\.state\.globals\.fieldTypeMap' "$file" || true)
  
  # 构建导入语句
  imports=""
  if [ "$needs_global" -gt 0 ]; then
    imports="$imports useGlobalStore,"
  fi
  if [ "$needs_retrieve" -gt 0 ]; then
    imports="$imports useRetrieveStore,"
  fi
  if [ "$needs_storage" -gt 0 ]; then
    imports="$imports useStorageStore,"
  fi
  if [ "$needs_collect" -gt 0 ]; then
    imports="$imports useCollectStore,"
  fi
  if [ "$needs_user" -gt 0 ]; then
    imports="$imports useUserStore,"
  fi
  if [ "$needs_index_field" -gt 0 ]; then
    imports="$imports useIndexFieldStore,"
  fi
  
  if [ -z "$imports" ]; then
    # 无法确定，导入所有常用的
    imports="useGlobalStore, useRetrieveStore"
  fi
  
  # 去掉尾部逗号
  imports="${imports%,}"
  
  # 检查是否已经有导入
  if ! grep -q "from '@/stores'" "$file"; then
    # 添加导入（在文件开头的 import 语句后面）
    sed -i "1a import { $imports } from '@/stores';" "$file"
  else
    echo "   已有 stores 导入"
  fi
  
  # 在函数/组件内部添加 store 实例化（如果需要）
  # 这里使用简单的模式匹配
  if grep -q 'const.*=.*use.*Store()' "$file"; then
    echo "   已有 store 实例化"
  else
    # 尝试在函数定义后添加
    # 这个比较复杂，先跳过，手动处理
    echo "   需要手动添加 store 实例化"
  fi
  
  ((FIXED++))
done

echo ""
echo "✅ 处理完成: $FIXED 个文件"
echo "⏭️  跳过: $SKIPPED 个文件"
echo ""
echo "⚠️  注意：此脚本仅添加了导入语句，你需要手动在每个函数/组件中添加："
echo "   const globalStore = useGlobalStore();"
echo "   const retrieveStore = useRetrieveStore();"
echo "   等等"
