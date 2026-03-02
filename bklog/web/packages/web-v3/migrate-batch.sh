#!/bin/bash
# BKLog Web-v3 批量迁移脚本
# 自动将 src/views/retrieve-v3 和 manage-v2 迁移到 packages/web-v3

set -e

SRC_BASE="/root/clawd/bk-monitor/bklog/web/src"
DEST_BASE="/root/clawd/bk-monitor/bklog/web/packages/web-v3/src"

echo "===== BKLog Web-v3 批量迁移工具 ====="
echo "源目录: $SRC_BASE"
echo "目标目录: $DEST_BASE"
echo ""

# 函数：复制并转换单个文件
copy_and_convert() {
    local src_file="$1"
    local dest_file="$2"
    
    # 创建目标目录
    mkdir -p "$(dirname "$dest_file")"
    
    #复制文件
    cp "$src_file" "$dest_file"
    
    echo "✓ $src_file -> $dest_file"
}

# 函数：批量复制目录
copy_directory() {
    local src_dir="$1"
    local dest_dir="$2"
    local file_pattern="$3"
    
    if [ ! -d "$src_dir" ]; then
        echo "⚠ 源目录不存在: $src_dir"
        return
    fi
    
    echo "📁 复制目录: $src_dir"
    
    # 查找所有匹配的文件
    find "$src_dir" -type f \( -name "$file_pattern" \) | while read -r src_file; do
        # 计算相对路径
        rel_path="${src_file#$src_dir/}"
        dest_file="$dest_dir/$rel_path"
        
        copy_and_convert "$src_file" "$dest_file"
    done
}

echo "============================================"
echo "阶段 1: 迁移 Retrieve 检索模块 (retrieve-v3)"
echo "============================================"

# 1.1 复制整个 retrieve-v3 目录
copy_directory \
    "$SRC_BASE/views/retrieve-v3" \
    "$DEST_BASE/views/retrieve" \
    "*.tsx"

copy_directory \
    "$SRC_BASE/views/retrieve-v3" \
    "$DEST_BASE/views/retrieve" \
    "*.ts"

copy_directory \
    "$SRC_BASE/views/retrieve-v3" \
    "$DEST_BASE/views/retrieve" \
    "*.scss"

echo ""
echo "============================================"
echo "阶段 2: 迁移 Manage 管理模块 (manage-v2)"
echo "============================================"

# 2.1 Client Log 客户端日志
copy_directory \
    "$SRC_BASE/views/manage-v2/client-log" \
    "$DEST_BASE/views/manage/client-log" \
    "*.tsx"

copy_directory \
    "$SRC_BASE/views/manage-v2/client-log" \
    "$DEST_BASE/views/manage/client-log" \
    "*.ts"

# 2.2 ES Cluster
copy_directory \
    "$SRC_BASE/views/manage-v2/es-cluster" \
    "$DEST_BASE/views/manage/cluster" \
    "*.tsx"

# 2.3 Log Archive
copy_directory \
    "$SRC_BASE/views/manage-v2/log-archive" \
    "$DEST_BASE/views/manage/archive" \
    "*.tsx"

# 2.4 Log Collection (最大模块)
copy_directory \
    "$SRC_BASE/views/manage-v2/log-collection" \
    "$DEST_BASE/views/manage/log-collection" \
    "*.tsx"

copy_directory \
    "$SRC_BASE/views/manage-v2/log-collection" \
    "$DEST_BASE/views/manage/log-collection" \
    "*.ts"

# 2.5 Log Extract
copy_directory \
    "$SRC_BASE/views/manage-v2/log-extract" \
    "$DEST_BASE/views/manage/extract" \
    "*.tsx"

# 2.6 Hooks
copy_directory \
    "$SRC_BASE/views/manage-v2/hooks" \
    "$DEST_BASE/views/manage/hooks" \
    "*.ts"

# 2.7 Helper
if [ -f "$SRC_BASE/views/manage-v2/manage-helper.ts" ]; then
    copy_and_convert \
        "$SRC_BASE/views/manage-v2/manage-helper.ts" \
        "$DEST_BASE/views/manage/manage-helper.ts"
fi

echo ""
echo "============================================"
echo "阶段 3: 迁移共享组件"
echo "============================================"

# 3.1 Collection Access (采集接入核心组件)
copy_directory \
    "$SRC_BASE/components/collection-access" \
    "$DEST_BASE/components/business/collection-access" \
    "*.tsx"

copy_directory \
    "$SRC_BASE/components/collection-access" \
    "$DEST_BASE/components/business/collection-access" \
    "*.vue"

copy_directory \
    "$SRC_BASE/components/collection-access" \
    "$DEST_BASE/components/business/collection-access" \
    "*.scss"

# 3.2 Log Masking
copy_directory \
    "$SRC_BASE/components/log-masking" \
    "$DEST_BASE/components/business/log-masking" \
    "*.tsx"

copy_directory \
    "$SRC_BASE/components/log-masking" \
    "$DEST_BASE/components/business/log-masking" \
    "*.scss"

# 3.3 Filter Rule
copy_directory \
    "$SRC_BASE/components/filter-rule" \
    "$DEST_BASE/components/business/filter-rule" \
    "*.tsx"

copy_directory \
    "$SRC_BASE/components/filter-rule" \
    "$DEST_BASE/components/business/filter-rule" \
    "*.scss"

# 3.4 Log View
copy_directory \
    "$SRC_BASE/components/log-view" \
    "$DEST_BASE/components/business/log-view" \
    "*.tsx"

copy_directory \
    "$SRC_BASE/components/log-view" \
    "$DEST_BASE/components/business/log-view" \
    "*.vue"

copy_directory \
    "$SRC_BASE/components/log-view" \
    "$DEST_BASE/components/business/log-view" \
    "*.js"

# 3.5 Monitor Echarts
copy_directory \
    "$SRC_BASE/components/monitor-echarts" \
    "$DEST_BASE/components/business/monitor-echarts" \
    "*.tsx"

copy_directory \
    "$SRC_BASE/components/monitor-echarts" \
    "$DEST_BASE/components/business/monitor-echarts" \
    "*.vue"

# 3.6 其他表单和通用组件
COMMON_COMPONENTS=(
    "bklog-popover"
    "ellipsis-tag-list"
    "time-range"
    "user-selector"
    "log-ip-selector"
    "index-set-label-select"
    "global-dialog"
    "global-setting"
    "import-from-other-index-set"
    "log-import"
)

for comp in "${COMMON_COMPONENTS[@]}"; do
    if [ -d "$SRC_BASE/components/$comp" ]; then
        copy_directory \
            "$SRC_BASE/components/$comp" \
            "$DEST_BASE/components/common/$comp" \
            "*.tsx"
        
        copy_directory \
            "$SRC_BASE/components/$comp" \
            "$DEST_BASE/components/common/$comp" \
            "*.scss"
    fi
done

echo ""
echo "============================================"
echo "迁移完成统计"
echo "============================================"

echo "检索模块文件数:"
find "$DEST_BASE/views/retrieve" -type f 2>/dev/null | wc -l

echo "管理模块文件数:"
find "$DEST_BASE/views/manage" -type f 2>/dev/null | wc -l

echo "组件文件数:"
find "$DEST_BASE/components" -type f 2>/dev/null | wc -l

echo ""
echo "✅ 批量迁移完成！"
echo ""
echo "⚠️  注意事项:"
echo "1. 所有文件已复制，但可能需要调整导入路径"
echo "2. Vue2 特性需要手动转换为 Vue3"
echo "3. bkui-vue 需要替换为 TDesign Vue Next"
echo "4. Store 需要从 Vuex 迁移到 Pinia"
echo "5. 检查并修复 TypeScript 类型错误"
echo ""
echo "📝 下一步:"
echo "   cd $DEST_BASE"
echo "   npm run lint --fix"
echo ""
