/**
 * MCP-CLI 完整工作流示例
 * 
 * 本示例展示如何使用 MCP-CLI 实现：
 * 1. 项目结构分析 → 生成 CodeBuddy Rule
 * 2. 代码变更分析 → 生成受影响组件树和测试路径
 * 3. Test-ID 注入 → 精准测试定位
 * 4. Chrome DevTools MCP 执行测试
 * 5. 生成测试报告
 */

import path from 'path';

// ============ 工作流 1: 项目结构分析 ============
async function analyzeProjectStructure() {
  console.log('=== 工作流 1: 项目结构分析 ===\n');
  
  const { ProjectAnalyzer } = await import('../src/codebuddy/project-analyzer-rule.js');
  
  const projectRoot = process.cwd();
  const analyzer = new ProjectAnalyzer(projectRoot);
  
  // 分析项目并生成 Rule
  const rule = await analyzer.analyzeAndGenerateRule();
  
  console.log('\n生成的 Rule:');
  console.log(`- ID: ${rule.id}`);
  console.log(`- 名称: ${rule.name}`);
  console.log(`- 框架: ${rule.context.framework}`);
  console.log(`- 路由数量: ${rule.context.routes.length}`);
  console.log(`- 测试流程数量: ${rule.flows.length}`);
  
  return rule;
}

// ============ 工作流 2: 代码变更影响分析 ============
async function analyzeCodeChangeImpact() {
  console.log('\n=== 工作流 2: 代码变更影响分析 ===\n');
  
  const { ChangeImpactAnalyzer } = await import('../src/codebuddy/change-impact-analyzer.js');
  
  const projectRoot = process.cwd();
  const analyzer = new ChangeImpactAnalyzer(projectRoot);
  
  // 分析变更影响并生成测试 Rule
  const rule = await analyzer.analyzeAndGenerateTestRule('HEAD~1');
  
  console.log('\n变更影响分析结果:');
  console.log(`- 变更文件: ${rule.changeContext.changedFiles.length}`);
  console.log(`- 直接影响: ${rule.impactAnalysis.directImpact.length}`);
  console.log(`- 间接影响: ${rule.impactAnalysis.indirectImpact.length}`);
  console.log(`- 传递影响: ${rule.impactAnalysis.transitiveImpact.length}`);
  console.log(`- 建议测试: ${rule.tests.length}`);
  
  return rule;
}

// ============ 工作流 3: Test-ID 注入 ============
async function injectTestIds() {
  console.log('\n=== 工作流 3: Test-ID 注入 ===\n');
  
  const { TestIdInjector } = await import('../src/codebuddy/testid-injector.js');
  
  const projectRoot = process.cwd();
  const injector = new TestIdInjector(projectRoot, {
    prefix: 'test',
    separator: '-',
    includeComponentName: true,
    includeElementType: true,
    includeIndex: true,
  });
  
  // 分析并预览（dryRun: true 不实际修改文件）
  const report = await injector.analyzeAndInject({ dryRun: true });
  
  console.log('\nTest-ID 注入预览:');
  console.log(`- 处理文件: ${report.totalFiles}`);
  console.log(`- 待注入: ${report.totalInjected}`);
  console.log(`- 已存在: ${report.totalSkipped}`);
  
  // 如果需要实际注入，设置 dryRun: false
  // await injector.analyzeAndInject({ dryRun: false });
  
  return report;
}

// ============ 工作流 4: 执行测试 ============
async function executeTests(ruleId: string) {
  console.log('\n=== 工作流 4: 执行测试 ===\n');
  
  const { RuleExecutor } = await import('../src/runtime/rule-executor.js');
  
  const projectRoot = process.cwd();
  const executor = new RuleExecutor(projectRoot, {
    baseUrl: process.env.MCP_BASE_URL || 'http://localhost:8081',
    headless: false,
    timeout: 30000,
    retries: 2,
    screenshot: true,
  });
  
  // 执行 Rule
  const result = await executor.executeRule(ruleId);
  
  console.log('\n测试执行结果:');
  console.log(`- 状态: ${result.status}`);
  console.log(`- 总测试: ${result.totalTests}`);
  console.log(`- 通过: ${result.passedTests}`);
  console.log(`- 失败: ${result.failedTests}`);
  console.log(`- 耗时: ${result.duration}ms`);
  
  return result;
}

// ============ 完整工作流 ============
async function runFullWorkflow() {
  console.log('🚀 开始完整测试工作流\n');
  console.log('='.repeat(50));
  
  try {
    // Step 1: 分析项目结构
    const projectRule = await analyzeProjectStructure();
    
    // Step 2: 分析代码变更影响
    const impactRule = await analyzeCodeChangeImpact();
    
    // Step 3: 分析 Test-ID（预览模式）
    await injectTestIds();
    
    // Step 4: 执行测试
    // 优先执行变更影响测试
    if (impactRule.tests.length > 0) {
      console.log('\n执行变更影响测试...');
      await executeTests(impactRule.id);
    }
    
    // 执行项目测试
    if (projectRule.flows.length > 0) {
      console.log('\n执行项目测试...');
      await executeTests(projectRule.id);
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ 完整工作流执行完成！');
    
  } catch (error) {
    console.error('\n❌ 工作流执行失败:', error);
    process.exit(1);
  }
}

// ============ CLI 使用示例 ============
/*
# 1. 分析项目结构并生成 Rule
npx mcp-e2e rule:analyze

# 2. 分析代码变更影响
npx mcp-e2e rule:impact --base HEAD~1

# 3. 预览 test-id 注入
npx mcp-e2e testid:analyze

# 4. 实际注入 test-id
npx mcp-e2e testid:inject

# 5. 执行指定 Rule
npx mcp-e2e rule:execute <rule-id> --base-url http://localhost:8081

# 6. 执行完整工作流
npx mcp-e2e workflow:full --base-url http://localhost:8081

# 7. 查看 test-id 映射表
npx mcp-e2e testid:mapping
*/

// 导出工作流函数
export {
  analyzeProjectStructure,
  analyzeCodeChangeImpact,
  injectTestIds,
  executeTests,
  runFullWorkflow,
};

// 如果直接运行此文件
if (import.meta.url === `file://${process.argv[1]}`) {
  runFullWorkflow();
}
