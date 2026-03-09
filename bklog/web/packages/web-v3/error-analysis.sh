#!/bin/bash

echo "=== BKLog Web-v3 类型错误分析 ==="
echo ""

LOG_FILE="/tmp/typecheck3.log"

# 总错误数
TOTAL=$(grep -c "error TS" "$LOG_FILE" 2>/dev/null || echo "0")
echo "📊 总错误数: $TOTAL"
echo ""

# 按错误类型统计
echo "📋 错误类型分布（Top 15）:"
cat "$LOG_FILE" | grep "error TS" | sed 's/.*error TS\([0-9]*\): .*/TS\1/' | sort | uniq -c | sort -rn | head -15 | while read count code; do
    case "$code" in
        "TS6133") desc="未使用的变量声明 [不影响运行]" ;;
        "TS2339") desc="属性不存在（多为 Pinia actions）" ;;
        "TS2551") desc="属性拼写错误或不存在" ;;
        "TS2304") desc="找不到名称" ;;
        "TS2345") desc="参数类型不匹配" ;;
        "TS2307") desc="找不到模块" ;;
        "TS1192") desc="模块没有默认导出" ;;
        "TS2614") desc="模块没有导出的成员" ;;
        "TS2322") desc="类型不可赋值" ;;
        *) desc="其他错误" ;;
    esac
    printf "  %-8s %4d  %s\n" "$code" "$count" "$desc"
done
echo ""

# 按文件统计错误最多的文件
echo "📁 错误最多的文件（Top 10）:"
cat "$LOG_FILE" | grep "error TS" | sed 's/^\(src\/[^(]*\).*/\1/' | sort | uniq -c | sort -rn | head -10 | while read count file; do
    printf "  %4d  %s\n" "$count" "$file"
done
echo ""

# store 相关错误
STORE_ERRORS=$(grep -c "Cannot find name 'store'" "$LOG_FILE" 2>/dev/null || echo "0")
echo "🏪 剩余 store 未定义错误: $STORE_ERRORS"
echo ""

# 模块导入错误
MODULE_ERRORS=$(grep -c "Cannot find module\|has no default export\|has no exported member" "$LOG_FILE" 2>/dev/null || echo "0")
echo "📦 模块导入相关错误: $MODULE_ERRORS"
echo ""

# Pinia store actions 错误
PINIA_ERRORS=$(grep -c "does not exist on type 'Store<" "$LOG_FILE" 2>/dev/null || echo "0")
echo "🗄️  Pinia Store actions 类型错误: $PINIA_ERRORS"
echo ""

# 未使用变量（警告级别）
UNUSED=$(grep -c "is declared but its value is never read" "$LOG_FILE" 2>/dev/null || echo "0")
echo "⚠️  未使用的变量警告: $UNUSED (可忽略)"
echo ""

# 关键错误（排除警告）
CRITICAL=$((TOTAL - UNUSED))
echo "🔴 关键错误数（排除未使用警告）: $CRITICAL"
echo ""

echo "=== 修复建议 ==="
echo "1. 优先修复 Pinia Store actions 类型推断问题 ($PINIA_ERRORS 个)"
echo "2. 继续修复剩余的 store 未定义错误 ($STORE_ERRORS 个)"
echo "3. 解决模块导入问题 ($MODULE_ERRORS 个)"
echo "4. 可选：清理未使用的变量 ($UNUSED 个)"
echo ""

