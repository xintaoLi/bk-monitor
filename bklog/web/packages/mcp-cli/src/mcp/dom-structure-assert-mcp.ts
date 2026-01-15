import { Logger } from '../utils/log.js';

/**
 * DOM 结构断言 MCP Tool
 *
 * 基于 MCP 的结构感知自动化测试能力，用于：
 * - 基于 chrome-devtools-mcp 获取运行态 DOM
 * - 基于源码 AST 生成预期结构
 * - 通过结构对比完成自动断言
 * - 输出人类 + LLM 双友好的结构化 diff
 *
 * 该能力作为断言型 AI Tool 存在，不负责页面操作，不依赖视觉截图。
 */

// ============ 类型定义 ============

/**
 * DOM 快照节点（运行态）
 * 只提取结构与语义，不提取样式，排除动态噪声
 */
export interface DomNode {
  /** DOM 标签名 */
  tag: string;
  /** 元素 ID */
  id?: string;
  /** 类名列表 */
  classes?: string[];
  /** 属性（过滤后的关键属性） */
  attrs?: Record<string, any>;
  /** 子节点 */
  children?: DomNode[];
  /** 文本内容（可选，用于特定断言） */
  textContent?: string;
}

/**
 * 预期结构节点（AST 生成）
 */
export interface ExpectedNode {
  /** 组件名称（Vue 组件标签） */
  component: string;
  /** 对应的 DOM 标签（映射后） */
  tag?: string;
  /** 必须存在的类名 */
  mustHaveClasses?: string[];
  /** 必须存在的属性 */
  attrs?: Record<string, any>;
  /** 子节点 */
  children?: ExpectedNode[];
  /** 是否为可选节点（v-if 等条件渲染） */
  optional?: boolean;
  /** 是否为列表节点（v-for 渲染） */
  isList?: boolean;
}

/**
 * 结构差异类型
 */
export type DiffType =
  | 'TAG_MISMATCH'      // 标签不匹配
  | 'CLASS_MISSING'     // 缺少必需类名
  | 'CLASS_EXTRA'       // 多余类名（可配置是否检查）
  | 'NODE_MISSING'      // 缺少节点
  | 'NODE_EXTRA'        // 多余节点
  | 'ATTR_MISMATCH'     // 属性不匹配
  | 'CHILDREN_COUNT'    // 子节点数量不匹配
  | 'CHILDREN_ORDER';   // 子节点顺序不匹配

/**
 * 结构差异项
 * 设计目标：精确定位、可被 LLM 理解、可反向驱动修复
 */
export interface StructureDiff {
  /** 差异路径（便于定位） */
  path: string;
  /** 差异类型 */
  type: DiffType;
  /** 预期值 */
  expected?: any;
  /** 实际值 */
  actual?: any;
  /** 人类可读的差异说明 */
  message: string;
  /** 严重程度 */
  severity: 'error' | 'warning' | 'info';
}

/**
 * 断言选项
 */
export interface AssertOptions {
  /** 忽略的类名模式（正则） */
  ignoreClasses?: (string | RegExp)[];
  /** 是否严格检查子节点顺序 */
  strictChildrenOrder?: boolean;
  /** 是否忽略多余节点 */
  ignoreExtraNodes?: boolean;
  /** 是否忽略文本节点 */
  ignoreTextNodes?: boolean;
  /** 最大比较深度 */
  maxDepth?: number;
  /** 自定义组件映射 */
  componentMapping?: Record<string, ComponentDomMapping>;
}

/**
 * 断言结果
 */
export interface AssertResult {
  /** 是否通过 */
  pass: boolean;
  /** 差异列表 */
  diff: StructureDiff[];
  /** 摘要信息（供 LLM 使用） */
  summary?: string;
  /** 统计信息 */
  stats?: {
    totalNodes: number;
    matchedNodes: number;
    errorCount: number;
    warningCount: number;
  };
}

/**
 * 组件到 DOM 的映射配置
 */
export interface ComponentDomMapping {
  /** 对应的 DOM 标签 */
  tag: string;
  /** 必须存在的类名 */
  mustHaveClasses?: string[];
  /** 可选类名 */
  optionalClasses?: string[];
  /** 属性映射 */
  attrMapping?: Record<string, string>;
}

// ============ 默认组件映射表 ============

/**
 * 常用 UI 组件库的组件 → DOM 映射
 * 解决：源码语义组件 ≠ 浏览器真实 DOM
 */
export const DEFAULT_COMPONENT_MAPPING: Record<string, ComponentDomMapping> = {
  // Ant Design Vue 组件映射
  'a-form': { tag: 'form', mustHaveClasses: ['ant-form'] },
  'a-form-item': { tag: 'div', mustHaveClasses: ['ant-form-item'] },
  'a-input': { tag: 'input', mustHaveClasses: ['ant-input'] },
  'a-button': { tag: 'button', mustHaveClasses: ['ant-btn'] },
  'a-select': { tag: 'div', mustHaveClasses: ['ant-select'] },
  'a-date-picker': { tag: 'div', mustHaveClasses: ['ant-picker'] },
  'a-table': { tag: 'div', mustHaveClasses: ['ant-table'] },
  'a-modal': { tag: 'div', mustHaveClasses: ['ant-modal'] },
  'a-drawer': { tag: 'div', mustHaveClasses: ['ant-drawer'] },
  'a-tabs': { tag: 'div', mustHaveClasses: ['ant-tabs'] },
  'a-tab-pane': { tag: 'div', mustHaveClasses: ['ant-tabs-tabpane'] },
  'a-checkbox': { tag: 'label', mustHaveClasses: ['ant-checkbox-wrapper'] },
  'a-radio': { tag: 'label', mustHaveClasses: ['ant-radio-wrapper'] },
  'a-switch': { tag: 'button', mustHaveClasses: ['ant-switch'] },
  'a-tooltip': { tag: 'div', mustHaveClasses: ['ant-tooltip'] },
  'a-dropdown': { tag: 'div', mustHaveClasses: ['ant-dropdown'] },
  'a-menu': { tag: 'ul', mustHaveClasses: ['ant-menu'] },
  'a-menu-item': { tag: 'li', mustHaveClasses: ['ant-menu-item'] },
  'a-card': { tag: 'div', mustHaveClasses: ['ant-card'] },
  'a-row': { tag: 'div', mustHaveClasses: ['ant-row'] },
  'a-col': { tag: 'div', mustHaveClasses: ['ant-col'] },
  'a-spin': { tag: 'div', mustHaveClasses: ['ant-spin'] },
  'a-alert': { tag: 'div', mustHaveClasses: ['ant-alert'] },
  'a-tag': { tag: 'span', mustHaveClasses: ['ant-tag'] },
  'a-badge': { tag: 'span', mustHaveClasses: ['ant-badge'] },
  'a-avatar': { tag: 'span', mustHaveClasses: ['ant-avatar'] },
  'a-pagination': { tag: 'ul', mustHaveClasses: ['ant-pagination'] },
  'a-tree': { tag: 'div', mustHaveClasses: ['ant-tree'] },
  'a-upload': { tag: 'span', mustHaveClasses: ['ant-upload'] },

  // Element Plus 组件映射
  'el-form': { tag: 'form', mustHaveClasses: ['el-form'] },
  'el-form-item': { tag: 'div', mustHaveClasses: ['el-form-item'] },
  'el-input': { tag: 'div', mustHaveClasses: ['el-input'] },
  'el-button': { tag: 'button', mustHaveClasses: ['el-button'] },
  'el-select': { tag: 'div', mustHaveClasses: ['el-select'] },
  'el-date-picker': { tag: 'div', mustHaveClasses: ['el-date-editor'] },
  'el-table': { tag: 'div', mustHaveClasses: ['el-table'] },
  'el-dialog': { tag: 'div', mustHaveClasses: ['el-dialog'] },
  'el-drawer': { tag: 'div', mustHaveClasses: ['el-drawer'] },
  'el-tabs': { tag: 'div', mustHaveClasses: ['el-tabs'] },
  'el-tab-pane': { tag: 'div', mustHaveClasses: ['el-tab-pane'] },

  // BK UI 组件映射
  'bk-form': { tag: 'form', mustHaveClasses: ['bk-form'] },
  'bk-form-item': { tag: 'div', mustHaveClasses: ['bk-form-item'] },
  'bk-input': { tag: 'div', mustHaveClasses: ['bk-input'] },
  'bk-button': { tag: 'button', mustHaveClasses: ['bk-button'] },
  'bk-select': { tag: 'div', mustHaveClasses: ['bk-select'] },
  'bk-date-picker': { tag: 'div', mustHaveClasses: ['bk-date-picker'] },
  'bk-table': { tag: 'div', mustHaveClasses: ['bk-table'] },
  'bk-dialog': { tag: 'div', mustHaveClasses: ['bk-dialog'] },
  'bk-sideslider': { tag: 'div', mustHaveClasses: ['bk-sideslider'] },
  'bk-tab': { tag: 'div', mustHaveClasses: ['bk-tab'] },
  'bk-checkbox': { tag: 'label', mustHaveClasses: ['bk-checkbox'] },
  'bk-radio': { tag: 'label', mustHaveClasses: ['bk-radio'] },
  'bk-switcher': { tag: 'div', mustHaveClasses: ['bk-switcher'] },
  'bk-loading': { tag: 'div', mustHaveClasses: ['bk-loading'] },
  'bk-pagination': { tag: 'div', mustHaveClasses: ['bk-pagination'] },

  // 通用 HTML 元素（直通映射）
  'div': { tag: 'div' },
  'span': { tag: 'span' },
  'p': { tag: 'p' },
  'a': { tag: 'a' },
  'button': { tag: 'button' },
  'input': { tag: 'input' },
  'form': { tag: 'form' },
  'table': { tag: 'table' },
  'ul': { tag: 'ul' },
  'li': { tag: 'li' },
  'h1': { tag: 'h1' },
  'h2': { tag: 'h2' },
  'h3': { tag: 'h3' },
  'h4': { tag: 'h4' },
  'h5': { tag: 'h5' },
  'h6': { tag: 'h6' },
};

// ============ DOM Snapshot 抽取 ============

/**
 * 生成 DOM Snapshot 抽取脚本
 * 用于在浏览器上下文中执行，返回结构化的 DOM 快照
 */
export function generateDomSnapshotScript(rootSelector: string = 'body', maxDepth: number = 10): string {
  return `
(function extractDomSnapshot() {
  const MAX_DEPTH = ${maxDepth};
  
  // 需要忽略的属性
  const IGNORE_ATTRS = ['style', 'data-v-', 'data-reactid', '__vue__'];
  
  // 需要忽略的类名模式
  const IGNORE_CLASS_PATTERNS = [
    /^css-[a-z0-9]+$/i,     // CSS-in-JS 生成
    /^_[a-z0-9]+$/i,        // 私有类名
    /^sc-[a-z]+$/i,         // styled-components
    /^emotion-[0-9]+$/i,    // emotion
  ];
  
  function shouldIgnoreClass(className) {
    return IGNORE_CLASS_PATTERNS.some(pattern => pattern.test(className));
  }
  
  function extractNode(element, depth = 0) {
    if (depth > MAX_DEPTH) return null;
    if (!element || element.nodeType !== 1) return null;
    
    // 忽略 script, style, svg 等
    const ignoreTags = ['script', 'style', 'svg', 'noscript', 'template'];
    if (ignoreTags.includes(element.tagName.toLowerCase())) return null;
    
    const node = {
      tag: element.tagName.toLowerCase(),
    };
    
    // 提取 ID
    if (element.id) {
      node.id = element.id;
    }
    
    // 提取类名（过滤噪声）
    if (element.classList && element.classList.length > 0) {
      const classes = Array.from(element.classList)
        .filter(c => !shouldIgnoreClass(c));
      if (classes.length > 0) {
        node.classes = classes;
      }
    }
    
    // 提取关键属性
    const attrs = {};
    const importantAttrs = ['data-testid', 'data-test', 'role', 'aria-label', 'type', 'name', 'placeholder', 'href'];
    
    for (const attr of importantAttrs) {
      if (element.hasAttribute(attr)) {
        attrs[attr] = element.getAttribute(attr);
      }
    }
    
    if (Object.keys(attrs).length > 0) {
      node.attrs = attrs;
    }
    
    // 递归处理子节点
    const children = [];
    for (const child of element.children) {
      const childNode = extractNode(child, depth + 1);
      if (childNode) {
        children.push(childNode);
      }
    }
    
    if (children.length > 0) {
      node.children = children;
    }
    
    return node;
  }
  
  const root = document.querySelector('${rootSelector}');
  if (!root) {
    return { error: 'Root element not found: ${rootSelector}' };
  }
  
  return extractNode(root);
})();
`;
}

/**
 * 默认忽略的类名模式
 */
export const DEFAULT_IGNORE_CLASSES: RegExp[] = [
  /^css-[a-z0-9]+$/i,        // CSS-in-JS
  /^_[a-z0-9]+$/i,           // 私有类名
  /^sc-[a-z]+$/i,            // styled-components
  /^emotion-[0-9]+$/i,       // emotion
  /^v-[a-z]+-[a-z0-9]+$/i,   // Vue scoped 样式
  /^data-v-[a-z0-9]+$/i,     // Vue scoped 属性
];

// ============ 结构对比引擎 ============

/**
 * DOM 结构断言引擎
 */
export class DomStructureAssert {
  private options: AssertOptions;
  private componentMapping: Record<string, ComponentDomMapping>;
  private diffs: StructureDiff[] = [];
  private stats = { totalNodes: 0, matchedNodes: 0, errorCount: 0, warningCount: 0 };

  constructor(options: AssertOptions = {}) {
    this.options = {
      ignoreClasses: DEFAULT_IGNORE_CLASSES,
      strictChildrenOrder: false,
      ignoreExtraNodes: false,
      ignoreTextNodes: true,
      maxDepth: 10,
      ...options,
    };

    // 合并组件映射
    this.componentMapping = {
      ...DEFAULT_COMPONENT_MAPPING,
      ...options.componentMapping,
    };
  }

  /**
   * 执行结构断言
   */
  assert(domSnapshot: DomNode, expectedStructure: ExpectedNode): AssertResult {
    this.diffs = [];
    this.stats = { totalNodes: 0, matchedNodes: 0, errorCount: 0, warningCount: 0 };

    this.compareNode(domSnapshot, expectedStructure, 'root');

    const pass = this.stats.errorCount === 0;
    const summary = this.generateSummary(pass);

    return {
      pass,
      diff: this.diffs,
      summary,
      stats: { ...this.stats },
    };
  }

  /**
   * 比较单个节点
   */
  private compareNode(actual: DomNode | undefined, expected: ExpectedNode, path: string, depth: number = 0): void {
    this.stats.totalNodes++;

    // 深度检查
    if (depth > (this.options.maxDepth || 10)) {
      return;
    }

    // 实际节点不存在
    if (!actual) {
      if (!expected.optional) {
        this.addDiff({
          path,
          type: 'NODE_MISSING',
          expected: expected.component,
          actual: undefined,
          message: `缺少预期节点: ${expected.component}`,
          severity: 'error',
        });
      }
      return;
    }

    // 获取组件映射
    const mapping = this.getComponentMapping(expected.component);
    const expectedTag = expected.tag || mapping.tag;
    const expectedClasses = expected.mustHaveClasses || mapping.mustHaveClasses || [];

    // 1. 比较标签
    if (expectedTag && actual.tag !== expectedTag) {
      this.addDiff({
        path,
        type: 'TAG_MISMATCH',
        expected: expectedTag,
        actual: actual.tag,
        message: `标签不匹配: 预期 <${expectedTag}>, 实际 <${actual.tag}>`,
        severity: 'error',
      });
    } else {
      this.stats.matchedNodes++;
    }

    // 2. 比较必须存在的类名
    if (expectedClasses.length > 0 && actual.classes) {
      const actualClasses = this.filterIgnoredClasses(actual.classes);

      for (const expectedClass of expectedClasses) {
        if (!actualClasses.includes(expectedClass)) {
          this.addDiff({
            path,
            type: 'CLASS_MISSING',
            expected: expectedClass,
            actual: actualClasses,
            message: `缺少必需类名: "${expectedClass}"`,
            severity: 'error',
          });
        }
      }
    }

    // 3. 比较属性
    if (expected.attrs && actual.attrs) {
      for (const [key, value] of Object.entries(expected.attrs)) {
        if (actual.attrs[key] !== value) {
          this.addDiff({
            path,
            type: 'ATTR_MISMATCH',
            expected: { [key]: value },
            actual: { [key]: actual.attrs[key] },
            message: `属性不匹配: ${key}="${value}" vs "${actual.attrs[key]}"`,
            severity: 'warning',
          });
        }
      }
    }

    // 4. 比较子节点
    if (expected.children && expected.children.length > 0) {
      this.compareChildren(actual.children || [], expected.children, path, depth);
    }
  }

  /**
   * 比较子节点
   */
  private compareChildren(
    actualChildren: DomNode[],
    expectedChildren: ExpectedNode[],
    parentPath: string,
    depth: number
  ): void {
    // 跳过可选和列表节点的数量检查
    const requiredExpected = expectedChildren.filter(c => !c.optional && !c.isList);

    // 子节点数量检查（宽松模式）
    if (!this.options.ignoreExtraNodes && actualChildren.length < requiredExpected.length) {
      this.addDiff({
        path: parentPath,
        type: 'CHILDREN_COUNT',
        expected: requiredExpected.length,
        actual: actualChildren.length,
        message: `子节点数量不足: 预期至少 ${requiredExpected.length} 个, 实际 ${actualChildren.length} 个`,
        severity: 'warning',
      });
    }

    // 按顺序或按匹配比较子节点
    if (this.options.strictChildrenOrder) {
      // 严格顺序比较
      expectedChildren.forEach((expectedChild, index) => {
        const actualChild = actualChildren[index];
        const childPath = `${parentPath} > ${expectedChild.component}[${index}]`;
        this.compareNode(actualChild, expectedChild, childPath, depth + 1);
      });
    } else {
      // 宽松匹配（按组件类型匹配）
      for (const expectedChild of expectedChildren) {
        const matchedActual = this.findMatchingNode(actualChildren, expectedChild);
        const childPath = `${parentPath} > ${expectedChild.component}`;

        if (matchedActual) {
          this.compareNode(matchedActual, expectedChild, childPath, depth + 1);
        } else if (!expectedChild.optional) {
          this.compareNode(undefined, expectedChild, childPath, depth + 1);
        }
      }
    }
  }

  /**
   * 查找匹配的实际节点
   */
  private findMatchingNode(actualChildren: DomNode[], expected: ExpectedNode): DomNode | undefined {
    const mapping = this.getComponentMapping(expected.component);
    const expectedTag = expected.tag || mapping.tag;
    const expectedClasses = expected.mustHaveClasses || mapping.mustHaveClasses || [];

    return actualChildren.find(actual => {
      // 标签匹配
      if (expectedTag && actual.tag !== expectedTag) {
        return false;
      }

      // 类名匹配（至少包含一个预期类名）
      if (expectedClasses.length > 0) {
        const actualClasses = actual.classes || [];
        const hasMatchingClass = expectedClasses.some(c => actualClasses.includes(c));
        if (!hasMatchingClass) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * 获取组件映射
   */
  private getComponentMapping(component: string): ComponentDomMapping {
    // 标准化组件名（转小写）
    const normalizedName = component.toLowerCase();
    return this.componentMapping[normalizedName] || { tag: normalizedName };
  }

  /**
   * 过滤需要忽略的类名
   */
  private filterIgnoredClasses(classes: string[]): string[] {
    const ignorePatterns = this.options.ignoreClasses || [];

    return classes.filter(className => {
      for (const pattern of ignorePatterns) {
        if (pattern instanceof RegExp) {
          if (pattern.test(className)) return false;
        } else if (typeof pattern === 'string') {
          if (className === pattern || className.includes(pattern)) return false;
        }
      }
      return true;
    });
  }

  /**
   * 添加差异
   */
  private addDiff(diff: StructureDiff): void {
    this.diffs.push(diff);

    if (diff.severity === 'error') {
      this.stats.errorCount++;
    } else if (diff.severity === 'warning') {
      this.stats.warningCount++;
    }
  }

  /**
   * 生成摘要信息（供 LLM 使用）
   */
  private generateSummary(pass: boolean): string {
    const { totalNodes, matchedNodes, errorCount, warningCount } = this.stats;

    if (pass) {
      return `✅ 结构断言通过：共检查 ${totalNodes} 个节点，${matchedNodes} 个匹配成功，${warningCount} 个警告`;
    }

    const errorDiffs = this.diffs.filter(d => d.severity === 'error');
    const errorSummary = errorDiffs.slice(0, 3).map(d => `  - ${d.message}`).join('\n');

    return `❌ 结构断言失败：
错误数量: ${errorCount}
警告数量: ${warningCount}
主要问题:
${errorSummary}${errorDiffs.length > 3 ? `\n  ... 还有 ${errorDiffs.length - 3} 个错误` : ''}`;
  }
}

// ============ Vue AST 转换器 ============

/**
 * Vue Template AST 节点类型（简化版）
 */
export interface VueAstNode {
  type: number;
  tag?: string;
  props?: VueAstProp[];
  children?: VueAstNode[];
  content?: string;
}

export interface VueAstProp {
  type: number;
  name: string;
  value?: { content: string };
  arg?: { content: string };
  exp?: { content: string };
}

/**
 * Vue AST 转换配置
 */
export interface VueAstConverterConfig {
  /** 是否提取条件渲染指令 */
  extractConditions: boolean;
  /** 是否提取循环渲染指令 */
  extractLoops: boolean;
  /** 自定义组件映射 */
  componentMapping?: Record<string, ComponentDomMapping>;
}

/**
 * Vue AST → ExpectedStructure 转换器
 *
 * 使用 @vue/compiler-dom 解析 Vue Template
 * 提取组件层级、指令、静态属性
 */
export class VueAstConverter {
  private config: VueAstConverterConfig;

  constructor(config: Partial<VueAstConverterConfig> = {}) {
    this.config = {
      extractConditions: true,
      extractLoops: true,
      ...config,
    };
  }

  /**
   * 将 Vue AST 转换为预期结构
   */
  convert(ast: VueAstNode): ExpectedNode | null {
    return this.convertNode(ast);
  }

  /**
   * 转换单个 AST 节点
   */
  private convertNode(node: VueAstNode): ExpectedNode | null {
    // 只处理元素节点 (type === 1)
    if (node.type !== 1 || !node.tag) {
      return null;
    }

    const expectedNode: ExpectedNode = {
      component: node.tag,
    };

    // 提取属性
    if (node.props && node.props.length > 0) {
      const attrs: Record<string, any> = {};
      const classes: string[] = [];

      for (const prop of node.props) {
        // 静态属性 (type === 6)
        if (prop.type === 6 && prop.value) {
          if (prop.name === 'class') {
            classes.push(...prop.value.content.split(/\s+/));
          } else {
            attrs[prop.name] = prop.value.content;
          }
        }

        // 指令 (type === 7)
        if (prop.type === 7) {
          // v-if / v-show 标记为可选
          if (prop.name === 'if' || prop.name === 'show') {
            expectedNode.optional = true;
          }

          // v-for 标记为列表
          if (prop.name === 'for') {
            expectedNode.isList = true;
          }

          // v-bind:class
          if (prop.name === 'bind' && prop.arg?.content === 'class') {
            // 动态类名暂不处理
          }
        }
      }

      if (classes.length > 0) {
        expectedNode.mustHaveClasses = classes;
      }

      if (Object.keys(attrs).length > 0) {
        expectedNode.attrs = attrs;
      }
    }

    // 递归处理子节点
    if (node.children && node.children.length > 0) {
      const children = node.children
        .map(child => this.convertNode(child))
        .filter((child): child is ExpectedNode => child !== null);

      if (children.length > 0) {
        expectedNode.children = children;
      }
    }

    return expectedNode;
  }

  /**
   * 从 Vue SFC 源码生成预期结构
   * 需要 @vue/compiler-dom 支持
   */
  async parseVueSFC(source: string): Promise<ExpectedNode | null> {
    try {
      // 动态导入 @vue/compiler-dom
      const { parse } = await import('@vue/compiler-dom');
      const { ast } = parse(source);

      if (ast.children && ast.children.length > 0) {
        // 查找 template 根节点
        const templateRoot = ast.children.find((c: any) => c.type === 1);
        if (templateRoot) {
          return this.convertNode(templateRoot as VueAstNode);
        }
      }

      return null;
    } catch (error) {
      Logger.warn('Vue SFC 解析失败:', error);
      return null;
    }
  }
}

// ============ MCP Tool 接口 ============

/**
 * DOM 结构断言 MCP Tool
 *
 * MCP 能力定义：
 * assertDomStructure({
 *   domSnapshot,
 *   expectedStructure,
 *   options
 * }) => {
 *   pass: boolean
 *   diff: StructureDiff[]
 * }
 */
export class DomStructureAssertMCP {
  private assertEngine: DomStructureAssert;
  private vueConverter: VueAstConverter;

  constructor(options: AssertOptions = {}) {
    this.assertEngine = new DomStructureAssert(options);
    this.vueConverter = new VueAstConverter();
  }

  /**
   * 执行结构断言
   *
   * @param domSnapshot - DOM 快照（运行态）
   * @param expectedStructure - 预期结构（可以是 ExpectedNode 或 Vue 源码）
   * @param options - 断言选项
   */
  async assertDomStructure(params: {
    domSnapshot: DomNode;
    expectedStructure: ExpectedNode | string;
    options?: AssertOptions;
  }): Promise<AssertResult> {
    const { domSnapshot, expectedStructure, options } = params;

    Logger.info('🔍 开始 DOM 结构断言...');

    // 如果预期结构是字符串，尝试解析为 Vue SFC
    let expected: ExpectedNode;

    if (typeof expectedStructure === 'string') {
      const parsed = await this.vueConverter.parseVueSFC(expectedStructure);
      if (!parsed) {
        return {
          pass: false,
          diff: [{
            path: 'root',
            type: 'NODE_MISSING',
            message: '无法解析预期结构',
            severity: 'error',
          }],
          summary: '❌ 预期结构解析失败',
        };
      }
      expected = parsed;
    } else {
      expected = expectedStructure;
    }

    // 创建新的断言引擎（如果有自定义选项）
    const engine = options
      ? new DomStructureAssert(options)
      : this.assertEngine;

    const result = engine.assert(domSnapshot, expected);

    // 日志输出
    if (result.pass) {
      Logger.success(result.summary || '✅ 结构断言通过');
    } else {
      Logger.error(result.summary || '❌ 结构断言失败');
      result.diff.slice(0, 5).forEach(diff => {
        Logger.warn(`  ${diff.path}: ${diff.message}`);
      });
    }

    return result;
  }

  /**
   * 获取 DOM 快照抽取脚本
   */
  getDomSnapshotScript(rootSelector: string = 'body', maxDepth: number = 10): string {
    return generateDomSnapshotScript(rootSelector, maxDepth);
  }

  /**
   * 注册自定义组件映射
   */
  registerComponentMapping(mapping: Record<string, ComponentDomMapping>): void {
    this.assertEngine = new DomStructureAssert({
      componentMapping: mapping,
    });
  }

  /**
   * 从 Vue 源码生成预期结构
   */
  async generateExpectedStructure(vueSource: string): Promise<ExpectedNode | null> {
    return this.vueConverter.parseVueSFC(vueSource);
  }
}

// ============ 便捷工厂函数 ============

/**
 * 创建 DOM 结构断言 MCP Tool
 */
export function createDomStructureAssertMCP(options?: AssertOptions): DomStructureAssertMCP {
  return new DomStructureAssertMCP(options);
}

/**
 * 创建 DOM 结构断言引擎
 */
export function createDomStructureAssert(options?: AssertOptions): DomStructureAssert {
  return new DomStructureAssert(options);
}

/**
 * 创建 Vue AST 转换器
 */
export function createVueAstConverter(config?: Partial<VueAstConverterConfig>): VueAstConverter {
  return new VueAstConverter(config);
}

// ============ 导出类型和常量 ============

export {
  DEFAULT_IGNORE_CLASSES as defaultIgnoreClasses,
  DEFAULT_COMPONENT_MAPPING as defaultComponentMapping,
};
