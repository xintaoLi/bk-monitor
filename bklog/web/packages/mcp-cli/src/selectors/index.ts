import { SourceFile } from "ts-morph";
import { inferReactSelectors, SelectorInfo } from "./reactSelector.js";
import { inferVueSelectors, inferVueSFCSelectors } from "./vueSelector.js";
import fs from "fs";

export { SelectorInfo } from "./reactSelector.js";

export function inferSelectors(filePath: string, sourceFile?: SourceFile): SelectorInfo[] {
  const ext = getFileExtension(filePath);
  
  switch (ext) {
    case '.tsx':
    case '.jsx':
      if (sourceFile) {
        return inferReactSelectors(sourceFile);
      }
      break;
      
    case '.vue':
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        return inferVueSFCSelectors(content);
      } catch (error) {
        console.warn(`Failed to read Vue file: ${filePath}`, error);
      }
      break;
      
    case '.ts':
    case '.js':
      // 检查是否包含 JSX
      if (sourceFile) {
        const text = sourceFile.getFullText();
        if (text.includes('jsx') || text.includes('<') && text.includes('>')) {
          return inferReactSelectors(sourceFile);
        }
      }
      break;
  }
  
  return [];
}

export function inferSelectorFromComponentName(componentName: string): string {
  return `[data-testid="${componentName.toLowerCase()}"]`;
}

export function getBestSelector(selectors: SelectorInfo[]): string | undefined {
  if (selectors.length === 0) return undefined;
  
  // 返回优先级最高的 selector
  return selectors[0].selector;
}

export function getAllSelectors(selectors: SelectorInfo[]): string[] {
  return selectors.map(s => s.selector);
}

function getFileExtension(filePath: string): string {
  const lastDot = filePath.lastIndexOf('.');
  return lastDot !== -1 ? filePath.substring(lastDot) : '';
}