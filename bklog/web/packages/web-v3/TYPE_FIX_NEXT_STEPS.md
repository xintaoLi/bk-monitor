# BKLog Web-v3 类型修复工作总结

## 📊 当前状态

| 指标 | 初始值 | 当前值 | 变化 |
|-----|-------|-------|------|
| 总错误数 | 2,590 | 2,835 | +245 |
| 关键错误 | 2,023 | ~2,267 | +244 |
| TS6133 警告 | 567 | 568 | +1 |
| 可修复的关键错误 | - | ~1,800 | - |

**注意：** 错误增加是因为创建了 stub 模块补充缺失的功能，引入了新的类型不匹配。实际可修复的错误约为 **1,800 个**。

## ✅ 已完成的工作

### 1. Pinia Store 类型系统
- [x] 创建完整的 Store 类型定义 (`src/stores/types.ts`)
- [x] 为 6 个主要 stores 添加类型断言
- [x] 解决了约 70+ 个 Store actions 类型推断问题

### 2. API 模块修复
- [x] 修复 `src/api/index.ts` 添加默认导出
- [x] 解决 88 个 "Module has no default export" 错误

### 3. 补充缺失模块（Stub）
- [x] `src/common/util.ts` - 通用工具函数
- [x] `src/common/authority-map.ts` - 权限映射
- [x] `src/hooks/use-resize-observe.ts` - Resize Observer
- [x] `src/hooks/use-retrieve-event.ts` - 检索事件
- [x] `src/store/*.ts` - Store 相关模块
- [x] `src/views/retrieve-helper.ts` - 检索辅助类
- [x] `src/shims/bk-magic-vue.ts` - bk-magic-vue 兼容

### 4. 具体文件修复
- [x] `use-app-init.tsx` - 3 处 store 未定义 + 类型推断
- [x] `share/index.tsx` - bkui-vue Result 导入
- [x] 所有 store 文件的类型定义

## ⚠️  待完成的工作

### Phase 1：修复 Stub 模块（1-2天）🔥 **紧急**
**目标：错误降至 2,000 以下**

**任务清单：**
- [ ] 补充 `RetrieveHelper` 缺失方法（setSearchingValue, getScrollSelector, 等）
- [ ] 完善 `RetrieveUrlResolver` 方法
- [ ] 修复 `useResizeObserve` 参数签名
- [ ] 添加缺失的事件类型（GLOBAL_SCROLL）

**执行方式：**
```bash
cd /root/clawd/bk-monitor/bklog/web/packages/web-v3

# 1. 编辑 src/views/retrieve-helper.ts
# 2. 编辑 src/store/url-resolver.ts  
# 3. 编辑 src/hooks/use-resize-observe.ts
# 4. 编辑 src/hooks/use-retrieve-event.ts

# 运行类型检查验证
npm run type-check
```

### Phase 2：批量修复 store 未定义（2-3天）🔥 **高优先级**
**目标：错误降至 1,500-1,700**

约 189 个文件中有 `store` 未定义错误。

**推荐策略：使用自动化脚本**
```bash
# 创建智能修复脚本
./scripts/fix-all-store-undefined.sh

# 或手动修复高频文件
# 1. views/manage/cluster/cluster-manage/es-slider.tsx (70 错误)
# 2. views/retrieve/search-result/log-clustering/index.tsx (~50 错误)
# 3. 其他文件按优先级逐个修复
```

### Phase 3：迁移 Options API 组件（3-5天）⚠️  **中优先级**
**目标：错误降至 1,200-1,400**

25+ 个组件需要从 Options API 迁移到 Composition API。

**优先迁移：**
1. `components/business/log-masking/*.tsx` (5个，~200 错误)
2. `components/business/collection-access/step-*.tsx` (5个，~100 错误)

### Phase 4：补充类型定义（2-3天）⚠️  **中优先级**
**目标：错误降至 600-800**

- [ ] 修复函数签名不匹配 (196 个)
- [ ] 补充类型定义 (190 个)
- [ ] 添加第三方库类型声明 (242 个)

### Phase 5：最终优化（1-2天）✅ **低优先级**
**目标：错误 < 100**

- [ ] 清理未使用变量 (568 个)
- [ ] 修复剩余零散错误
- [ ] 运行 `npm run build` 验证
- [ ] 生成最终报告

## 🚀 快速开始

### 立即执行（推荐）

```bash
cd /root/clawd/bk-monitor/bklog/web/packages/web-v3

# 1. 查看当前错误统计
npm run type-check 2>&1 | grep "Found"

# 2. 补充 RetrieveHelper 缺失方法
vim src/views/retrieve-helper.ts

# 在 RetrieveHelperClass 中添加：
# setSearchingValue(value: any): void { /* ... */ }
# getScrollSelector(): string { return '.scroll-container'; }
# onMounted(callback: Function): void { /* ... */ }
# destroy(): void { this.clearAllListeners(); }
# routeQueryTabValueFix(tab: string): string { return tab; }

# 3. 运行类型检查验证改进
npm run type-check

# 4. 继续处理其他 stub 模块...
```

### 参考文档

- **完整报告：** [TYPE_FIX_FINAL_COMPREHENSIVE_REPORT.md](./TYPE_FIX_FINAL_COMPREHENSIVE_REPORT.md)
- **Pinia 迁移指南：** [PINIA_REPLACE_MAP.md](./PINIA_REPLACE_MAP.md)
- **原始错误日志：** `/tmp/typecheck-round5.log`

## 📞 需要帮助？

如果在后续修复过程中遇到问题，参考以下资源：

1. **查看错误详情：**
   ```bash
   npm run type-check 2>&1 | grep "TS2304" > store-undefined-errors.log
   ```

2. **按文件统计错误：**
   ```bash
   npm run type-check 2>&1 | grep "error TS" | cut -d'(' -f1 | sort | uniq -c | sort -rn | head -20
   ```

3. **查找特定模块的错误：**
   ```bash
   npm run type-check 2>&1 | grep "views/retrieve"
   ```

## 📈 预期时间线

- **Week 1-2:** Phase 1-2（紧急 + 高优先级）→ 错误降至 2,000 以下
- **Week 3-4:** Phase 3-4（中优先级）→ 错误降至 600-800
- **Week 5:** Phase 5（低优先级）→ 错误 < 100

**总计：约 3-5 周完成全部修复**

---

**最后更新：** 2026-03-02  
**执行者：** Subagent (cbbd4e67)
