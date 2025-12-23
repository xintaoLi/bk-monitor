/**
 * MCP E2E 本地测试配置
 * 专门针对 bklog 日志检索 v3 版本的自动化测试配置
 */

module.exports = {
    // 项目基本信息
    projectName: 'bklog-web',
    framework: 'vue', // Vue 2 + TSX

    // 测试范围配置
    scope: {
        // 只扫描 v3 版本，忽略 v1
        include: [
            'src/views/retrieve-v3/**/*.tsx',
            'src/views/retrieve-v3/**/*.ts',
            'src/views/retrieve-helper.tsx',
            'src/components/**/*.tsx',
            'src/components/**/*.vue',
        ],
        // 明确排除 v1 版本和测试文件
        exclude: [
            'src/views/retrieve/index.vue',
            'src/views/retrieve/container.tsx',
            'src/views/retrieve-v2/**/*',
            'tests/**/*',
            'node_modules/**/*',
            '**/*.spec.ts',
            '**/*.test.ts',
        ],
    },

    // 开发服务器配置
    devServer: {
        url: process.env.MCP_DEV_SERVER_URL || 'http://appdev.woa.com:8001/#/retrieve/627861?addition=%5B%5D&keyword=&bizId=2005000002&spaceUid=bkcc__2005000002&pid=%5B%22%23%22%5D&search_mode=ui',
        startCommand: 'npm run dev',
        readyWhen: 'Webpack compiled', // 等待开发服务器就绪的标志
    },

    // 浏览器配置
    browser: {
        headless: false, // 本地测试建议设为 false，可以看到测试过程
        slowMo: 100,     // 放慢操作速度，便于观察
        viewport: {
            width: 1920,
            height: 1080,
        },
        defaultTimeout: 30000,
    },

    // Selector 优先级策略
    selectorPriority: [
        'data-testid',
        'data-test',
        'aria-label',
        'class', // 降级使用 BK UI 组件的 class
    ],

    // 组件级测试配置
    componentTests: {
        enabled: true,
        tests: [
            {
                name: 'bk-space-choice',
                description: '业务切换组件功能测试',
                component: 'BkSpaceChoice',
                testFile: 'tests/mcp/flows/bk-space-choice.flow.js',
            },
            {
                name: 'index-set-choice',
                description: '索引选择组件功能测试',
                component: 'IndexSetChoice',
                testFile: 'tests/mcp/flows/index-set-choice.flow.js',
            },
            {
                name: 'search-bar',
                description: '检索框组件功能测试',
                component: 'V3Searchbar',
                testFile: 'tests/mcp/flows/search-bar.flow.js',
            },
        ],
    },

    // 日志检索 v3 主流程定义
    mainFlows: [
        {
            name: 'retrieve-v3-main-flow',
            description: '日志检索 v3 版本主流程测试',
            steps: [
                {
                    type: 'navigation',
                    description: '访问检索页面',
                    route: '/retrieve',
                    query: { spaceUid: '__test__' },
                },
                {
                    type: 'wait',
                    description: '等待页面加载完成',
                    selector: '.v3-bklog-root',
                    timeout: 10000,
                },
                {
                    type: 'search',
                    description: '输入搜索关键词',
                    selector: '[data-testid="search-input"]',
                    value: 'error',
                },
                {
                    type: 'click',
                    description: '点击搜索按钮',
                    selector: '[data-testid="search-btn"]',
                },
                {
                    type: 'wait',
                    description: '等待搜索结果',
                    selector: '[data-testid="search-result"]',
                    timeout: 15000,
                },
            ],
        },
        {
            name: 'retrieve-v3-toolbar',
            description: '工具栏功能测试',
            steps: [
                {
                    type: 'click',
                    description: '打开收藏夹',
                    selector: '[data-testid="favorite-toggle"]',
                },
                {
                    type: 'click',
                    description: '打开字段设置',
                    selector: '[data-testid="field-setting-toggle"]',
                },
            ],
        },
        {
            name: 'retrieve-v3-ai-assistant',
            description: 'AI 助手功能测试',
            steps: [
                {
                    type: 'click',
                    description: '打开 AI 助手',
                    selector: '[data-testid="ai-assistant-toggle"]',
                },
                {
                    type: 'wait',
                    description: '等待 AI 助手加载',
                    selector: '[data-testid="ai-assistant-panel"]',
                },
            ],
        },
    ],

    // 组件映射规则
    componentMapping: {
        // 将 Vue 组件名映射到具体路由
        'RetrieveV3': '/retrieve',
        'V3Searchbar': '/retrieve',
        'V3SearchResult': '/retrieve',
        'V3Toolbar': '/retrieve',
        'V3Collection': '/retrieve',
    },

    // 测试报告配置
    report: {
        outputDir: 'tests/mcp/reports',
        format: ['json', 'html'],
        screenshotOnFailure: true,
        videoOnFailure: false, // 本地测试可以关闭视频录制
    },

    // CodeBuddy 集成配置
    codebuddy: {
        enabled: true,
        autoPromoteThreshold: 5, // 成功运行 5 次后自动提升
        watchPatterns: [
            'src/views/retrieve-v3/**/*.tsx',
            'src/views/retrieve-v3/**/*.ts',
        ],
    },

    // AST 分析配置
    ast: {
        tsConfigPath: './tsconfig.json',
        // 组件依赖分析配置
        dependencyAnalysis: {
            maxDepth: 3, // 最大依赖深度
            ignoreExternal: true, // 忽略 node_modules
        },
    },

    // 本地开发专用配置
    dev: {
        // 使用本地 mcp-cli 源码
        useLocalCli: true,
        localCliPath: './packages/mcp-cli',
        // 自动重新生成测试
        autoRegenerate: true,
        // 监听文件变更
        watchMode: true,
    },
};
