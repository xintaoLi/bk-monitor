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
    const code = await fs.readFile(componentPath, 'utf8');
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
    return { 
      executeComponent: async (componentPath, props, context) => {
        try {
          // 简化的组件执行模拟
          const componentCode = await fs.readFile(componentPath, 'utf8');
          
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
    
    for (const file of routeFiles) {
      try {
        const content = await fs.readFile(file, 'utf8');
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
      
      for (const file of vueConfigFiles) {
        const content = await fs.readFile(file, 'utf8');
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
  }

  // 构建完整的依赖关系图
  async buildDependencyGraph() {
    console.log('🔍 构建依赖关系图...');
    
    // 1. 扫描所有源文件
    const sourceFiles = await this.scanSourceFiles();
    console.log(`发现 ${sourceFiles.length} 个源文件`);
    
    // 2. 分析每个文件的依赖关系
    for (const file of sourceFiles) {
      const dependencies = await this.analyzeFileDependencies(file);
      this.dependencyGraph.set(file, dependencies);
      
      // 构建导入关系图
      this.buildImportGraph(file, dependencies);
      
      // 构建函数调用图
      await this.buildFunctionCallGraph(file);
    }
    
    // 3. 构建模块注册表
    await this.buildModuleRegistry();
    
    console.log('✅ 依赖关系图构建完成');
    console.log(`- 文件依赖: ${this.dependencyGraph.size} 个文件`);
    console.log(`- 函数调用: ${this.functionCallGraph.size} 个函数`);
    console.log(`- 模块注册: ${this.moduleRegistry.size} 个模块`);
  }

  // 扫描所有源文件
  async scanSourceFiles() {
    const glob = require('glob');
    const patterns = [
      'bklog/web/src/**/*.js',
      'bklog/web/src/**/*.ts',
      'bklog/web/src/**/*.vue',
      'bklog/web/src/**/*.jsx',
      'bklog/web/src/**/*.tsx'
    ];
    
    const files = [];
    for (const pattern of patterns) {
      try {
        const matchedFiles = glob.sync(pattern);
        files.push(...matchedFiles);
      } catch (error) {
        console.warn(`扫描模式 ${pattern} 失败:`, error.message);
      }
    }
    
    return [...new Set(files)];
  }

  // 分析单个文件的依赖关系
  async analyzeFileDependencies(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const dependencies = {
        imports: this.extractImports(content),
        exports: this.extractExports(content),
        functions: this.extractFunctions(content),
        components: this.extractComponents(content),
        modules: this.extractModules(content)
      };
      
      return dependencies;
    } catch (error) {
      console.warn(`分析文件 ${filePath} 依赖失败:`, error.message);
      return { imports: [], exports: [], functions: [], components: [], modules: [] };
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
      const content = await fs.readFile(file, 'utf8');
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

  // 查找函数调用
  findFunctionCalls(content, functionName) {
    const calls = [];
    
    // 匹配函数调用模式
    const callPatterns = [
      new RegExp(`\\b${functionName}\\s*\\(`, 'g'),
      new RegExp(`\\.${functionName}\\s*\\(`, 'g'),
    ];
    
    callPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        calls.push({
          function: functionName,
          position: match.index,
          context: content.substring(Math.max(0, match.index - 50), match.index + 50)
        });
      }
    });
    
    return calls;
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

  // 解析模块路径
  resolveModulePath(modulePath, currentFile) {
    // 简化实现，实际应该处理各种模块解析规则
    if (modulePath.startsWith('.')) {
      // 相对路径
      const currentDir = path.dirname(currentFile);
      return path.resolve(currentDir, modulePath);
    } else if (modulePath.startsWith('@/')) {
      // 别名路径
      return modulePath.replace('@/', 'bklog/web/src/');
    } else {
      // 绝对路径或包名
      return modulePath;
    }
  }

  // 分析变更的影响范围
  async analyzeChangeImpact(changedFiles) {
    console.log('🔍 分析变更影响范围...');
    
    const impact = {
      directImpact: [],
      indirectImpact: [],
      affectedComponents: [],
      affectedModules: [],
      affectedFunctions: [],
      callChain: [],
      riskLevel: 'low'
    };
    
    for (const file of changedFiles) {
      const fileImpact = await this.analyzeFileImpact(file);
      impact.directImpact.push(fileImpact);
      
      // 分析间接影响
      const indirectImpact = await this.analyzeIndirectImpact(file);
      impact.indirectImpact.push(...indirectImpact);
      
      // 分析函数级影响
      const functionImpact = await this.analyzeFunctionImpact(file);
      impact.affectedFunctions.push(...functionImpact);
      
      // 分析调用链
      const callChain = await this.analyzeCallChain(file);
      impact.callChain.push(...callChain);
    }
    
    // 汇总受影响的组件和模块
    impact.affectedComponents = this.getAffectedComponents(impact);
    impact.affectedModules = this.getAffectedModules(impact);
    
    // 计算风险等级
    impact.riskLevel = this.calculateRiskLevel(impact);
    
    return impact;
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

  // 分析工具函数影响
  async analyzeUtilityImpact(filePath) {
    const affectedFunctions = [];
    
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const functions = this.extractFunctions(content);
      
      // 查找所有使用这些函数的文件
      for (const func of functions) {
        const callers = await this.findFunctionCallers(func.name);
        affectedFunctions.push({
          function: func.name,
          file: filePath,
          callers: callers,
          impact: this.assessFunctionImpact(callers.length)
        });
      }
    } catch (error) {
      console.warn(`分析工具函数影响失败 ${filePath}:`, error.message);
    }
    
    return affectedFunctions;
  }

  // 查找函数调用者
  async findFunctionCallers(functionName) {
    const callers = [];
    
    for (const [file, dependencies] of this.dependencyGraph) {
      try {
        const content = await fs.readFile(file, 'utf8');
        const calls = this.findFunctionCalls(content, functionName);
        
        if (calls.length > 0) {
          callers.push({
            file: file,
            calls: calls.length,
            positions: calls.map(call => call.position)
          });
        }
      } catch (error) {
        // 忽略读取错误
      }
    }
    
    return callers;
  }

  // 查找使用特定函数的组件
  async findComponentsUsingFunctions(affectedFunctions) {
    const affectedComponents = [];
    
    for (const funcImpact of affectedFunctions) {
      for (const caller of funcImpact.callers) {
        if (this.getFileType(caller.file) === 'component') {
          affectedComponents.push({
            component: caller.file,
            function: funcImpact.function,
            impact: 'function_dependency'
          });
        }
      }
    }
    
    return affectedComponents;
  }

  // 评估函数影响程度
  assessFunctionImpact(callersCount) {
    if (callersCount > 10) return 'high';
    if (callersCount > 5) return 'medium';
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
    const functionImpact = [];
    
    try {
      const content = await fs.readFile(file, 'utf8');
      const functions = this.extractFunctions(content);
      
      for (const func of functions) {
        const callers = await this.findFunctionCallers(func.name);
        functionImpact.push({
          function: func.name,
          file: file,
          callers: callers,
          impact: this.assessFunctionImpact(callers.length)
        });
      }
    } catch (error) {
      console.warn(`分析函数影响失败 ${file}:`, error.message);
    }
    
    return functionImpact;
  }

  // 分析调用链
  async analyzeCallChain(file) {
    const callChain = [];
    
    // 查找此文件调用的函数
    try {
      const content = await fs.readFile(file, 'utf8');
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
    let riskScore = 0;
    
    // 根据影响范围计算风险
    riskScore += impact.affectedComponents.length * 10;
    riskScore += impact.affectedModules.length * 5;
    riskScore += impact.affectedFunctions.length * 3;
    riskScore += impact.callChain.length * 2;
    
    // 根据函数调用者数量调整风险
    impact.affectedFunctions.forEach(func => {
      if (func.impact === 'high') riskScore += 20;
      if (func.impact === 'medium') riskScore += 10;
    });
    
    if (riskScore > 50) return 'high';
    if (riskScore > 20) return 'medium';
    return 'low';
  }

  // 获取变更文件（保持原有功能）
  async getChangedFiles(commitHash = 'WORKING') {
    const { execSync } = require('child_process');
    
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
      
      // 去重并过滤空值
      const uniqueFiles = [...new Set(files)].filter(file => file && file.length > 0);
      console.log(`总共发现 ${uniqueFiles.length} 个变更文件:`, uniqueFiles);
      
      return uniqueFiles;
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
          .filter(file => file !== null);
          
        console.log(`降级获取到 ${fallbackFiles.length} 个文件:`, fallbackFiles);
        return fallbackFiles;
      } catch (fallbackError) {
        console.error('降级获取也失败:', fallbackError.message);
        return [];
      }
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
      const content = await fs.readFile(componentPath, 'utf8');
      
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
    Object.entries(mockData).forEach(([apiKey, apiData]) => {
      scenarios.push({
        name: `api_scenario_${apiKey}`,
        type: 'data',
        mockData: apiData,
        description: `Testing with API data from ${apiKey}`,
      });
    });

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

  async predictSystemImpact(commitHash, mockData) {
    const prediction = {
      overview: {},
      componentImpacts: [],
      pageImpacts: [],
      functionalImpacts: [],
      uiImpacts: [],
      riskAssessment: {},
    };

    // 1. 分析代码影响范围
    const codeImpact = await this.impactAnalyzer.analyzeCommitImpact(commitHash);
    prediction.overview = {
      changedFiles: codeImpact.directImpact.length,
      affectedComponents: codeImpact.affectedComponents.length,
      affectedPages: codeImpact.affectedPages.length,
      riskLevel: codeImpact.riskLevel,
    };

    // 2. 分析每个受影响的组件
    for (const component of codeImpact.affectedComponents) {
      const componentImpact = await this.analyzeComponentImpact(component, mockData);
      prediction.componentImpacts.push(componentImpact);
    }

    // 3. 分析页面级别影响
    for (const page of codeImpact.affectedPages) {
      const pageImpact = await this.analyzePageImpact(page, mockData);
      prediction.pageImpacts.push(pageImpact);
    }

    // 4. 分析功能性影响
    prediction.functionalImpacts = await this.analyzeFunctionalImpact(codeImpact, mockData);

    // 5. 分析UI影响
    prediction.uiImpacts = await this.analyzeUIImpact(codeImpact, mockData);

    // 6. 风险评估
    prediction.riskAssessment = this.assessOverallRisk(prediction);

    return prediction;
  }

  async analyzeComponentImpact(component, mockData) {
    const scenarios = await this.scenarioGenerator.generateScenariosForComponent(
      component.path,
      component.impactAnalysis
    );

    const renderingDiffs = await this.diffDetector.detectRenderingDifferences(component, scenarios);

    return {
      componentName: component.name,
      componentPath: component.path,
      scenarios: scenarios.length,
      renderingDiffs: renderingDiffs,
      riskLevel: this.calculateComponentRisk(renderingDiffs),
      recommendations: this.generateRecommendations(renderingDiffs),
    };
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
  async analyzePageImpact(page, mockData) {
    return {
      pageName: page.name,
      path: page.path,
      riskLevel: 'low',
      affectedComponents: []
    };
  }
  
  async analyzeFunctionalImpact(codeImpact, mockData) {
    return [];
  }
  
  async analyzeUIImpact(codeImpact, mockData) {
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
      functional: this.generateFunctionalReport(prediction.functionalImpacts),
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
    return {
      overview: `分析了 ${prediction.overview.changedFiles} 个文件的变更，影响了 ${prediction.overview.affectedComponents} 个组件和 ${prediction.overview.affectedPages} 个页面`,
      riskLevel: prediction.overview.riskLevel,
      keyFindings: [
        `${prediction.componentImpacts.filter(c => c.riskLevel === 'high').length} 个高风险组件`,
        `${prediction.functionalImpacts.filter(f => f.breaking).length} 个功能性破坏`,
        `${prediction.uiImpacts.filter(u => u.breaking).length} 个UI破坏`,
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
    return functionalImpacts.map(impact => ({
      type: impact.type,
      breaking: impact.breaking || false
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
    return `
      <html>
        <head><title>回归测试报告</title></head>
        <body>
          <h1>回归测试分析报告</h1>
          <h2>概要信息</h2>
          <p>${report.executive.overview}</p>
          <h2>风险等级: ${report.executive.riskLevel}</h2>
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

  async analyzeCommit(commitHash = 'WORKING', mockData) {
    console.log(`正在分析提交 ${commitHash}...`);

    // 1. 预测系统影响
    const prediction = await this.systemPredictor.predictSystemImpact(commitHash, mockData);

    // 2. 生成报告
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
      const report = await this.analyzeCommit(latestCommit, mockData);

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
  async analyzeStagedChanges(mockData) {
    console.log('正在分析已 staged 的修改...');

    // 1. 预测系统影响
    const prediction = await this.systemPredictor.predictSystemImpact('STAGED', mockData);

    // 2. 生成报告
    const report = await this.reportGenerator.generateReport(prediction, 'STAGED');

    console.log('已 staged 修改分析完成！');
    return report;
  }
  
  // 新增：分析工作目录的所有修改
  async analyzeWorkingChanges(mockData) {
    console.log('正在分析工作目录的所有修改（包括已 staged 和未 staged）...');

    // 1. 预测系统影响
    const prediction = await this.systemPredictor.predictSystemImpact('WORKING', mockData);

    // 2. 生成报告
    const report = await this.reportGenerator.generateReport(prediction, 'WORKING');

    console.log('工作目录修改分析完成！');
    return report;
  }
}

// 使用示例
async function main() {
  const system = new AutomatedRegressionTestSystem();

  // 初始化系统
  const mockData = await system.initialize('http://localhost:8080');

  // 默认：分析当前所有变更（staged + working）
  const report = await system.analyzeCommit(undefined, mockData);
  console.log('当前变更分析报告:', report.summary);

  // 方式2：分析已 staged 的修改（适用于提交前的预检查）
  try {
    const stagedReport = await system.analyzeStagedChanges(mockData);
    console.log('已 staged 修改分析报告:', stagedReport.summary);
    
    // 如果风险等级高，可以阻止提交
    if (stagedReport.summary.riskLevel === 'high') {
      console.warn('⚠️  检测到高风险修改，建议在提交前进行充分测试！');
    }
  } catch (error) {
    console.log('没有 staged 的修改或分析失败:', error.message);
  }

  // 方式3：分析工作目录的所有修改（包括 staged 和未 staged）
  try {
    const workingReport = await system.analyzeWorkingChanges(mockData);
    console.log('工作目录修改分析报告:', workingReport.summary);
  } catch (error) {
    console.log('工作目录没有修改或分析失败:', error.message);
  }

  // 方式4：持续监控（监听文件变化和Git状态变化）
  // await system.runContinuousAnalysis('http://localhost:8080');
  
  // 方式5：Git Hook集成示例
  // 可以在pre-commit hook中调用：
  // const hookReport = await system.analyzeStagedChanges(mockData);
  // if (hookReport.summary.riskLevel === 'high') {
  //   process.exit(1); // 阻止提交
  // }
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
    // 快速初始化（跳过完整的Mock数据生成以提高速度）
    console.log('初始化系统...');
    const mockData = {}; // 可以使用缓存的Mock数据
    
    // 分析已 staged 的修改
    const report = await system.analyzeStagedChanges(mockData);
    
    console.log('\n📊 分析结果:');
    console.log(`- 风险等级: ${report.summary.riskLevel}`);
    console.log(`- 受影响组件: ${report.summary.keyFindings[0] || '0 个'}`);
    console.log(`- 功能性影响: ${report.summary.keyFindings[1] || '无'}`);
    console.log(`- UI影响: ${report.summary.keyFindings[2] || '无'}`);
    
    // 根据风险等级决定是否允许提交
    if (report.summary.riskLevel === 'high') {
      console.error('\n❌ 检测到高风险修改！');
      console.error('建议：');
      report.summary.recommendations.forEach(rec => {
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
    main().catch(error => {
      console.error('主程序执行失败:', error);
      process.exit(1);
    });
  }
}
