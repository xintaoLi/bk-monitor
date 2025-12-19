import path from 'path';
import fs from 'fs-extra';
import { Logger } from '../utils/log.js';
import { FlowWriter } from '../generator/flowWriter.js';
import { inferSelectors } from '../selectors/index.js';

export default async function generate(): Promise<void> {
  Logger.header('Generating MCP Test Flows');
  
  const projectRoot = process.cwd();
  const analysisPath = path.join(projectRoot, '.mcp', 'analysis.json');
  
  Logger.step(1, 3, 'Loading analysis results...');
  
  try {
    if (!await fs.pathExists(analysisPath)) {
      Logger.error('No analysis results found. Please run "npx mcp-e2e analyze" first.');
      process.exit(1);
    }
    
    const analysis = await fs.readJson(analysisPath);
    const { components } = analysis;
    
    if (!components || components.length === 0) {
      Logger.warn('No components found in analysis. Nothing to generate.');
      return;
    }
    
    Logger.info(`Found ${components.length} components to generate tests for`);
    
    Logger.step(2, 3, 'Generating test flows...');
    
    const flowWriter = new FlowWriter(projectRoot);
    await flowWriter.cleanGeneratedFlows();
    
    const generatedFlows = [];
    
    for (let i = 0; i < components.length; i++) {
      const component = components[i];
      Logger.progress(i + 1, components.length, `Generating ${component.componentName}...`);
      
      // 重新分析 selectors 以获取详细信息
      const fullPath = path.resolve(projectRoot, component.filePath);
      let detailedSelectors = [];
      
      try {
        if (await fs.pathExists(fullPath)) {
          detailedSelectors = inferSelectors(fullPath);
        }
      } catch (error) {
        Logger.debug(`Failed to re-analyze selectors for ${component.filePath}:`, error);
      }
      
      const flowConfig = {
        route: component.route || `/${component.componentName.toLowerCase()}`,
        componentName: component.componentName,
        selectors: detailedSelectors.length > 0 ? detailedSelectors : 
          component.selectors.map(s => ({ selector: s, priority: 1 }))
      };
      
      try {
        const generatedFlow = await flowWriter.writeFlow(flowConfig);
        generatedFlows.push(generatedFlow);
      } catch (error) {
        Logger.error(`Failed to generate flow for ${component.componentName}:`, error);
      }
    }
    
    Logger.step(3, 3, 'Creating flow index...');
    
    await flowWriter.generateFlowIndex();
    
    // 更新生成记录
    const generationRecord = {
      timestamp: new Date().toISOString(),
      generatedFlows: generatedFlows.map(flow => ({
        component: flow.componentName,
        file: path.relative(projectRoot, flow.filePath),
        route: flow.route,
        type: flow.type
      })),
      totalGenerated: generatedFlows.length
    };
    
    await fs.writeJson(
      path.join(projectRoot, '.mcp', 'generated.json'),
      generationRecord,
      { spaces: 2 }
    );
    
    Logger.success(`Generated ${generatedFlows.length} test flows!`);
    
    if (generatedFlows.length > 0) {
      Logger.table(generatedFlows.map(flow => ({
        Component: flow.componentName,
        Type: flow.type,
        Route: flow.route,
        File: path.relative(projectRoot, flow.filePath)
      })));
      
      Logger.info('Generated flows are saved in: tests/mcp/generated/');
      Logger.info('Next step: Run "npx mcp-e2e run" to execute the tests');
    }
    
  } catch (error) {
    Logger.error('Generation failed:', error);
    process.exit(1);
  }
}