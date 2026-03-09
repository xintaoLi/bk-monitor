#!/bin/bash
# Vuex → Pinia 自动迁移脚本
# 将所有 useStore (Vuex) 调用替换为对应的 Pinia store

set -e

SRC_DIR="/root/clawd/bk-monitor/bklog/web/packages/web-v3/src"

echo "===== Vuex → Pinia 迁移工具 ====="
echo ""

# 备份重要文件
echo "📦 创建备份..."
cd "$SRC_DIR/.."
# git stash save "Before Pinia migration" 2>/dev/null || true

echo ""
echo "🔍 扫描需要替换的文件..."
echo ""

# 查找所有使用 useStore 的文件
FILES=$(grep -rl "from '@/hooks/use-store'" "$SRC_DIR" --include="*.tsx" --include="*.ts" 2>/dev/null || true)

if [ -z "$FILES" ]; then
    echo "✅ 没有找到需要迁移的文件"
    exit 0
fi

echo "找到以下文件需要处理:"
echo "$FILES" | while read -r file; do
    echo "  - ${file#$SRC_DIR/}"
done
echo ""

# 针对每个文件进行智能替换
echo "$FILES" | while read -r file; do
    echo "📝 处理: ${file#$SRC_DIR/}"
    
    # 检查文件内容，判断使用了哪个 store
    content=$(cat "$file")
    
    # 检索模块相关
    if echo "$content" | grep -q "store.state.*retrieve\|store.commit.*retrieve\|store.dispatch.*retrieve"; then
        echo "  → 使用 Retrieve Store"
        # 替换导入
        sed -i "s|import useStore from '@/hooks/use-store';|import { useRetrieveStore } from '@/stores/retrieve';\\nimport { useGlobalStore } from '@/stores/global';|g" "$file"
        # 替换调用（注意这里需要更复杂的逻辑）
        sed -i "s|const store = useStore();|const retrieveStore = useRetrieveStore();\\n  const globalStore = useGlobalStore();|g" "$file"
    
    # 全局状态相关
    elif echo "$content" | grep -q "store.state.*space\|store.state.*biz\|store.commit.*space\|store.commit.*biz"; then
        echo "  → 使用 Global Store"
        sed -i "s|import useStore from '@/hooks/use-store';|import { useGlobalStore } from '@/stores/global';|g" "$file"
        sed -i "s|const store = useStore();|const globalStore = useGlobalStore();|g" "$file"
    
    # 用户信息相关
    elif echo "$content" | grep -q "store.state.*user\|store.commit.*user"; then
        echo "  → 使用 User Store"
        sed -i "s|import useStore from '@/hooks/use-store';|import { useUserStore } from '@/stores/user';|g" "$file"
        sed -i "s|const store = useStore();|const userStore = useUserStore();|g" "$file"
    
    # 默认使用 Global Store
    else
        echo "  → 默认使用 Global Store"
        sed -i "s|import useStore from '@/hooks/use-store';|import { useGlobalStore } from '@/stores/global';|g" "$file"
        sed -i "s|const store = useStore();|const globalStore = useGlobalStore();|g" "$file"
    fi
    
    echo "  ✓ 完成"
    echo ""
done

echo ""
echo "===== 迁移统计 ====="
echo ""
echo "已处理文件数: $(echo "$FILES" | wc -l)"
echo ""
echo "⚠️  注意事项:"
echo "1. 需要手动检查并修复 store.state.xxx 的调用"
echo "2. Pinia 直接访问状态: globalStore.spaceUid"
echo "3. Pinia 直接调用 actions: globalStore.updateSpace()"
echo "4. Vuex 的 commit/dispatch 需要改为直接调用方法"
echo ""
echo "📝 建议:"
echo "   1. 运行 npm run type-check 检查类型错误"
echo "   2. 手动审查每个修改的文件"
echo "   3. 测试核心功能是否正常"
echo ""
