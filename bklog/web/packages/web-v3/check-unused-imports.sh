#!/bin/bash

# 清理未使用的 Pinia Store 导入

BASE_DIR="/root/clawd/bk-monitor/bklog/web/packages/web-v3/src"

echo "=== 清理未使用的 Store 导入 ==="

# 查找导入了但未使用的 stores
find "$BASE_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -print0 | while IFS= read -r -d '' file; do
    # 检查是否导入了 stores
    if grep -q "from '@/stores'" "$file" 2>/dev/null; then
        # 检查每个 store 是否被使用
        
        # 检查 collectStore
        if grep -q "useCollectStore" "$file" && ! grep -q "collectStore\." "$file" && ! grep -q "collectStore)" "$file" && ! grep -q "collectStore," "$file"; then
            echo "文件 $file 导入了 collectStore 但未使用"
        fi
        
        # 检查 storageStore
        if grep -q "useStorageStore" "$file" && ! grep -q "storageStore\." "$file" && ! grep -q "storageStore)" "$file" && ! grep -q "storageStore," "$file" && ! grep -q "storageStore\[" "$file"; then
            echo "文件 $file 导入了 storageStore 但未使用"
        fi
        
        # 检查 userStore
        if grep -q "useUserStore" "$file" && ! grep -q "userStore\." "$file" && ! grep -q "userStore)" "$file" && ! grep -q "userStore," "$file"; then
            echo "文件 $file 导入了 userStore 但未使用"
        fi
        
        # 检查 retrieveStore
        if grep -q "useRetrieveStore" "$file" && ! grep -q "retrieveStore\." "$file" && ! grep -q "retrieveStore)" "$file" && ! grep -q "retrieveStore," "$file"; then
            echo "文件 $file 导入了 retrieveStore 但未使用"
        fi
        
        # 检查 indexFieldStore
        if grep -q "useIndexFieldStore" "$file" && ! grep -q "indexFieldStore\." "$file" && ! grep -q "indexFieldStore)" "$file" && ! grep -q "indexFieldStore," "$file"; then
            echo "文件 $file 导入了 indexFieldStore 但未使用"
        fi
    fi
done

echo "完成检查"
