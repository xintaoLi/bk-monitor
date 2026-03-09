# 🔧 BKLog Web-v3 技术债务处理计划

**目标**: 从 82.89% 完成度提升到 100%  
**预计时间**: 2-3小时  
**开始时间**: 2026-03-02 11:00 GMT+8

---

## 📋 技术债务清单

### 1. 导入路径调整 ⚠️ 高优先级
**问题**: 迁移后的文件仍使用旧路径  
**影响**: 编译失败、运行时错误  
**工作量**: 30分钟  

**需要替换的路径**:
- `@/views/retrieve-v3` → `@/views/retrieve`
- `@/views/manage-v2` → `@/views/manage`
- `@/components/` → 根据新结构调整

**执行策略**:
```bash
# 批量替换所有 .tsx .ts 文件中的导入路径
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i 's|@/views/retrieve-v3|@/views/retrieve|g' {} +
find src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i 's|@/views/manage-v2|@/views/manage|g' {} +
```

---

### 2. Vue2 特性清理 ⚠️ 高优先级
**问题**: 代码中存在 Vue2 特有的 API  
**影响**: Vue3 兼容性问题  
**工作量**: 45分钟  

**需要处理的特性**:
- `$listeners` → 使用 `attrs`
- `$scopedSlots` → 使用 `slots`
- `this.$refs` → 使用 `ref()` + `.value`
- `Vue.observable()` → `reactive()`
- `@hook:mounted` → `onMounted`
- Event Bus → Provide/Inject 或 Pinia

**执行策略**:
1. 搜索并标记所有使用 Vue2 API 的文件
2. 逐文件手动审查和修复（自动化风险高）
3. 优先处理核心模块

---

### 3. Vuex → Pinia 迁移 ⚠️ 高优先级
**问题**: Store 仍使用 Vuex  
**影响**: 无法利用 Vue3 性能优势  
**工作量**: 60分钟  

**需要创建的 Pinia Stores**:
- `useRetrieveStore` - 检索模块状态
- `useManageStore` - 管理模块状态
- `useGlobalStore` - 全局状态
- `useUserStore` - 用户信息
- `useIndexSetStore` - 索引集状态

**执行策略**:
1. 在 `src/stores/` 创建 Pinia store 文件
2. 将 Vuex 模块逐个转换为 Pinia
3. 更新所有 `useStore()` 调用为对应的 Pinia store
4. 测试状态管理功能

---

### 4. 组件库替换 (bkui-vue → TDesign) ⚠️ 中优先级
**问题**: 部分组件仍使用 bkui-vue  
**影响**: 组件库不一致  
**工作量**: 90分钟  

**需要替换的组件**:
- `bk-button` → `t-button`
- `bk-input` → `t-input`
- `bk-select` → `t-select`
- `bk-table` → `t-table`
- `bk-dialog` → `t-dialog`
- `bk-form` → `t-form`
- `bk-checkbox` → `t-checkbox`
- `bk-radio` → `t-radio`
- `bk-date-picker` → `t-date-picker`

**执行策略**:
1. 创建组件映射表
2. 批量搜索替换（注意 props 差异）
3. 手动调整不兼容的 API
4. 测试组件渲染

---

### 5. TypeScript 类型检查修复 ⚠️ 中优先级
**问题**: 存在类型错误  
**影响**: 类型安全性降低  
**工作量**: 45分钟  

**常见问题**:
- 隐式 `any` 类型
- 缺少类型定义
- Props 类型不匹配
- 导入路径错误

**执行策略**:
```bash
npm run type-check 2>&1 | tee type-errors.log
# 逐个修复类型错误
```

---

### 6. 路由配置更新 ⚠️ 高优先级
**问题**: 路由仍指向旧文件  
**影响**: 页面无法访问  
**工作量**: 30分钟  

**需要更新**:
- `src/router/index.ts` - 主路由配置
- `src/router/retrieve.ts` - 检索模块路由
- `src/router/manage.ts` - 管理模块路由
- 懒加载路径更新

---

### 7. ESLint 和代码格式化 ⚠️ 低优先级
**问题**: 代码风格不一致  
**影响**: 代码可读性  
**工作量**: 15分钟  

**执行策略**:
```bash
npm run lint --fix
npm run format
```

---

### 8. 单元测试更新 ⚠️ 低优先级
**问题**: 测试用例需要更新  
**影响**: 测试覆盖率  
**工作量**: 60分钟（可选）  

**执行策略**:
- 更新测试文件中的导入路径
- 适配 Vue3 测试语法
- 补充核心功能测试

---

## 🎯 执行顺序

### 阶段 1: 基础设施修复 (60分钟)
1. ✅ 导入路径调整 (30分钟)
2. ✅ 路由配置更新 (30分钟)

### 阶段 2: 核心技术升级 (105分钟)
3. ✅ Vuex → Pinia 迁移 (60分钟)
4. ✅ Vue2 特性清理 (45分钟)

### 阶段 3: 组件库和类型 (135分钟)
5. ✅ 组件库替换 (90分钟)
6. ✅ TypeScript 类型检查修复 (45分钟)

### 阶段 4: 代码质量 (15分钟)
7. ✅ ESLint 和代码格式化 (15分钟)

### 阶段 5: 测试（可选）
8. ⚠️ 单元测试更新 (60分钟) - 根据时间决定

**总计**: 约 315 分钟 (5.25小时)  
**核心工作**: 约 255 分钟 (4.25小时)

---

## 📊 预期成果

完成后将达到:
- ✅ 100% 路径正确性
- ✅ 100% Vue3 兼容性
- ✅ 100% Pinia 状态管理
- ✅ 90%+ TDesign 组件库使用率
- ✅ 0 TypeScript 类型错误
- ✅ 0 ESLint 错误

---

## 🚨 风险评估

| 风险 | 等级 | 应对措施 |
|------|------|---------|
| 路径替换错误 | 中 | 先备份，分批替换并测试 |
| Vue2 API 转换遗漏 | 高 | 全局搜索 + 手动审查 |
| Pinia 迁移破坏功能 | 高 | 保留 Vuex，逐步迁移并测试 |
| TDesign 组件不兼容 | 中 | 保留部分 bkui-vue，自定义封装 |
| TypeScript 类型爆炸 | 中 | 先 `@ts-ignore`，后续优化 |

---

**创建时间**: 2026-03-02 11:00 GMT+8  
**更新时间**: -  
**状态**: 📝 计划中
