#!/usr/bin/env node

/**
 * BKLog Web-v3 补充处理脚本
 * 处理 Options API 中的 this.$store 调用、getters 和 dispatch
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WORK_DIR = '/root/clawd/bk-monitor/bklog/web/packages/web-v3';

let filesProcessed = 0;
let filesModified = 0;

function log(message) {
  console.log(message);
}

// 处理文件中剩余的 this.$store 调用
function processOptionsAPIFile(filePath, content) {
  let modified = false;
  let newContent = content;
  
  // 检查是否有 this.$store 调用
  if (!content.includes('this.$store')) {
    return { content, modified: false };
  }
  
  log(`处理 Options API 文件: ${path.relative(WORK_DIR, filePath)}`);
  
  // 检查是否是 defineComponent 或 class component
  const isOptionsAPI = content.includes('defineComponent') || content.includes('export default');
  
  if (isOptionsAPI) {
    // 需要添加 computed/methods 来访问 store
    
    // 1. 处理 this.$store.getters.retrieveParams
    if (content.includes("this.$store.getters.retrieveParams")) {
      // 需要在 computed 中添加
      newContent = newContent.replace(
        /this\.\$store\.getters\.retrieveParams/g,
        'this.retrieveParams'
      );
      modified = true;
      
      // 添加 computed（如果不存在）
      if (!content.includes('retrieveParams()')) {
        log('  → 需要手动添加 retrieveParams computed property');
      }
    }
    
    // 2. 处理 this.$store.getters['globals/globalsData']
    if (content.includes("this.$store.getters['globals/globalsData']")) {
      newContent = newContent.replace(
        /this\.\$store\.getters\['globals\/globalsData'\]/g,
        'this.globalsData'
      );
      modified = true;
    }
    
    // 3. 处理 this.$store.getters['collect/curCollect']
    if (content.includes("this.$store.getters['collect/curCollect']")) {
      newContent = newContent.replace(
        /this\.\$store\.getters\['collect\/curCollect'\]/g,
        'this.curCollect'
      );
      modified = true;
    }
    
    // 4. 处理 this.$store.getters.isEnLanguage
    if (content.includes("this.$store.getters.isEnLanguage")) {
      newContent = newContent.replace(
        /this\.\$store\.getters\.isEnLanguage/g,
        'this.isEnLanguage'
      );
      modified = true;
    }
    
    // 5. 处理 this.$store.dispatch
    if (content.includes("this.$store.dispatch('getApplyData'")) {
      // 这个需要从其他地方获取，暂时保留注释
      log('  ⚠️  需要手动处理: this.$store.dispatch(\'getApplyData\')');
    }
    
    if (content.includes("this.$store.dispatch('checkAndGetData'")) {
      log('  ⚠️  需要手动处理: this.$store.dispatch(\'checkAndGetData\')');
    }
  }
  
  return { content: newContent, modified };
}

// 处理 Composition API 中的 store.getters 和 store.dispatch
function processCompositionAPIFile(filePath, content) {
  let modified = false;
  let newContent = content;
  
  // 检查是否有 store.getters 或 store.dispatch
  if (!content.includes('store.getters') && !content.includes('store.dispatch')) {
    return { content, modified: false };
  }
  
  log(`处理 Composition API 文件: ${path.relative(WORK_DIR, filePath)}`);
  
  // 1. 处理 store.getters.retrieveParams
  if (content.includes('store.getters.retrieveParams')) {
    // 需要从 retrieveStore 获取，但 retrieveStore 没有这个 getter
    // 可能需要创建一个新的 composable
    log('  ⚠️  需要手动处理: store.getters.retrieveParams');
    newContent = newContent.replace(
      /store\.getters\.retrieveParams/g,
      'retrieveStore.searchParams'
    );
    modified = true;
  }
  
  // 2. 处理 store.getters.visibleFields
  if (content.includes('store.getters.visibleFields')) {
    newContent = newContent.replace(
      /store\.getters\.visibleFields/g,
      'indexFieldStore.visibleFields'
    );
    modified = true;
  }
  
  // 3. 处理 store.getters.filteredFieldList
  if (content.includes('store.getters.filteredFieldList')) {
    newContent = newContent.replace(
      /store\.getters\.filteredFieldList/g,
      'indexFieldStore.filteredFieldList'
    );
    modified = true;
  }
  
  // 4. 处理 store.getters.isEnLanguage
  if (content.includes('store.getters.isEnLanguage')) {
    // 需要从 i18n 或其他地方获取
    log('  ⚠️  需要手动处理: store.getters.isEnLanguage');
    newContent = newContent.replace(
      /store\.getters\.isEnLanguage/g,
      'false // TODO: 需要从 i18n 获取'
    );
    modified = true;
  }
  
  // 5. 处理 store.dispatch('requestIndexSetQuery')
  if (content.includes("store.dispatch('requestIndexSetQuery')")) {
    log('  ⚠️  需要手动处理: store.dispatch(\'requestIndexSetQuery\')');
    newContent = newContent.replace(
      /store\.dispatch\('requestIndexSetQuery'\)/g,
      '// TODO: retrieveStore.requestIndexSetQuery()'
    );
    modified = true;
  }
  
  // 6. 处理 store.dispatch('requestFavoriteList')
  if (content.includes("store.dispatch('requestFavoriteList')")) {
    newContent = newContent.replace(
      /store\.dispatch\('requestFavoriteList'\)/g,
      'retrieveStore.getFavoriteList(globalStore.spaceUid)'
    );
    modified = true;
  }
  
  // 7. 处理 store.dispatch('requestIndexSetFieldInfo')
  if (content.includes("store.dispatch('requestIndexSetFieldInfo')")) {
    log('  ⚠️  需要手动处理: store.dispatch(\'requestIndexSetFieldInfo\')');
    newContent = newContent.replace(
      /store\.dispatch\('requestIndexSetFieldInfo'\)/g,
      '// TODO: indexFieldStore.requestIndexSetFieldInfo()'
    );
    modified = true;
  }
  
  // 8. 处理 store.dispatch('setQueryCondition', ...)
  if (content.includes("store.dispatch('setQueryCondition'")) {
    log('  ⚠️  需要手动处理: store.dispatch(\'setQueryCondition\')');
    newContent = newContent.replace(
      /store\.dispatch\('setQueryCondition',\s*([^)]+)\)/g,
      '// TODO: retrieveStore.setQueryCondition($1)'
    );
    modified = true;
  }
  
  return { content: newContent, modified };
}

// 主处理函数
function processFile(filePath) {
  filesProcessed++;
  
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    const originalContent = content;
    
    // 处理 Options API
    let result = processOptionsAPIFile(filePath, content);
    content = result.content;
    let modified = result.modified;
    
    // 处理 Composition API
    result = processCompositionAPIFile(filePath, content);
    content = result.content;
    modified = modified || result.modified;
    
    // 保存文件
    if (modified && content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf-8');
      filesModified++;
      log('  ✓ 已修改\n');
    }
  } catch (error) {
    console.error(`错误: ${filePath}`, error.message);
  }
}

// 获取所有需要处理的文件
function getAllFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  
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

// 主函数
function main() {
  log('========================================');
  log('BKLog Web-v3 补充处理脚本');
  log('处理 Options API 和 getters/dispatch');
  log('========================================\n');
  
  const dirs = [
    path.join(WORK_DIR, 'src/views'),
    path.join(WORK_DIR, 'src/components'),
    path.join(WORK_DIR, 'src/composables'),
  ];
  
  const files = [];
  dirs.forEach(dir => getAllFiles(dir, files));
  
  // 只处理包含需要处理内容的文件
  const filesToProcess = files.filter(file => {
    const content = fs.readFileSync(file, 'utf-8');
    return content.includes('this.$store') || 
           content.includes('store.getters') || 
           content.includes('store.dispatch');
  });
  
  log(`找到 ${filesToProcess.length} 个文件需要处理\n`);
  
  filesToProcess.forEach(processFile);
  
  log('\n========================================');
  log('补充处理完成');
  log('========================================');
  log(`处理文件数: ${filesProcessed}`);
  log(`修改文件数: ${filesModified}`);
  log('========================================\n');
  
  log('⚠️  注意: 部分调用需要手动处理，请检查输出中的 TODO 标记');
}

main();
