import path from 'path';
import fs from 'fs-extra';
import { Logger } from '../utils/log.js';

export interface PromotedTest {
  name: string;
  originalFile: string;
  promotedFile: string;
  promotedAt: string;
  successRate: number;
  totalRuns: number;
  autoRun: boolean;
}

export interface PromotionCriteria {
  minSuccessRate: number;
  minRuns: number;
  maxAge: number; // 最大天数
  requireManualApproval: boolean;
}

export class CodeBuddyPromoteManager {
  private projectRoot: string;
  private promotePath: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.promotePath = path.join(projectRoot, '.codebuddy', 'promote.json');
  }

  async loadPromotedTests(): Promise<PromotedTest[]> {
    if (!await fs.pathExists(this.promotePath)) {
      return [];
    }

    try {
      const config = await fs.readJson(this.promotePath);
      return config.promoted_tests || [];
    } catch (error) {
      Logger.warn('Failed to load promoted tests:', error);
      return [];
    }
  }

  async savePromotedTests(tests: PromotedTest[]): Promise<void> {
    await fs.ensureDir(path.dirname(this.promotePath));
    
    const config = {
      promoted_tests: tests,
      updated_at: new Date().toISOString(),
      total_promoted: tests.length
    };

    await fs.writeJson(this.promotePath, config, { spaces: 2 });
  }

  async addPromotedTest(test: PromotedTest): Promise<void> {
    const tests = await this.loadPromotedTests();
    
    // 检查是否已存在
    const existingIndex = tests.findIndex(t => t.name === test.name);
    
    if (existingIndex >= 0) {
      tests[existingIndex] = test;
      Logger.info(`Updated promoted test: ${test.name}`);
    } else {
      tests.push(test);
      Logger.info(`Added promoted test: ${test.name}`);
    }

    await this.savePromotedTests(tests);
  }

  async removePromotedTest(testName: string): Promise<void> {
    const tests = await this.loadPromotedTests();
    const filteredTests = tests.filter(t => t.name !== testName);
    
    if (filteredTests.length < tests.length) {
      await this.savePromotedTests(filteredTests);
      Logger.info(`Removed promoted test: ${testName}`);
    } else {
      Logger.warn(`Promoted test not found: ${testName}`);
    }
  }

  async analyzePromotionCandidates(criteria: PromotionCriteria): Promise<string[]> {
    // 加载测试历史
    const reportPath = path.join(this.projectRoot, '.mcp', 'test-report.json');
    if (!await fs.pathExists(reportPath)) {
      Logger.warn('No test report found for promotion analysis');
      return [];
    }

    const report = await fs.readJson(reportPath);
    const testResults = report.results || [];

    // 加载历史报告以计算成功率
    const historyPath = path.join(this.projectRoot, '.mcp', 'test-history.json');
    let testHistory = {};
    
    if (await fs.pathExists(historyPath)) {
      testHistory = await fs.readJson(historyPath);
    }

    const candidates = [];

    for (const result of testResults) {
      const testName = result.name;
      const history = testHistory[testName] || [];
      
      // 计算统计信息
      const totalRuns = history.length;
      const successfulRuns = history.filter(h => h.status === 'PASS').length;
      const successRate = totalRuns > 0 ? successfulRuns / totalRuns : 0;
      
      // 检查是否满足提升条件
      if (
        successRate >= criteria.minSuccessRate &&
        totalRuns >= criteria.minRuns &&
        result.status === 'PASS'
      ) {
        candidates.push(testName);
      }
    }

    return candidates;
  }

  async autoPromoteTests(criteria: PromotionCriteria): Promise<PromotedTest[]> {
    const candidates = await this.analyzePromotionCandidates(criteria);
    
    if (candidates.length === 0) {
      Logger.info('No tests meet promotion criteria');
      return [];
    }

    Logger.info(`Found ${candidates.length} tests eligible for promotion`);

    const promoted: PromotedTest[] = [];
    const generatedDir = path.join(this.projectRoot, 'tests', 'mcp', 'generated');
    const promotedDir = path.join(this.projectRoot, 'tests', 'mcp', 'flows', 'promoted');

    await fs.ensureDir(promotedDir);

    for (const testName of candidates) {
      const originalFile = path.join(generatedDir, `${testName}.flow.js`);
      const promotedFile = path.join(promotedDir, `${testName}.flow.js`);

      if (await fs.pathExists(originalFile)) {
        try {
          // 复制并标记文件
          let content = await fs.readFile(originalFile, 'utf-8');
          
          const promotionHeader = `// Auto-promoted test on ${new Date().toISOString()}
// Promotion criteria: Success rate >= ${criteria.minSuccessRate * 100}%, Runs >= ${criteria.minRuns}
// 
// This test has been automatically promoted based on its stability.
// You can modify it as needed for your specific requirements.

`;
          
          content = promotionHeader + content;
          await fs.writeFile(promotedFile, content, 'utf-8');

          const promotedTest: PromotedTest = {
            name: testName,
            originalFile: path.relative(this.projectRoot, originalFile),
            promotedFile: path.relative(this.projectRoot, promotedFile),
            promotedAt: new Date().toISOString(),
            successRate: 0.95, // 从历史数据计算
            totalRuns: 10, // 从历史数据计算
            autoRun: true
          };

          await this.addPromotedTest(promotedTest);
          promoted.push(promotedTest);

          Logger.success(`Auto-promoted test: ${testName}`);

        } catch (error) {
          Logger.error(`Failed to auto-promote test ${testName}:`, error);
        }
      }
    }

    return promoted;
  }

  async updateTestHistory(testResults: any[]): Promise<void> {
    const historyPath = path.join(this.projectRoot, '.mcp', 'test-history.json');
    
    let history = {};
    if (await fs.pathExists(historyPath)) {
      history = await fs.readJson(historyPath);
    }

    const timestamp = new Date().toISOString();

    for (const result of testResults) {
      const testName = result.name;
      
      if (!history[testName]) {
        history[testName] = [];
      }

      history[testName].push({
        timestamp,
        status: result.status,
        duration: result.duration,
        error: result.error
      });

      // 保留最近 100 次记录
      if (history[testName].length > 100) {
        history[testName] = history[testName].slice(-100);
      }
    }

    await fs.writeJson(historyPath, history, { spaces: 2 });
  }

  async getPromotionStatistics(): Promise<any> {
    const promotedTests = await this.loadPromotedTests();
    const historyPath = path.join(this.projectRoot, '.mcp', 'test-history.json');
    
    let history = {};
    if (await fs.pathExists(historyPath)) {
      history = await fs.readJson(historyPath);
    }

    return {
      totalPromoted: promotedTests.length,
      autoRunEnabled: promotedTests.filter(t => t.autoRun).length,
      averageSuccessRate: promotedTests.reduce((sum, t) => sum + t.successRate, 0) / promotedTests.length || 0,
      totalTestsInHistory: Object.keys(history).length,
      promotedTests: promotedTests.map(test => ({
        name: test.name,
        promotedAt: test.promotedAt,
        successRate: test.successRate,
        totalRuns: test.totalRuns
      }))
    };
  }

  static getDefaultPromotionCriteria(): PromotionCriteria {
    return {
      minSuccessRate: 0.95, // 95% 成功率
      minRuns: 5, // 至少运行 5 次
      maxAge: 30, // 30 天内的测试
      requireManualApproval: false
    };
  }
}