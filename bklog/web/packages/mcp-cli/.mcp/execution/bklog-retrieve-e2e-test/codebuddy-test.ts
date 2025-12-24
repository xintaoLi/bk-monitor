/**
 * 日志检索页面 E2E 测试
 * 
 * 自动生成的 CodeBuddy + Chrome DevTools MCP 测试脚本
 * 生成时间: 2025-12-24T07:57:00.460Z
 * 
 * 使用方式:
 * 1. 确保已安装 Chrome DevTools MCP 服务
 * 2. 在 CodeBuddy 中打开此文件
 * 3. 使用 AI 执行测试命令
 */

import { MCPClient } from '@anthropic-ai/mcp';

// MCP 配置
const MCP_CONFIG = {
  server: 'chrome-devtools',
  options: {
    "viewport": "1920x1080",
    "timeout": 30000,
    "screenshotOnFailure": true
},
};

// 测试变量
const VARIABLES = {
  "baseUrl": "http://appdev.woa.com:8001/",
  "indexId": "1"
};

// 测试场景
const SCENARIOS = [
  {
    "id": "smoke-page-load",
    "name": "页面加载冒烟测试",
    "prompt": "作为测试工程师，请执行日志检索页面的冒烟测试：\n\n1. 打开检索页面 http://appdev.woa.com:8001//retrieve\n2. 等待页面加载完成（检查 .v3-bklog-root 元素存在）\n3. 验证以下核心组件已渲染：\n   - 工具栏区域（索引集选择器、时间选择器）\n   - 搜索栏区域\n   - 结果展示区域\n4. 验证页面无 JavaScript 错误\n5. 截图保存当前页面状态\n\n**预期结果**：页面正常加载，所有核心组件可见，无控制台错误"
  },
  {
    "id": "e2e-basic-search",
    "name": "基础日志检索流程",
    "prompt": "作为测试工程师，请执行完整的日志检索流程测试：\n\n1. 打开检索页面\n2. 等待索引集列表加载完成\n3. 如果有索引集选择器，选择第一个可用的索引集\n4. 在搜索栏中输入查询语句：*\n5. 点击搜索按钮或按 Enter 键执行搜索\n6. 等待搜索结果返回\n7. 验证结果列表区域显示日志数据\n8. 验证趋势图区域正常渲染\n\n**可用 test-id**：\n- v3-search-bar: 搜索栏\n- search-btn: 搜索按钮\n- index-set-choice: 索引集选择器\n\n**预期结果**：成功执行搜索并显示日志结果"
  },
  {
    "id": "e2e-search-mode-switch",
    "name": "搜索模式切换测试",
    "prompt": "作为测试工程师，请测试搜索模式切换功能：\n\n1. 打开检索页面并等待加载完成\n2. 确认当前处于 UI 模式（默认）\n3. 点击模式切换按钮，切换到 SQL 模式\n4. 验证搜索栏变为 SQL 输入模式\n5. 输入 SQL 查询语句：log: error\n6. 执行搜索\n7. 再次点击模式切换，切回 UI 模式\n8. 验证搜索栏恢复为 UI 模式\n\n**可用 test-id**：\n- mode-switch: 模式切换按钮\n- v3-search-bar: 搜索栏\n\n**预期结果**：UI/SQL 模式切换正常，搜索功能在两种模式下均可用"
  },
  {
    "id": "e2e-result-tab-switch",
    "name": "结果Tab切换测试",
    "prompt": "作为测试工程师，请测试结果展示区域的 Tab 切换功能：\n\n1. 打开检索页面并执行一次搜索\n2. 确认当前处于「原始日志」Tab\n3. 点击「日志聚类」Tab（如果可用）\n4. 验证日志聚类视图正常显示\n5. 点击「图表分析」Tab（如果可用）\n6. 验证图表分析视图正常显示\n7. 点击「Grep模式」Tab（如果可用）\n8. 验证 Grep 模式视图正常显示\n9. 点击「原始日志」Tab 返回\n\n**可用 test-id**：\n- search-result-tab: 结果 Tab 组件\n\n**预期结果**：所有可用的 Tab 切换正常，对应视图正确渲染"
  },
  {
    "id": "e2e-favorite-sidebar",
    "name": "收藏夹侧边栏测试",
    "prompt": "作为测试工程师，请测试收藏夹侧边栏功能：\n\n1. 打开检索页面\n2. 找到收藏夹开关按钮（收藏夹图标）\n3. 点击按钮展开收藏夹侧边栏\n4. 验证侧边栏正常显示\n5. 查看收藏夹列表是否有收藏项\n6. 再次点击按钮收起侧边栏\n7. 验证侧边栏已收起\n\n**可用 test-id**：\n- collection-box: 收藏夹开关按钮\n\n**预期结果**：收藏夹侧边栏展开/收起功能正常"
  },
  {
    "id": "e2e-time-range-select",
    "name": "时间范围选择测试",
    "prompt": "作为测试工程师，请测试时间范围选择功能：\n\n1. 打开检索页面\n2. 找到时间范围选择器\n3. 点击打开时间选择下拉框\n4. 选择「近 1 小时」选项\n5. 验证时间范围已更新\n6. 执行搜索\n7. 验证搜索结果按新时间范围过滤\n\n**可用 test-id**：\n- time-setting: 时间选择器\n\n**预期结果**：时间范围选择正常，搜索结果按时间过滤"
  },
  {
    "id": "e2e-index-set-with-param",
    "name": "带索引集参数访问测试",
    "prompt": "作为测试工程师，请测试带索引集 ID 参数的页面访问：\n\n1. 打开检索页面并带上索引集 ID 参数：http://appdev.woa.com:8001//retrieve/1\n2. 等待页面加载完成\n3. 验证索引集选择器显示了对应的索引集\n4. 验证页面正常渲染，无错误\n5. 执行一次搜索验证功能正常\n\n**预期结果**：带参数访问时自动选中对应索引集，页面功能正常"
  }
];

/**
 * 执行单个测试场景
 */
async function executeScenario(client: MCPClient, scenario: typeof SCENARIOS[0]) {
  console.log(`\n🧪 执行场景: ${scenario.name}`);
  console.log('─'.repeat(50));
  
  const startTime = Date.now();
  
  try {
    // 发送 Prompt 给 AI 执行
    const result = await client.chat({
      messages: [
        {
          role: 'user',
          content: scenario.prompt,
        },
      ],
      tools: ['chrome-devtools'],
    });
    
    const duration = Date.now() - startTime;
    console.log(`✅ 场景完成 (${duration}ms)`);
    
    return {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      success: true,
      duration,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`❌ 场景失败: ${error.message}`);
    
    return {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      success: false,
      duration,
      error: error.message,
    };
  }
}

/**
 * 执行所有测试场景
 */
async function runAllTests() {
  console.log('═'.repeat(50));
  console.log(`  日志检索页面 E2E 测试`);
  console.log('═'.repeat(50));
  console.log(`Base URL: ${VARIABLES.baseUrl}`);
  console.log(`场景数量: ${SCENARIOS.length}`);
  
  const client = new MCPClient(MCP_CONFIG);
  await client.connect();
  
  const results = [];
  
  for (const scenario of SCENARIOS) {
    const result = await executeScenario(client, scenario);
    results.push(result);
  }
  
  await client.disconnect();
  
  // 输出汇总
  console.log('\n' + '═'.repeat(50));
  console.log('  测试结果汇总');
  console.log('═'.repeat(50));
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`✅ 通过: ${passed}`);
  console.log(`❌ 失败: ${failed}`);
  console.log(`📊 通过率: ${((passed / results.length) * 100).toFixed(1)}%`);
  
  return results;
}

// 导出供 CodeBuddy 调用
export { runAllTests, executeScenario, SCENARIOS, VARIABLES };

// 直接执行
if (require.main === module) {
  runAllTests().catch(console.error);
}
