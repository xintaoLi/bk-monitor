#!/bin/bash

# 针对性修复 store 相关错误
# 策略：在文件中添加所需的 store 导入和实例化

set -e

cd /root/clawd/bk-monitor/bklog/web/packages/web-v3

echo "开始修复 store 未定义错误..."

# 修复函数
fix_file() {
  local file="$1"
  
  if [ ! -f "$file" ]; then
    echo "⚠️  文件不存在: $file"
    return 1
  fi
  
  echo "📝 处理: $file"
  
  # 检查是否已经有 'const store' 定义
  if grep -q "const.*store.*=.*useStore()" "$file"; then
    # 删除旧的 useStore 导入
    sed -i '/import.*useStore.*from.*vuex/d' "$file"
    # 删除旧的 const store = useStore()
    sed -i '/const.*store.*=.*useStore()/d' "$file"
    echo "   已删除旧的 useStore 引用"
  fi
  
  # 检查是否需要添加 stores 导入
  if ! grep -q "from '@/stores'" "$file"; then
    # 在第一个 import 后添加
    sed -i "1a import { useGlobalStore, useRetrieveStore, useCollectStore, useStorageStore, useIndexFieldStore } from '@/stores';" "$file"
    echo "   已添加 stores 导入"
  fi
  
  return 0
}

# 处理文件列表（优先处理简单的文件）
FILES=(
  "src/composables/use-field-alias-request-params.tsx"
  "src/views/manage/hooks/use-drag.ts"
  "src/views/manage/log-collection/hook/useCollectList.ts"
  "src/views/retrieve/favorite/hooks/use-favorite.ts"
  "src/views/retrieve/monitor/use-monitor-app-init.ts"
)

for file in "${FILES[@]}"; do
  fix_file "$file" || continue
done

echo ""
echo "✅ 修复完成！"
echo ""
echo "⚠️  注意：还需要在每个函数中手动添加："
echo "   const globalStore = useGlobalStore();"
echo "   const retrieveStore = useRetrieveStore();"
echo "   等实例化语句"
