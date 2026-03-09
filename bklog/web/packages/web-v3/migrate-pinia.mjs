#!/usr/bin/env node

/**
 * BKLog Web-v3 Vuex to Pinia Migration Script
 * 精确的自动化批量替换脚本
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WORK_DIR = '/root/clawd/bk-monitor/bklog/web/packages/web-v3';
const LOG_FILE = path.join(WORK_DIR, 'migration.log');
const ERROR_LOG = path.join(WORK_DIR, 'migration-errors.log');
const MODIFIED_LOG = path.join(WORK_DIR, 'migration-modified.log');
const REPORT_FILE = path.join(WORK_DIR, 'MIGRATION_REPORT.md');

let totalFiles = 0;
let modifiedFiles = 0;
let errors = 0;
const modifiedFilesList = [];
const errorsList = [];

// 清空日志文件
fs.writeFileSync(LOG_FILE, '');
fs.writeFileSync(ERROR_LOG, '');
fs.writeFileSync(MODIFIED_LOG, '');

function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(message);
  fs.appendFileSync(LOG_FILE, logMessage);
}

function logError(message, file) {
  const errorMessage = `[ERROR] ${file}: ${message}\n`;
  console.error(errorMessage);
  fs.appendFileSync(ERROR_LOG, errorMessage);
  errors++;
  errorsList.push({ file, error: message });
}

// 递归获取所有文件
function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      getAllFiles(filePath, fileList);
    } else if ((file.endsWith('.tsx') || file.endsWith('.ts')) && !file.endsWith('.d.ts')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// 检查文件是否需要处理
function needsProcessing(content) {
  return (
    content.includes('useStore()') ||
    content.includes('store.state.') ||
    content.includes('store.commit') ||
    content.includes('this.$store')
  );
}

// 检查文件是否已部分处理
function isPartiallyProcessed(content) {
  return (
    content.includes('useGlobalStore') ||
    content.includes('useRetrieveStore') ||
    content.includes('useUserStore')
  );
}

// 替换 import 语句
function replaceImports(content) {
  // 如果已经有 Pinia store 的 import，不重复添加
  if (content.includes("from '@/stores/global'")) {
    return content;
  }
  
  // 替换 Vuex useStore import
  if (content.includes("import { useStore } from 'vuex'")) {
    content = content.replace(
      /import\s+{\s*useStore\s*}\s+from\s+['"]vuex['"];?/g,
      `import { useGlobalStore } from '@/stores/global';
import { useRetrieveStore } from '@/stores/retrieve';
import { useUserStore } from '@/stores/user';
import { useCollectStore } from '@/stores/collect';
import { useIndexFieldStore } from '@/stores/index-field';
import { useStorageStore } from '@/stores/storage';`
    );
  }
  
  return content;
}

// 替换 useStore() 调用
function replaceUseStore(content) {
  // 替换 const store = useStore()
  if (content.includes('const store = useStore()')) {
    content = content.replace(
      /const\s+store\s*=\s*useStore\(\);?/g,
      `const globalStore = useGlobalStore();
  const retrieveStore = useRetrieveStore();
  const userStore = useUserStore();
  const collectStore = useCollectStore();
  const indexFieldStore = useIndexFieldStore();
  const storageStore = useStorageStore();`
    );
  }
  
  return content;
}

// 替换 state 访问
function replaceStateAccess(content) {
  const replacements = [
    // GlobalStore
    [/store\.state\.spaceUid/g, 'globalStore.spaceUid'],
    [/store\.state\.bkBizId/g, 'globalStore.bkBizId'],
    [/store\.state\.indexId\b/g, 'globalStore.indexSetId'],
    [/store\.state\.isExternal/g, 'globalStore.isExternal'],
    [/store\.state\.runVer/g, 'globalStore.runVer'],
    [/store\.state\.featureToggle/g, 'globalStore.featureToggle'],
    [/store\.state\.features\b/g, 'globalStore.features'],
    [/store\.state\.showAlert/g, 'globalStore.showAlert'],
    [/store\.state\.isShowGlobalDialog/g, 'globalStore.isShowGlobalDialog'],
    [/store\.state\.authDialogData/g, 'globalStore.authDialogData'],
    
    // UserStore
    [/store\.state\.userMeta\.bk_tenant_id/g, 'userStore.userInfo?.tenant_id'],
    [/store\.state\.userMeta\.username/g, 'userStore.username'],
    [/store\.state\.userMeta/g, 'userStore.userInfo'],
    
    // RetrieveStore
    [/store\.state\.cacheDatePickerValue/g, 'retrieveStore.cacheDatePickerValue'],
    [/store\.state\.cacheTimeRange/g, 'retrieveStore.cacheTimeRange'],
    [/store\.state\.indexSetList/g, 'retrieveStore.indexSetList'],
    [/store\.state\.indexSetLoading/g, 'retrieveStore.isIndexSetLoading'],
    [/store\.state\.indexSetQueryResult/g, 'retrieveStore.indexSetQueryResult'],
    [/store\.state\.indexItem/g, 'retrieveStore.indexItem'],
    [/store\.state\.storeIsShowClusterStep/g, 'retrieveStore.storeIsShowClusterStep'],
    [/store\.state\.clusterParams/g, 'retrieveStore.clusterParams'],
    [/store\.state\.aiMode/g, 'retrieveStore.aiMode'],
    [/store\.state\.indexItemParams/g, 'retrieveStore.indexItemParams'],
    
    // IndexFieldStore
    [/store\.state\.indexFieldInfo\.fields/g, 'indexFieldStore.indexFieldInfo.fields'],
    [/store\.state\.indexFieldInfo\.aggs_items/g, 'indexFieldStore.indexFieldInfo.aggs_items'],
    [/store\.state\.indexFieldInfo/g, 'indexFieldStore.indexFieldInfo'],
    [/store\.state\.globals\.fieldTypeMap/g, 'indexFieldStore.fieldTypeMap'],
    
    // CollectStore
    [/store\.state\.collect\.curCollect/g, 'collectStore.curCollect'],
    [/store\.state\.collect\.exportCollectObj/g, 'collectStore.exportCollectObj'],
    
    // StorageStore - 需要特殊处理动态访问
    // store.state.storage[xxx] → storageStore[xxx]
  ];
  
  replacements.forEach(([pattern, replacement]) => {
    content = content.replace(pattern, replacement);
  });
  
  return content;
}

// 替换 commit 调用
function replaceCommits(content) {
  const replacements = [
    // StorageStore
    [/store\.commit\(['"]updateStorage['"],\s*([^)]+)\)/g, 'storageStore.updateStorage($1)'],
    
    // RetrieveStore
    [/store\.commit\(['"]retrieve\/updateCachePickerValue['"],\s*([^)]+)\)/g, 'retrieveStore.updateCachePickerValue($1)'],
    [/store\.commit\(['"]updateAiMode['"],\s*([^)]+)\)/g, 'retrieveStore.updateAiMode($1)'],
    [/store\.commit\(['"]updateIndexItemParams['"],\s*([^)]+)\)/g, 'retrieveStore.updateIndexItemParams($1)'],
    [/store\.commit\(['"]updateIndexSetCustomConfig['"],\s*([^)]+)\)/g, 'retrieveStore.updateIndexSetCustomConfig($1)'],
    
    // CollectStore
    [/store\.commit\(['"]collect\/updateExportCollectObj['"],\s*([^)]+)\)/g, 'collectStore.updateExportCollectObj($1)'],
    
    // IndexFieldStore
    [/store\.commit\(['"]updateIndexFieldEggsItems['"],\s*([^)]+)\)/g, 'indexFieldStore.updateIndexFieldEggsItems($1)'],
    
    // GlobalStore
    [/store\.commit\(['"]updateState['"],\s*([^)]+)\)/g, 'globalStore.updateState($1)'],
  ];
  
  replacements.forEach(([pattern, replacement]) => {
    content = content.replace(pattern, replacement);
  });
  
  return content;
}

// 处理单个文件
function processFile(filePath) {
  totalFiles++;
  
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    const originalContent = content;
    
    // 检查是否需要处理
    if (!needsProcessing(content)) {
      return;
    }
    
    log(`处理文件: ${path.relative(WORK_DIR, filePath)}`);
    
    // 应用替换
    content = replaceImports(content);
    content = replaceUseStore(content);
    content = replaceStateAccess(content);
    content = replaceCommits(content);
    
    // 检查是否有修改
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf-8');
      modifiedFiles++;
      modifiedFilesList.push(path.relative(WORK_DIR, filePath));
      log(`  ✓ 已修改`);
      fs.appendFileSync(MODIFIED_LOG, `${filePath}\n`);
    } else {
      log(`  - 无需修改`);
    }
  } catch (error) {
    logError(error.message, filePath);
  }
}

// 生成最终报告
function generateReport() {
  const timestamp = new Date().toISOString();
  
  const report = `# BKLog Web-v3 Vuex → Pinia 迁移报告

**生成时间**: ${timestamp}
**工作目录**: ${WORK_DIR}

---

## 📊 迁移统计

- **总文件数**: ${totalFiles}
- **已修改文件数**: ${modifiedFiles}
- **错误数**: ${errors}
- **成功率**: ${totalFiles > 0 ? ((modifiedFiles / totalFiles) * 100).toFixed(2) : 0}%

---

## ✅ 已修改的文件列表

${modifiedFilesList.length > 0 ? modifiedFilesList.map((file, index) => `${index + 1}. \`${file}\``).join('\n') : '无'}

---

## ❌ 错误列表

${errorsList.length > 0 ? errorsList.map((item, index) => `${index + 1}. **${item.file}**\n   - 错误: ${item.error}`).join('\n\n') : '无错误'}

---

## 📝 替换规则

### 1. Import 替换
\`\`\`typescript
// 旧代码
import { useStore } from 'vuex';

// 新代码
import { useGlobalStore } from '@/stores/global';
import { useRetrieveStore } from '@/stores/retrieve';
import { useUserStore } from '@/stores/user';
import { useCollectStore } from '@/stores/collect';
import { useIndexFieldStore } from '@/stores/index-field';
import { useStorageStore } from '@/stores/storage';
\`\`\`

### 2. Store 实例化替换
\`\`\`typescript
// 旧代码
const store = useStore();

// 新代码
const globalStore = useGlobalStore();
const retrieveStore = useRetrieveStore();
const userStore = useUserStore();
const collectStore = useCollectStore();
const indexFieldStore = useIndexFieldStore();
const storageStore = useStorageStore();
\`\`\`

### 3. State 访问替换
- \`store.state.spaceUid\` → \`globalStore.spaceUid\`
- \`store.state.indexSetList\` → \`retrieveStore.indexSetList\`
- \`store.state.userMeta\` → \`userStore.userInfo\`
- 等等...

### 4. Commit 替换
- \`store.commit('updateStorage', data)\` → \`storageStore.updateStorage(data)\`
- \`store.commit('updateAiMode', mode)\` → \`retrieveStore.updateAiMode(mode)\`
- 等等...

---

## 🔍 后续工作

### 需要手动检查的项目
1. 动态 state 访问: \`store.state[variable]\`
2. Options API 中的 \`this.$store\`
3. 复杂的嵌套访问和条件判断

### 建议
1. 运行 \`npm run type-check\` 检查类型错误
2. 运行 \`npm run lint --fix\` 修复代码风格
3. 手动测试所有修改的功能
4. 检查 console 是否有运行时错误

---

**生成时间**: ${timestamp}
`;

  fs.writeFileSync(REPORT_FILE, report, 'utf-8');
  log(`\n报告已生成: ${REPORT_FILE}`);
}

// 主函数
function main() {
  log('========================================');
  log('BKLog Web-v3 Vuex → Pinia 迁移脚本');
  log(`工作目录: ${WORK_DIR}`);
  log('========================================\n');
  
  // 获取所有需要处理的文件
  const dirs = [
    path.join(WORK_DIR, 'src/views/retrieve'),
    path.join(WORK_DIR, 'src/views/manage'),
    path.join(WORK_DIR, 'src/components'),
    path.join(WORK_DIR, 'src/composables'),
  ];
  
  const files = [];
  dirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      getAllFiles(dir, files);
    }
  });
  
  log(`找到 ${files.length} 个文件待处理\n`);
  
  // 处理每个文件
  files.forEach(processFile);
  
  log('\n========================================');
  log('迁移完成统计');
  log('========================================');
  log(`总文件数: ${totalFiles}`);
  log(`已修改文件数: ${modifiedFiles}`);
  log(`错误数: ${errors}`);
  log('========================================\n');
  
  // 生成报告
  generateReport();
  
  log('迁移完成！');
  
  process.exit(errors > 0 ? 1 : 0);
}

// 运行主函数
main();
