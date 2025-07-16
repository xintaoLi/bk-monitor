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

    traverse(ast, {
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
}

// ====================
// 2. API Mock数据生成器
// ====================

class APIMockDataGenerator {
  constructor() {
    this.recordedRequests = new Map();
    this.mockData = {};
  }

  // 启动API请求录制
  async startRecording(projectUrl) {
    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // 拦截所有网络请求
    await page.setRequestInterception(true);

    page.on('request', request => {
      this.recordRequest(request);
      request.continue();
    });

    page.on('response', response => {
      this.recordResponse(response);
    });

    // 遍历应用的所有页面
    const routes = await this.discoverRoutes(projectUrl);

    for (const route of routes) {
      await page.goto(`${projectUrl}${route}`);
      await page.waitForLoadState('networkidle');

      // 触发交互以捕获更多API调用
      await this.simulateUserInteractions(page);
    }

    await browser.close();
    return this.generateMockData();
  }

  recordRequest(request) {
    const key = `${request.method()}_${request.url()}`;
    this.recordedRequests.set(key, {
      method: request.method(),
      url: request.url(),
      headers: request.headers(),
      body: request.postData(),
      timestamp: Date.now(),
    });
  }

  async recordResponse(response) {
    const key = `${response.request().method()}_${response.url()}`;
    const request = this.recordedRequests.get(key);

    if (request) {
      request.response = {
        status: response.status(),
        headers: response.headers(),
        body: await response.text(),
        timestamp: Date.now(),
      };
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
            body: request.body,
          },
          response: {
            status: request.response.status,
            headers: request.response.headers,
            body: this.parseResponseBody(request.response.body),
          },
        };
      }
    });

    return mockData;
  }

  // 创建Mock服务器
  createMockServer(mockData) {
    const express = require('express');
    const app = express();

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

  // 发现应用中的所有路由
  async discoverRoutes(projectUrl) {
    console.log('开始发现路由...');
    
    // 1. 从路由配置文件中提取路由
    const staticRoutes = ['']; //await this.extractStaticRoutes();
    
    // // 2. 从站点地图中发现路由
    // const sitemapRoutes = await this.extractSitemapRoutes(projectUrl);
    
    // // 3. 通过爬虫发现动态路由
    // const crawledRoutes = await this.crawlRoutes(projectUrl);
    
    // // 4. 从Vue Router配置中提取路由
    // const vueRoutes = await this.extractVueRoutes();
    
    // 合并所有路由
    const allRoutes = [
      ...staticRoutes,
      // ...sitemapRoutes,
      // ...crawledRoutes,
      // ...vueRoutes
    ];
    
    // 去重和过滤
    const uniqueRoutes = [...new Set(allRoutes)].filter(route => 
      !route.includes('javascript:') && 
      !route.includes('mailto:') &&
      !route.includes('#')
    );
    
    console.log(`发现了 ${uniqueRoutes.length} 个路由`);
    return uniqueRoutes;
  }

  // 1. 从静态路由配置文件中提取路由
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

  // 2. 从站点地图中发现路由
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

  // 3. 通过爬虫发现动态路由
  async crawlRoutes(projectUrl) {
    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch({ 
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
    
    await browser.close();
    return Array.from(discoveredRoutes);
  }

  // 4. 从Vue Router配置中提取路由
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
    const fs = require('fs').promises;
    const path = require('path');
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
    
    // 使用AST解析获得更准确的结果
    try {
      const babel = require('@babel/parser');
      const traverse = require('@babel/traverse').default;
      
      const ast = babel.parse(content, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript']
      });
      
      traverse(ast, {
        ObjectExpression(path) {
          const node = path.node;
          const pathProperty = node.properties.find(prop => 
            prop.key && prop.key.name === 'path'
          );
          
          if (pathProperty && pathProperty.value) {
            const routePath = pathProperty.value.value;
            if (routePath && typeof routePath === 'string') {
              // 处理动态路由参数
              const cleanPath = routePath.replace(/:[^/]+/g, '1');
              routes.push(cleanPath);
            }
          }
        }
      });
    } catch (error) {
      // 如果AST解析失败，使用正则表达式
      const pathRegex = /path:\s*['"`]([^'"`]+)['"`]/g;
      let match;
      
      while ((match = pathRegex.exec(content)) !== null) {
        const path = match[1];
        const cleanPath = path.replace(/:[^/]+/g, '1');
        routes.push(cleanPath);
      }
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

  // 模拟用户交互以捕获更多API调用
  async simulateUserInteractions(page) {
    try {
      // 滚动页面
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight / 2);
      });
      await page.waitForTimeout(500);
      
      // 点击可交互元素
      const interactiveElements = await page.$$('button, input, select, [role="button"], .btn');
      
      for (let i = 0; i < Math.min(interactiveElements.length, 10); i++) {
        try {
          await interactiveElements[i].click();
          await page.waitForTimeout(300);
        } catch (error) {
          // 忽略点击错误
        }
      }
      
      // 尝试触发hover事件
      const hoverElements = await page.$$('[data-hover], .dropdown, .menu');
      for (let i = 0; i < Math.min(hoverElements.length, 5); i++) {
        try {
          await hoverElements[i].hover();
          await page.waitForTimeout(300);
        } catch (error) {
          // 忽略hover错误
        }
      }
      
      // 填写表单
      const formInputs = await page.$$('input[type="text"], input[type="email"], textarea');
      for (let i = 0; i < Math.min(formInputs.length, 5); i++) {
        try {
          await formInputs[i].type('test');
          await page.waitForTimeout(200);
        } catch (error) {
          // 忽略输入错误
        }
      }
      
    } catch (error) {
      console.warn('模拟用户交互失败:', error.message);
    }
  }
}

// ====================
// 3. 代码影响范围分析器
// ====================

class CodeImpactAnalyzer {
  constructor() {
    this.dependencyGraph = new Map();
    this.componentRegistry = new Map();
  }

  async analyzeCommitImpact(commitHash) {
    // 获取变更文件
    const changedFiles = await this.getChangedFiles(commitHash);

    const impact = {
      directImpact: [],
      indirectImpact: [],
      affectedComponents: [],
      affectedPages: [],
      riskLevel: 'low',
    };

    for (const file of changedFiles) {
      const fileImpact = await this.analyzeFileImpact(file);
      impact.directImpact.push(fileImpact);

      // 分析间接影响
      const indirectImpact = await this.analyzeIndirectImpact(file);
      impact.indirectImpact.push(...indirectImpact);
    }

    // 汇总受影响的组件
    impact.affectedComponents = this.getAffectedComponents(impact);
    impact.affectedPages = this.getAffectedPages(impact.affectedComponents);
    impact.riskLevel = this.calculateRiskLevel(impact);

    return impact;
  }

  async analyzeFileImpact(filePath) {
    const fileType = this.getFileType(filePath);
    const impact = {
      filePath,
      type: fileType,
      changes: [],
      affectedComponents: [],
      severity: 'low',
    };

    switch (fileType) {
      case 'component':
        impact.affectedComponents = await this.analyzeComponentImpact(filePath);
        break;
      case 'utility':
        impact.affectedComponents = await this.analyzeUtilityImpact(filePath);
        break;
      case 'style':
        impact.affectedComponents = await this.analyzeStyleImpact(filePath);
        break;
      case 'route':
        impact.affectedComponents = await this.analyzeRouteImpact(filePath);
        break;
    }

    return impact;
  }

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

  buildDependencyGraph() {
    // 构建全局依赖关系图
    const graph = new Map();

    // 扫描所有组件文件
    const componentFiles = this.findAllComponents();

    componentFiles.forEach(file => {
      const dependencies = this.extractDependencies(file);
      graph.set(file, dependencies);
    });

    this.dependencyGraph = graph;
    return graph;
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

  async detectRenderingDifferences(component, scenarios, beforeCommit, afterCommit) {
    const results = [];

    for (const scenario of scenarios) {
      const beforeRender = await this.renderComponent(component, scenario, beforeCommit);
      const afterRender = await this.renderComponent(component, scenario, afterCommit);

      const diff = await this.compareRendering(beforeRender, afterRender);

      results.push({
        scenario: scenario.name,
        diff: diff,
        riskLevel: this.calculateRiskLevel(diff),
        screenshots: {
          before: beforeRender.screenshot,
          after: afterRender.screenshot,
          diff: diff.screenshot,
        },
      });
    }

    return results;
  }

  async renderComponent(component, scenario, commit) {
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

  async captureRenderingResult(page) {
    const screenshot = await page.screenshot({ fullPage: true });

    const domStructure = await page.evaluate(() => {
      const root = document.querySelector('[data-testid="component-root"]');
      return this.serializeDOMStructure(root);
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
    const diff = {
      structural: this.compareStructure(before.domStructure, after.domStructure),
      visual: await this.compareVisual(before.screenshot, after.screenshot),
      styles: this.compareStyles(before.computedStyles, after.computedStyles),
    };

    return diff;
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

    const renderingDiffs = await this.diffDetector.detectRenderingDifferences(component, scenarios, 'HEAD~1', 'HEAD');

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

  async analyzeCommit(commitHash, mockData) {
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
}

// 使用示例
async function main() {
  const system = new AutomatedRegressionTestSystem();

  // 方式1：分析单个提交
  const mockData = await system.initialize('http://localhost:8080');
  const report = await system.analyzeCommit('HEAD', mockData);
  console.log('报告生成完成:', report.summary);

  // 方式2：持续监控
  // await system.runContinuousAnalysis('http://localhost:8080');
}

module.exports = {
  AutomatedRegressionTestSystem,
  FunctionComponentAnalyzer,
  APIMockDataGenerator,
  CodeImpactAnalyzer,
  SystemImpactPredictor,
  ReportGenerator,
};
