import path from 'path';
import fs from 'fs-extra';
import { Logger } from '../utils/log.js';
import { ensureDirectories, detectFramework } from '../utils/fs.js';

export default async function init(): Promise<void> {
  Logger.header('Initializing MCP E2E Testing Environment');
  
  const projectRoot = process.cwd();
  const framework = await detectFramework(projectRoot);
  
  Logger.info(`Detected framework: ${framework}`);
  Logger.step(1, 4, 'Creating directory structure...');
  
  try {
    // 创建目录结构
    await ensureDirectories(projectRoot);
    
    Logger.step(2, 4, 'Setting up MCP configuration...');
    
    // 创建 .mcp/servers.json
    const mcpConfig = {
      "mcpServers": {
        "chrome-devtools": {
          "command": "npx",
          "args": ["chrome-devtools-mcp"],
          "env": {}
        }
      }
    };
    
    await fs.writeJson(
      path.join(projectRoot, '.mcp', 'servers.json'),
      mcpConfig,
      { spaces: 2 }
    );
    
    Logger.step(3, 4, 'Setting up CodeBuddy configuration...');
    
    // 创建 .codebuddy/tasks.json
    const codeBuddyTasks = {
      "tasks": [
        {
          "id": "mcp-e2e-test",
          "name": "MCP E2E Automated Testing",
          "description": "Run automated E2E tests using MCP chrome-devtools",
          "trigger": "on_change",
          "files": ["src/**/*.{ts,tsx,js,jsx,vue}"],
          "command": "npx mcp-e2e run",
          "enabled": true
        }
      ]
    };
    
    await fs.writeJson(
      path.join(projectRoot, '.codebuddy', 'tasks.json'),
      codeBuddyTasks,
      { spaces: 2 }
    );
    
    // 创建 .codebuddy/rules.json
    const codeBuddyRules = {
      "rules": [
        {
          "id": "auto-generate-tests",
          "name": "Auto Generate MCP Tests",
          "description": "Automatically generate MCP test flows when components change",
          "pattern": "src/**/*.{ts,tsx,js,jsx,vue}",
          "action": "generate_mcp_test",
          "enabled": true
        }
      ]
    };
    
    await fs.writeJson(
      path.join(projectRoot, '.codebuddy', 'rules.json'),
      codeBuddyRules,
      { spaces: 2 }
    );
    
    Logger.step(4, 4, 'Creating test utilities and templates...');
    
    // 创建浏览器工具函数
    const browserUtils = `export async function openApp(ctx, url = "http://localhost:3000") {
  const { browser, page } = ctx;
  
  await page.goto(url);
  await page.waitForLoadState('networkidle');
  
  return { browser, page };
}

export async function waitForElement(page, selector, timeout = 5000) {
  try {
    await page.waitForSelector(selector, { timeout });
    return true;
  } catch (error) {
    console.warn(\`Element not found: \${selector}\`);
    return false;
  }
}

export async function takeScreenshot(page, name) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = \`\${name}-\${timestamp}.png\`;
  await page.screenshot({ path: \`screenshots/\${filename}\` });
  return filename;
}`;
    
    await fs.writeFile(
      path.join(projectRoot, 'tests', 'mcp', 'utils', 'browser.js'),
      browserUtils,
      'utf-8'
    );
    
    // 创建示例测试流程
    const exampleFlow = `import { openApp } from "../utils/browser.js";

export default async function run(ctx) {
  const { browser, page } = await openApp(ctx);

  try {
    // Example: Test homepage loads
    await page.waitForSelector('body');
    console.log('✅ Homepage loaded successfully');
    
    // Add your test logic here
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}`;
    
    await fs.writeFile(
      path.join(projectRoot, 'tests', 'mcp', 'flows', 'example.flow.js'),
      exampleFlow,
      'utf-8'
    );
    
    // 创建 README
    const readme = `# MCP E2E Testing

This directory contains automated E2E tests powered by MCP chrome-devtools.

## Directory Structure

- \`flows/\` - Manual test flows
- \`generated/\` - Auto-generated test flows (do not edit manually)
- \`utils/\` - Shared utilities for tests

## Usage

\`\`\`bash
# Analyze component changes
npx mcp-e2e analyze

# Generate test flows
npx mcp-e2e generate

# Run tests
npx mcp-e2e run

# Promote generated tests to permanent flows
npx mcp-e2e promote
\`\`\`

## Framework: ${framework}

Tests are automatically generated based on your ${framework} components.
Make sure to use \`data-testid\` attributes for reliable element selection.
`;
    
    await fs.writeFile(
      path.join(projectRoot, 'tests', 'mcp', 'README.md'),
      readme,
      'utf-8'
    );
    
    Logger.success('MCP E2E testing environment initialized successfully!');
    Logger.info('Next steps:');
    Logger.info('1. Add data-testid attributes to your components');
    Logger.info('2. Run: npx mcp-e2e analyze');
    Logger.info('3. Run: npx mcp-e2e generate');
    Logger.info('4. Run: npx mcp-e2e run');
    
  } catch (error) {
    Logger.error('Failed to initialize MCP E2E environment:', error);
    process.exit(1);
  }
}