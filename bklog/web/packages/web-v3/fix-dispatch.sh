#!/bin/bash

# 修复 store.dispatch 调用的脚本

BASE_DIR="/root/clawd/bk-monitor/bklog/web/packages/web-v3/src"

echo "开始修复 store.dispatch 调用..."

# 查找所有包含 store.dispatch('getApplyData' 的文件
find "$BASE_DIR" -type f \( -name "*.tsx" -o -name "*.ts" \) -exec grep -l "store\.dispatch.*getApplyData" {} \; | while read file; do
    echo "修复 $file 中的 store.dispatch('getApplyData')"
    
    # 替换 store.dispatch('getApplyData' 为 globalStore.getApplyData(
    sed -i "s/store\.dispatch('getApplyData'/globalStore.getApplyData(/g" "$file"
    sed -i 's/store\.dispatch("getApplyData"/globalStore.getApplyData(/g' "$file"
    
    # 移除多余的括号（如果有的话，因为 dispatch 的第二个参数变成了第一个参数）
    # 例如: globalStore.getApplyData(, data) -> globalStore.getApplyData(data)
    sed -i 's/globalStore\.getApplyData(, /globalStore.getApplyData(/g' "$file"
done

echo "完成修复 store.dispatch 调用"
