import { SelectorInfo } from "../selectors/index.js";

export interface FlowConfig {
  route: string;
  componentName: string;
  selectors: SelectorInfo[];
  actions?: TestAction[];
}

export interface TestAction {
  type: 'click' | 'type' | 'wait' | 'assert';
  selector: string;
  value?: string;
  timeout?: number;
}

export function generateBasicFlowTemplate(config: FlowConfig): string {
  const { route, componentName, selectors } = config;
  
  return `import { openApp } from "../utils/browser.js";

export default async function run(ctx) {
  const { browser, page } = await openApp(ctx, "${route}");

  try {
    // Wait for component to load
    await page.waitForSelector("${selectors[0]?.selector || `[data-testid="${componentName.toLowerCase()}"]`}");
    
    ${generateSelectorTests(selectors)}
    
    // Add your test logic here
    console.log("✅ ${componentName} component test passed");
    
  } catch (error) {
    console.error("❌ ${componentName} component test failed:", error);
    throw error;
  } finally {
    await browser.close();
  }
}`;
}

export function generateInteractiveFlowTemplate(config: FlowConfig): string {
  const { route, componentName, selectors, actions = [] } = config;
  
  return `import { openApp } from "../utils/browser.js";

export default async function run(ctx) {
  const { browser, page } = await openApp(ctx, "${route}");

  try {
    // Wait for component to load
    await page.waitForSelector("${selectors[0]?.selector || `[data-testid="${componentName.toLowerCase()}"]`}");
    
    ${generateActionTests(actions, selectors)}
    
    console.log("✅ ${componentName} interactive test passed");
    
  } catch (error) {
    console.error("❌ ${componentName} interactive test failed:", error);
    throw error;
  } finally {
    await browser.close();
  }
}`;
}

export function generateFormFlowTemplate(config: FlowConfig): string {
  const { route, componentName, selectors } = config;
  
  const inputSelectors = selectors.filter(s => s.element === 'input');
  const buttonSelectors = selectors.filter(s => s.element === 'button');
  
  return `import { openApp } from "../utils/browser.js";

export default async function run(ctx) {
  const { browser, page } = await openApp(ctx, "${route}");

  try {
    // Wait for form to load
    await page.waitForSelector("${selectors[0]?.selector || `[data-testid="${componentName.toLowerCase()}"]`}");
    
    ${generateFormTests(inputSelectors, buttonSelectors)}
    
    console.log("✅ ${componentName} form test passed");
    
  } catch (error) {
    console.error("❌ ${componentName} form test failed:", error);
    throw error;
  } finally {
    await browser.close();
  }
}`;
}

function generateSelectorTests(selectors: SelectorInfo[]): string {
  return selectors
    .slice(0, 5) // 限制测试数量
    .map(selector => `    // Test ${selector.element || 'element'} is present
    await page.waitForSelector("${selector.selector}");`)
    .join('\n');
}

function generateActionTests(actions: TestAction[], selectors: SelectorInfo[]): string {
  if (actions.length === 0) {
    // 生成默认交互测试
    const clickableSelectors = selectors.filter(s => 
      s.element && ['button', 'a', 'input'].includes(s.element)
    );
    
    return clickableSelectors
      .slice(0, 3)
      .map(selector => {
        if (selector.element === 'input') {
          return `    // Test input interaction
    await page.type("${selector.selector}", "test value");`;
        } else {
          return `    // Test ${selector.element} click
    await page.click("${selector.selector}");`;
        }
      })
      .join('\n');
  }
  
  return actions.map(action => {
    switch (action.type) {
      case 'click':
        return `    await page.click("${action.selector}");`;
      case 'type':
        return `    await page.type("${action.selector}", "${action.value || 'test'}");`;
      case 'wait':
        return `    await page.waitForSelector("${action.selector}"${action.timeout ? `, { timeout: ${action.timeout} }` : ''});`;
      case 'assert':
        return `    await expect(page.locator("${action.selector}")).toBeVisible();`;
      default:
        return `    // Unknown action: ${action.type}`;
    }
  }).join('\n');
}

function generateFormTests(inputSelectors: SelectorInfo[], buttonSelectors: SelectorInfo[]): string {
  const tests: string[] = [];
  
  // 填充表单字段
  inputSelectors.forEach((selector, index) => {
    tests.push(`    // Fill form field ${index + 1}
    await page.type("${selector.selector}", "test_value_${index + 1}");`);
  });
  
  // 点击提交按钮
  if (buttonSelectors.length > 0) {
    tests.push(`    
    // Submit form
    await page.click("${buttonSelectors[0].selector}");`);
  }
  
  return tests.join('\n');
}

export function generateCustomFlowTemplate(
  componentName: string,
  route: string,
  customCode: string
): string {
  return `import { openApp } from "../utils/browser.js";

export default async function run(ctx) {
  const { browser, page } = await openApp(ctx, "${route}");

  try {
    ${customCode}
    
    console.log("✅ ${componentName} custom test passed");
    
  } catch (error) {
    console.error("❌ ${componentName} custom test failed:", error);
    throw error;
  } finally {
    await browser.close();
  }
}`;
}