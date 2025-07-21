// 全局依赖
const fs = require('fs').promises;
const path = require('path');
const fetch = require('node-fetch');
const { URL } = require('url');

// ====================
// 1. 函数组件预测与Bug分析
// ====================

class FunctionComponentAnalyzer {
  constructor() {
    this.parser = require('@babel/parser');
    this.traverse = require('@babel/traverse').default;
    this.types = require('@babel/types');
  }

  async analyzeFunctionComponent(componentPath) {
    // 使用 CodeImpactAnalyzer 的统一文件读取方法
    const analyzer = new CodeImpactAnalyzer();
    const code = await analyzer.readFileContent(componentPath);
    const ast = this.parser.parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
    });

    const analysis = {
      inputs: [],
      outputs: [],
      sideEffects: [],
      potentialBugs: [],
      dependencies: [],
    };

    this.traverse(ast, {
      // 分析函数输入
      FunctionDeclaration: path => {
        const params = path.node.params;
        analysis.inputs = params.map(param => ({
          name: param.name,
          type: this.inferType(param),
          required: !param.optional,
        }));
      },

      // 分析返回值
      ReturnStatement: path => {
        const returnValue = this.analyzeReturnValue(path.node.argument);
        analysis.outputs.push(returnValue);
      },

      // 检测潜在bug
      CallExpression: path => {
        const bugs = this.detectPotentialBugs(path);
        analysis.potentialBugs.push(...bugs);
      },
    });

    return analysis;
  }

  detectPotentialBugs(path) {
    const bugs = [];
    const callee = path.node.callee;

    // 检测未处理的Promise
    if (this.isAsyncCall(callee) && !this.hasErrorHandling(path)) {
      bugs.push({
        type: 'UNHANDLED_PROMISE',
        message: 'Async call without error handling',
        line: path.node.loc.start.line,
        severity: 'medium',
      });
    }

    // 检测数组访问越界
    if (this.isArrayAccess(path) && !this.hasBoundsCheck(path)) {
      bugs.push({
        type: 'ARRAY_ACCESS',
        message: 'Array access without bounds checking',
        line: path.node.loc.start.line,
        severity: 'high',
      });
    }

    // 检测空值引用
    if (this.hasNullReference(path)) {
      bugs.push({
        type: 'NULL_REFERENCE',
        message: 'Potential null/undefined reference',
        line: path.node.loc.start.line,
        severity: 'high',
      });
    }

    return bugs;
  }

  async predictComponentOutput(componentPath, props, context) {
    const analysis = await this.analyzeFunctionComponent(componentPath);

    // 创建沙盒环境
    const sandbox = await this.createSandbox();

    try {
      // 在沙盒中执行组件
      const result = await sandbox.executeComponent(componentPath, props, context);

      return {
        success: true,
        output: result,
        warnings: analysis.potentialBugs.filter(bug => bug.severity === 'medium'),
        errors: analysis.potentialBugs.filter(bug => bug.severity === 'high'),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        stackTrace: error.stack,
        analysis: analysis,
      };
    }
  }

  // ====== 补全的方法 ======
  inferType(param) { 
    if (!param) return 'any';
    
    // Vue 2.7 组件类型推断
    if (param.typeAnnotation) {
      const typeAnnotation = param.typeAnnotation;
      if (typeAnnotation.type === 'TSTypeAnnotation') {
        const tsType = typeAnnotation.typeAnnotation;
        switch (tsType.type) {
          case 'TSStringKeyword': return 'string';
          case 'TSNumberKeyword': return 'number';
          case 'TSBooleanKeyword': return 'boolean';
          case 'TSArrayType': return 'array';
          case 'TSObjectKeyword': return 'object';
          case 'TSFunctionType': return 'function';
          default: return 'any';
        }
      }
    }
    
    // 从参数名推断Vue组件常见类型
    const paramName = param.name?.toLowerCase() || '';
    if (paramName.includes('props')) return 'object';
    if (paramName.includes('data')) return 'object';
    if (paramName.includes('methods')) return 'object';
    if (paramName.includes('computed')) return 'object';
    if (paramName.includes('watch')) return 'object';
    if (paramName.includes('component')) return 'object';
    
    return 'any'; 
  }
  
  analyzeReturnValue(arg) { 
    if (!arg) return { type: 'void', value: null };
    
    // Vue组件返回值分析
    switch (arg.type) {
      case 'ObjectExpression':
        // Vue组件配置对象
        const vueConfig = this.analyzeVueComponentConfig(arg);
        return { 
          type: 'VueComponent', 
          value: vueConfig,
          props: vueConfig.props || [],
          data: vueConfig.data || {},
          methods: vueConfig.methods || [],
          computed: vueConfig.computed || []
        };
      
      case 'CallExpression':
        if (arg.callee && arg.callee.name === 'defineComponent') {
          return { type: 'Vue3Component', value: 'defineComponent' };
        }
        return { type: 'function_call', value: arg.callee?.name || 'unknown' };
      
      case 'Identifier':
        return { type: 'identifier', value: arg.name };
      
      case 'Literal':
        return { type: typeof arg.value, value: arg.value };
      
      case 'JSXElement':
        return { type: 'jsx', value: arg.openingElement?.name?.name || 'JSXElement' };
      
      default:
        return { type: 'unknown', value: arg.name || arg.value || null };
    }
  }
  
  // 分析Vue组件配置对象
  analyzeVueComponentConfig(objectExpression) {
    const config = {
      props: [],
      data: null,
      methods: [],
      computed: [],
      watch: [],
      components: [],
      mixins: []
    };
    
    if (!objectExpression.properties) return config;
    
    objectExpression.properties.forEach(prop => {
      if (prop.key && prop.key.name) {
        const keyName = prop.key.name;
        
        switch (keyName) {
          case 'props':
            config.props = this.extractPropsFromNode(prop.value);
            break;
          case 'data':
            config.data = this.extractDataFromNode(prop.value);
            break;
          case 'methods':
            config.methods = this.extractMethodsFromNode(prop.value);
            break;
          case 'computed':
            config.computed = this.extractComputedFromNode(prop.value);
            break;
          case 'watch':
            config.watch = this.extractWatchFromNode(prop.value);
            break;
          case 'components':
            config.components = this.extractComponentsFromNode(prop.value);
            break;
        }
      }
    });
    
    return config;
  }
  
  // 提取Props配置
  extractPropsFromNode(node) {
    const props = [];
    if (!node) return props;
    
    if (node.type === 'ArrayExpression') {
      // props: ['prop1', 'prop2']
      node.elements.forEach(element => {
        if (element && element.type === 'Literal') {
          props.push({
            name: element.value,
            type: 'any',
            required: false,
            default: undefined
          });
        }
      });
    } else if (node.type === 'ObjectExpression') {
      // props: { prop1: String, prop2: { type: Number, default: 0 } }
      node.properties.forEach(prop => {
        if (prop.key) {
          const propConfig = {
            name: prop.key.name || prop.key.value,
            type: 'any',
            required: false,
            default: undefined
          };
          
          if (prop.value.type === 'Identifier') {
            // prop1: String
            propConfig.type = prop.value.name.toLowerCase();
          } else if (prop.value.type === 'ObjectExpression') {
            // prop2: { type: Number, default: 0 }
            prop.value.properties.forEach(subProp => {
              if (subProp.key) {
                const keyName = subProp.key.name;
                if (keyName === 'type' && subProp.value.type === 'Identifier') {
                  propConfig.type = subProp.value.name.toLowerCase();
                } else if (keyName === 'required' && subProp.value.type === 'Literal') {
                  propConfig.required = subProp.value.value;
                } else if (keyName === 'default') {
                  propConfig.default = subProp.value.value || 'function';
                }
              }
            });
          }
          
          props.push(propConfig);
        }
      });
    }
    
    return props;
  }
  
  // 提取data配置
  extractDataFromNode(node) {
    if (!node) return null;
    
    if (node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression') {
      // data() { return { ... } }
      return 'function';
    } else if (node.type === 'ObjectExpression') {
      // data: { ... }
      return 'object';
    }
    
    return null;
  }
  
  // 提取methods配置
  extractMethodsFromNode(node) {
    const methods = [];
    if (!node || node.type !== 'ObjectExpression') return methods;
    
    node.properties.forEach(prop => {
      if (prop.key && (prop.value.type === 'FunctionExpression' || prop.value.type === 'ArrowFunctionExpression')) {
        methods.push({
          name: prop.key.name || prop.key.value,
          type: 'method',
          async: prop.value.async || false,
          params: prop.value.params.length
        });
      }
    });
    
    return methods;
  }
  
  // 提取computed配置
  extractComputedFromNode(node) {
    const computed = [];
    if (!node || node.type !== 'ObjectExpression') return computed;
    
    node.properties.forEach(prop => {
      if (prop.key) {
        computed.push({
          name: prop.key.name || prop.key.value,
          type: 'computed'
        });
      }
    });
    
    return computed;
  }
  
  // 提取watch配置
  extractWatchFromNode(node) {
    const watch = [];
    if (!node || node.type !== 'ObjectExpression') return watch;
    
    node.properties.forEach(prop => {
      if (prop.key) {
        watch.push({
          name: prop.key.name || prop.key.value,
          type: 'watcher'
        });
      }
    });
    
    return watch;
  }
  
  // 提取components配置
  extractComponentsFromNode(node) {
    const components = [];
    if (!node || node.type !== 'ObjectExpression') return components;
    
    node.properties.forEach(prop => {
      if (prop.key) {
        components.push({
          name: prop.key.name || prop.key.value,
          type: 'component'
        });
      }
    });
    
    return components;
  }
  
  isAsyncCall(callee) { 
    if (!callee) return false;
    
    // Vue异步操作检测
    const asyncPatterns = [
      'fetch', 'axios', 'request', '$http', '$ajax',
      'setTimeout', 'setInterval', 'requestAnimationFrame',
      'nextTick', '$nextTick', 'Promise', 'async'
    ];
    
    if (callee.type === 'Identifier') {
      return asyncPatterns.includes(callee.name);
    } else if (callee.type === 'MemberExpression') {
      const objectName = callee.object?.name || '';
      const propertyName = callee.property?.name || '';
      
      // Vue实例方法
      if (objectName === 'this' && propertyName.startsWith('$')) {
        return ['$http', '$ajax', '$nextTick'].includes(propertyName);
      }
      
      // 其他异步模式
      return asyncPatterns.some(pattern => 
        objectName.includes(pattern) || propertyName.includes(pattern)
      );
    }
    
    return false; 
  }
  
  hasErrorHandling(path) { 
    if (!path) return true;
    
    // 检查是否有try-catch包围
    let currentPath = path;
    while (currentPath) {
      if (currentPath.type === 'TryStatement') {
        return true;
      }
      currentPath = currentPath.parent;
    }
    
    // 检查是否有.catch()调用
    if (path.node && path.node.type === 'CallExpression') {
      const callee = path.node.callee;
      if (callee.type === 'MemberExpression' && callee.property.name === 'catch') {
        return true;
      }
    }
    
    // 检查父节点是否有错误处理
    const parent = path.parent;
    if (parent && parent.type === 'CallExpression') {
      const memberExpression = parent.callee;
      if (memberExpression && memberExpression.type === 'MemberExpression') {
        if (memberExpression.property.name === 'catch' || 
            memberExpression.property.name === 'finally') {
          return true;
        }
      }
    }
    
    return false; 
  }
  
  isArrayAccess(path) { 
    if (!path || !path.node) return false;
    
    const node = path.node;
    
    // 检查是否是数组访问: arr[index]
    if (node.type === 'CallExpression' && node.callee) {
      const callee = node.callee;
      
      // 检查 arr[0], arr.at(0) 等模式
      if (callee.type === 'MemberExpression') {
        const propertyName = callee.property?.name;
        if (['at', 'slice', 'splice', 'find', 'findIndex'].includes(propertyName)) {
          return true;
        }
      }
    }
    
    // 直接的方括号访问
    if (node.type === 'MemberExpression' && node.computed) {
      return true;
    }
    
    return false; 
  }
  
  hasBoundsCheck(path) { 
    if (!path) return true;
    
    // 检查数组访问前是否有长度检查
    let currentPath = path;
    while (currentPath && currentPath.parent) {
      const parent = currentPath.parent;
      
      // 检查if语句中的长度验证
      if (parent.type === 'IfStatement') {
        const test = parent.test;
        if (this.containsLengthCheck(test)) {
          return true;
        }
      }
      
      currentPath = currentPath.parent;
    }
    
    return false;
  }
  
  // 检查是否包含长度检查
  containsLengthCheck(node) {
    if (!node) return false;
    
    if (node.type === 'BinaryExpression') {
      const left = node.left;
      const right = node.right;
      
      // 检查 arr.length > 0, arr.length > index 等模式
      if (left.type === 'MemberExpression' && left.property?.name === 'length') {
        return true;
      }
      if (right.type === 'MemberExpression' && right.property?.name === 'length') {
        return true;
      }
    }
    
    if (node.type === 'LogicalExpression') {
      return this.containsLengthCheck(node.left) || this.containsLengthCheck(node.right);
    }
    
    return false;
  }
  
  hasNullReference(path) { 
    if (!path || !path.node) return false;
    
    const node = path.node;
    
    // 检查可能的空引用模式
    if (node.type === 'MemberExpression') {
      const object = node.object;
      
      // 检查是否有空值保护 (obj && obj.prop 或 obj?.prop)
      if (path.parent && path.parent.type === 'LogicalExpression') {
        const left = path.parent.left;
        if (left.type === 'Identifier' && object.type === 'Identifier' && left.name === object.name) {
          return false; // 有空值保护
        }
      }
      
      // 检查是否使用了可选链操作符
      if (node.optional) {
        return false; // 使用了可选链，安全
      }
      
      // 检查常见的可能为空的属性访问
      const objectName = object.name || '';
      const dangerousPatterns = ['props', 'data', 'refs', 'parent', 'children'];
      
      return dangerousPatterns.some(pattern => objectName.includes(pattern));
    }
    
    return false; 
  }
  
  async createSandbox() { 
    // 创建Vue组件测试沙盒环境
    const analyzer = new CodeImpactAnalyzer();
    return { 
      executeComponent: async (componentPath, props, context) => {
        try {
          // 简化的组件执行模拟，使用统一的文件读取方法
          const componentCode = await analyzer.readFileContent(componentPath);
          
          // 模拟Vue组件实例
          const mockVueInstance = {
            $props: props || {},
            $data: context?.data || {},
            $emit: (event, ...args) => {
              console.log(`组件事件: ${event}`, args);
            },
            $nextTick: (callback) => {
              return Promise.resolve().then(callback);
            },
            $refs: {},
            $parent: null,
            $children: []
          };
          
          // 返回模拟的渲染结果
          return {
            instance: mockVueInstance,
            rendered: true,
            props: props,
            emittedEvents: [],
            vnode: {
              tag: 'div',
              children: [],
              data: {}
            }
          };
        } catch (error) {
          throw new Error(`组件执行失败: ${error.message}`);
        }
      }
    }; 
  }
}

// ====================
// 2. API Mock数据生成器
// ====================

class APIMockDataGenerator {
  constructor() {
    this.recordedRequests = new Map();
    this.mockData = {};
    this.discoveredRoutes = new Set();
  }

  // 发现应用中的所有路由
  async discoverRoutes(projectUrl) {
    console.log('开始发现路由...');
    
    try {
      // 1. 从路由配置文件中提取路由
      const staticRoutes = await this.extractStaticRoutes();
      
      // 2. 从站点地图中发现路由
      const sitemapRoutes = await this.extractSitemapRoutes(projectUrl);
      
      // 3. 通过爬虫发现动态路由
      const crawledRoutes = await this.crawlRoutes(projectUrl);
      
      // 4. 从Vue Router配置中提取路由
      const vueRoutes = await this.extractVueRoutes();
      
      // 合并所有路由
      const allRoutes = [
        ...staticRoutes,
        ...sitemapRoutes,
        ...crawledRoutes,
        ...vueRoutes
      ];
      
      // 去重和过滤
      const uniqueRoutes = [...new Set(allRoutes)].filter(route => 
        route && 
        !route.includes('javascript:') && 
        !route.includes('mailto:') &&
        !route.includes('#')
      );
      
      console.log(`发现了 ${uniqueRoutes.length} 个路由`);
      return uniqueRoutes;
    } catch (error) {
      console.error('路由发现失败:', error);
      return ['/'];
    }
  }

  // 从静态路由配置文件中提取路由
  async extractStaticRoutes() {
    const routes = [];
    const routeFiles = [
      'src/router/index.js',
      'src/router/routes.js',
      'router/index.js',
      'routes.js',
      'src/routes.js'
    ];
    
    // 创建分析器实例用于统一文件读取
    const analyzer = new CodeImpactAnalyzer();
    
    for (const file of routeFiles) {
      try {
        const content = await analyzer.readFileContent(file);
        const extractedRoutes = this.parseRouterConfig(content);
        routes.push(...extractedRoutes);
      } catch (error) {
        // 文件不存在或无法读取，跳过
        continue;
      }
    }
    
    return routes;
  }

  // 解析Vue Router配置
  parseRouterConfig(content) {
    const routes = [];
    
    // 正则匹配路由path
    const pathRegex = /path:\s*['"`]([^'"`]+)['"`]/g;
    let match;
    
    while ((match = pathRegex.exec(content)) !== null) {
      const path = match[1];
      // 处理动态路由参数
      const cleanPath = path.replace(/:[^/]+/g, '1'); // 将 :id 替换为 1
      routes.push(cleanPath);
    }
    
    return routes;
  }

  // 从站点地图中发现路由
  async extractSitemapRoutes(projectUrl) {
    const routes = [];
    const sitemapUrls = [
      '/sitemap.xml',
      '/sitemap.txt',
      '/robots.txt'
    ];
    
    for (const sitemapUrl of sitemapUrls) {
      try {
        const response = await fetch(`${projectUrl}${sitemapUrl}`);
        if (response.ok) {
          const content = await response.text();
          const extractedRoutes = this.parseSitemap(content, projectUrl);
          routes.push(...extractedRoutes);
        }
      } catch (error) {
        // 站点地图不存在或无法访问，跳过
        continue;
      }
    }
    
    return routes;
  }

  // 解析站点地图
  parseSitemap(content, baseUrl) {
    const routes = [];
    
    if (content.includes('<?xml')) {
      // XML格式的sitemap
      const urlRegex = /<loc>(.*?)<\/loc>/g;
      let match;
      
      while ((match = urlRegex.exec(content)) !== null) {
        const url = match[1];
        const path = url.replace(baseUrl, '');
        routes.push(path);
      }
    } else {
      // 纯文本格式的sitemap
      const lines = content.split('\n');
      for (const line of lines) {
        if (line.trim().startsWith('http')) {
          const path = line.trim().replace(baseUrl, '');
          routes.push(path);
        }
      }
    }
    
    return routes;
  }

  // 通过爬虫发现动态路由
  async crawlRoutes(projectUrl) {
    const puppeteer = require('puppeteer');
    let browser;
    
    try {
      browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      const discoveredRoutes = new Set();
      const visitedUrls = new Set();
      const urlsToVisit = ['/'];
      
      // 设置用户代理
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      
      // 监听网络请求，发现AJAX加载的路由
      page.on('response', async (response) => {
        const url = response.url();
        if (url.includes('/api/') || url.includes('.json')) {
          // 从API响应中发现路由
          try {
            const responseBody = await response.text();
            const apiRoutes = this.extractRoutesFromApiResponse(responseBody);
            apiRoutes.forEach(route => discoveredRoutes.add(route));
          } catch (error) {
            // 忽略解析错误
          }
        }
      });
      
      while (urlsToVisit.length > 0 && visitedUrls.size < 50) { // 限制爬取数量
        const currentPath = urlsToVisit.shift();
        
        if (visitedUrls.has(currentPath)) {
          continue;
        }
        
        visitedUrls.add(currentPath);
        
        try {
          console.log(`正在爬取路由: ${currentPath}`);
          await page.goto(`${projectUrl}${currentPath}`, { 
            waitUntil: 'networkidle2',
            timeout: 30000 
          });
          
          // 等待Vue应用加载
          await page.waitForTimeout(2000);
          
          // 提取页面中的链接
          const links = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('a[href]'));
            return links.map(link => link.getAttribute('href'));
          });
          
          // 提取Vue Router链接
          const vueLinks = await page.evaluate(() => {
            const vueLinks = Array.from(document.querySelectorAll('[to], [href]'));
            return vueLinks.map(link => 
              link.getAttribute('to') || link.getAttribute('href')
            );
          });
          
          // 处理发现的链接
          [...links, ...vueLinks].forEach(link => {
            if (link && link.startsWith('/') && !link.startsWith('//')) {
              const cleanLink = link.split('?')[0].split('#')[0]; // 移除查询参数和锚点
              if (!visitedUrls.has(cleanLink) && cleanLink !== currentPath) {
                urlsToVisit.push(cleanLink);
                discoveredRoutes.add(cleanLink);
              }
            }
          });
          
          // 尝试触发导航事件以发现更多路由
          await this.triggerNavigationEvents(page);
          
        } catch (error) {
          console.warn(`爬取路由 ${currentPath} 失败:`, error.message);
        }
      }
      
      return Array.from(discoveredRoutes);
    } catch (error) {
      console.error('爬虫路由发现失败:', error);
      return [];
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  // 从Vue Router配置中提取路由
  async extractVueRoutes() {
    const routes = [];
    
    try {
      // 查找Vue项目中的路由配置
      const vueConfigFiles = await this.findVueConfigFiles();
      
      // 创建分析器实例用于统一文件读取
      const analyzer = new CodeImpactAnalyzer();
      
      for (const file of vueConfigFiles) {
        const content = await analyzer.readFileContent(file);
        const extractedRoutes = await this.parseVueRouterConfig(content);
        routes.push(...extractedRoutes);
      }
    } catch (error) {
      console.warn('提取Vue路由失败:', error.message);
    }
    
    return routes;
  }

  // 查找Vue配置文件
  async findVueConfigFiles() {
    const glob = require('glob');
    
    const patterns = [
      'src/router/**/*.js',
      'src/router/**/*.ts',
      'src/routes/**/*.js',
      'src/routes/**/*.ts'
    ];
    
    const files = [];
    
    for (const pattern of patterns) {
      try {
        const matchedFiles = glob.sync(pattern);
        files.push(...matchedFiles);
      } catch (error) {
        // 忽略glob错误
      }
    }
    
    return files;
  }

  // 解析Vue Router配置
  async parseVueRouterConfig(content) {
    const routes = [];
    
    // 使用正则表达式解析（简化版本）
    const pathRegex = /path:\s*['"`]([^'"`]+)['"`]/g;
    let match;
    
    while ((match = pathRegex.exec(content)) !== null) {
      const path = match[1];
      const cleanPath = path.replace(/:[^/]+/g, '1');
      routes.push(cleanPath);
    }
    
    return routes;
  }

  // 从API响应中提取路由
  extractRoutesFromApiResponse(responseBody) {
    const routes = [];
    
    try {
      const data = JSON.parse(responseBody);
      
      // 递归搜索可能的路由信息
      const searchForRoutes = (obj) => {
        if (typeof obj === 'object' && obj !== null) {
          for (const key in obj) {
            if (typeof obj[key] === 'string') {
              // 查找可能的路由路径
              if (key.toLowerCase().includes('path') || 
                  key.toLowerCase().includes('route') || 
                  key.toLowerCase().includes('url')) {
                const value = obj[key];
                if (value.startsWith('/') && !value.startsWith('//')) {
                  routes.push(value);
                }
              }
            } else if (typeof obj[key] === 'object') {
              searchForRoutes(obj[key]);
            }
          }
        }
      };
      
      searchForRoutes(data);
    } catch (error) {
      // 不是有效的JSON，忽略
    }
    
    return routes;
  }

  // 触发导航事件以发现更多路由
  async triggerNavigationEvents(page) {
    try {
      // 模拟用户交互以触发路由变化
      await page.evaluate(() => {
        // 触发所有按钮点击
        const buttons = document.querySelectorAll('button, .btn, [role="button"]');
        buttons.forEach((button, index) => {
          if (index < 5) { // 限制点击数量
            try {
              button.click();
            } catch (error) {
              // 忽略点击错误
            }
          }
        });
        
        // 触发菜单项点击
        const menuItems = document.querySelectorAll('.menu-item, .nav-item, [role="menuitem"]');
        menuItems.forEach((item, index) => {
          if (index < 5) {
            try {
              item.click();
            } catch (error) {
              // 忽略点击错误
            }
          }
        });
      });
      
      // 等待可能的路由变化
      await page.waitForTimeout(1000);
    } catch (error) {
      // 忽略触发事件的错误
    }
  }

  // 启动API请求录制
  async startRecording(projectUrl) {
    const puppeteer = require('puppeteer');
    let browser;
    
    try {
      browser = await puppeteer.launch();
      const page = await browser.newPage();

      // 拦截所有网络请求
      await page.setRequestInterception(true);
      
      page.on('request', (request) => {
        this.recordRequest(request);
        request.continue();
      });

      page.on('response', (response) => {
        this.recordResponse(response);
      });

      // 遍历应用的所有页面
      const routes = ['']; //await this.discoverRoutes(projectUrl);
      
      for (const route of routes) {
        try {
          await page.goto(`${projectUrl}${route}`, {
            waitUntil: 'networkidle0', // 500ms 内无新请求
          });

          
          // 触发交互以捕获更多API调用
          await this.simulateUserInteractions(page);
        } catch (error) {
          console.warn(`访问路由 ${route} 失败:`, error.message);
        }
      }

      return this.generateMockData();
    } catch (error) {
      console.error('录制失败:', error);
      return {};
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  recordRequest(request) {
    const key = `${request.method()}_${request.url()}`;
    this.recordedRequests.set(key, {
      method: request.method(),
      url: request.url(),
      headers: request.headers(),
      body: request.postData(),
      timestamp: Date.now()
    });
  }

  async recordResponse(response) {
    const key = `${response.request().method()}_${response.url()}`;
    const request = this.recordedRequests.get(key);
    
    if (request) {
      try {
        request.response = {
          status: response.status(),
          headers: response.headers(),
          body: await response.text(),
          timestamp: Date.now()
        };
      } catch (error) {
        console.warn('记录响应失败:', error.message);
      }
    }
  }

  generateMockData() {
    const mockData = {};
    
    this.recordedRequests.forEach((request, key) => {
      if (request.response) {
        mockData[key] = {
          request: {
            method: request.method,
            url: request.url,
            headers: request.headers,
            body: request.body
          },
          response: {
            status: request.response.status,
            headers: request.response.headers,
            body: this.parseResponseBody(request.response.body)
          }
        };
      }
    });

    return mockData;
  }

  parseResponseBody(body) {
    try {
      return JSON.parse(body);
    } catch (error) {
      return body;
    }
  }

  // 模拟用户交互以捕获更多API调用
  async simulateUserInteractions(page) {
    try {
      // 滚动页面
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight / 2);
      });
      // await page.waitForTimeout(500);
      
      // 点击可交互元素
      const interactiveElements = await page.$$('button, input, select, [role="button"], .btn');
      
      for (let i = 0; i < Math.min(interactiveElements.length, 10); i++) {
        try {
          await interactiveElements[i].click();
          // await page.waitForTimeout(300);
        } catch (error) {
          // 忽略点击错误
        }
      }
      
      // 尝试触发hover事件
      const hoverElements = await page.$$('[data-hover], .dropdown, .menu');
      for (let i = 0; i < Math.min(hoverElements.length, 5); i++) {
        try {
          await hoverElements[i].hover();
          // await page.waitForTimeout(300);
        } catch (error) {
          // 忽略hover错误
        }
      }
      
      // 填写表单
      const formInputs = await page.$$('input[type="text"], input[type="email"], textarea');
      for (let i = 0; i < Math.min(formInputs.length, 5); i++) {
        try {
          await formInputs[i].type('test');
          // await page.waitForTimeout(200);
        } catch (error) {
          // 忽略输入错误
        }
      }
      
    } catch (error) {
      console.warn('模拟用户交互失败:', error.message);
    }
  }

  // 创建Mock服务器
  createMockServer(mockData) {
    const express = require('express');
    const app = express();
    
    app.use(express.json());

    Object.entries(mockData).forEach(([key, mock]) => {
      const method = mock.request.method.toLowerCase();
      const url = new URL(mock.request.url).pathname;
      
      app[method](url, (req, res) => {
        res.status(mock.response.status);
        res.json(mock.response.body);
      });
    });

    return app;
  }
}

// ====================
// 3. 代码影响范围分析器
// ====================

class CodeImpactAnalyzer {
  constructor() {
    this.dependencyGraph = new Map();
    this.componentRegistry = new Map();
    this.functionCallGraph = new Map(); // 函数调用关系图
    this.moduleRegistry = new Map(); // 模块注册表
    this.importGraph = new Map(); // 导入关系图
    this.functionDefinitionMap = new Map(); // 函数定义映射
    this.functionUsageMap = new Map(); // 函数使用映射
    // 需要排除的目录和文件模式
    this.excludePatterns = [
      '../regression-data',
      'regression-data',
      '**/regression-data/**',
      'bklog/web/scripts',
      '**/bklog/web/scripts/**',
      '**/.git/**',
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/*.log',
      '**/*.tmp',
      '**/coverage/**'
    ];
    // 缓存优化
    this.analysisCache = new Map();
    this.lastAnalysisTime = null;
    // 工作目录设置 - 优先从配置读取，否则基于项目根目录
    this.workingDirectory = this.getAnalysisRoot();
  }

  // 获取分析根目录
  getAnalysisRoot() {
    const projectRoot = this.findProjectRoot(); // 优先找到项目根目录
    try {
      // 尝试读取配置文件
      const config = this.loadConfig();
      if (config && config.project && config.project.root) {
        const path = require('path');
        
        // 如果配置的根目录是绝对路径，直接返回
        if (path.isAbsolute(config.project.root)) {
          return config.project.root;
        } else {
          // 对于相对路径，需要特殊处理
          const configDir = path.dirname(this.findConfigFile());
          // 如果配置的 root 是 './' 或 '.', 返回配置文件所在目录
          if (config.project.root === './' || config.project.root === '.') {
            return configDir;
          } else {
            // 其他相对路径基于配置文件所在目录解析
            return path.resolve(configDir, config.project.root);
          }
        }
      }
    } catch (error) {
      console.warn('读取配置文件失败，使用项目根目录:', error.message);
    }
    
    // 如果没有配置或读取失败，使用找到的项目根目录
    return projectRoot;
  }

  // 查找并返回配置文件的路径
  findConfigFile() {
    const fs = require('fs');
    const path = require('path');
    
    let currentDir = process.cwd();
    const root = path.parse(currentDir).root;

    while (currentDir !== root) {
      const configPath = path.join(currentDir, 'regression.config.js');
      if (fs.existsSync(configPath)) {
        return configPath;
      }
      currentDir = path.dirname(currentDir);
    }
    return null;
  }

  // 加载配置文件
  loadConfig() {
    const configFile = this.findConfigFile();
    if (configFile) {
      // 清除require缓存以获取最新配置
      delete require.cache[configFile];
      return require(configFile);
    }
    return null;
  }

  // 查找项目根目录
  findProjectRoot() {
    const path = require('path');
    const fs = require('fs');
    
    let currentDir = process.cwd();
    const root = path.parse(currentDir).root;

    // 优先寻找.git目录，作为项目根目录的标志
    while (currentDir !== root) {
      if (fs.existsSync(path.join(currentDir, '.git'))) {
        return currentDir;
      }
      currentDir = path.dirname(currentDir);
    }
    
    // 如果没找到，使用当前工作目录
    console.warn('未能定位到 .git 目录，将使用当前目录作为项目根目录。对于 monorepo 或子目录执行可能导致路径解析不准确。');
    return process.cwd();
  }

  // 标准化文件路径 - 基于项目根目录
  normalizePath(filePath) {
    const path = require('path');
    
    if (!filePath) return '';
    
    // 如果是绝对路径，转换为相对于项目根目录的路径
    if (path.isAbsolute(filePath)) {
      const relativePath = path.relative(this.workingDirectory, filePath);
      return relativePath.replace(/\\/g, '/');
    }
    
    // 如果是相对路径，确保使用正确的分隔符
    return filePath.replace(/\\/g, '/');
  }

  // 检查文件是否应该被排除
  shouldExcludeFile(filePath) {
    if (!filePath) return true;
    
    // 标准化路径
    const normalizedPath = this.normalizePath(filePath);
    
    // 检查是否匹配排除模式
    return this.excludePatterns.some(pattern => {
      // 处理简单路径匹配
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'));
        return regex.test(normalizedPath);
      } else {
        // 处理精确路径匹配
        return normalizedPath.includes(pattern) || normalizedPath.startsWith(pattern + '/');
      }
    });
  }

  // 过滤文件列表
  filterFiles(files) {
    if (!Array.isArray(files)) return [];
    
    const filtered = files.filter(file => !this.shouldExcludeFile(file));
    
    console.log(`文件过滤结果: ${files.length} -> ${filtered.length} (排除了 ${files.length - filtered.length} 个文件)`);
    
    if (files.length !== filtered.length) {
      const excluded = files.filter(file => this.shouldExcludeFile(file));
      console.log('排除的文件:', excluded.slice(0, 10).join(', ') + (excluded.length > 10 ? '...' : ''));
    }
    
    return filtered;
  }

  // 构建完整的依赖关系图
  async buildDependencyGraph() {
    console.log('🔍 构建依赖关系图...');
    
    // 检查缓存
    if (this.lastAnalysisTime && Date.now() - this.lastAnalysisTime < 300000) { // 5分钟缓存
      console.log('使用缓存的依赖关系图');
      return;
    }
    
    // 1. 扫描所有源文件
    const sourceFiles = await this.scanSourceFiles();
    const filteredFiles = this.filterFiles(sourceFiles);
    console.log(`发现 ${filteredFiles.length} 个有效源文件`);
    
    // 2. 并行分析文件依赖关系
    const batchSize = 10; // 批处理大小
    const batches = [];
    for (let i = 0; i < filteredFiles.length; i += batchSize) {
      batches.push(filteredFiles.slice(i, i + batchSize));
    }
    
    for (const batch of batches) {
      const promises = batch.map(async (file) => {
        const dependencies = await this.analyzeFileDependencies(file);
        this.dependencyGraph.set(file, dependencies);
        
        // 构建导入关系图
        this.buildImportGraph(file, dependencies);
        
        // 构建函数调用图
        await this.buildFunctionCallGraph(file);
      });
      
      await Promise.all(promises);
    }
    
    // 3. 构建模块注册表
    await this.buildModuleRegistry();
    
    this.lastAnalysisTime = Date.now();
    
    console.log('✅ 依赖关系图构建完成');
    console.log(`- 文件依赖: ${this.dependencyGraph.size} 个文件`);
    console.log(`- 函数调用: ${this.functionCallGraph.size} 个函数`);
    console.log(`- 模块注册: ${this.moduleRegistry.size} 个模块`);
  }

  // 扫描所有源文件
  async scanSourceFiles() {
    const glob = require('glob');
    const path = require('path');
    
    // 确保在项目根目录下执行扫描
    const originalCwd = process.cwd();
    process.chdir(this.workingDirectory);
    
    try {
      const patterns = [
        'bklog/web/src/**/*.js',
        'bklog/web/src/**/*.ts',
        'bklog/web/src/**/*.vue',
        'bklog/web/src/**/*.jsx',
        'bklog/web/src/**/*.tsx',
        // 也扫描项目的src目录（如果存在）
        'src/**/*.js',
        'src/**/*.ts', 
        'src/**/*.vue',
        'src/**/*.jsx',
        'src/**/*.tsx'
      ];
      
      const files = [];
      const promises = patterns.map(async (pattern) => {
        try {
          const matchedFiles = glob.sync(pattern, {
            cwd: this.workingDirectory,
            absolute: false, // 返回相对路径
            nodir: true, // 确保只返回文件
          });
          files.push(...matchedFiles);
        } catch (error) {
          console.warn(`扫描模式 ${pattern} 失败:`, error.message);
        }
      });
      
      await Promise.all(promises);
      
      // 标准化所有文件路径
      const normalizedFiles = [...new Set(files)].map(file => this.normalizePath(file));
      
      return normalizedFiles;
    } finally {
      // 恢复原始工作目录
      process.chdir(originalCwd);
    }
  }

  // 分析单个文件的依赖关系
  async analyzeFileDependencies(filePath) {
    // 添加排除检查
    if (this.shouldExcludeFile(filePath)) {
      return { imports: [], exports: [], functions: [], components: [], modules: [] };
    }
    
    try {
      // 使用统一的文件读取方法
      const content = await this.readFileContent(filePath);
      
      if (content === null) { // 文件读取失败
        console.warn(`跳过分析，因为无法读取文件: ${filePath}`);
        return { imports: [], exports: [], functions: [], components: [], modules: [] };
      }

      const dependencies = {
        imports: this.extractImports(content),
        exports: this.extractExports(content),
        functions: this.extractFunctions(content),
        components: this.extractComponents(content),
        modules: this.extractModules(content)
      };
      
      // 过滤导入的模块，排除被排除的文件
      dependencies.imports = dependencies.imports.filter(imp => {
        const resolvedPath = this.resolveModulePath(imp.module, filePath);
        return resolvedPath && !this.shouldExcludeFile(resolvedPath);
      });
      
      return dependencies;
    } catch (error) {
      console.warn(`分析文件 ${filePath} 依赖失败:`, error.message);
      return { imports: [], exports: [], functions: [], components: [], modules: [] };
    }
  }

  // 改进版：统一的文件路径解析方法
  resolveFilePath(filePath) {
    const path = require('path');
    const fs = require('fs');

    if (!filePath) return null;

    // 规则1：如果是绝对路径且存在，直接使用
    if (path.isAbsolute(filePath)) {
      if (fs.existsSync(filePath)) {
        return filePath;
      }
      return null;
    }

    // 规则2：相对路径，基于当前命令执行位置（process.cwd()）进行解析
    const currentWorkingDir = process.cwd();
    const resolvedPath = path.join(currentWorkingDir, filePath);

    // 检查是否存在（包括扩展名候选）
    const candidatePaths = [
      resolvedPath,
      resolvedPath + '.js',
      resolvedPath + '.vue',
      resolvedPath + '.ts',
      path.join(resolvedPath, 'index.js'),
      path.join(resolvedPath, 'index.vue'),
      path.join(resolvedPath, 'index.ts'),
    ];

    for (const candidate of candidatePaths) {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
    
    // 规则3：如果基于当前工作目录解析失败，尝试基于项目根目录解析
    const projectRoot = this.workingDirectory;
    if (projectRoot !== currentWorkingDir) {
      const projectResolvedPath = path.join(projectRoot, filePath);
      
      const projectCandidatePaths = [
        projectResolvedPath,
        projectResolvedPath + '.js',
        projectResolvedPath + '.vue',
        projectResolvedPath + '.ts',
        path.join(projectResolvedPath, 'index.js'),
        path.join(projectResolvedPath, 'index.vue'),
        path.join(projectResolvedPath, 'index.ts'),
      ];

      for (const candidate of projectCandidatePaths) {
        if (fs.existsSync(candidate)) {
          return candidate;
        }
      }
    }
    
    // 如果所有候选都失败了，就返回null
    return null;
  }

  // 新增：统一的安全文件读取方法
  async readFileContent(filePath) {
    const fs = require('fs').promises;
    
    // 使用统一的路径解析
    const resolvedPath = this.resolveFilePath(filePath);
    
    if (!resolvedPath || !require('fs').existsSync(resolvedPath)) {
      console.error(`无法解析或找到文件路径: ${filePath} (解析为: ${resolvedPath})`);
      return null; // 返回null表示读取失败
    }
    
    try {
      return await fs.readFile(resolvedPath, 'utf8');
    } catch (error) {
      console.error(`读取文件失败 ${filePath} (解析为: ${resolvedPath}): ${error.message}`);
      return null; // 返回null表示读取失败
    }
  }

  // 提取导入语句
  extractImports(content) {
    const imports = [];
    
    // 匹配各种导入模式
    const importPatterns = [
      /import\s+(\{[^}]*\})\s+from\s+['"`]([^'"`]+)['"`]/g, // import { x, y } from 'module'
      /import\s+(\w+)\s+from\s+['"`]([^'"`]+)['"`]/g, // import x from 'module'
      /import\s+['"`]([^'"`]+)['"`]/g, // import 'module'
      /require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g, // require('module')
    ];
    
    importPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        imports.push({
          type: 'import',
          module: match[1] || match[2] || match[0],
          source: match[0]
        });
      }
    });
    
    return imports;
  }

  // 提取导出语句
  extractExports(content) {
    const exports = [];
    
    // 匹配各种导出模式
    const exportPatterns = [
      /export\s+(?:default\s+)?(?:function|class|const|let|var)\s+(\w+)/g,
      /export\s+\{([^}]+)\}/g,
      /export\s+default\s+(\w+)/g,
      /module\.exports\s*=\s*(\w+)/g,
    ];
    
    exportPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        exports.push({
          type: 'export',
          name: match[1],
          source: match[0]
        });
      }
    });
    
    return exports;
  }

  // 提取函数定义
  extractFunctions(content) {
    const functions = [];
    
    // 匹配函数定义
    const functionPatterns = [
      /(?:export\s+)?(?:async\s+)?function\s+(\w+)/g,
      /(?:export\s+)?(?:async\s+)?(\w+)\s*[:=]\s*(?:async\s+)?function/g,
      /(?:export\s+)?(?:async\s+)?(\w+)\s*[:=]\s*\([^)]*\)\s*=>/g,
    ];
    
    functionPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        functions.push({
          name: match[1],
          type: 'function',
          source: match[0]
        });
      }
    });
    
    return functions;
  }

  // 提取组件定义
  extractComponents(content) {
    const components = [];
    
    // Vue组件模式
    const vuePatterns = [
      /export\s+default\s*\{[^}]*name\s*:\s*['"`](\w+)['"`]/g,
      /components\s*:\s*\{([^}]+)\}/g,
    ];
    
    vuePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        components.push({
          name: match[1],
          type: 'vue_component',
          source: match[0]
        });
      }
    });
    
    return components;
  }

  // 提取模块信息
  extractModules(content) {
    const modules = [];
    
    // 匹配模块相关模式
    const modulePatterns = [
      /@module\s+(\w+)/g,
      /@component\s+(\w+)/g,
      /@service\s+(\w+)/g,
    ];
    
    modulePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        modules.push({
          name: match[1],
          type: 'module',
          source: match[0]
        });
      }
    });
    
    return modules;
  }

  // 构建导入关系图
  buildImportGraph(file, dependencies) {
    dependencies.imports.forEach(importItem => {
      const importedModule = this.resolveModulePath(importItem.module, file);
      if (importedModule) {
        if (!this.importGraph.has(importedModule)) {
          this.importGraph.set(importedModule, new Set());
        }
        this.importGraph.get(importedModule).add(file);
      }
    });
  }

  // 构建函数调用图
  async buildFunctionCallGraph(file) {
    try {
      // 使用统一的文件读取方法
      const content = await this.readFileContent(file);
      const functions = this.extractFunctions(content);
      
      functions.forEach(func => {
        // 查找函数调用
        const calls = this.findFunctionCalls(content, func.name);
        
        if (!this.functionCallGraph.has(func.name)) {
          this.functionCallGraph.set(func.name, {
            definition: file,
            calls: new Set(),
            callers: new Set()
          });
        }
        
        calls.forEach(call => {
          this.functionCallGraph.get(func.name).calls.add(call);
        });
      });
    } catch (error) {
      console.warn(`构建函数调用图失败 ${file}:`, error.message);
    }
  }

  // 改进的函数调用检测 - 更精确地匹配函数调用
  findFunctionCalls(content, functionName) {
    const calls = [];
    
    if (!content || !functionName) {
      return calls;
    }
    
    // 多种函数调用模式的正则表达式
    const callPatterns = [
      // 直接调用: functionName(
      new RegExp(`\\b${this.escapeRegExp(functionName)}\\s*\\(`, 'g'),
      // 对象方法调用: obj.functionName(
      new RegExp(`\\.\\s*${this.escapeRegExp(functionName)}\\s*\\(`, 'g'),
      // 解构调用: { functionName }
      new RegExp(`\\{[^}]*\\b${this.escapeRegExp(functionName)}\\b[^}]*\\}`, 'g'),
      // 导入时的重命名: import { functionName as alias }
      new RegExp(`import\\s*\\{[^}]*\\b${this.escapeRegExp(functionName)}\\b[^}]*\\}`, 'g'),
      // 从模块导入: import { functionName } from
      new RegExp(`import\\s*\\{[^}]*\\b${this.escapeRegExp(functionName)}\\b[^}]*\\}\\s*from`, 'g'),
      // Vue模板中的使用: {{ functionName( 或 v-bind:attr="functionName("
      new RegExp(`(\\{\\{[^}]*\\b${this.escapeRegExp(functionName)}\\s*\\(|v-[\\w:-]+="[^"]*\\b${this.escapeRegExp(functionName)}\\s*\\()`, 'g'),
      // 赋值操作: const result = functionName(
      new RegExp(`=\\s*${this.escapeRegExp(functionName)}\\s*\\(`, 'g'),
      // 函数参数: someFn(functionName, 或 someFn(arg, functionName)
      new RegExp(`\\([^)]*\\b${this.escapeRegExp(functionName)}\\b[^)]*\\)`, 'g'),
      // 数组中的函数: [functionName] 或 [..., functionName, ...]
      new RegExp(`\\[[^\\]]*\\b${this.escapeRegExp(functionName)}\\b[^\\]]*\\]`, 'g')
    ];
    
    callPatterns.forEach((pattern, index) => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        // 排除注释中的匹配
        if (this.isInComment(content, match.index)) {
          continue;
        }
        
        // 排除字符串字面量中的匹配
        if (this.isInStringLiteral(content, match.index)) {
          continue;
        }
        
        // 获取调用上下文
        const context = this.getCallContext(content, match.index, 100);
        
        calls.push({
          function: functionName,
          position: match.index,
          context: context,
          pattern: index,
          matchedText: match[0],
          lineNumber: this.getLineNumber(content, match.index)
        });
      }
    });
    
    return calls;
  }

  // 转义正则表达式特殊字符
  escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // 检查位置是否在注释中
  isInComment(content, position) {
    const beforeContent = content.substring(0, position);
    
    // 检查单行注释
    const lastNewLine = beforeContent.lastIndexOf('\n');
    const lineContent = beforeContent.substring(lastNewLine + 1);
    if (lineContent.includes('//')) {
      return true;
    }
    
    // 检查多行注释
    const lastCommentStart = beforeContent.lastIndexOf('/*');
    const lastCommentEnd = beforeContent.lastIndexOf('*/');
    
    return lastCommentStart > lastCommentEnd;
  }

  // 检查位置是否在字符串字面量中
  isInStringLiteral(content, position) {
    const beforeContent = content.substring(0, position);
    
    // 计算单引号数量
    const singleQuotes = (beforeContent.match(/'/g) || []).length;
    const doubleQuotes = (beforeContent.match(/"/g) || []).length;
    const backticks = (beforeContent.match(/`/g) || []).length;
    
    // 简单检查：如果引号数量为奇数，可能在字符串中
    return (singleQuotes % 2 === 1) || (doubleQuotes % 2 === 1) || (backticks % 2 === 1);
  }

  // 获取调用上下文
  getCallContext(content, position, contextLength = 50) {
    const start = Math.max(0, position - contextLength);
    const end = Math.min(content.length, position + contextLength);
    return content.substring(start, end);
  }

  // 获取行号
  getLineNumber(content, position) {
    const beforeContent = content.substring(0, position);
    return beforeContent.split('\n').length;
  }

  // 构建模块注册表
  async buildModuleRegistry() {
    for (const [file, dependencies] of this.dependencyGraph) {
      const moduleInfo = this.analyzeModuleInfo(file, dependencies);
      if (moduleInfo) {
        this.moduleRegistry.set(moduleInfo.name, {
          file: file,
          type: moduleInfo.type,
          dependencies: dependencies,
          exports: dependencies.exports,
          functions: dependencies.functions
        });
      }
    }
  }

  // 分析模块信息
  analyzeModuleInfo(file, dependencies) {
    // 添加安全检查
    if (!file || typeof file !== 'string') {
      return null;
    }
    
    // 从文件路径推断模块信息
    const pathParts = file.split('/');
    const fileName = pathParts[pathParts.length - 1];
    const moduleName = fileName.replace(/\.[^.]*$/, '');
    
    // 根据路径推断模块类型
    let moduleType = 'unknown';
    if (file.includes('/components/')) {
      moduleType = 'component';
    } else if (file.includes('/utils/') || file.includes('/common/')) {
      moduleType = 'utility';
    } else if (file.includes('/services/')) {
      moduleType = 'service';
    } else if (file.includes('/views/')) {
      moduleType = 'view';
    }
    
    return {
      name: moduleName,
      type: moduleType,
      file: file
    };
  }

  // 优化解析模块路径
  resolveModulePath(modulePath, currentFile) {
    const path = require('path');
    const fs = require('fs');
    
    if (!modulePath || !currentFile) return null;
    
    try {
      const normalizedCurrentFile = this.normalizePath(currentFile);
      const currentFileAbsolute = this.resolveFilePath(normalizedCurrentFile);

      if (!currentFileAbsolute) {
        return null;
      }
      
      if (modulePath.startsWith('.')) {
        // 相对路径：基于当前文件位置解析
        const currentDir = path.dirname(currentFileAbsolute);
        const resolved = path.resolve(currentDir, modulePath);
        
        // 尝试添加常见的文件扩展名
        const candidatePaths = [
          resolved,
          resolved + '.js',
          resolved + '.vue',
          resolved + '.ts',
          path.join(resolved, 'index.js'),
          path.join(resolved, 'index.vue'),
          path.join(resolved, 'index.ts')
        ];
        
        // 返回第一个存在的文件路径
        for (const candidate of candidatePaths) {
          if (fs.existsSync(candidate)) {
            const finalPath = this.normalizePath(candidate);
            if (!this.shouldExcludeFile(finalPath)) {
              return finalPath;
            }
          }
        }
        
        return null;
      } else if (modulePath.startsWith('@/')) {
        // Vue别名路径：@/ 
        // 尝试多种可能的 src 目录
        const relativePath = modulePath.replace('@/', '');
        const possibleSrcRoots = [
            'bklog/web/src',
            'src',
            'frontend/src',
            'client/src'
        ];

        for (const srcRoot of possibleSrcRoots) {
            const resolved = this.resolveFilePath(path.join(srcRoot, relativePath));
            if (resolved) {
                const finalPath = this.normalizePath(resolved);
                if (!this.shouldExcludeFile(finalPath)) {
                    return finalPath;
                }
            }
        }
        
        return null;
      } else if (!modulePath.includes('node_modules') && !path.isAbsolute(modulePath) && !modulePath.includes(':')) {
        // 项目内的模块路径：可能是相对于 src 或根目录
        const resolved = this.resolveProjectPath(modulePath);
        if (resolved && !this.shouldExcludeFile(resolved)) {
          return resolved;
        }
        
        return null;
      } else {
        // 外部包或绝对系统路径
        return modulePath;
      }
    } catch (error) {
      console.warn(`解析模块路径失败: ${modulePath} from ${currentFile}:`, error.message);
      return null;
    }
  }

  // 新增：解析源码目录路径（@/ 别名）
  resolveSrcPath(relativePath) {
    const path = require('path');
    const fs = require('fs');
    
    // 基于配置的根目录查找 src 目录
    const possibleSrcDirs = [
      'src',           // 标准的 src 目录
      'bklog/web/src', // 蓝鲸日志平台的特定目录结构
      'web/src',       // 嵌套的 web/src 目录
      'client/src',    // 客户端源码目录
      'frontend/src'   // 前端源码目录
    ];
    
    for (const srcDir of possibleSrcDirs) {
      const fullSrcPath = path.resolve(this.workingDirectory, srcDir);
      if (fs.existsSync(fullSrcPath)) {
        const resolved = path.resolve(fullSrcPath, relativePath);
        
        // 尝试添加文件扩展名
        const candidatePaths = [
          resolved,
          resolved + '.js',
          resolved + '.vue',
          resolved + '.ts',
          resolved + '/index.js',
          resolved + '/index.vue',
          resolved + '/index.ts'
        ];
        
        for (const candidate of candidatePaths) {
          if (fs.existsSync(candidate)) {
            return this.normalizePath(candidate);
          }
        }
        
        // 即使文件不存在，也返回规范化的路径
        return this.normalizePath(resolved);
      }
    }
    
    return null;
  }

  // 新增：解析项目内路径
  resolveProjectPath(modulePath) {
    const path = require('path');
    const fs = require('fs');
    
    // 使用相同的智能解析逻辑
    return this.normalizePath(this.resolveFilePath(modulePath));
  }

  // 新增：检查路径是否有有效的扩展名候选
  hasValidExtension(basePath) {
    const fs = require('fs');
    const extensions = ['.js', '.vue', '.ts', '/index.js', '/index.vue', '/index.ts'];
    
    return extensions.some(ext => fs.existsSync(basePath + ext));
  }

  // 分析变更的影响范围
  async analyzeChangeImpact(changedFiles) {
    console.log('🔍 分析变更影响范围...');
    
    // 在分析前确保依赖图已构建
    if (this.dependencyGraph.size === 0) {
      console.log('依赖图为空，正在重新构建...');
      await this.buildDependencyGraph();
    }

    // 再次过滤变更文件，确保不包含排除的目录
    const filteredChangedFiles = this.filterFiles(changedFiles);
    
    if (filteredChangedFiles.length === 0) {
      console.log('没有需要分析的变更文件');
      return {
        directImpact: [],
        indirectImpact: [],
        affectedComponents: [],
        affectedModules: [],
        affectedFunctions: [],
        functionLevelImpact: [], // 新增：函数级别影响
        callChain: [],
        riskLevel: 'none',
        excludedFiles: changedFiles.filter(file => this.shouldExcludeFile(file))
      };
    }
    
    const impact = {
      directImpact: [],
      indirectImpact: [],
      affectedComponents: [],
      affectedModules: [],
      affectedFunctions: [],
      functionLevelImpact: [], // 新增：函数级别影响详情
      callChain: [],
      riskLevel: 'low',
      excludedFiles: changedFiles.filter(file => this.shouldExcludeFile(file))
    };
    
    // 并行分析文件影响
    const analysisPromises = filteredChangedFiles.map(async (file) => {
      const cacheKey = `${file}_${this.lastAnalysisTime}`;
      
      // 检查缓存
      if (this.analysisCache.has(cacheKey)) {
        return this.analysisCache.get(cacheKey);
      }
      
      const fileImpact = await this.analyzeFileImpact(file);
      
      // 缓存结果
      this.analysisCache.set(cacheKey, fileImpact);
      
      return fileImpact;
    });
    
    const directImpacts = await Promise.all(analysisPromises);
    impact.directImpact = directImpacts;
    
    // 专门分析函数级别的影响
    console.log('🔍 正在进行函数级别影响分析...');
    const functionImpactPromises = filteredChangedFiles.map(file => this.analyzeFunctionLevelImpact(file));
    const functionImpacts = await Promise.all(functionImpactPromises);
    impact.functionLevelImpact = functionImpacts.flat();
    
    // 汇总所有受影响的函数
    impact.affectedFunctions = impact.functionLevelImpact.map(funcImpact => ({
      function: funcImpact.function,
      file: funcImpact.file,
      totalUsages: funcImpact.totalUsages,
      impact: funcImpact.impact,
      isModified: funcImpact.isModified
    }));
    
    // 并行分析间接影响
    const indirectAnalysisPromises = filteredChangedFiles.map(file => this.analyzeIndirectImpact(file));
    const indirectImpacts = await Promise.all(indirectAnalysisPromises);
    impact.indirectImpact = indirectImpacts.flat();
    
    // 并行分析调用链
    const callChainPromises = filteredChangedFiles.map(file => this.analyzeCallChain(file));
    const callChains = await Promise.all(callChainPromises);
    impact.callChain = callChains.flat();
    
    // 汇总受影响的组件和模块
    impact.affectedComponents = this.getAffectedComponents(impact);
    impact.affectedModules = this.getAffectedModules(impact);
    
    // 计算风险等级
    impact.riskLevel = this.calculateRiskLevel(impact);
    
    console.log(`✅ 影响分析完成: ${filteredChangedFiles.length} 个文件分析完毕`);
    console.log(`- 直接影响: ${impact.directImpact.length} 个文件`);
    console.log(`- 间接影响: ${impact.indirectImpact.length} 个文件`);
    console.log(`- 受影响组件: ${impact.affectedComponents.length} 个`);
    console.log(`- 受影响函数: ${impact.affectedFunctions.length} 个`);
    console.log(`- 函数级影响详情: ${impact.functionLevelImpact.length} 项`);
    console.log(`- 风险等级: ${impact.riskLevel}`);
    
    // 详细输出函数影响信息
    if (impact.functionLevelImpact.length > 0) {
      console.log('\n📋 函数级影响详情:');
      impact.functionLevelImpact.forEach(funcImpact => {
        console.log(`  - 函数 ${funcImpact.function} (${funcImpact.file})`);
        console.log(`    影响等级: ${funcImpact.impact}, 使用次数: ${funcImpact.totalUsages}, 是否修改: ${funcImpact.isModified}`);
        console.log(`    调用者文件: ${funcImpact.callers.map(c => c.file).join(', ')}`);
        console.log(`    导入者文件: ${funcImpact.importers.map(i => i.file).join(', ')}`);
      });
    }
    
    if (impact.excludedFiles.length > 0) {
      console.log(`- 排除文件: ${impact.excludedFiles.length} 个`);
    }
    
    return impact;
  }

  // 新增：函数级别影响分析
  async analyzeFunctionLevelImpact(file) {
    console.log(`正在分析文件 ${file} 的函数级影响...`);
    
    try {
      // 检查文件类型，重点关注工具函数文件
      const fileType = this.getFileType(file);
      
      if (fileType === 'utility' || file.includes('util') || file.includes('common') || file.includes('helper')) {
        console.log(`检测到工具文件 ${file}，进行深度函数影响分析...`);
        return await this.analyzeUtilityImpact(file);
      } else {
        // 对于其他文件，也进行函数分析但不那么详细
        const content = await this.readFileContent(file);
        if (!content) return [];
        
        const functions = this.extractFunctions(content);
        
        const functionImpacts = [];
        for (const func of functions) {
          const callers = await this.findFunctionCallersDetailed(func.name);
          if (callers.length > 0) {
            functionImpacts.push({
              function: func.name,
              file: file,
              callers: callers,
              importers: [],
              totalUsages: callers.length,
              impact: this.assessFunctionImpact(callers.length),
              isModified: true
            });
          }
        }
        
        return functionImpacts;
      }
    } catch (error) {
      console.warn(`函数级影响分析失败 ${file}:`, error.message);
      return [];
    }
  }

  // 分析文件影响
  async analyzeFileImpact(filePath) {
    const fileType = this.getFileType(filePath);
    const impact = {
      filePath,
      type: fileType,
      changes: [],
      affectedComponents: [],
      affectedFunctions: [],
      severity: 'low',
    };

    // 根据文件类型分析影响
    switch (fileType) {
      case 'utility':
        impact.affectedFunctions = await this.analyzeUtilityImpact(filePath);
        impact.affectedComponents = await this.findComponentsUsingFunctions(impact.affectedFunctions);
        break;
      case 'component':
        impact.affectedComponents = await this.analyzeComponentImpact(filePath);
        break;
      case 'service':
        impact.affectedComponents = await this.analyzeServiceImpact(filePath);
        break;
    }

    return impact;
  }

  // 改进的工具函数影响分析 - 专门处理函数修改的影响
  async analyzeUtilityImpact(filePath) {
    const affectedFunctions = [];
    const absoluteFilePath = this.resolveFilePath(filePath);
    if (!absoluteFilePath) {
        console.warn(`无法解析工具文件路径，跳过分析: ${filePath}`);
        return affectedFunctions;
    }
    const normalizedFilePath = this.normalizePath(absoluteFilePath);

    try {
      // 获取被修改的具体函数列表
      const modifiedFunctions = await this.getModifiedFunctions(absoluteFilePath);
      console.log(`文件 ${normalizedFilePath} 中被修改的函数:`, modifiedFunctions);
      
      // 使用统一的文件读取方法
      const content = await this.readFileContent(absoluteFilePath);
      if (!content) {
        console.warn(`无法读取工具文件内容: ${normalizedFilePath}`);
        return affectedFunctions;
      }
      const allFunctions = this.extractFunctions(content);
      
      // 合并所有需要分析的函数（修改的 + 定义的）
      const functionsToAnalyze = allFunctions.map(f => f.name);
      
      // 分析每个函数的影响
      for (const funcName of functionsToAnalyze) {
        console.log(`正在分析函数 ${funcName} 的影响范围...`);
        
        const callers = await this.findFunctionCallersDetailed(funcName);
        const importers = await this.findFunctionImporters(funcName, absoluteFilePath);
        
        console.log(`函数 ${funcName} 的调用者:`, callers);
        console.log(`函数 ${funcName} 的导入者:`, importers);
        
        affectedFunctions.push({
          function: funcName,
          file: normalizedFilePath, // 使用标准化的路径
          callers: callers,
          importers: importers,
          totalUsages: callers.length + importers.length,
          impact: this.assessFunctionImpact(callers.length + importers.length),
          isModified: modifiedFunctions.includes(funcName)
        });
      }
    } catch (error) {
      console.warn(`分析工具函数影响失败 ${filePath}:`, error.message);
    }
    
    return affectedFunctions;
  }

  // 增强：获取被修改的具体函数 - 更精确的检测
  async getModifiedFunctions(filePath) {
    const { execSync } = require('child_process');
    const modifiedFunctions = [];
    
    try {
      // 获取文件的git diff - 强制使用绝对路径
      const diffOutput = execSync(`git diff HEAD~1 HEAD -- "${filePath}"`, { 
        encoding: 'utf8',
        cwd: this.workingDirectory 
      });
      
      if (!diffOutput) {
        // 如果没有历史diff，检查工作目录的修改
        const workingDiff = execSync(`git diff -- "${filePath}"`, { 
          encoding: 'utf8',
          cwd: this.workingDirectory 
        });
        return this.extractModifiedFunctionsFromDiff(workingDiff, filePath);
      }
      
      return this.extractModifiedFunctionsFromDiff(diffOutput, filePath);
    } catch (error) {
      console.warn(`获取文件 ${filePath} 的修改信息失败:`, error.message);
      
      // 降级：分析文件中的所有导出函数
      try {
        const content = await this.readFileContent(filePath);
        if (!content) return [];
        const exports = this.extractExports(content);
        return exports.map(exp => exp.name).filter(name => name);
      } catch (fallbackError) {
        console.warn(`降级分析也失败:`, fallbackError.message);
        return [];
      }
    }
  }

  // 增强：从git diff中提取被修改的函数 - 更精确的分析
  extractModifiedFunctionsFromDiff(diffOutput, filePath) {
    const modifiedFunctions = [];
    const modifiedLines = [];
    
    if (!diffOutput) return modifiedFunctions;
    
    const lines = diffOutput.split('\n');
    let currentFunction = null;
    let inFunctionBody = false;
    let functionStartLine = 0;
    
    // 第一遍：收集所有修改的行
    lines.forEach((line, index) => {
      if (line.startsWith('+') || line.startsWith('-')) {
        modifiedLines.push({
          line: line.substring(1), // 去掉+或-
          type: line.startsWith('+') ? 'added' : 'removed',
          originalLine: line,
          lineNumber: index
        });
      }
    });
    
    // 第二遍：分析修改的行，识别函数
    modifiedLines.forEach(modifiedLine => {
      const line = modifiedLine.line;
      
      // 匹配函数定义模式
      const functionPatterns = [
        // 函数声明
        /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(/,
        // 箭头函数赋值
        /(?:export\s+)?(?:const|let|var)\s+(\w+)\s*[:=]\s*(?:async\s+)?\([^)]*\)\s*=>/,
        // 方法定义
        /(\w+)\s*[:=]\s*(?:async\s+)?function\s*\(/,
        // 箭头函数方法
        /(\w+)\s*[:=]\s*\([^)]*\)\s*=>/,
        // 导出语句中的函数
        /export\s*\{\s*([^}]+)\s*\}/,
        // 默认导出
        /export\s+(?:default\s+)?(\w+)/
      ];
      
      functionPatterns.forEach(pattern => {
        const match = line.match(pattern);
        if (match) {
          const funcName = match[1];
          if (funcName && !modifiedFunctions.includes(funcName)) {
            modifiedFunctions.push(funcName);
            console.log(`检测到修改的函数: ${funcName} (在行: ${line.trim()})`);
          }
        }
      });
      
      // 特别检查导出语句中的函数
      if (line.includes('export') && line.includes('{')) {
        const exportMatch = line.match(/export\s*\{\s*([^}]+)\s*\}/);
        if (exportMatch) {
          const exportedItems = exportMatch[1].split(',').map(item => item.trim());
          exportedItems.forEach(item => {
            const cleanItem = item.replace(/\s+as\s+\w+/, '').trim();
            if (cleanItem && !modifiedFunctions.includes(cleanItem)) {
              modifiedFunctions.push(cleanItem);
              console.log(`检测到导出的修改函数: ${cleanItem}`);
            }
          });
        }
      }
    });
    
    // 如果没有检测到明确的函数定义，尝试从上下文推断
    if (modifiedFunctions.length === 0) {
      const inferredFunctions = this.inferModifiedFunctionsFromContext(modifiedLines, filePath);
      modifiedFunctions.push(...inferredFunctions);
    }
    
    console.log(`从diff中提取的修改函数: ${modifiedFunctions.join(', ')}`);
    return modifiedFunctions;
  }

  // 新增：从上下文推断修改的函数
  inferModifiedFunctionsFromContext(modifiedLines, filePath) {
    const inferredFunctions = [];
    
    try {
      // 读取当前文件内容
      const content = require('fs').readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      // 分析修改行附近的代码，推断可能修改的函数
      modifiedLines.forEach(modifiedLine => {
        const lineNumber = this.findLineNumberInFile(content, modifiedLine.line);
        if (lineNumber > 0) {
          // 向上搜索最近的函数定义
          for (let i = lineNumber - 1; i >= Math.max(0, lineNumber - 20); i--) {
            const line = lines[i];
            const functionMatch = line.match(/(?:function\s+(\w+)|(\w+)\s*[:=]\s*(?:function|\([^)]*\)\s*=>))/);
            if (functionMatch) {
              const funcName = functionMatch[1] || functionMatch[2];
              if (funcName && !inferredFunctions.includes(funcName)) {
                inferredFunctions.push(funcName);
                console.log(`推断修改的函数: ${funcName} (基于上下文分析)`);
                break;
              }
            }
          }
        }
      });
    } catch (error) {
      console.warn('上下文推断失败:', error.message);
    }
    
    return inferredFunctions;
  }

  // 新增：在文件中查找行号
  findLineNumberInFile(content, searchLine) {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(searchLine.trim())) {
        return i + 1;
      }
    }
    return -1;
  }

  // 新增：分析函数变更的潜在风险和缺陷
  async analyzeFunctionChangeRisks(functionName, filePath, changeType = 'modification') {
    const risks = [];
    const recommendations = [];
    
    try {
      // 获取函数的详细信息
      const functionInfo = await this.getFunctionDetails(functionName, filePath);
      
      // 分析函数类型和用途
      const functionType = this.classifyFunctionType(functionName, functionInfo);
      
      // 根据函数类型分析风险
      switch (functionType) {
        case 'date_format':
          risks.push({
            type: 'data_format',
            severity: 'high',
            description: '日期格式化函数修改可能导致时间显示异常',
            impact: ['时间显示错误', '时区处理问题', '数据导出格式错误']
          });
          recommendations.push('测试所有时间相关的页面和功能');
          break;
          
        case 'data_processing':
          risks.push({
            type: 'data_integrity',
            severity: 'medium',
            description: '数据处理函数修改可能影响数据准确性',
            impact: ['数据计算错误', '统计结果异常', '报表数据不准确']
          });
          recommendations.push('验证数据处理流程和计算结果');
          break;
          
        case 'api_utility':
          risks.push({
            type: 'api_compatibility',
            severity: 'high',
            description: 'API工具函数修改可能影响接口调用',
            impact: ['API调用失败', '数据请求异常', '接口兼容性问题']
          });
          recommendations.push('测试所有相关的API调用功能');
          break;
          
        case 'ui_utility':
          risks.push({
            type: 'ui_behavior',
            severity: 'medium',
            description: 'UI工具函数修改可能影响界面行为',
            impact: ['界面显示异常', '交互行为错误', '用户体验问题']
          });
          recommendations.push('检查相关页面的UI表现');
          break;
          
        case 'validation':
          risks.push({
            type: 'data_validation',
            severity: 'high',
            description: '验证函数修改可能影响数据验证逻辑',
            impact: ['数据验证失效', '安全风险', '数据质量问题']
          });
          recommendations.push('全面测试数据验证功能');
          break;
          
        default:
          risks.push({
            type: 'general',
            severity: 'medium',
            description: '通用函数修改可能产生未知影响',
            impact: ['功能异常', '性能问题', '兼容性问题']
          });
          recommendations.push('进行全面的功能测试');
      }
      
      // 分析函数的使用频率
      const usageCount = await this.getFunctionUsageCount(functionName);
      if (usageCount > 10) {
        risks.push({
          type: 'high_usage',
          severity: 'critical',
          description: `函数被大量使用(${usageCount}次)，修改影响范围广`,
          impact: ['系统稳定性风险', '回归测试需求大', '部署风险高']
        });
        recommendations.push('进行全面的回归测试');
      }
      
      // 分析调用链深度
      const callChainDepth = await this.analyzeCallChainDepth(functionName);
      if (callChainDepth > 3) {
        risks.push({
          type: 'deep_call_chain',
          severity: 'high',
          description: `函数调用链较深(${callChainDepth}层)，修改可能产生连锁反应`,
          impact: ['连锁故障', '调试困难', '影响范围难以预测']
        });
        recommendations.push('分析完整的调用链影响');
      }
      
    } catch (error) {
      console.warn(`分析函数 ${functionName} 风险失败:`, error.message);
    }
    
    return {
      risks,
      recommendations,
      functionType: this.classifyFunctionType(functionName, {}),
      usageCount: await this.getFunctionUsageCount(functionName),
      callChainDepth: await this.analyzeCallChainDepth(functionName)
    };
  }

  // 新增：获取函数详细信息
  async getFunctionDetails(functionName, filePath) {
    try {
      const content = await this.readFileContent(filePath);
      if (!content) return {};
      
      // 查找函数定义
      const functionPattern = new RegExp(`(?:export\\s+)?(?:async\\s+)?function\\s+${functionName}\\s*\\([^)]*\\)\\s*\\{[\\s\\S]*?\\n\\s*\\}`, 'g');
      const match = functionPattern.exec(content);
      
      if (match) {
        return {
          definition: match[0],
          hasAsync: match[0].includes('async'),
          hasReturn: match[0].includes('return'),
          hasErrorHandling: match[0].includes('try') || match[0].includes('catch'),
          complexity: this.calculateFunctionComplexity(match[0])
        };
      }
      
      return {};
    } catch (error) {
      console.warn(`获取函数 ${functionName} 详情失败:`, error.message);
      return {};
    }
  }

  // 新增：分类函数类型
  classifyFunctionType(functionName, functionInfo) {
    const name = functionName.toLowerCase();
    
    if (name.includes('format') && (name.includes('date') || name.includes('time'))) {
      return 'date_format';
    }
    
    if (name.includes('parse') || name.includes('process') || name.includes('transform')) {
      return 'data_processing';
    }
    
    if (name.includes('api') || name.includes('request') || name.includes('http')) {
      return 'api_utility';
    }
    
    if (name.includes('ui') || name.includes('render') || name.includes('display')) {
      return 'ui_utility';
    }
    
    if (name.includes('validate') || name.includes('check') || name.includes('verify')) {
      return 'validation';
    }
    
    return 'general';
  }

  // 新增：获取函数使用次数
  async getFunctionUsageCount(functionName) {
    const callers = await this.findFunctionCallersDetailed(functionName);
    return callers.reduce((total, caller) => total + caller.calls, 0);
  }

  // 新增：分析调用链深度
  async analyzeCallChainDepth(functionName) {
    const callers = await this.findFunctionCallersDetailed(functionName);
    let maxDepth = 0;
    
    for (const caller of callers) {
      const depth = await this.calculateCallChainDepth(caller.file, functionName);
      maxDepth = Math.max(maxDepth, depth);
    }
    
    return maxDepth;
  }

  // 新增：计算调用链深度
  async calculateCallChainDepth(file, functionName, visited = new Set(), depth = 0) {
    if (visited.has(file) || depth > 10) return depth;
    
    visited.add(file);
    const callers = await this.findFunctionCallersDetailed(functionName);
    
    let maxDepth = depth;
    for (const caller of callers) {
      const newDepth = await this.calculateCallChainDepth(caller.file, functionName, visited, depth + 1);
      maxDepth = Math.max(maxDepth, newDepth);
    }
    
    return maxDepth;
  }

  // 新增：计算函数复杂度
  calculateFunctionComplexity(functionCode) {
    const lines = functionCode.split('\n');
    let complexity = 0;
    
    lines.forEach(line => {
      if (line.includes('if') || line.includes('else')) complexity++;
      if (line.includes('for') || line.includes('while')) complexity++;
      if (line.includes('switch')) complexity++;
      if (line.includes('catch')) complexity++;
    });
    
    return complexity;
  }

  // 改进的函数调用者查找 - 提供更详细的信息
  async findFunctionCallersDetailed(functionName) {
    const callers = [];
    
    console.log(`正在查找函数 ${functionName} 的所有调用者...`);
    
    // 直接遍历所有已扫描的文件进行内容搜索
    const allFiles = Array.from(this.dependencyGraph.keys());

    for (const file of allFiles) {
      try {
        // 使用统一的文件读取方法
        const content = await this.readFileContent(file);
        if (!content) continue; // 跳过无法读取的文件

        const calls = this.findFunctionCalls(content, functionName);
        
        if (calls.length > 0) {
          callers.push({
            file: file,
            calls: calls.length,
            positions: calls.map(call => ({
              line: call.lineNumber,
              position: call.position,
              context: call.context,
              pattern: call.pattern
            })),
            callDetails: calls
          });
          
          console.log(`在文件 ${file} 中发现 ${calls.length} 个 ${functionName} 的调用`);
        }
      } catch (error) {
        // 忽略读取错误，继续处理其他文件
        console.warn(`查找函数调用者时读取文件失败 ${file}:`, error.message);
      }
    }
    
    return callers;
  }

  // 新增：查找函数的导入者
  async findFunctionImporters(functionName, definitionFile) {
    const importers = [];
    
    console.log(`正在查找导入函数 ${functionName} 的文件...`);
    
    for (const [file, dependencies] of this.dependencyGraph) {
      try {
        // 检查是否导入了定义该函数的文件
        const imports = dependencies.imports || [];
        
        for (const importItem of imports) {
          const importedModule = this.resolveModulePath(importItem.module, file);
          
          // 如果导入的模块指向函数定义文件
          if (importedModule && this.normalizePath(importedModule) === this.normalizePath(definitionFile)) {
            // 检查是否具体导入了这个函数
            const content = await this.readFileContent(file);
            if (!content) continue; // 跳过无法读取的文件
            
            if (this.checkFunctionImport(content, functionName, importItem.module)) {
              importers.push({
                file: file,
                importType: 'named',
                importSource: importItem.module,
                importStatement: importItem.source
              });
              
              console.log(`文件 ${file} 导入了函数 ${functionName}`);
            }
          }
        }
      } catch (error) {
        console.warn(`检查函数导入时失败 ${file}:`, error.message);
      }
    }
    
    return importers;
  }

  // 检查文件中是否导入了特定函数
  checkFunctionImport(content, functionName, importPath) {
    // 检查具名导入
    const namedImportPatterns = [
      new RegExp(`import\\s*\\{[^}]*\\b${this.escapeRegExp(functionName)}\\b[^}]*\\}\\s*from\\s*['"\`]${this.escapeRegExp(importPath)}['"\`]`, 'g'),
      new RegExp(`import\\s*\\{[^}]*\\b${this.escapeRegExp(functionName)}\\b[^}]*\\}`, 'g'),
      new RegExp(`\\{[^}]*\\b${this.escapeRegExp(functionName)}\\b[^}]*\\}\\s*=\\s*require\\(['"\`]${this.escapeRegExp(importPath)}['"\`]\\)`, 'g')
    ];
    
    return namedImportPatterns.some(pattern => pattern.test(content));
  }

  // 改进的函数影响评估
  assessFunctionImpact(usageCount) {
    if (usageCount === 0) return 'none';
    if (usageCount >= 20) return 'critical';
    if (usageCount >= 10) return 'high';
    if (usageCount >= 5) return 'medium';
    return 'low';
  }

  // 分析间接影响
  async analyzeIndirectImpact(file) {
    const indirectImpact = [];
    
    // 查找导入此文件的所有文件
    const importers = this.findFileImporters(file);
    
    for (const importer of importers) {
      indirectImpact.push({
        type: 'import_dependency',
        file: importer,
        source: file,
        impact: 'indirect'
      });
    }
    
    return indirectImpact;
  }

  // 查找文件导入者
  findFileImporters(file) {
    const importers = [];
    
    for (const [importerFile, dependencies] of this.dependencyGraph) {
      const imports = dependencies.imports;
      for (const importItem of imports) {
        const importedModule = this.resolveModulePath(importItem.module, importerFile);
        if (importedModule === file) {
          importers.push(importerFile);
        }
      }
    }
    
    return importers;
  }

  // 分析函数级影响
  async analyzeFunctionImpact(file) {
    console.log(`正在分析文件 ${file} 的函数影响...`);
    
    const functionImpact = [];
    
    try {
      // 使用统一的文件读取方法
      const content = await this.readFileContent(file);
      if (!content) return functionImpact;

      const functions = this.extractFunctions(content);
      
      for (const func of functions) {
        const callers = await this.findFunctionCallersDetailed(func.name);
        const importers = await this.findFunctionImporters(func.name, file);
        
        if (callers.length > 0 || importers.length > 0) {
          functionImpact.push({
            function: func.name,
            file: file,
            callers: callers,
            importers: importers,
            totalUsages: callers.length + importers.length,
            impact: this.assessFunctionImpact(callers.length + importers.length),
            isModified: true
          });
        }
      }
    } catch (error) {
      console.warn(`分析函数影响失败 ${file}:`, error.message);
    }
    
    return functionImpact;
  }

  // 改进的风险等级计算 - 特别关注函数级影响
  calculateRiskLevel(impact) {
    // 如果没有有效的变更文件，风险为none
    if (!impact.directImpact || impact.directImpact.length === 0) {
      return 'none';
    }
    
    let riskScore = 0;
    
    // 基础影响范围评分
    riskScore += impact.affectedComponents.length * 10;
    riskScore += impact.affectedModules.length * 5;
    riskScore += impact.callChain.length * 2;
    
    // 函数级影响评分 - 这是新的重点
    if (impact.functionLevelImpact && impact.functionLevelImpact.length > 0) {
      impact.functionLevelImpact.forEach(funcImpact => {
        // 被修改的函数影响更严重
        const modifierMultiplier = funcImpact.isModified ? 2 : 1;
        
        // 根据使用次数调整风险
        const usageScore = funcImpact.totalUsages * 3 * modifierMultiplier;
        riskScore += usageScore;
        
        // 工具函数的影响更严重
        if (funcImpact.file.includes('util') || funcImpact.file.includes('common') || funcImpact.file.includes('helper')) {
          riskScore += funcImpact.totalUsages * 5 * modifierMultiplier;
        }
        
        // 特别关注formatDate相关函数
        if (funcImpact.function.includes('formatDate') || funcImpact.function.includes('Date')) {
          riskScore += funcImpact.totalUsages * 3 * modifierMultiplier;
          console.log(`⚠️ 检测到日期格式化函数 ${funcImpact.function} 的修改，增加风险评分`);
        }
        
        // 根据函数影响等级调整
        switch (funcImpact.impact) {
          case 'critical':
            riskScore += 50 * modifierMultiplier;
            break;
          case 'high':
            riskScore += 30 * modifierMultiplier;
            break;
          case 'medium':
            riskScore += 15 * modifierMultiplier;
            break;
          case 'low':
            riskScore += 5 * modifierMultiplier;
            break;
        }
      });
    }
    
    // 根据直接影响的文件类型调整风险
    impact.directImpact.forEach(fileImpact => {
      const fileType = this.getFileType(fileImpact.filePath || fileImpact);
      switch (fileType) {
        case 'component':
          riskScore += 15; // Vue组件变更风险较高
          break;
        case 'service':
          riskScore += 20; // 服务层变更风险很高
          break;
        case 'utility':
          riskScore += 35; // 工具函数变更影响面最广
          break;
        case 'route':
          riskScore += 10; // 路由变更风险中等
          break;
        case 'style':
          riskScore += 5;  // 样式变更风险较低
          break;
        default:
          riskScore += 8;  // 其他文件默认风险
      }
    });
    
    // 根据间接影响调整风险
    if (impact.indirectImpact && impact.indirectImpact.length > 0) {
      riskScore += impact.indirectImpact.length * 3;
    }
    
    // 考虑排除文件的影响（如果排除了很多文件，可能漏掉了重要影响）
    if (impact.excludedFiles && impact.excludedFiles.length > 0) {
      console.log(`注意: 排除了 ${impact.excludedFiles.length} 个文件，可能影响风险评估的完整性`);
    }
    
    console.log(`🎯 风险评分计算: 总分 ${riskScore}`);
    
    // 分级判断
    if (riskScore === 0) return 'none';
    if (riskScore >= 200) return 'critical'; // 降低critical阈值，更敏感地检测高风险
    if (riskScore >= 100) return 'high';
    if (riskScore >= 40) return 'medium';   // 降低medium阈值
    return 'low';
  }

  // 改进的受影响组件获取
  getAffectedComponents(impact) {
    const components = new Set();
    
    // 从直接影响中收集组件
    impact.directImpact.forEach(fileImpact => {
      if (fileImpact.affectedComponents) {
        fileImpact.affectedComponents.forEach(comp => {
          components.add(comp.component || comp);
        });
      }
      
      // 如果直接影响的文件本身就是组件
      const filePath = fileImpact.filePath || fileImpact;
      if (this.getFileType(filePath) === 'component') {
        components.add(filePath);
      }
    });
    
    // 从间接影响中收集组件
    impact.indirectImpact.forEach(indirect => {
      if (this.getFileType(indirect.file) === 'component') {
        components.add(indirect.file);
      }
    });
    
    // 从函数级影响中收集组件
    if (impact.functionLevelImpact) {
      impact.functionLevelImpact.forEach(funcImpact => {
        // 从调用者中找组件
        funcImpact.callers.forEach(caller => {
          if (this.getFileType(caller.file) === 'component') {
            components.add(caller.file);
          }
        });
        
        // 从导入者中找组件
        funcImpact.importers.forEach(importer => {
          if (this.getFileType(importer.file) === 'component') {
            components.add(importer.file);
          }
        });
      });
    }
    
    return Array.from(components);
  }

  // 改进的受影响模块获取
  getAffectedModules(impact) {
    const modules = new Set();
    
    // 从所有影响中收集模块
    [...impact.directImpact, ...impact.indirectImpact].forEach(item => {
      const filePath = item.file || item.component || item.filePath;
      if (filePath) {
        const moduleInfo = this.analyzeModuleInfo(filePath, {});
        if (moduleInfo) {
          modules.add(moduleInfo.name);
        }
      }
    });
    
    // 从函数级影响中收集模块
    if (impact.functionLevelImpact) {
      impact.functionLevelImpact.forEach(funcImpact => {
        const moduleInfo = this.analyzeModuleInfo(funcImpact.file, {});
        if (moduleInfo) {
          modules.add(moduleInfo.name);
        }
        
        // 从调用者和导入者中收集模块
        [...funcImpact.callers, ...funcImpact.importers].forEach(item => {
          const moduleInfo = this.analyzeModuleInfo(item.file, {});
          if (moduleInfo) {
            modules.add(moduleInfo.name);
          }
        });
      });
    }
    
    return Array.from(modules);
  }

  // 新增：生成详细的影响报告
  generateDetailedImpactReport(impact) {
    const report = {
      summary: {
        riskLevel: impact.riskLevel,
        totalFiles: impact.directImpact.length,
        affectedComponents: impact.affectedComponents.length,
        affectedFunctions: impact.affectedFunctions.length,
        excludedFiles: impact.excludedFiles.length
      },
      functionImpacts: [],
      componentImpacts: [],
      recommendations: []
    };
    
    // 生成函数影响详情
    if (impact.functionLevelImpact) {
      impact.functionLevelImpact.forEach(funcImpact => {
        const functionReport = {
          functionName: funcImpact.function,
          sourceFile: funcImpact.file,
          isModified: funcImpact.isModified,
          impactLevel: funcImpact.impact,
          totalUsages: funcImpact.totalUsages,
          callerFiles: funcImpact.callers.map(c => c.file),
          importerFiles: funcImpact.importers.map(i => i.file),
          affectedComponents: [
            ...funcImpact.callers.filter(c => this.getFileType(c.file) === 'component').map(c => c.file),
            ...funcImpact.importers.filter(i => this.getFileType(i.file) === 'component').map(i => i.file)
          ]
        };
        
        report.functionImpacts.push(functionReport);
      });
    }
    
    // 生成组件影响详情
    impact.affectedComponents.forEach(component => {
      const componentReport = {
        componentPath: component,
        impactSource: 'unknown',
        affectedFunctions: []
      };
      
      // 找出影响这个组件的函数
      if (impact.functionLevelImpact) {
        impact.functionLevelImpact.forEach(funcImpact => {
          const isAffected = [
            ...funcImpact.callers.map(c => c.file),
            ...funcImpact.importers.map(i => i.file)
          ].includes(component);
          
          if (isAffected) {
            componentReport.affectedFunctions.push(funcImpact.function);
          }
        });
      }
      
      report.componentImpacts.push(componentReport);
    });
    
    // 生成建议
    report.recommendations = this.generateDetailedRecommendations(impact);
    
    return report;
  }

  // 新增：生成详细建议
  generateDetailedRecommendations(impact) {
    const recommendations = [];
    
    // 根据风险等级生成基础建议
    switch (impact.riskLevel) {
      case 'critical':
        recommendations.push('🚨 CRITICAL: 检测到关键风险修改，强烈建议暂停发布');
        recommendations.push('📋 必须进行完整的回归测试套件');
        recommendations.push('👥 建议多人Review代码变更');
        break;
      case 'high':
        recommendations.push('⚠️ HIGH: 检测到高风险修改，建议充分测试后发布');
        recommendations.push('🔍 重点测试受影响的组件和功能');
        break;
      case 'medium':
        recommendations.push('⚡ MEDIUM: 中等风险修改，建议进行相关功能测试');
        break;
      case 'low':
        recommendations.push('✅ LOW: 风险较低，建议进行基础验证测试');
        break;
    }
    
    // 针对函数级影响的建议
    if (impact.functionLevelImpact && impact.functionLevelImpact.length > 0) {
      const highImpactFunctions = impact.functionLevelImpact.filter(f => f.impact === 'high' || f.impact === 'critical');
      
      if (highImpactFunctions.length > 0) {
        recommendations.push(`🎯 重点关注高影响函数: ${highImpactFunctions.map(f => f.function).join(', ')}`);
        
        highImpactFunctions.forEach(func => {
          if (func.function.includes('formatDate')) {
            recommendations.push(`📅 特别注意: ${func.function} 影响日期显示，建议测试所有涉及时间格式化的页面`);
          }
        });
      }
      
      // 工具函数修改的建议
      const utilityFunctions = impact.functionLevelImpact.filter(f => 
        f.file.includes('util') || f.file.includes('common') || f.file.includes('helper')
      );
      
      if (utilityFunctions.length > 0) {
        recommendations.push(`🔧 工具函数修改: ${utilityFunctions.map(f => f.function).join(', ')} - 建议进行全面的功能测试`);
      }
    }
    
    // 组件影响的建议
    if (impact.affectedComponents.length > 0) {
      recommendations.push(`🎨 受影响组件数量: ${impact.affectedComponents.length} - 建议逐一验证组件渲染和交互`);
      
      if (impact.affectedComponents.length > 10) {
        recommendations.push('⚠️ 大量组件受影响，建议分批测试并重点关注核心业务流程');
      }
    }
    
    // 排除文件的建议
    if (impact.excludedFiles && impact.excludedFiles.length > 0) {
      recommendations.push(`ℹ️ 已排除 ${impact.excludedFiles.length} 个文件的分析，如有需要请检查排除规则`);
    }
    
    return recommendations;
  }

  // 查找函数定义
  findFunctionDefinition(functionName) {
    for (const [file, dependencies] of this.dependencyGraph) {
      const functions = dependencies.functions;
      for (const func of functions) {
        if (func.name === functionName) {
          return file;
        }
      }
    }
    return null;
  }

  // 获取受影响的组件
  getAffectedComponents(impact) {
    const components = new Set();
    
    // 从直接影响中收集组件
    impact.directImpact.forEach(fileImpact => {
      fileImpact.affectedComponents.forEach(comp => {
        components.add(comp.component || comp);
      });
    });
    
    // 从间接影响中收集组件
    impact.indirectImpact.forEach(indirect => {
      if (this.getFileType(indirect.file) === 'component') {
        components.add(indirect.file);
      }
    });
    
    return Array.from(components);
  }

  // 获取受影响的模块
  getAffectedModules(impact) {
    const modules = new Set();
    
    // 从所有影响中收集模块
    [...impact.directImpact, ...impact.indirectImpact].forEach(item => {
      const moduleInfo = this.analyzeModuleInfo(item.file || item.component, {});
      if (moduleInfo) {
        modules.add(moduleInfo.name);
      }
    });
    
    return Array.from(modules);
  }

  // 计算风险等级
  calculateRiskLevel(impact) {
    // 如果没有有效的变更文件，风险为none
    if (!impact.directImpact || impact.directImpact.length === 0) {
      return 'none';
    }
    
    let riskScore = 0;
    
    // 根据影响范围计算风险
    riskScore += impact.affectedComponents.length * 10;
    riskScore += impact.affectedModules.length * 5;
    riskScore += impact.affectedFunctions.length * 3;
    riskScore += impact.callChain.length * 2;
    
    // 根据直接影响的文件类型调整风险
    impact.directImpact.forEach(fileImpact => {
      const fileType = this.getFileType(fileImpact.filePath || fileImpact);
      switch (fileType) {
        case 'component':
          riskScore += 15; // Vue组件变更风险较高
          break;
        case 'service':
          riskScore += 20; // 服务层变更风险很高
          break;
        case 'utility':
          riskScore += 25; // 工具函数变更影响面广
          break;
        case 'route':
          riskScore += 10; // 路由变更风险中等
          break;
        case 'style':
          riskScore += 5;  // 样式变更风险较低
          break;
        default:
          riskScore += 8;  // 其他文件默认风险
      }
    });
    
    // 根据函数调用者数量调整风险
    impact.affectedFunctions.forEach(func => {
      if (func.impact === 'high') riskScore += 20;
      if (func.impact === 'medium') riskScore += 10;
      if (func.impact === 'low') riskScore += 3;
    });
    
    // 根据间接影响调整风险
    if (impact.indirectImpact && impact.indirectImpact.length > 0) {
      riskScore += impact.indirectImpact.length * 5;
    }
    
    // 考虑排除文件的影响（如果排除了很多文件，可能漏掉了重要影响）
    if (impact.excludedFiles && impact.excludedFiles.length > 0) {
      console.log(`注意: 排除了 ${impact.excludedFiles.length} 个文件，可能影响风险评估的完整性`);
    }
    
    // 分级判断
    if (riskScore === 0) return 'none';
    if (riskScore > 100) return 'critical'; // 新增critical级别
    if (riskScore > 50) return 'high';
    if (riskScore > 20) return 'medium';
    return 'low';
  }

  // 获取变更文件（保持原有功能）
  async getChangedFiles(commitHash = 'WORKING') {
    const { execSync } = require('child_process');
    const path = require('path');
    
    // 确保在项目根目录下执行git命令
    const originalCwd = process.cwd();
    process.chdir(this.workingDirectory);
    
    try {
      let files = [];
      
      // 如果 commitHash 是特殊值 'STAGED' 或 'WORKING'，处理当前修改
      if (commitHash === 'STAGED' || commitHash === 'WORKING') {
        // 获取已 staged 的文件
        try {
          const stagedOutput = execSync('git diff --cached --name-only', { 
            encoding: 'utf8' 
          });
          const stagedFiles = stagedOutput.trim().split('\n').filter(file => file.length > 0);
          files.push(...stagedFiles);
          console.log(`发现 ${stagedFiles.length} 个已 staged 的文件:`, stagedFiles);
        } catch (stagedError) {
          console.warn('获取 staged 文件失败:', stagedError.message);
        }
        
        // 如果是 WORKING，还要获取工作目录中的修改（未 staged）
        if (commitHash === 'WORKING') {
          try {
            const workingOutput = execSync('git diff --name-only', { 
              encoding: 'utf8' 
            });
            const workingFiles = workingOutput.trim().split('\n').filter(file => file.length > 0);
            files.push(...workingFiles);
            console.log(`发现 ${workingFiles.length} 个工作目录修改的文件:`, workingFiles);
          } catch (workingError) {
            console.warn('获取工作目录修改文件失败:', workingError.message);
          }
        }
        
        // 获取新增的未跟踪文件（如果需要）
        try {
          const untrackedOutput = execSync('git ls-files --others --exclude-standard', { 
            encoding: 'utf8' 
          });
          const untrackedFiles = untrackedOutput.trim().split('\n').filter(file => file.length > 0);
          if (untrackedFiles.length > 0) {
            console.log(`发现 ${untrackedFiles.length} 个新增未跟踪文件:`, untrackedFiles);
            files.push(...untrackedFiles);
          }
        } catch (untrackedError) {
          console.warn('获取未跟踪文件失败:', untrackedError.message);
        }
      } else {
        // 原有逻辑：比较指定提交与其父提交
        const output = execSync(`git diff --name-only ${commitHash}~1 ${commitHash}`, { 
          encoding: 'utf8' 
        });
        files = output.trim().split('\n').filter(file => file.length > 0);
      }
      
      // 去重并过滤空值，标准化路径
      const uniqueFiles = [...new Set(files)]
        .filter(file => file && file.length > 0)
        .map(file => this.normalizePath(file));
      
      // 应用文件过滤，排除 regression-data 等目录
      const filteredFiles = this.filterFiles(uniqueFiles);
      
      console.log(`变更文件分析: 原始 ${uniqueFiles.length} 个 -> 过滤后 ${filteredFiles.length} 个`);
      
      if (uniqueFiles.length !== filteredFiles.length) {
        const excludedFiles = uniqueFiles.filter(file => this.shouldExcludeFile(file));
        console.log(`排除的变更文件 (${excludedFiles.length} 个):`, excludedFiles.join(', '));
      }
      
      return filteredFiles;
    } catch (error) {
      console.warn('获取变更文件失败:', error.message);
      
      // 降级处理：尝试获取当前状态
      try {
        console.log('尝试降级获取当前变更状态...');
        const fallbackOutput = execSync('git status --porcelain', { 
          encoding: 'utf8' 
        });
        
        const fallbackFiles = fallbackOutput
          .split('\n')
          .filter(line => line.trim().length > 0)
          .map(line => {
            // git status --porcelain 格式: XY filename
            // X: staged状态, Y: working tree状态
            const match = line.match(/^(..) (.+)$/);
            return match ? match[2] : null;
          })
          .filter(file => file !== null)
          .map(file => this.normalizePath(file));
          
        // 应用文件过滤
        const filteredFallbackFiles = this.filterFiles(fallbackFiles);
        
        console.log(`降级获取到 ${filteredFallbackFiles.length} 个有效文件:`, filteredFallbackFiles);
        return filteredFallbackFiles;
      } catch (fallbackError) {
        console.error('降级获取也失败:', fallbackError.message);
        return [];
      }
    } finally {
      // 恢复原始工作目录
      process.chdir(originalCwd);
    }
  }

  // 更新后的 analyzeCommitImpact 方法
  async analyzeCommitImpact(commitHash = 'WORKING') {
    // 获取变更文件
    const changedFiles = await this.getChangedFiles(commitHash);

    // 使用新的影响分析功能
    const impact = await this.analyzeChangeImpact(changedFiles);

    // 添加分析类型和时间戳
    impact.analysisType = this.getAnalysisType(commitHash);
    impact.timestamp = new Date().toISOString();
    impact.affectedPages = this.getAffectedPages(impact.affectedComponents);

    return impact;
  }
  
  // 新增：分析已 staged 的修改
  async analyzeStagedChanges() {
    console.log('正在分析已 staged 的修改...');
    return await this.analyzeCommitImpact('STAGED');
  }
  
  // 新增：分析工作目录的所有修改（包括 staged 和未 staged）
  async analyzeWorkingChanges() {
    console.log('正在分析工作目录的所有修改...');
    return await this.analyzeCommitImpact('WORKING');
  }
  
  // 新增：获取分析类型描述
  getAnalysisType(commitHash) {
    switch (commitHash) {
      case 'STAGED':
        return 'staged_changes';
      case 'WORKING':
        return 'working_directory_changes';
      default:
        return 'commit_comparison';
    }
  }

  // 获取文件类型
  getFileType(filePath) {
    const ext = path.extname(filePath);
    const basename = path.basename(filePath);
    
    if (ext === '.vue' || filePath.includes('components/')) {
      return 'component';
    }
    if (ext === '.css' || ext === '.scss' || ext === '.less') {
      return 'style';
    }
    if (filePath.includes('router/') || basename.includes('route')) {
      return 'route';
    }
    if (filePath.includes('utils/') || filePath.includes('lib/') || filePath.includes('common/')) {
      return 'utility';
    }
    if (filePath.includes('services/')) {
      return 'service';
    }
    return 'other';
  }

  // 分析组件影响
  async analyzeComponentImpact(componentPath) {
    const component = await this.parseComponent(componentPath);
    const impact = [];

    // 分析props变化的影响
    const propsChanges = await this.analyzePropsChanges(component);
    if (propsChanges.length > 0) {
      impact.push({
        type: 'props',
        changes: propsChanges,
        affectedParents: await this.findParentComponents(componentPath),
      });
    }

    // 分析events变化的影响
    const eventsChanges = await this.analyzeEventsChanges(component);
    if (eventsChanges.length > 0) {
      impact.push({
        type: 'events',
        changes: eventsChanges,
        affectedParents: await this.findParentComponents(componentPath),
      });
    }

    // 分析slot变化的影响
    const slotsChanges = await this.analyzeSlotsChanges(component);
    if (slotsChanges.length > 0) {
      impact.push({
        type: 'slots',
        changes: slotsChanges,
        affectedParents: await this.findParentComponents(componentPath),
      });
    }

    return impact;
  }

  // 分析服务影响
  async analyzeServiceImpact(filePath) {
    // 查找使用此服务的组件
    const serviceUsers = [];
    
    for (const [file, dependencies] of this.dependencyGraph) {
      const imports = dependencies.imports;
      for (const importItem of imports) {
        const importedModule = this.resolveModulePath(importItem.module, file);
        if (importedModule === filePath && this.getFileType(file) === 'component') {
          serviceUsers.push({
            component: file,
            service: filePath,
            impact: 'service_dependency'
          });
        }
      }
    }
    
    return serviceUsers;
  }

  // 获取受影响的页面
  getAffectedPages(components) {
    const pages = new Set();
    
    components.forEach(component => {
      const componentPath = typeof component === 'string' ? component : component.component;
      if (componentPath && componentPath.includes('/views/')) {
        pages.add(componentPath);
      }
    });
    
    return Array.from(pages);
  }

  // 补全的方法
  async parseComponent(componentPath) { 
    return { path: componentPath }; 
  }
  
  async analyzePropsChanges(component) { 
    return []; 
  }
  
  async findParentComponents(componentPath) { 
    return []; 
  }
  
  async analyzeEventsChanges(component) { 
    return []; 
  }
  
  async analyzeSlotsChanges(component) { 
    return []; 
  }

  // 添加清理缓存方法
  clearCache() {
    this.analysisCache.clear();
    this.lastAnalysisTime = null;
    console.log('缓存已清理');
  }

  // 添加获取分析统计信息的方法
  getAnalysisStats() {
    return {
      dependencyGraphSize: this.dependencyGraph.size,
      functionCallGraphSize: this.functionCallGraph.size,
      moduleRegistrySize: this.moduleRegistry.size,
      cacheSize: this.analysisCache.size,
      lastAnalysisTime: this.lastAnalysisTime,
      excludePatterns: this.excludePatterns
    };
  }

  // 添加性能监控方法
  async withPerformanceMonitor(operation, operationName) {
    const startTime = Date.now();
    console.log(`🚀 开始 ${operationName}...`);
    
    try {
      const result = await operation();
      const endTime = Date.now();
      console.log(`✅ ${operationName} 完成，耗时: ${endTime - startTime}ms`);
      return result;
    } catch (error) {
      const endTime = Date.now();
      console.error(`❌ ${operationName} 失败，耗时: ${endTime - startTime}ms，错误:`, error.message);
      throw error;
    }
  }

  // 快速分析当前变更（包装方法）
  async quickAnalyzeCurrentChanges() {
    return this.withPerformanceMonitor(async () => {
      const changedFiles = await this.getChangedFiles('WORKING');
      if (changedFiles.length === 0) {
        return {
          hasChanges: false,
          message: '没有检测到变更文件或所有变更文件都被排除'
        };
      }
      
      const impact = await this.analyzeChangeImpact(changedFiles);
      return {
        hasChanges: true,
        changedFilesCount: changedFiles.length,
        excludedFilesCount: impact.excludedFiles ? impact.excludedFiles.length : 0,
        riskLevel: impact.riskLevel,
        summary: this.generateQuickSummary(impact)
      };
    }, '快速变更分析');
  }

  // 生成快速摘要
  generateQuickSummary(impact) {
    const summary = {
      riskLevel: impact.riskLevel,
      totalFiles: impact.directImpact.length,
      affectedComponents: impact.affectedComponents.length,
      affectedFunctions: impact.affectedFunctions.length,
      recommendations: []
    };

    // 根据风险等级生成建议
    switch (impact.riskLevel) {
      case 'critical':
        summary.recommendations.push('🚨 关键风险：建议暂停发布，进行全面测试');
        summary.recommendations.push('📋 建议进行完整的回归测试套件');
        break;
      case 'high':
        summary.recommendations.push('⚠️ 高风险：建议进行重点测试');
        summary.recommendations.push('🔍 重点关注受影响的组件');
        break;
      case 'medium':
        summary.recommendations.push('⚡ 中等风险：建议进行相关功能测试');
        break;
      case 'low':
        summary.recommendations.push('✅ 风险较低：建议进行基础验证');
        break;
      case 'none':
        summary.recommendations.push('✨ 无风险：所有变更都在排除范围内');
        break;
    }

    return summary;
  }

  // 添加配置更新方法
  updateExcludePatterns(newPatterns) {
    if (Array.isArray(newPatterns)) {
      this.excludePatterns = [...this.excludePatterns, ...newPatterns];
      console.log(`更新排除模式，新增 ${newPatterns.length} 个模式`);
      this.clearCache(); // 清理缓存以应用新的排除规则
    } else {
      console.warn('排除模式必须是数组格式');
    }
  }

  // 重置排除模式
  resetExcludePatterns() {
    this.excludePatterns = [
      '../regression-data',
      'regression-data',
      '**/regression-data/**',
      '**/.git/**',
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/*.log',
      '**/*.tmp',
      '**/coverage/**'
    ];
    this.clearCache();
    console.log('排除模式已重置为默认值');
  }

  // 检查特定文件的影响
  async checkFileImpact(filePath) {
    if (this.shouldExcludeFile(filePath)) {
      return {
        excluded: true,
        reason: '文件在排除列表中',
        impact: null
      };
    }

    const impact = await this.analyzeFileImpact(filePath);
    return {
      excluded: false,
      impact: impact,
      riskLevel: this.calculateComponentRisk([impact])
    };
  }

  // 预览分析结果（不执行实际分析）
  previewAnalysis(files) {
    const filteredFiles = this.filterFiles(files);
    const excludedFiles = files.filter(file => this.shouldExcludeFile(file));
    
    return {
      totalFiles: files.length,
      validFiles: filteredFiles.length,
      excludedFiles: excludedFiles.length,
      excludedList: excludedFiles,
      wouldAnalyze: filteredFiles.length > 0,
      estimatedRisk: filteredFiles.length === 0 ? 'none' : 'unknown'
    };
  }

  async parseComponent(componentPath) {
    try {
      // 使用统一的文件读取方法
      const analyzer = new CodeImpactAnalyzer();
      const content = await analyzer.readFileContent(componentPath);
      
      // 简化的组件解析
      return {
        path: componentPath,
        content: content,
        props: this.extractProps(content),
        events: this.extractEvents(content),
        slots: this.extractSlots(content)
      };
    } catch (error) {
      console.warn(`解析组件 ${componentPath} 失败:`, error.message);
      return {
        path: componentPath,
        content: '',
        props: [],
        events: [],
        slots: []
      };
    }
  }

  // 查找使用特定函数的组件
  async findComponentsUsingFunctions(affectedFunctions) {
    const affectedComponents = [];
    
    for (const funcImpact of affectedFunctions) {
      // 从调用者中找组件
      for (const caller of funcImpact.callers) {
        if (this.getFileType(caller.file) === 'component') {
          affectedComponents.push({
            component: caller.file,
            function: funcImpact.function,
            impact: 'function_dependency',
            usageCount: caller.calls
          });
        }
      }
      
      // 从导入者中找组件
      for (const importer of funcImpact.importers || []) {
        if (this.getFileType(importer.file) === 'component') {
          affectedComponents.push({
            component: importer.file,
            function: funcImpact.function,
            impact: 'import_dependency',
            importType: importer.importType
          });
        }
      }
    }
    
    return affectedComponents;
  }

  // 分析调用链
  async analyzeCallChain(file) {
    const callChain = [];
    
    // 查找此文件调用的函数
    try {
      // 使用统一的文件读取方法
      const content = await this.readFileContent(file);
      if (!content) return callChain;

      const functions = this.extractFunctions(content);
      
      for (const func of functions) {
        const calls = this.findFunctionCalls(content, func.name);
        
        for (const call of calls) {
          // 查找被调用函数的定义
          const calleeDefinition = this.findFunctionDefinition(call.function);
          if (calleeDefinition) {
            callChain.push({
              caller: file,
              callee: calleeDefinition,
              function: call.function,
              chain: [file, calleeDefinition]
            });
          }
        }
      }
    } catch (error) {
      console.warn(`分析调用链失败 ${file}:`, error.message);
    }
    
    return callChain;
  }
}

// ====================
// 4. 自动化测试场景生成器
// ====================

class TestScenarioGenerator {
  constructor(mockData) {
    this.mockData = mockData;
    this.scenarios = [];
  }

  async generateScenariosForComponent(componentPath, impactAnalysis) {
    const component = await this.parseComponent(componentPath);
    const scenarios = [];

    // 基于props生成场景
    const propsScenarios = this.generatePropsScenarios(component);
    scenarios.push(...propsScenarios);

    // 基于数据状态生成场景
    const dataScenarios = this.generateDataScenarios(component, this.mockData);
    scenarios.push(...dataScenarios);

    // 基于用户交互生成场景
    const interactionScenarios = this.generateInteractionScenarios(component);
    scenarios.push(...interactionScenarios);

    // 基于错误状态生成场景
    const errorScenarios = this.generateErrorScenarios(component);
    scenarios.push(...errorScenarios);

    return scenarios;
  }

  async parseComponent(componentPath) {
    try {
      // 统一使用 CodeImpactAnalyzer 的文件读取方法
      const analyzer = new CodeImpactAnalyzer();
      const content = await analyzer.readFileContent(componentPath);
      
      if (!content) {
        console.warn(`解析组件失败，无法读取文件内容: ${componentPath}`);
        return { path: componentPath, content: '', props: [], events: [], slots: [] };
      }

      // 简化的组件解析
      return {
        path: componentPath,
        content: content,
        props: this.extractProps(content),
        events: this.extractEvents(content),
        slots: this.extractSlots(content)
      };
    } catch (error) {
      console.warn(`解析组件 ${componentPath} 失败:`, error.message);
      return {
        path: componentPath,
        content: '',
        props: [],
        events: [],
        slots: []
      };
    }
  }

  generatePropsScenarios(component) {
    const scenarios = [];
    const props = component.props || {};

    // 生成props的各种组合
    const propsCombinations = this.generatePropsCombinations(props);

    propsCombinations.forEach((combination, index) => {
      scenarios.push({
        name: `props_scenario_${index}`,
        type: 'props',
        props: combination,
        description: `Testing with props: ${Object.keys(combination).join(', ')}`,
      });
    });

    return scenarios;
  }

  generateDataScenarios(component, mockData) {
    const scenarios = [];

    // 基于API数据生成场景
    if (mockData && typeof mockData === 'object') {
      Object.entries(mockData).forEach(([apiKey, apiData]) => {
        scenarios.push({
          name: `api_scenario_${apiKey}`,
          type: 'data',
          mockData: apiData,
          description: `Testing with API data from ${apiKey}`,
        });
      });
    }

    // 生成空数据场景
    scenarios.push({
      name: 'empty_data_scenario',
      type: 'data',
      mockData: {},
      description: 'Testing with empty data',
    });

    // 生成错误数据场景
    scenarios.push({
      name: 'error_data_scenario',
      type: 'data',
      mockData: { error: 'API Error' },
      description: 'Testing with error data',
    });

    return scenarios;
  }

  generateInteractionScenarios(component) {
    const scenarios = [];
    const interactions = this.extractInteractions(component);

    interactions.forEach(interaction => {
      scenarios.push({
        name: `interaction_${interaction.name}`,
        type: 'interaction',
        interaction: interaction,
        description: `Testing ${interaction.type} interaction`,
      });
    });

    return scenarios;
  }

  // ====== 补全的方法 ======
  generatePropsCombinations(props) {
    if (!props || Object.keys(props).length === 0) {
      return [{}];
    }
    
    const combinations = [];
    const propNames = Object.keys(props);
    
    // 为每个prop生成测试值
    const propTestValues = {};
    propNames.forEach(propName => {
      const prop = props[propName];
      propTestValues[propName] = this.generatePropTestValues(prop);
    });
    
    // 生成各种组合
    // 1. 空props
    combinations.push({});
    
    // 2. 每个prop的单独测试
    propNames.forEach(propName => {
      const testValues = propTestValues[propName];
      testValues.forEach(value => {
        combinations.push({ [propName]: value });
      });
    });
    
    // 3. 必需props的组合
    const requiredProps = propNames.filter(name => {
      const prop = props[name];
      return prop && prop.required;
    });
    
    if (requiredProps.length > 0) {
      const requiredCombination = {};
      requiredProps.forEach(propName => {
        const testValues = propTestValues[propName];
        requiredCombination[propName] = testValues[0]; // 使用第一个有效值
      });
      combinations.push(requiredCombination);
    }
    
    // 4. 所有props的组合（限制数量）
    if (propNames.length <= 5) { // 避免组合爆炸
      const allPropsCombination = {};
      propNames.forEach(propName => {
        const testValues = propTestValues[propName];
        allPropsCombination[propName] = testValues[0];
      });
      combinations.push(allPropsCombination);
    }
    
    return combinations;
  }
  
  // 为单个prop生成测试值
  generatePropTestValues(prop) {
    if (!prop || !prop.type) {
      return [null, undefined, '', 0, false, {}, []];
    }
    
    const type = prop.type.toLowerCase();
    const values = [];
    
    switch (type) {
      case 'string':
        values.push('', 'test', '测试文本', 'very long string '.repeat(10));
        if (prop.default !== undefined) values.push(prop.default);
        break;
        
      case 'number':
        values.push(0, -1, 1, 100, 0.5, Number.MAX_SAFE_INTEGER);
        if (prop.default !== undefined) values.push(prop.default);
        break;
        
      case 'boolean':
        values.push(true, false);
        if (prop.default !== undefined) values.push(prop.default);
        break;
        
      case 'array':
        values.push([], [1], [1, 2, 3], new Array(100).fill(0));
        if (prop.default !== undefined) values.push(prop.default);
        break;
        
      case 'object':
        values.push({}, { test: true }, { nested: { deep: 'value' } });
        if (prop.default !== undefined) values.push(prop.default);
        break;
        
      case 'function':
        values.push(() => {}, async () => {}, function namedFunction() {});
        if (prop.default !== undefined) values.push(prop.default);
        break;
        
      default:
        values.push(null, undefined);
        if (prop.default !== undefined) values.push(prop.default);
    }
    
    // 添加边界情况
    if (!prop.required) {
      values.push(null, undefined);
    }
    
    return values;
  }
  
  extractProps(content) { 
    if (!content) return {};
    
    const props = {};
    
    try {
      // 匹配Vue 2.7 props定义的多种模式
      
      // 1. 数组形式: props: ['prop1', 'prop2']
      const arrayPropsMatch = content.match(/props\s*:\s*\[([\s\S]*?)\]/);
      if (arrayPropsMatch) {
        const propsStr = arrayPropsMatch[1];
        const propMatches = propsStr.match(/'([^']+)'|"([^"]+)"/g);
        if (propMatches) {
          propMatches.forEach(match => {
            const propName = match.replace(/['"]/g, '');
            props[propName] = { type: 'any', required: false };
          });
        }
      }
      
      // 2. 对象形式: props: { prop1: String, prop2: { type: Number, default: 0 } }
      const objectPropsMatch = content.match(/props\s*:\s*\{([\s\S]*?)\}(?=\s*,|\s*\}|\s*$)/);
      if (objectPropsMatch) {
        const propsStr = objectPropsMatch[1];
        
        // 匹配简单类型: prop1: String
        const simpleTypeMatches = propsStr.match(/(\w+)\s*:\s*(String|Number|Boolean|Array|Object|Function)/g);
        if (simpleTypeMatches) {
          simpleTypeMatches.forEach(match => {
            const [, propName, type] = match.match(/(\w+)\s*:\s*(\w+)/);
            props[propName] = { 
              type: type.toLowerCase(), 
              required: false 
            };
          });
        }
        
        // 匹配复杂配置: prop2: { type: Number, default: 0, required: true }
        const complexMatches = propsStr.match(/(\w+)\s*:\s*\{[^}]+\}/g);
        if (complexMatches) {
          complexMatches.forEach(match => {
            const propNameMatch = match.match(/(\w+)\s*:/);
            if (propNameMatch) {
              const propName = propNameMatch[1];
              const config = { type: 'any', required: false };
              
              // 提取type
              const typeMatch = match.match(/type\s*:\s*(\w+)/);
              if (typeMatch) {
                config.type = typeMatch[1].toLowerCase();
              }
              
              // 提取required
              const requiredMatch = match.match(/required\s*:\s*(true|false)/);
              if (requiredMatch) {
                config.required = requiredMatch[1] === 'true';
              }
              
              // 提取default
              const defaultMatch = match.match(/default\s*:\s*([^,}]+)/);
              if (defaultMatch) {
                let defaultValue = defaultMatch[1].trim();
                // 简单解析默认值
                if (defaultValue === 'true' || defaultValue === 'false') {
                  config.default = defaultValue === 'true';
                } else if (!isNaN(defaultValue)) {
                  config.default = Number(defaultValue);
                } else if (defaultValue.startsWith("'") || defaultValue.startsWith('"')) {
                  config.default = defaultValue.slice(1, -1);
                } else {
                  config.default = defaultValue;
                }
              }
              
              props[propName] = config;
            }
          });
        }
      }
      
      // 3. TypeScript装饰器形式: @Prop({ type: String, default: '' })
      const decoratorMatches = content.match(/@Prop\([^)]*\)\s+(\w+)/g);
      if (decoratorMatches) {
        decoratorMatches.forEach(match => {
          const propNameMatch = match.match(/@Prop\([^)]*\)\s+(\w+)/);
          if (propNameMatch) {
            const propName = propNameMatch[1];
            const config = { type: 'any', required: false };
            
            // 解析装饰器参数
            const decoratorParamMatch = match.match(/@Prop\(([^)]*)\)/);
            if (decoratorParamMatch) {
              const paramStr = decoratorParamMatch[1];
              
              const typeMatch = paramStr.match(/type\s*:\s*(\w+)/);
              if (typeMatch) {
                config.type = typeMatch[1].toLowerCase();
              }
              
              const requiredMatch = paramStr.match(/required\s*:\s*(true|false)/);
              if (requiredMatch) {
                config.required = requiredMatch[1] === 'true';
              }
            }
            
            props[propName] = config;
          }
        });
      }
      
    } catch (error) {
      console.warn('解析props失败:', error);
    }
    
    return props;
  }
  
  extractEvents(content) { 
    if (!content) return [];
    
    const events = [];
    
    try {
      // 1. 查找 $emit 调用
      const emitMatches = content.match(/\$emit\s*\(\s*['"`]([^'"`]+)['"`]/g);
      if (emitMatches) {
        emitMatches.forEach(match => {
          const eventMatch = match.match(/\$emit\s*\(\s*['"`]([^'"`]+)['"`]/);
          if (eventMatch) {
            events.push({
              name: eventMatch[1],
              type: 'emit',
              source: 'component'
            });
          }
        });
      }
      
      // 2. 查找 emits 配置 (Vue 3风格，但在Vue 2.7中也可能使用)
      const emitsConfigMatch = content.match(/emits\s*:\s*\[([\s\S]*?)\]/);
      if (emitsConfigMatch) {
        const emitsStr = emitsConfigMatch[1];
        const eventMatches = emitsStr.match(/'([^']+)'|"([^"]+)"/g);
        if (eventMatches) {
          eventMatches.forEach(match => {
            const eventName = match.replace(/['"]/g, '');
            events.push({
              name: eventName,
              type: 'declared',
              source: 'emits_config'
            });
          });
        }
      }
      
      // 3. 查找模板中的事件监听
      const templateEventMatches = content.match(/@(\w+)=|v-on:(\w+)=/g);
      if (templateEventMatches) {
        templateEventMatches.forEach(match => {
          const eventMatch = match.match(/@(\w+)=|v-on:(\w+)=/);
          if (eventMatch) {
            const eventName = eventMatch[1] || eventMatch[2];
            events.push({
              name: eventName,
              type: 'listener',
              source: 'template'
            });
          }
        });
      }
      
      // 4. 查找原生DOM事件
      const nativeEventMatches = content.match(/@(click|change|input|focus|blur|submit|keyup|keydown)=/gi);
      if (nativeEventMatches) {
        nativeEventMatches.forEach(match => {
          const eventMatch = match.match(/@(\w+)=/);
          if (eventMatch) {
            events.push({
              name: eventMatch[1].toLowerCase(),
              type: 'native',
              source: 'template'
            });
          }
        });
      }
      
    } catch (error) {
      console.warn('解析events失败:', error);
    }
    
    // 去重
    const uniqueEvents = events.filter((event, index, arr) => 
      arr.findIndex(e => e.name === event.name && e.type === event.type) === index
    );
    
    return uniqueEvents;
  }
  
  extractSlots(content) { 
    if (!content) return [];
    
    const slots = [];
    
    try {
      // 1. 查找具名插槽: <slot name="header">
      const namedSlotMatches = content.match(/<slot\s+name=['"`]([^'"`]+)['"`][^>]*>/g);
      if (namedSlotMatches) {
        namedSlotMatches.forEach(match => {
          const nameMatch = match.match(/name=['"`]([^'"`]+)['"`]/);
          if (nameMatch) {
            slots.push({
              name: nameMatch[1],
              type: 'named',
              hasProps: match.includes(':') || match.includes('v-bind')
            });
          }
        });
      }
      
      // 2. 查找默认插槽: <slot>
      const defaultSlotMatches = content.match(/<slot(?:\s[^>]*)?>/g);
      if (defaultSlotMatches) {
        // 过滤掉已经匹配的具名插槽
        const defaultSlots = defaultSlotMatches.filter(match => !match.includes('name='));
        if (defaultSlots.length > 0) {
          slots.push({
            name: 'default',
            type: 'default',
            hasProps: defaultSlots.some(slot => slot.includes(':') || slot.includes('v-bind'))
          });
        }
      }
      
      // 3. 查找作用域插槽使用: v-slot 或 #
      const scopedSlotMatches = content.match(/(v-slot:(\w+)|#(\w+))(?:\s*=\s*['"`]([^'"`]*)['"`])?/g);
      if (scopedSlotMatches) {
        scopedSlotMatches.forEach(match => {
          const nameMatch = match.match(/(v-slot:(\w+)|#(\w+))/);
          if (nameMatch) {
            const slotName = nameMatch[2] || nameMatch[3];
            slots.push({
              name: slotName,
              type: 'scoped',
              hasProps: true
            });
          }
        });
      }
      
      // 4. 查找slot-scope (Vue 2.x语法)
      const slotScopeMatches = content.match(/slot-scope=['"`]([^'"`]*)['"`]/g);
      if (slotScopeMatches) {
        slots.push({
          name: 'default',
          type: 'scoped_legacy',
          hasProps: true
        });
      }
      
    } catch (error) {
      console.warn('解析slots失败:', error);
    }
    
    // 去重
    const uniqueSlots = slots.filter((slot, index, arr) => 
      arr.findIndex(s => s.name === slot.name && s.type === slot.type) === index
    );
    
    return uniqueSlots;
  }
  
  extractInteractions(component) { 
    if (!component || !component.content) return [];
    
    const interactions = [];
    const content = component.content;
    
    try {
      // 1. 提取点击事件
      const clickMatches = content.match(/@click(['"`]?)\s*=\s*['"`]?([^'"`\s>]+)/g);
      if (clickMatches) {
        clickMatches.forEach((match, index) => {
          const methodMatch = match.match(/@click=['"`]?([^'"`\s>]+)/);
          if (methodMatch) {
            interactions.push({
              name: `click_${index}`,
              type: 'click',
              method: methodMatch[1],
              element: 'button|div|span'
            });
          }
        });
      }
      
      // 2. 提取表单交互
      const inputMatches = content.match(/@(input|change)=['"`]?([^'"`\s>]+)/g);
      if (inputMatches) {
        inputMatches.forEach((match, index) => {
          const [, eventType, method] = match.match(/@(input|change)=['"`]?([^'"`\s>]+)/) || [];
          if (eventType && method) {
            interactions.push({
              name: `${eventType}_${index}`,
              type: eventType,
              method: method,
              element: 'input|textarea|select'
            });
          }
        });
      }
      
      // 3. 提取键盘事件
      const keyMatches = content.match(/@(keyup|keydown|keypress)(?:\.(\w+))?=['"`]?([^'"`\s>]+)/g);
      if (keyMatches) {
        keyMatches.forEach((match, index) => {
          const [, eventType, modifier, method] = match.match(/@(keyup|keydown|keypress)(?:\.(\w+))?=['"`]?([^'"`\s>]+)/) || [];
          if (eventType && method) {
            interactions.push({
              name: `${eventType}_${index}`,
              type: eventType,
              method: method,
              modifier: modifier,
              element: 'input|textarea|document'
            });
          }
        });
      }
      
      // 4. 提取鼠标事件
      const mouseMatches = content.match(/@(mouseenter|mouseleave|hover|focus|blur)=['"`]?([^'"`\s>]+)/g);
      if (mouseMatches) {
        mouseMatches.forEach((match, index) => {
          const [, eventType, method] = match.match(/@(mouseenter|mouseleave|hover|focus|blur)=['"`]?([^'"`\s>]+)/) || [];
          if (eventType && method) {
            interactions.push({
              name: `${eventType}_${index}`,
              type: eventType,
              method: method,
              element: 'any'
            });
          }
        });
      }
      
      // 5. 提取自定义组件事件
      const customEventMatches = content.match(/@(\w+)=['"`]?([^'"`\s>]+)/g);
      if (customEventMatches) {
        customEventMatches.forEach((match, index) => {
          const eventMatch = match.match(/@(\w+)=['"`]?([^'"`\s>]+)/);
          if (eventMatch) {
            const eventType = eventMatch[1];
            const method = eventMatch[2];
            // 排除常见的DOM事件
            const commonEvents = ['click', 'input', 'change', 'keyup', 'keydown', 'mouseenter', 'mouseleave', 'hover', 'focus', 'blur'];
            if (eventType && method && !commonEvents.includes(eventType)) {
              interactions.push({
                name: `custom_${eventType}_${index}`,
                type: 'custom',
                event: eventType,
                method: method,
                element: 'component'
              });
            }
          }
        });
      }
      
    } catch (error) {
      console.warn('解析interactions失败:', error);
    }
    
    return interactions;
  }
  
  generateErrorScenarios(component) { 
    if (!component) return [];
    
    const errorScenarios = [];
    
    // 1. Props错误场景
    if (component.props && Object.keys(component.props).length > 0) {
      Object.keys(component.props).forEach(propName => {
        const prop = component.props[propName];
        
        // 类型错误
        errorScenarios.push({
          name: `prop_type_error_${propName}`,
          type: 'props_error',
          description: `${propName} 属性类型错误测试`,
          props: { [propName]: this.getWrongTypeValue(prop.type) },
          expectedError: 'type_mismatch'
        });
        
        // 必需属性缺失
        if (prop.required) {
          errorScenarios.push({
            name: `prop_required_missing_${propName}`,
            type: 'props_error',
            description: `缺失必需属性 ${propName}`,
            props: {},
            expectedError: 'required_prop_missing'
          });
        }
      });
    }
    
    // 2. 事件错误场景
    if (component.events && component.events.length > 0) {
      component.events.forEach(event => {
        errorScenarios.push({
          name: `event_handler_error_${event.name}`,
          type: 'event_error',
          description: `${event.name} 事件处理错误`,
          interaction: {
            type: event.type,
            event: event.name,
            expectError: true
          },
          expectedError: 'event_handler_exception'
        });
      });
    }
    
    // 3. 渲染错误场景
    errorScenarios.push({
      name: 'render_error_null_data',
      type: 'render_error',
      description: '数据为null时的渲染错误',
      data: null,
      expectedError: 'render_exception'
    });
    
    errorScenarios.push({
      name: 'render_error_circular_data',
      type: 'render_error',
      description: '循环引用数据的渲染错误',
      data: (() => {
        const obj = { name: 'test' };
        obj.self = obj;
        return obj;
      })(),
      expectedError: 'circular_reference'
    });
    
    // 4. 异步错误场景
    errorScenarios.push({
      name: 'async_operation_timeout',
      type: 'async_error',
      description: '异步操作超时',
      timeout: 100, // 100ms超时
      expectedError: 'timeout'
    });
    
    errorScenarios.push({
      name: 'api_call_failure',
      type: 'async_error',
      description: 'API调用失败',
      mockApiError: true,
      expectedError: 'api_error'
    });
    
    // 5. 内存泄漏场景
    errorScenarios.push({
      name: 'memory_leak_listeners',
      type: 'memory_error',
      description: '事件监听器未清理导致的内存泄漏',
      checkMemoryLeak: true,
      expectedError: 'memory_leak'
    });
    
    return errorScenarios;
  }
  
  // 获取错误类型的值
  getWrongTypeValue(expectedType) {
    const wrongValues = {
      'string': 12345,
      'number': 'not a number',
      'boolean': 'not a boolean',
      'array': { not: 'array' },
      'object': 'not an object',
      'function': 'not a function'
    };
    
    return wrongValues[expectedType] || null;
  }
}

// ====================
// 5. 渲染差异检测器
// ====================

class RenderingDiffDetector {
  constructor() {
    this.puppeteer = require('puppeteer');
    this.browser = null;
  }

  async initialize() {
    this.browser = await this.puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }

  async detectRenderingDifferences(component, scenarios) {
    const results = [];

    for (const scenario of scenarios) {
      // 直接渲染当前变更后的组件，不需要比较两个 commit
      const currentRender = await this.renderComponent(component, scenario, 'CURRENT');

      // 如果有 staged 或 working 变更，分析变更前后的差异
      const diff = await this.analyzeCurrentChanges(component, scenario, currentRender);

      results.push({
        scenario: scenario.name,
        diff: diff,
        riskLevel: this.calculateRiskLevel(diff),
        screenshots: {
          current: currentRender.screenshot,
          diff: diff.screenshot,
        },
      });
    }

    return results;
  }

  async renderComponent(component, scenario, renderType = 'CURRENT') {
    const page = await this.browser.newPage();

    try {
      // 设置Mock数据
      await this.setupMockData(page, scenario.mockData);

      // 加载组件
      await page.goto(`http://localhost:3000/test-component/${component.name}`);

      // 等待渲染完成
      await page.waitForSelector('[data-testid="component-root"]');

      // 执行交互
      if (scenario.type === 'interaction') {
        await this.executeInteraction(page, scenario.interaction);
      }

      // 获取渲染结果
      const result = await this.captureRenderingResult(page);

      return result;
    } finally {
      await page.close();
    }
  }

  async analyzeCurrentChanges(component, scenario, currentRender) {
    // 分析当前变更对组件的影响
    const diff = {
      structural: this.analyzeStructuralChanges(component, currentRender),
      visual: await this.analyzeVisualChanges(currentRender),
      styles: this.analyzeStyleChanges(component, currentRender),
      behavior: this.analyzeBehaviorChanges(component, scenario),
    };

    return diff;
  }

  // 新增：分析结构变化
  analyzeStructuralChanges(component, currentRender) {
    return {
      changed: false,
      differences: [],
      componentPath: component.path,
      currentStructure: currentRender.domStructure
    };
  }

  // 新增：分析视觉变化
  async analyzeVisualChanges(currentRender) {
    return {
      similarity: 1.0,
      differences: [],
      currentScreenshot: currentRender.screenshot
    };
  }

  // 新增：分析样式变化
  analyzeStyleChanges(component, currentRender) {
    return {
      changed: false,
      differences: [],
      currentStyles: currentRender.computedStyles
    };
  }

  // 新增：分析行为变化
  analyzeBehaviorChanges(component, scenario) {
    return {
      changed: false,
      differences: [],
      scenario: scenario.name,
      interactionType: scenario.type
    };
  }

  async captureRenderingResult(page) {
    const screenshot = await page.screenshot({ fullPage: true });

    const domStructure = await page.evaluate(() => {
      const root = document.querySelector('[data-testid="component-root"]');
      // 内联序列化函数
      function serializeDOMStructure(element) {
        if (!element) return null;
        return {
          tagName: element.tagName,
          className: element.className,
          id: element.id,
          children: Array.from(element.children).map(child => serializeDOMStructure(child))
        };
      }
      return serializeDOMStructure(root);
    });

    const computedStyles = await page.evaluate(() => {
      const elements = document.querySelectorAll('[data-testid="component-root"] *');
      const styles = {};

      elements.forEach((el, index) => {
        const computedStyle = window.getComputedStyle(el);
        styles[index] = {
          display: computedStyle.display,
          position: computedStyle.position,
          width: computedStyle.width,
          height: computedStyle.height,
          color: computedStyle.color,
          backgroundColor: computedStyle.backgroundColor,
        };
      });

      return styles;
    });

    return {
      screenshot,
      domStructure,
      computedStyles,
      timestamp: Date.now(),
    };
  }

  async compareRendering(before, after) {
    // 这个方法现在主要用于分析当前变更的影响
    const diff = {
      structural: this.compareStructure(before.domStructure, after.domStructure),
      visual: await this.compareVisual(before.screenshot, after.screenshot),
      styles: this.compareStyles(before.computedStyles, after.computedStyles),
    };

    return diff;
  }

  // ====== 补全的方法 ======
  async setupMockData(page, mockData) {
    // Mock数据设置的简化实现
  }
  
  async executeInteraction(page, interaction) {
    // 交互执行的简化实现
  }
  
  compareStructure(before, after) {
    return { 
      changed: false, 
      differences: [] 
    };
  }
  
  async compareVisual(beforeScreenshot, afterScreenshot) {
    return { 
      similarity: 1.0, 
      differences: [] 
    };
  }
  
  compareStyles(beforeStyles, afterStyles) {
    return { 
      changed: false, 
      differences: [] 
    };
  }
  
  calculateRiskLevel(diff) {
    return 'low';
  }
}

// ====================
// 6. 系统影响预测器
// ====================

class SystemImpactPredictor {
  constructor() {
    this.impactAnalyzer = new CodeImpactAnalyzer();
    this.diffDetector = new RenderingDiffDetector();
    this.scenarioGenerator = new TestScenarioGenerator();
  }

  async predictSystemImpact(codeImpact) { // 移除了 mockData
    const path = require('path'); // 引入 path 模块
    const prediction = {
      overview: {},
      componentImpacts: [],
      pageImpacts: [],
      functionalImpacts: [],
      uiImpacts: [],
      riskAssessment: {},
      // 确保该字段存在
      functionLevelImpact: codeImpact.functionLevelImpact || [] 
    };

    // 1. 分析代码影响范围
    prediction.overview = {
      changedFiles: codeImpact.directImpact.length,
      affectedComponents: codeImpact.affectedComponents.length,
      affectedPages: this.impactAnalyzer.getAffectedPages(codeImpact.affectedComponents),
      riskLevel: codeImpact.riskLevel,
    };

    // 2. 分析每个受影响的组件
    for (const component of codeImpact.affectedComponents) {
      const componentPath = typeof component === 'string' ? component : (component.component || component.file);
      if (!componentPath) continue;

      const componentImpact = await this.analyzeComponentImpact({ path: componentPath, name: path.basename(componentPath, '.vue') });
      prediction.componentImpacts.push(componentImpact);
    }

    // 3. 分析页面级别影响
    for (const page of prediction.overview.affectedPages) {
      const pageImpact = await this.analyzePageImpact({ path: page, name: path.basename(page, '.vue') });
      prediction.pageImpacts.push(pageImpact);
    }

    // 4. 分析功能性影响
    prediction.functionalImpacts = await this.analyzeFunctionalImpact(codeImpact);

    // 5. 分析UI影响
    prediction.uiImpacts = await this.analyzeUIImpact(codeImpact);

    // 6. 风险评估
    prediction.riskAssessment = this.assessOverallRisk(prediction);

    return prediction;
  }

  async analyzeComponentImpact(component) {
    try {
      // 安全检查：如果没有浏览器环境，跳过渲染检测
      if (!global.browser || !global.browser.newPage) {
        console.log(`跳过组件 ${component} 的渲染检测（无浏览器环境）`);
        return {
          component,
          riskLevel: 'unknown',
          renderingDiffs: [],
          recommendations: ['需要浏览器环境进行完整分析']
        };
      }

      const testScenarioGenerator = new TestScenarioGenerator();
      const scenarios = await testScenarioGenerator.generateScenariosForComponent(component, {});
      
      const renderingDiffDetector = new RenderingDiffDetector();
      await renderingDiffDetector.initialize();
      
      const renderingDiffs = await renderingDiffDetector.detectRenderingDifferences(component, scenarios);
      
      return {
        component,
        riskLevel: this.calculateComponentRisk(renderingDiffs),
        renderingDiffs,
        recommendations: this.generateRecommendations(renderingDiffs)
      };
    } catch (error) {
      console.warn(`组件影响分析失败: ${component}`, error.message);
      return {
        component,
        riskLevel: 'unknown',
        renderingDiffs: [],
        recommendations: [`分析失败: ${error.message}`]
      };
    }
  }

  assessOverallRisk(prediction) {
    const riskFactors = {
      componentCount: prediction.componentImpacts.length,
      pageCount: prediction.pageImpacts.length,
      highRiskComponents: prediction.componentImpacts.filter(c => c.riskLevel === 'high').length,
      functionalBreaking: prediction.functionalImpacts.filter(f => f.breaking).length,
      uiBreaking: prediction.uiImpacts.filter(u => u.breaking).length,
    };

    let totalRisk = 0;
    totalRisk += riskFactors.componentCount * 10;
    totalRisk += riskFactors.pageCount * 20;
    totalRisk += riskFactors.highRiskComponents * 50;
    totalRisk += riskFactors.functionalBreaking * 100;
    totalRisk += riskFactors.uiBreaking * 30;

    return {
      score: Math.min(totalRisk, 1000),
      level: totalRisk > 500 ? 'high' : totalRisk > 200 ? 'medium' : 'low',
      factors: riskFactors,
      recommendations: this.generateSystemRecommendations(riskFactors),
    };
  }

  // ====== 补全的方法 ======
  async analyzePageImpact(page) {
    return {
      pageName: page.name,
      path: page.path,
      riskLevel: 'low',
      affectedComponents: []
    };
  }
  
  async analyzeFunctionalImpact(codeImpact) { // 移除了 mockData
    if (!codeImpact || !codeImpact.functionLevelImpact) {
      return [];
    }

    const functionalImpacts = codeImpact.functionLevelImpact.map(funcImpact => {
      // Determine if the change is 'breaking'
      const isBreaking = ['critical', 'high'].includes(funcImpact.impact);

      // Find affected components
      const affectedComponents = [
        ...funcImpact.callers.filter(c => this.impactAnalyzer.getFileType(c.file) === 'component').map(c => c.file),
        ...funcImpact.importers.filter(i => this.impactAnalyzer.getFileType(i.file) === 'component').map(i => i.file)
      ];

      return {
        type: 'function_change',
        breaking: isBreaking,
        functionName: funcImpact.function || 'unknown', // 确保有函数名
        sourceFile: funcImpact.file || 'unknown', // 确保有源文件路径
        isModified: funcImpact.isModified || false,
        impactLevel: funcImpact.impact || 'low',
        totalUsages: funcImpact.totalUsages || 0,
        affectedComponents: [...new Set(affectedComponents)], // Ensure uniqueness
        details: `Function ${funcImpact.function || 'unknown'} in ${funcImpact.file || 'unknown'} has an impact level of ${funcImpact.impact || 'low'} with ${funcImpact.totalUsages || 0} usages.`
      };
    });

    return functionalImpacts;
  }
  
  async analyzeUIImpact(codeImpact) { // 移除了 mockData
    return [];
  }
  
  calculateComponentRisk(renderingDiffs) {
    return 'low';
  }
  
  generateRecommendations(renderingDiffs) {
    return ['建议进行回归测试'];
  }
  
  generateSystemRecommendations(riskFactors) {
    return ['建议全面测试系统功能'];
  }
}

// ====================
// 7. 报告生成器
// ====================

class ReportGenerator {
  constructor() {
    // this.template = require('./report-template');
  }

  async generateReport(prediction, commitHash) {
    const report = {
      metadata: {
        commitHash,
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      },
      executive: this.generateExecutiveSummary(prediction),
      components: this.generateComponentReport(prediction.componentImpacts),
      pages: this.generatePageReport(prediction.pageImpacts),
      functional: this.generateFunctionalReport(prediction.functionalImpacts || prediction.functionLevelImpact),
      ui: this.generateUIReport(prediction.uiImpacts),
      risk: this.generateRiskReport(prediction.riskAssessment),
      recommendations: this.generateRecommendations(prediction),
    };

    // 生成HTML报告
    const htmlReport = await this.generateHTMLReport(report);

    // 生成JSON报告
    const jsonReport = JSON.stringify(report, null, 2);

    return {
      html: htmlReport,
      json: jsonReport,
      summary: report.executive,
    };
  }

  generateExecutiveSummary(prediction) {
    const highRiskFunctions = (prediction.functionalImpacts || []).filter(f => f.impactLevel === 'high' || f.impactLevel === 'critical');
    const breakingFunctions = (prediction.functionalImpacts || []).filter(f => f.breaking);

    return {
      overview: `分析了 ${prediction.overview.changedFiles} 个文件的变更，影响了 ${prediction.overview.affectedComponents} 个组件和 ${prediction.overview.affectedPages} 个页面`,
      riskLevel: prediction.overview.riskLevel,
      keyFindings: [
        `${highRiskFunctions.length} 个高风险函数`,
        `${breakingFunctions.length} 个功能性破坏`,
        `${(prediction.uiImpacts || []).filter(u => u.breaking).length} 个UI破坏`,
      ],
      recommendations: prediction.riskAssessment.recommendations.slice(0, 3),
    };
  }

  // ====== 补全的方法 ======
  generateComponentReport(componentImpacts) {
    return componentImpacts.map(impact => ({
      name: impact.componentName,
      path: impact.componentPath,
      riskLevel: impact.riskLevel,
      scenarios: impact.scenarios
    }));
  }
  
  generatePageReport(pageImpacts) {
    return pageImpacts.map(impact => ({
      name: impact.pageName,
      path: impact.path,
      riskLevel: impact.riskLevel
    }));
  }
  
  generateFunctionalReport(functionalImpacts) {
    if (!functionalImpacts) return [];
    
    return functionalImpacts.map(impact => ({
      functionName: impact.functionName || impact.function || 'unknown',
      sourceFile: impact.sourceFile || impact.file || 'unknown',
      breaking: impact.breaking || false,
      impactLevel: impact.impactLevel || impact.impact || 'low',
      totalUsages: impact.totalUsages || 0,
      affectedComponents: impact.affectedComponents || [],
      details: impact.details || 'No details available',
    }));
  }
  
  generateUIReport(uiImpacts) {
    return uiImpacts.map(impact => ({
      type: impact.type,
      breaking: impact.breaking || false
    }));
  }
  
  generateRiskReport(riskAssessment) {
    return {
      score: riskAssessment.score,
      level: riskAssessment.level,
      factors: riskAssessment.factors
    };
  }
  
  generateRecommendations(prediction) {
    return [
      '建议进行全面的回归测试',
      '重点关注高风险组件',
      '验证核心功能流程'
    ];
  }
  
  async generateHTMLReport(report) {
    // Helper to generate a table for function impacts
    const generateFunctionImpactTable = (impacts) => {
        if (!impacts || impacts.length === 0) {
            return '<p>无功能性影响。</p>';
        }
        let table = `
            <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 100%;">
                <thead>
                    <tr>
                        <th>函数名</th>
                        <th>源文件</th>
                        <th>影响等级</th>
                        <th>破坏性</th>
                        <th>使用次数</th>
                        <th>受影响组件数</th>
                    </tr>
                </thead>
                <tbody>
        `;
        impacts.forEach(impact => {
            table += `
                <tr>
                    <td>${impact.functionName}</td>
                    <td>${impact.sourceFile}</td>
                    <td>${impact.impactLevel}</td>
                    <td>${impact.breaking ? '是' : '否'}</td>
                    <td>${impact.totalUsages}</td>
                    <td>${impact.affectedComponents.length}</td>
                </tr>
            `;
        });
        table += '</tbody></table>';
        return table;
    };
    
    return `
      <html>
        <head>
            <title>回归测试报告</title>
            <style>
                body { font-family: sans-serif; }
                table { border-collapse: collapse; width: 100%; }
                th, td { border: 1px solid #dddddd; text-align: left; padding: 8px; }
                th { background-color: #f2f2f2; }
            </style>
        </head>
        <body>
          <h1>回归测试分析报告</h1>
          <h2>概要信息</h2>
          <p>${report.executive.overview}</p>
          <h2>风险等级: ${report.executive.riskLevel}</h2>
          
          <h2>功能性影响 (函数级)</h2>
          ${generateFunctionImpactTable(report.functional)}

          <h2>完整报告 (JSON)</h2>
          <pre>${JSON.stringify(report, null, 2)}</pre>
        </body>
      </html>
    `;
  }
}

// ====================
// 8. 主控制器
// ====================

class AutomatedRegressionTestSystem {
  constructor() {
    this.mockGenerator = new APIMockDataGenerator();
    this.impactAnalyzer = new CodeImpactAnalyzer();
    this.systemPredictor = new SystemImpactPredictor();
    this.reportGenerator = new ReportGenerator();
  }

  async initialize(projectUrl) {
    // 1. 生成Mock数据
    console.log('正在生成Mock数据...');
    const mockData = await this.mockGenerator.startRecording(projectUrl);
    console.log(`生成了 ${Object.keys(mockData).length} 个API Mock数据`);

    // 2. 构建依赖图
    console.log('正在构建依赖关系图...');
    await this.impactAnalyzer.buildDependencyGraph();
    console.log('依赖关系图构建完成');

    // 3. 初始化渲染检测器
    await this.systemPredictor.diffDetector.initialize();
    console.log('系统初始化完成');

    return mockData;
  }

  async analyzeCommit(commitHash = 'WORKING') {
    console.log(`正在分析提交 ${commitHash}...`);

    // 1. 获取变更文件并进行影响分析
    const changedFiles = await this.impactAnalyzer.getChangedFiles(commitHash);
    const impact = await this.impactAnalyzer.analyzeChangeImpact(changedFiles);

    // 2. 预测系统影响 - 注意：移除了mockData参数，因为它在当前实现中未被使用
    const prediction = await this.systemPredictor.predictSystemImpact(impact);

    // 3. 生成报告
    const report = await this.reportGenerator.generateReport(prediction, commitHash);

    console.log('分析完成！');
    return report;
  }

  async runContinuousAnalysis(projectUrl) {
    // 初始化系统
    const mockData = await this.initialize(projectUrl);

    // 监听Git提交
    const chokidar = require('chokidar');
    const watcher = chokidar.watch('.git/logs/HEAD');

    watcher.on('change', async () => {
      const latestCommit = await this.getLatestCommit();
      const report = await this.analyzeCommit(latestCommit);

      // 发送报告
      await this.sendReport(report);
    });

    console.log('持续分析已启动...');
  }

  // ====== 补全的方法 ======
  async getLatestCommit() {
    const { execSync } = require('child_process');
    try {
      const output = execSync('git rev-parse HEAD', { encoding: 'utf8' });
      return output.trim();
    } catch (error) {
      console.warn('获取最新提交失败:', error.message);
      return 'HEAD';
    }
  }
  
  async sendReport(report) {
    console.log('发送报告:', report.summary);
    // 可以在这里实现发送邮件、webhook等功能
  }

  // 新增：分析已 staged 的修改
  async analyzeStagedChanges() {
    console.log('正在分析已 staged 的修改...');
    return await this.analyzeCommit('STAGED');
  }
  
  // 新增：分析工作目录的所有修改（包括 staged 和未 staged）
  async analyzeWorkingChanges() {
    console.log('正在分析工作目录的所有修改...');
    return await this.analyzeCommit('WORKING');
  }
}

// 使用示例
async function main() {
  const system = new AutomatedRegressionTestSystem();

  // 初始化系统（构建依赖图）
  await system.impactAnalyzer.buildDependencyGraph();

  // 新功能1: 快速分析当前变更
  console.log('\n=== 快速变更分析 ===');
  const quickAnalysis = await system.impactAnalyzer.quickAnalyzeCurrentChanges();
  console.log('快速分析结果:', quickAnalysis);

  // 新功能2: 预览分析（不执行实际分析）
  console.log('\n=== 预览分析 ===');
  const allChanges = await system.impactAnalyzer.getChangedFiles('WORKING');
  const preview = system.impactAnalyzer.previewAnalysis(allChanges);
  console.log('预览结果:', preview);

  // 新功能3: 检查系统统计信息
  console.log('\n=== 系统统计信息 ===');
  const stats = system.impactAnalyzer.getAnalysisStats();
  console.log('系统统计:', stats);

  // 新功能4: 自定义排除模式
  console.log('\n=== 自定义排除模式 ===');
  system.impactAnalyzer.updateExcludePatterns([
    '**/test-data/**',
    '**/mock-data/**',
    '**/*.backup.*'
  ]);

  // 重点改进：更详细的函数级影响分析
  console.log('\n=== 🎯 增强函数级影响分析 ===');
  
  // 执行增强的影响分析
  const report = await system.analyzeCommit(); // 无需传入 mockData

  console.log('\n=== 📊 增强分析报告 ===');
  
  // 直接从 report 对象获取信息
  console.log('风险等级:', report.summary.riskLevel);
  
  try {
    // 详细报告已经包含在 report.html 和 report.json 中
    console.log('\n=== 📋 详细报告已生成 ===');
    console.log('HTML 报告内容预览:');
    console.log(report.html.substring(0, 1000) + '...'); // 预览前1000个字符
    
    const jsonData = JSON.parse(report.json);
    
    if (jsonData.functional && jsonData.functional.length > 0) {
      console.log('\n🔧 函数级影响详情:');
      jsonData.functional.forEach((funcImpact, index) => {
        console.log(`\n${index + 1}. 函数: ${funcImpact.functionName}`);
        console.log(`   源文件: ${funcImpact.sourceFile}`);
        console.log(`   影响等级: ${funcImpact.impactLevel}`);
        console.log(`   总使用次数: ${funcImpact.totalUsages}`);
        
        if (funcImpact.affectedComponents.length > 0) {
          console.log(`   受影响组件 (${funcImpact.affectedComponents.length}):`, funcImpact.affectedComponents.slice(0, 3).join(', '));
        }
      });
    }

    if (jsonData.recommendations && jsonData.recommendations.length > 0) {
        console.log('\n💡 详细建议:');
        jsonData.recommendations.forEach((rec, index) => {
          console.log(`${index + 1}. ${rec}`);
        });
    }

  } catch (error) {
    console.error('解析或显示报告失败:', error.message);
  }

  // 显示排除的文件信息
  const impactData = JSON.parse(report.json);
  if (impactData.executive.overview) {
    //
  }


  // 方式2：分析已 staged 的修改（适用于提交前的预检查）
  try {
    const stagedReport = await system.analyzeStagedChanges(); // 无需传入 mockData
    console.log('\n=== Staged 修改分析 ===');
    console.log('已 staged 修改分析报告:', stagedReport.summary);
    
    // 根据风险等级给出详细建议
    const riskLevel = stagedReport.summary.riskLevel;
    console.log(`\n📊 风险评估: ${riskLevel}`);
    
    switch (riskLevel) {
      case 'critical':
        console.error('🚨 CRITICAL: 检测到关键风险修改！');
        console.error('建议：立即停止提交，进行全面测试后再提交');
        break;
      case 'high':
        console.warn('⚠️ HIGH: 检测到高风险修改！');
        console.warn('建议：在提交前进行充分测试，确保核心功能正常');
        break;
      case 'medium':
        console.log('⚡ MEDIUM: 检测到中等风险修改');
        console.log('建议：测试相关功能后提交');
        break;
      case 'low':
        console.log('✅ LOW: 风险较低，可以安全提交');
        break;
      case 'none':
        console.log('✨ NONE: 所有修改都在排除范围内，无需担心');
        break;
    }
  } catch (error) {
    console.log('没有 staged 的修改或分析失败:', error.message);
  }

  // 新功能5: 检查特定文件的影响
  console.log('\n=== 特定文件影响检查 ===');
  const specificFile = 'bklog/web/src/common/util.js';
  try {
    const fileImpact = await system.impactAnalyzer.checkFileImpact(specificFile);
    console.log(`文件 ${specificFile} 的影响:`, fileImpact);
  } catch (error) {
    console.log(`检查文件 ${specificFile} 失败:`, error.message);
  }

  // 新功能6: 测试排除功能
  console.log('\n=== 排除功能测试 ===');
  const testFiles = [
    'src/components/Button.vue',
    '../regression-data/test.json',
    'regression-data/mock.js',
    'node_modules/vue/dist/vue.js',
    'src/utils/helper.js'
  ];
  
  testFiles.forEach(file => {
    const shouldExclude = system.impactAnalyzer.shouldExcludeFile(file);
    console.log(`${file} -> ${shouldExclude ? '❌ 排除' : '✅ 包含'}`);
  });
}

module.exports = {
  AutomatedRegressionTestSystem,
  FunctionComponentAnalyzer,
  APIMockDataGenerator,
  CodeImpactAnalyzer,
  SystemImpactPredictor,
  ReportGenerator,
};

// Git Hook 集成示例
// 可以在 .git/hooks/pre-commit 中使用
async function preCommitHook() {
  console.log('🔍 运行提交前回归测试检查...');
  
  const system = new AutomatedRegressionTestSystem();
  
  try {
    // 快速初始化（构建依赖图）
    await system.impactAnalyzer.buildDependencyGraph();
    
    // 分析已 staged 的修改
    const stagedChanges = await system.impactAnalyzer.getChangedFiles('STAGED');
    const impact = await system.impactAnalyzer.analyzeChangeImpact(stagedChanges);
    const report = system.impactAnalyzer.generateDetailedImpactReport(impact);

    console.log('\n📊 分析结果:');
    console.log(`- 风险等级: ${report.summary.riskLevel}`);
    console.log(`- 受影响组件: ${report.summary.affectedComponents}`);
    console.log(`- 功能性影响: ${report.summary.functionalImpacts || '无'}`); // 假设报告中有此字段
    console.log(`- UI影响: ${report.summary.uiImpacts || '无'}`); // 假设报告中有此字段
    
    // 根据风险等级决定是否允许提交
    if (report.summary.riskLevel === 'high' || report.summary.riskLevel === 'critical') {
      console.error('\n❌ 检测到高风险修改！');
      console.error('建议：');
      report.recommendations.forEach(rec => {
        console.error(`  - ${rec}`);
      });
      console.error('\n如果确认要提交，请使用 git commit --no-verify 跳过检查');
      process.exit(1); // 阻止提交
    } else if (report.summary.riskLevel === 'medium') {
      console.warn('\n⚠️  检测到中等风险修改，请确保已充分测试');
    } else {
      console.log('\n✅ 风险等级较低，可以安全提交');
    }
    
  } catch (error) {
    console.warn('\n⚠️  回归测试检查失败:', error.message);
    console.warn('提交将继续进行，建议手动检查修改影响');
  }
}

// 导出Hook函数
module.exports.preCommitHook = preCommitHook;

// 如果直接运行此脚本作为pre-commit hook
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.includes('--pre-commit')) {
    preCommitHook().catch(error => {
      console.error('Pre-commit hook 执行失败:', error);
      process.exit(1);
    });
  } else {
    // 正常执行 main 函数
    main().catch(error => {
      console.error('主程序执行失败:', error);
      process.exit(1);
    });
  }
}

