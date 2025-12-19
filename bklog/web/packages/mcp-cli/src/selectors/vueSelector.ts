import { SelectorInfo } from "./reactSelector.js";

export function inferVueSelectors(content: string): SelectorInfo[] {
  const selectors: SelectorInfo[] = [];

  // 匹配 Vue 模板中的测试属性
  const patterns = [
    {
      regex: /data-testid\s*=\s*["']([^"']+)["']/g,
      priority: 1,
      attr: "data-testid"
    },
    {
      regex: /data-test\s*=\s*["']([^"']+)["']/g,
      priority: 2,
      attr: "data-test"
    },
    {
      regex: /aria-label\s*=\s*["']([^"']+)["']/g,
      priority: 3,
      attr: "aria-label"
    }
  ];

  patterns.forEach(({ regex, priority, attr }) => {
    let match;
    while ((match = regex.exec(content))) {
      selectors.push({
        selector: `[${attr}="${match[1]}"]`,
        priority,
        element: extractElementFromMatch(content, match.index)
      });
    }
  });

  // 分析 Vue 动态属性
  const dynamicPatterns = [
    /:data-testid\s*=\s*["']([^"']+)["']/g,
    /v-bind:data-testid\s*=\s*["']([^"']+)["']/g
  ];

  dynamicPatterns.forEach(regex => {
    let match;
    while ((match = regex.exec(content))) {
      selectors.push({
        selector: `[data-testid="${match[1]}"]`,
        priority: 1,
        element: extractElementFromMatch(content, match.index)
      });
    }
  });

  // 提取组件名作为 fallback
  const componentNameMatch = content.match(/<script[^>]*>[\s\S]*?export\s+default\s*{[\s\S]*?name\s*:\s*["']([^"']+)["']/);
  if (componentNameMatch) {
    const componentName = componentNameMatch[1];
    
    // 为没有测试属性的交互元素生成 fallback selector
    const interactiveElements = ['button', 'input', 'select', 'textarea', 'a', 'form'];
    interactiveElements.forEach(element => {
      const elementRegex = new RegExp(`<${element}(?![^>]*(?:data-testid|data-test|aria-label))`, 'g');
      let match;
      while ((match = elementRegex.exec(content))) {
        selectors.push({
          selector: `[data-testid="${componentName.toLowerCase()}-${element}"]`,
          priority: 4,
          element
        });
      }
    });
  }

  return selectors.sort((a, b) => a.priority - b.priority);
}

function extractElementFromMatch(content: string, matchIndex: number): string | undefined {
  // 向前查找最近的开始标签
  const beforeMatch = content.substring(0, matchIndex);
  const tagMatch = beforeMatch.match(/<(\w+)[^>]*$/);
  
  return tagMatch ? tagMatch[1] : undefined;
}

export function inferVueSFCSelectors(content: string): SelectorInfo[] {
  // 提取 template 部分
  const templateMatch = content.match(/<template[^>]*>([\s\S]*?)<\/template>/);
  if (!templateMatch) {
    return [];
  }

  const templateContent = templateMatch[1];
  return inferVueSelectors(templateContent);
}