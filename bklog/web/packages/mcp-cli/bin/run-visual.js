#!/usr/bin/env node

/**
 * 可视化测试执行入口
 */

import run from '../dist/commands/run.js';

// 设置环境变量，强制使用 Puppeteer
process.env.USE_PUPPETEER = 'true';
process.env.FORCE_COLOR = '1';

// 执行测试
run().catch(error => {
  console.error('测试执行失败:', error);
  process.exit(1);
});
