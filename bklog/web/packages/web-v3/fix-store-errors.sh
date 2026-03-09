#!/bin/bash

# 批量修复 store 相关错误的脚本

BASE_DIR="/root/clawd/bk-monitor/bklog/web/packages/web-v3/src"

echo "开始批量修复 store 错误..."

# 修复 store.getters.bkBizId -> globalStore.bkBizId
find "$BASE_DIR" -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.vue" \) -exec grep -l "store\.getters\.bkBizId" {} \; | while read file; do
    echo "修复 $file 中的 store.getters.bkBizId"
    sed -i 's/store\.getters\.bkBizId/globalStore.bkBizId/g' "$file"
done

# 修复 store.getters.spaceUid -> globalStore.spaceUid  
find "$BASE_DIR" -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.vue" \) -exec grep -l "store\.getters\.spaceUid" {} \; | while read file; do
    echo "修复 $file 中的 store.getters.spaceUid"
    sed -i 's/store\.getters\.spaceUid/globalStore.spaceUid/g' "$file"
done

# 修复 store.getters.isExternal -> globalStore.isExternal
find "$BASE_DIR" -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.vue" \) -exec grep -l "store\.getters\.isExternal" {} \; | while read file; do
    echo "修复 $file 中的 store.getters.isExternal"
    sed -i 's/store\.getters\.isExternal/globalStore.isExternal/g' "$file"
done

# 修复 store.state.spaceUid -> globalStore.spaceUid
find "$BASE_DIR" -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.vue" \) -exec grep -l "store\.state\.spaceUid" {} \; | while read file; do
    echo "修复 $file 中的 store.state.spaceUid"
    sed -i 's/store\.state\.spaceUid/globalStore.spaceUid/g' "$file"
done

# 修复 store.state.bkBizId -> globalStore.bkBizId
find "$BASE_DIR" -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.vue" \) -exec grep -l "store\.state\.bkBizId" {} \; | while read file; do
    echo "修复 $file 中的 store.state.bkBizId"
    sed -i 's/store\.state\.bkBizId/globalStore.bkBizId/g' "$file"
done

# 修复 store.state.isExternal -> globalStore.isExternal
find "$BASE_DIR" -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.vue" \) -exec grep -l "store\.state\.isExternal" {} \; | while read file; do
    echo "修复 $file 中的 store.state.isExternal"
    sed -i 's/store\.state\.isExternal/globalStore.isExternal/g' "$file"
done

# 修复 store.state.runVer -> globalStore.runVer
find "$BASE_DIR" -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.vue" \) -exec grep -l "store\.state\.runVer" {} \; | while read file; do
    echo "修复 $file 中的 store.state.runVer"
    sed -i 's/store\.state\.runVer/globalStore.runVer/g' "$file"
done

# 修复 store.state.indexId -> globalStore.indexSetId
find "$BASE_DIR" -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.vue" \) -exec grep -l "store\.state\.indexId" {} \; | while read file; do
    echo "修复 $file 中的 store.state.indexId"
    sed -i 's/store\.state\.indexId/globalStore.indexSetId/g' "$file"
done

# 修复 store.state.userMeta.username -> userStore.username
find "$BASE_DIR" -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.vue" \) -exec grep -l "store\.state\.userMeta\.username" {} \; | while read file; do
    echo "修复 $file 中的 store.state.userMeta.username"
    sed -i 's/store\.state\.userMeta\.username/userStore.username/g' "$file"
done

# 修复 store.state.collect.curCollect -> collectStore.curCollect
find "$BASE_DIR" -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.vue" \) -exec grep -l "store\.state\.collect\.curCollect" {} \; | while read file; do
    echo "修复 $file 中的 store.state.collect.curCollect"
    sed -i 's/store\.state\.collect\.curCollect/collectStore.curCollect/g' "$file"
done

# 修复 store.state.indexSetList -> retrieveStore.indexSetList
find "$BASE_DIR" -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.vue" \) -exec grep -l "store\.state\.indexSetList" {} \; | while read file; do
    echo "修复 $file 中的 store.state.indexSetList"
    sed -i 's/store\.state\.indexSetList/retrieveStore.indexSetList/g' "$file"
done

# 修复 store.commit('updateStorage' -> storageStore.updateStorage
find "$BASE_DIR" -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.vue" \) -exec grep -l "store\.commit.*updateStorage" {} \; | while read file; do
    echo "修复 $file 中的 store.commit('updateStorage')"
    sed -i "s/store\.commit('updateStorage'/storageStore.updateStorage(/g" "$file"
    sed -i 's/store\.commit("updateStorage"/storageStore.updateStorage(/g' "$file"
done

echo "完成第一轮批量修复"
