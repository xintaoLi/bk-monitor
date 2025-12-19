import { Node, JsxAttribute, SourceFile } from "ts-morph";

export interface SelectorInfo {
  selector: string;
  priority: number; // 1: data-testid, 2: data-test, 3: aria-label, 4: component name
  element?: string;
}

export function inferReactSelectors(sourceFile: SourceFile): SelectorInfo[] {
  const selectors: SelectorInfo[] = [];
  const componentNames = new Set<string>();

  // 收集组件名
  sourceFile.forEachDescendant(node => {
    if (Node.isFunctionDeclaration(node) || Node.isVariableDeclaration(node)) {
      const name = node.getName?.();
      if (name && /^[A-Z]/.test(name)) {
        componentNames.add(name);
      }
    }
  });

  // 分析 JSX 属性
  sourceFile.forEachDescendant(node => {
    if (Node.isJsxAttribute(node)) {
      const nameNode = node.getNameNode();
      const name = nameNode.getText();
      const initializer = node.getInitializer();
      
      if (initializer && Node.isStringLiteral(initializer)) {
        const value = initializer.getLiteralValue();
        
        switch (name) {
          case "data-testid":
            selectors.push({
              selector: `[data-testid="${value}"]`,
              priority: 1,
              element: getJsxElementName(node)
            });
            break;
          case "data-test":
            selectors.push({
              selector: `[data-test="${value}"]`,
              priority: 2,
              element: getJsxElementName(node)
            });
            break;
          case "aria-label":
            selectors.push({
              selector: `[aria-label="${value}"]`,
              priority: 3,
              element: getJsxElementName(node)
            });
            break;
        }
      }
    }
    
    // 分析 JSX 元素，为没有 test id 的元素生成 fallback selector
    if (Node.isJsxElement(node)) {
      const openingElement = node.getOpeningElement();
      const tagName = openingElement.getTagNameNode().getText();
      
      // 检查是否已有测试属性
      const hasTestAttr = openingElement.getAttributes().some(attr => {
        if (Node.isJsxAttribute(attr)) {
          const nameNode = attr.getNameNode();
          const name = nameNode.getText();
          return name === "data-testid" || name === "data-test" || name === "aria-label";
        }
        return false;
      });
      
      if (!hasTestAttr && isInteractiveElement(tagName)) {
        // 生成基于组件名的 fallback selector
        const componentName = findNearestComponentName(node, componentNames);
        if (componentName) {
          selectors.push({
            selector: `[data-testid="${componentName.toLowerCase()}-${tagName}"]`,
            priority: 4,
            element: tagName
          });
        }
      }
    }
  });

  return selectors.sort((a, b) => a.priority - b.priority);
}

function getJsxElementName(attrNode: JsxAttribute): string | undefined {
  const jsxElement = attrNode.getFirstAncestor(node => Node.isJsxElement(node));
  if (jsxElement) {
    return jsxElement.getOpeningElement().getTagNameNode().getText();
  }
  return undefined;
}

function isInteractiveElement(tagName: string): boolean {
  const interactiveElements = [
    'button', 'input', 'select', 'textarea', 'a', 'form',
    'details', 'dialog', 'menu', 'menuitem'
  ];
  return interactiveElements.includes(tagName.toLowerCase());
}

function findNearestComponentName(node: Node, componentNames: Set<string>): string | undefined {
  let current = node.getParent();
  
  while (current) {
    if (Node.isFunctionDeclaration(current) || Node.isVariableDeclaration(current)) {
      const name = current.getName?.();
      if (name && componentNames.has(name)) {
        return name;
      }
    }
    current = current.getParent();
  }
  
  return undefined;
}