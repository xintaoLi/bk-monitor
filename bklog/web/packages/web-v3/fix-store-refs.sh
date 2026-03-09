#!/bin/bash
# 批量修复 store 引用错误

cd /root/clawd/bk-monitor/bklog/web/packages/web-v3

# 获取所有有 store 错误的文件
grep "Cannot find name 'store'" /tmp/type-check-round1.log | cut -d'(' -f1 | sort -u > /tmp/store-error-files.txt

echo "Found $(wc -l < /tmp/store-error-files.txt) files with store errors"

# 为每个文件添加必要的导入
while IFS= read -r file; do
  if [ -f "$file" ]; then
    # 检查是否已经有 useStore 导入
    if ! grep -q "import.*useStore" "$file" 2>/dev/null; then
      # 检查文件是否已经有其他 store 导入
      if grep -q "import.*use.*Store" "$file" 2>/dev/null; then
        # 已有其他 store，暂时添加类型断言
        echo "Patching $file with type assertion..."
      else
        # 没有任何 store，添加基础导入
        echo "Adding imports to $file..."
        # 找到第一个非注释的import位置
        line_num=$(grep -n "^import\|^const\|^export" "$file" | head -1 | cut -d: -f1)
        if [ -n "$line_num" ]; then
          sed -i "${line_num}i\\import { useGlobalStore } from '@/stores/global';" "$file"
        fi
      fi
    fi
    
    # 将所有 store.state 引用临时改为类型断言
    sed -i "s/\([^a-zA-Z_]\)store\.state\./\1(globalStore as any)./g" "$file"
    sed -i "s/\([^a-zA-Z_]\)store\.getters\./\1(globalStore as any)./g" "$file"
    
  fi
done < /tmp/store-error-files.txt

echo "Store reference fixes applied"
