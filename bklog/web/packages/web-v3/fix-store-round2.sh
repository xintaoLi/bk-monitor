#!/bin/bash

# 全面修复所有 store 相关错误的脚本

BASE_DIR="/root/clawd/bk-monitor/bklog/web/packages/web-v3/src"

echo "=== 第2轮：修复更多 store.state 访问 ==="

# 修复 store.state.featureToggle -> globalStore.featureToggle
find "$BASE_DIR" -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.vue" \) -exec grep -l "store\.state\.featureToggle" {} \; | while read file; do
    echo "修复 $file 中的 store.state.featureToggle"
    sed -i 's/store\.state\.featureToggle/globalStore.featureToggle/g' "$file"
done

# 修复 store.state.features -> globalStore.features
find "$BASE_DIR" -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.vue" \) -exec grep -l "store\.state\.features" {} \; | while read file; do
    echo "修复 $file 中的 store.state.features"
    sed -i 's/store\.state\.features/globalStore.features/g' "$file"
done

# 修复 store.state.indexFieldInfo -> indexFieldStore.indexFieldInfo
find "$BASE_DIR" -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.vue" \) -exec grep -l "store\.state\.indexFieldInfo" {} \; | while read file; do
    echo "修复 $file 中的 store.state.indexFieldInfo"
    sed -i 's/store\.state\.indexFieldInfo/indexFieldStore.indexFieldInfo/g' "$file"
done

# 修复 store.state.cacheDatePickerValue -> retrieveStore.cacheDatePickerValue
find "$BASE_DIR" -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.vue" \) -exec grep -l "store\.state\.cacheDatePickerValue" {} \; | while read file; do
    echo "修复 $file 中的 store.state.cacheDatePickerValue"
    sed -i 's/store\.state\.cacheDatePickerValue/retrieveStore.cacheDatePickerValue/g' "$file"
done

# 修复 store.state.cacheTimeRange -> retrieveStore.cacheTimeRange
find "$BASE_DIR" -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.vue" \) -exec grep -l "store\.state\.cacheTimeRange" {} \; | while read file; do
    echo "修复 $file 中的 store.state.cacheTimeRange"
    sed -i 's/store\.state\.cacheTimeRange/retrieveStore.cacheTimeRange/g' "$file"
done

# 修复 store.state.globals.fieldTypeMap -> indexFieldStore.fieldTypeMap
find "$BASE_DIR" -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.vue" \) -exec grep -l "store\.state\.globals\.fieldTypeMap" {} \; | while read file; do
    echo "修复 $file 中的 store.state.globals.fieldTypeMap"
    sed -i 's/store\.state\.globals\.fieldTypeMap/indexFieldStore.fieldTypeMap/g' "$file"
done

# 修复 store.state.collect.exportCollectObj -> collectStore.exportCollectObj
find "$BASE_DIR" -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.vue" \) -exec grep -l "store\.state\.collect\.exportCollectObj" {} \; | while read file; do
    echo "修复 $file 中的 store.state.collect.exportCollectObj"
    sed -i 's/store\.state\.collect\.exportCollectObj/collectStore.exportCollectObj/g' "$file"
done

# 修复 store.commit 调用
echo "=== 修复 store.commit 调用 ==="

# store.commit('retrieve/updateCachePickerValue' -> retrieveStore.updateCachePickerValue(
find "$BASE_DIR" -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.vue" \) -exec grep -l "store\.commit.*retrieve/updateCachePickerValue" {} \; | while read file; do
    echo "修复 $file 中的 store.commit('retrieve/updateCachePickerValue')"
    sed -i "s/store\.commit('retrieve\/updateCachePickerValue'/retrieveStore.updateCachePickerValue(/g" "$file"
    sed -i 's/store\.commit("retrieve\/updateCachePickerValue"/retrieveStore.updateCachePickerValue(/g' "$file"
done

# store.commit('collect/updateExportCollectObj' -> collectStore.updateExportCollectObj(
find "$BASE_DIR" -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.vue" \) -exec grep -l "store\.commit.*collect/updateExportCollectObj" {} \; | while read file; do
    echo "修复 $file 中的 store.commit('collect/updateExportCollectObj')"
    sed -i "s/store\.commit('collect\/updateExportCollectObj'/collectStore.updateExportCollectObj(/g" "$file"
    sed -i 's/store\.commit("collect\/updateExportCollectObj"/collectStore.updateExportCollectObj(/g' "$file"
done

echo "完成第2轮修复"
