#!/bin/bash

# BKLog Web-v3 Vuex to Pinia Migration Script
# 自动化批量替换脚本

set -e

WORK_DIR="/root/clawd/bk-monitor/bklog/web/packages/web-v3"
cd "$WORK_DIR"

echo "=========================================="
echo "BKLog Web-v3 Vuex → Pinia 迁移脚本"
echo "工作目录: $WORK_DIR"
echo "=========================================="

# 统计信息
TOTAL_FILES=0
MODIFIED_FILES=0
ERRORS=0

# 日志文件
LOG_FILE="migration.log"
ERROR_LOG="migration-errors.log"
MODIFIED_LOG="migration-modified.log"

> "$LOG_FILE"
> "$ERROR_LOG"
> "$MODIFIED_LOG"

# 记录日志函数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo "[ERROR] $1" | tee -a "$ERROR_LOG"
    ((ERRORS++))
}

log "开始迁移..."

# 获取所有需要处理的文件
FILES=$(find src/views/retrieve src/views/manage src/components -type f \( -name "*.tsx" -o -name "*.ts" \) ! -name "*.d.ts" 2>/dev/null)

for file in $FILES; do
    ((TOTAL_FILES++))
    
    # 跳过已处理的文件
    if grep -q "useGlobalStore\|useRetrieveStore\|useUserStore" "$file" 2>/dev/null; then
        # 文件可能部分处理，继续检查是否还有旧代码
        if ! grep -q "useStore()" "$file" 2>/dev/null && \
           ! grep -q "store\.state\." "$file" 2>/dev/null && \
           ! grep -q "store\.commit" "$file" 2>/dev/null && \
           ! grep -q "this\.\$store" "$file" 2>/dev/null; then
            continue
        fi
    fi
    
    # 检查是否包含需要替换的内容
    if grep -q "useStore()\|store\.state\.\|store\.commit\|this\.\$store" "$file" 2>/dev/null; then
        log "处理文件: $file"
        
        # 备份原文件
        cp "$file" "$file.bak"
        
        # 标记是否修改
        MODIFIED=false
        
        # 使用 sed 进行替换
        # 注意：sed 在 Mac 和 Linux 上语法不同，这里使用 Linux 语法
        
        # 1. 替换 import
        if grep -q "import.*useStore.*from.*vuex" "$file"; then
            sed -i "s|import { useStore } from 'vuex';|import { useGlobalStore } from '@/stores/global';\nimport { useRetrieveStore } from '@/stores/retrieve';\nimport { useUserStore } from '@/stores/user';\nimport { useCollectStore } from '@/stores/collect';\nimport { useIndexFieldStore } from '@/stores/index-field';\nimport { useStorageStore } from '@/stores/storage';|g" "$file"
            MODIFIED=true
        fi
        
        # 2. 替换 useStore() 调用
        if grep -q "const store = useStore()" "$file"; then
            sed -i "s|const store = useStore();|const globalStore = useGlobalStore();\n  const retrieveStore = useRetrieveStore();\n  const userStore = useUserStore();\n  const collectStore = useCollectStore();\n  const indexFieldStore = useIndexFieldStore();\n  const storageStore = useStorageStore();|g" "$file"
            MODIFIED=true
        fi
        
        # 3. 替换 state 访问 - GlobalStore
        sed -i "s|store\.state\.spaceUid|globalStore.spaceUid|g" "$file"
        sed -i "s|store\.state\.bkBizId|globalStore.bkBizId|g" "$file"
        sed -i "s|store\.state\.indexId|globalStore.indexSetId|g" "$file"
        sed -i "s|store\.state\.isExternal|globalStore.isExternal|g" "$file"
        sed -i "s|store\.state\.runVer|globalStore.runVer|g" "$file"
        sed -i "s|store\.state\.featureToggle|globalStore.featureToggle|g" "$file"
        sed -i "s|store\.state\.features|globalStore.features|g" "$file"
        sed -i "s|store\.state\.showAlert|globalStore.showAlert|g" "$file"
        sed -i "s|store\.state\.isShowGlobalDialog|globalStore.isShowGlobalDialog|g" "$file"
        sed -i "s|store\.state\.authDialogData|globalStore.authDialogData|g" "$file"
        
        # 4. 替换 state 访问 - UserStore
        sed -i "s|store\.state\.userMeta\.bk_tenant_id|userStore.userInfo?.tenant_id|g" "$file"
        sed -i "s|store\.state\.userMeta\.username|userStore.username|g" "$file"
        sed -i "s|store\.state\.userMeta|userStore.userInfo|g" "$file"
        
        # 5. 替换 state 访问 - RetrieveStore
        sed -i "s|store\.state\.cacheDatePickerValue|retrieveStore.cacheDatePickerValue|g" "$file"
        sed -i "s|store\.state\.cacheTimeRange|retrieveStore.cacheTimeRange|g" "$file"
        sed -i "s|store\.state\.indexSetList|retrieveStore.indexSetList|g" "$file"
        sed -i "s|store\.state\.indexSetLoading|retrieveStore.isIndexSetLoading|g" "$file"
        sed -i "s|store\.state\.indexSetQueryResult|retrieveStore.indexSetQueryResult|g" "$file"
        sed -i "s|store\.state\.indexItem|retrieveStore.indexItem|g" "$file"
        sed -i "s|store\.state\.storeIsShowClusterStep|retrieveStore.storeIsShowClusterStep|g" "$file"
        sed -i "s|store\.state\.clusterParams|retrieveStore.clusterParams|g" "$file"
        sed -i "s|store\.state\.aiMode|retrieveStore.aiMode|g" "$file"
        sed -i "s|store\.state\.indexItemParams|retrieveStore.indexItemParams|g" "$file"
        
        # 6. 替换 state 访问 - IndexFieldStore
        sed -i "s|store\.state\.indexFieldInfo\.fields|indexFieldStore.indexFieldInfo.fields|g" "$file"
        sed -i "s|store\.state\.indexFieldInfo\.aggs_items|indexFieldStore.indexFieldInfo.aggs_items|g" "$file"
        sed -i "s|store\.state\.indexFieldInfo|indexFieldStore.indexFieldInfo|g" "$file"
        sed -i "s|store\.state\.globals\.fieldTypeMap|indexFieldStore.fieldTypeMap|g" "$file"
        
        # 7. 替换 state 访问 - CollectStore
        sed -i "s|store\.state\.collect\.curCollect|collectStore.curCollect|g" "$file"
        sed -i "s|store\.state\.collect\.exportCollectObj|collectStore.exportCollectObj|g" "$file"
        
        # 8. 替换 commit - StorageStore
        sed -i "s|store\.commit('updateStorage', \(.*\))|storageStore.updateStorage(\1)|g" "$file"
        
        # 9. 替换 commit - RetrieveStore
        sed -i "s|store\.commit('retrieve/updateCachePickerValue', \(.*\))|retrieveStore.updateCachePickerValue(\1)|g" "$file"
        sed -i "s|store\.commit('updateAiMode', \(.*\))|retrieveStore.updateAiMode(\1)|g" "$file"
        sed -i "s|store\.commit('updateIndexItemParams', \(.*\))|retrieveStore.updateIndexItemParams(\1)|g" "$file"
        sed -i "s|store\.commit('updateIndexSetCustomConfig', \(.*\))|retrieveStore.updateIndexSetCustomConfig(\1)|g" "$file"
        
        # 10. 替换 commit - CollectStore
        sed -i "s|store\.commit('collect/updateExportCollectObj', \(.*\))|collectStore.updateExportCollectObj(\1)|g" "$file"
        
        # 11. 替换 commit - IndexFieldStore
        sed -i "s|store\.commit('updateIndexFieldEggsItems', \(.*\))|indexFieldStore.updateIndexFieldEggsItems(\1)|g" "$file"
        
        # 12. 替换 commit - GlobalStore (updateState 特殊处理)
        sed -i "s|store\.commit('updateState', \(.*\))|globalStore.updateState(\1)|g" "$file"
        
        # 检查是否有修改
        if ! diff -q "$file" "$file.bak" > /dev/null 2>&1; then
            MODIFIED=true
            ((MODIFIED_FILES++))
            echo "$file" >> "$MODIFIED_LOG"
            log "  ✓ 已修改"
        else
            log "  - 无需修改"
        fi
        
        # 删除备份（如果需要保留备份，注释此行）
        rm -f "$file.bak"
    fi
done

log ""
log "=========================================="
log "迁移完成统计"
log "=========================================="
log "总文件数: $TOTAL_FILES"
log "已修改文件数: $MODIFIED_FILES"
log "错误数: $ERRORS"
log ""
log "详细日志: $LOG_FILE"
log "错误日志: $ERROR_LOG"
log "修改文件列表: $MODIFIED_LOG"
log "=========================================="

# 输出修改的文件列表
if [ -s "$MODIFIED_LOG" ]; then
    echo ""
    echo "以下文件已被修改:"
    cat "$MODIFIED_LOG"
fi

exit 0
