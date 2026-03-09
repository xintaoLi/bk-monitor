#!/bin/bash
# Vuex to Pinia 迁移脚本
# 用途：自动替换 Vuex 调用为 Pinia 调用

set -e

WORK_DIR="/root/clawd/bk-monitor/bklog/web/packages/web-v3"
cd "$WORK_DIR"

echo "🔄 开始 Vuex → Pinia 迁移"
echo "工作目录: $WORK_DIR"
echo "-----------------------------------"

# 备份
BACKUP_DIR="./backup-$(date +%Y%m%d-%H%M%S)"
echo "📦 创建备份: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"
cp -r src "$BACKUP_DIR/"

# 统计数据
total_files=0
replaced_files=0

# 步骤 1: 替换简单的 import 语句
echo ""
echo "📝 步骤 1: 替换 import 语句"
echo "-----------------------------------"

# 查找所有使用 useStore 的文件
files=$(grep -rl "from '@/hooks/use-store'" src/ --include="*.ts" --include="*.tsx" 2>/dev/null || true)

if [ -z "$files" ]; then
  echo "✅ 没有找到需要替换的 import 语句"
else
  echo "找到 $(echo "$files" | wc -l) 个文件需要处理"
  
  for file in $files; do
    ((total_files++))
    echo "  处理: $file"
    
    # 先检查文件中使用了哪些 store 方法
    uses_global=false
    uses_retrieve=false
    uses_user=false
    uses_collect=false
    uses_storage=false
    uses_index_field=false
    
    # 检查 global store 使用
    if grep -q "store\.state\.spaceUid\|store\.state\.bkBizId\|store\.state\.indexId\|store\.state\.isExternal\|store\.state\.runVer\|store\.state\.featureToggle" "$file"; then
      uses_global=true
    fi
    
    # 检查 storage store 使用
    if grep -q "store\.state\.storage\|BK_LOG_STORAGE" "$file"; then
      uses_storage=true
    fi
    
    # 检查 index-field store 使用
    if grep -q "store\.state\.indexFieldInfo\|store\.state\.fieldTypeMap\|store\.state\.globals\.fieldTypeMap" "$file"; then
      uses_index_field=true
    fi
    
    # 检查 retrieve store 使用
    if grep -q "store\.state\.indexSetList\|store\.state\.cacheDatePickerValue\|store\.state\.cacheTimeRange\|store\.commit('retrieve/" "$file"; then
      uses_retrieve=true
    fi
    
    # 检查 user store 使用
    if grep -q "store\.state\.userMeta\|store\.state\.username" "$file"; then
      uses_user=true
    fi
    
    # 检查 collect store 使用
    if grep -q "store\.state\.collect\|store\.commit('collect/" "$file"; then
      uses_collect=true
    fi
    
    # 生成新的 import 语句
    imports=""
    if $uses_global; then
      imports="${imports}, useGlobalStore"
    fi
    if $uses_user; then
      imports="${imports}, useUserStore"
    fi
    if $uses_retrieve; then
      imports="${imports}, useRetrieveStore"
    fi
    if $uses_collect; then
      imports="${imports}, useCollectStore"
    fi
    if $uses_index_field; then
      imports="${imports}, useIndexFieldStore"
    fi
    if $uses_storage; then
      imports="${imports}, useStorageStore, BK_LOG_STORAGE"
    fi
    
    # 去掉前导逗号
    imports="${imports#, }"
    
    if [ -n "$imports" ]; then
      # 替换 import 语句
      sed -i "s|import useStore from '@/hooks/use-store';|import { $imports } from '@/stores';|g" "$file"
      ((replaced_files++))
      echo "    ✓ 已替换 import 语句"
      echo "    导入: $imports"
    fi
  done
  
  echo ""
  echo "✅ Import 语句替换完成"
  echo "   处理文件: $total_files"
  echo "   替换文件: $replaced_files"
fi

echo ""
echo "-----------------------------------"
echo "⚠️  注意事项："
echo "1. Import 语句已自动替换"
echo "2. 需要手动替换 store 实例化和调用"
echo "3. 请运行 npm run type-check 检查类型错误"
echo "4. 备份位置: $BACKUP_DIR"
echo ""
echo "📋 下一步操作："
echo "   1. 手动替换: const store = useStore() → const xxxStore = useXxxStore()"
echo "   2. 手动替换: store.state.xxx → xxxStore.xxx"
echo "   3. 手动替换: store.commit('xxx', val) → xxxStore.xxx(val)"
echo "   4. 运行类型检查验证"
echo ""
echo "✅ 脚本执行完成"
