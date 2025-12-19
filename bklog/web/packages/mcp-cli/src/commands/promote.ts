import path from 'path';
import fs from 'fs-extra';
import { Logger } from '../utils/log.js';

export default async function promote(): Promise<void> {
  Logger.header('Promoting Generated Tests to Permanent Assets');
  
  const projectRoot = process.cwd();
  const generatedDir = path.join(projectRoot, 'tests', 'mcp', 'generated');
  const flowsDir = path.join(projectRoot, 'tests', 'mcp', 'flows');
  const promotedDir = path.join(flowsDir, 'promoted');
  
  Logger.step(1, 4, 'Checking generated tests...');
  
  try {
    if (!await fs.pathExists(generatedDir)) {
      Logger.error('No generated tests found. Please run "npx mcp-e2e generate" first.');
      process.exit(1);
    }
    
    const generatedFiles = await fs.readdir(generatedDir);
    const testFiles = generatedFiles.filter(f => f.endsWith('.flow.js') && f !== 'index.js');
    
    if (testFiles.length === 0) {
      Logger.warn('No generated test flows to promote.');
      return;
    }
    
    Logger.info(`Found ${testFiles.length} generated tests to promote`);
    
    Logger.step(2, 4, 'Loading test execution history...');
    
    // 加载测试报告以确定哪些测试是稳定的
    const reportPath = path.join(projectRoot, '.mcp', 'test-report.json');
    let testResults = {};
    
    if (await fs.pathExists(reportPath)) {
      const report = await fs.readJson(reportPath);
      testResults = report.results.reduce((acc, result) => {
        acc[result.name] = result;
        return acc;
      }, {});
    }
    
    Logger.step(3, 4, 'Selecting tests for promotion...');
    
    const promotionCandidates = [];
    
    for (const testFile of testFiles) {
      const testName = path.basename(testFile, '.flow.js');
      const result = testResults[testName];
      
      // 只提升通过的测试
      if (!result || result.status === 'PASS') {
        promotionCandidates.push({
          file: testFile,
          name: testName,
          status: result?.status || 'UNKNOWN'
        });
      }
    }
    
    if (promotionCandidates.length === 0) {
      Logger.warn('No tests eligible for promotion. Only passing tests can be promoted.');
      return;
    }
    
    Logger.info(`Promoting ${promotionCandidates.length} tests:`);
    promotionCandidates.forEach(candidate => {
      Logger.info(`  - ${candidate.name} (${candidate.status})`);
    });
    
    Logger.step(4, 4, 'Promoting tests...');
    
    await fs.ensureDir(promotedDir);
    
    const promoted = [];
    
    for (const candidate of promotionCandidates) {
      const sourcePath = path.join(generatedDir, candidate.file);
      const targetPath = path.join(promotedDir, candidate.file);
      
      try {
        // 读取生成的测试内容
        let content = await fs.readFile(sourcePath, 'utf-8');
        
        // 添加提升标记和元数据
        const promotionHeader = `// Promoted from generated test on ${new Date().toISOString()}
// Original: tests/mcp/generated/${candidate.file}
// Status: ${candidate.status}
// 
// This test has been promoted to a permanent test asset.
// You can now modify it as needed for your specific requirements.

`;
        
        content = promotionHeader + content;
        
        // 写入到 promoted 目录
        await fs.writeFile(targetPath, content, 'utf-8');
        
        promoted.push({
          name: candidate.name,
          from: path.relative(projectRoot, sourcePath),
          to: path.relative(projectRoot, targetPath)
        });
        
      } catch (error) {
        Logger.error(`Failed to promote ${candidate.name}:`, error);
      }
    }
    
    // 创建提升记录
    const promotionRecord = {
      timestamp: new Date().toISOString(),
      promoted: promoted.map(p => ({
        name: p.name,
        originalFile: p.from,
        promotedFile: p.to
      })),
      totalPromoted: promoted.length
    };
    
    await fs.writeJson(
      path.join(projectRoot, '.mcp', 'promoted.json'),
      promotionRecord,
      { spaces: 2 }
    );
    
    // 更新 CodeBuddy 配置以包含提升的测试
    const codeBuddyPath = path.join(projectRoot, '.codebuddy', 'promote.json');
    const promoteConfig = {
      "promoted_tests": promoted.map(p => ({
        "name": p.name,
        "file": p.to,
        "promoted_at": new Date().toISOString(),
        "auto_run": true
      }))
    };
    
    await fs.writeJson(codeBuddyPath, promoteConfig, { spaces: 2 });
    
    Logger.success(`Successfully promoted ${promoted.length} tests!`);
    
    if (promoted.length > 0) {
      Logger.table(promoted.map(p => ({
        Test: p.name,
        'Original File': p.from,
        'Promoted File': p.to
      })));
      
      Logger.info('Promoted tests are now permanent test assets in: tests/mcp/flows/promoted/');
      Logger.info('You can modify these tests as needed for your specific requirements.');
      Logger.info('CodeBuddy configuration updated to include promoted tests.');
    }
    
  } catch (error) {
    Logger.error('Promotion failed:', error);
    process.exit(1);
  }
}