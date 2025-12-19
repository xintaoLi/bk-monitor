import path from 'path';
import { Logger } from '../utils/log.js';
import { GitAnalyzer } from '../utils/git.js';
import { findProjectFiles, detectFramework } from '../utils/fs.js';
import { createTsProject, createTsProjectWithoutConfig } from '../analyzer/project.js';
import { buildDependencyGraph } from '../analyzer/dependencyGraph.js';
import { findAffectedFiles, ComponentInfo } from '../analyzer/affected.js';
import { inferSelectors } from '../selectors/index.js';

export default async function analyze(): Promise<void> {
  Logger.header('Analyzing Component Dependencies');
  
  const projectRoot = process.cwd();
  const framework = await detectFramework(projectRoot);
  
  Logger.info(`Framework: ${framework}`);
  Logger.step(1, 5, 'Getting changed files from Git...');
  
  try {
    const gitAnalyzer = new GitAnalyzer(projectRoot);
    const changedFiles = await gitAnalyzer.getChangedFiles();
    
    if (changedFiles.length === 0) {
      Logger.warn('No changed files detected. Analyzing all project files...');
      const allFiles = await findProjectFiles(projectRoot);
      Logger.info(`Found ${allFiles.length} project files`);
    } else {
      Logger.info(`Found ${changedFiles.length} changed files:`);
      changedFiles.forEach(file => {
        Logger.info(`  - ${path.relative(projectRoot, file)}`);
      });
    }
    
    Logger.step(2, 5, 'Building TypeScript project...');
    
    let project;
    try {
      project = createTsProject(projectRoot);
    } catch (error) {
      Logger.warn('Failed to load tsconfig.json, using default configuration');
      project = createTsProjectWithoutConfig(projectRoot);
    }
    
    const sourceFiles = project.getSourceFiles();
    Logger.info(`Loaded ${sourceFiles.length} source files`);
    
    Logger.step(3, 5, 'Building dependency graph...');
    
    const dependencyGraph = buildDependencyGraph(sourceFiles);
    Logger.info(`Built dependency graph with ${dependencyGraph.dependencies.size} nodes`);
    
    Logger.step(4, 5, 'Finding affected components...');
    
    const affectedFiles = changedFiles.length > 0 
      ? findAffectedFiles(dependencyGraph, changedFiles)
      : Array.from(dependencyGraph.dependencies.keys()).slice(0, 10); // 限制分析数量
    
    Logger.info(`Found ${affectedFiles.length} affected files`);
    
    Logger.step(5, 5, 'Analyzing components and selectors...');
    
    const components: ComponentInfo[] = [];
    
    for (const filePath of affectedFiles) {
      const sourceFile = sourceFiles.find(sf => sf.getFilePath() === filePath);
      if (!sourceFile) continue;
      
      const selectors = inferSelectors(filePath, sourceFile);
      if (selectors.length === 0) continue;
      
      const componentName = extractComponentName(filePath);
      const route = inferRoute(filePath, projectRoot);
      
      components.push({
        filePath: path.relative(projectRoot, filePath),
        componentName,
        route,
        selectors: selectors.map(s => s.selector)
      });
    }
    
    Logger.success(`Analysis complete! Found ${components.length} testable components:`);
    
    if (components.length > 0) {
      Logger.table(components.map(c => ({
        Component: c.componentName,
        File: c.filePath,
        Route: c.route || 'N/A',
        Selectors: c.selectors.length
      })));
      
      // 保存分析结果
      const analysisResult = {
        timestamp: new Date().toISOString(),
        framework,
        changedFiles: changedFiles.map(f => path.relative(projectRoot, f)),
        affectedFiles: affectedFiles.map(f => path.relative(projectRoot, f)),
        components
      };
      
      const fs = require('fs-extra');
      await fs.writeJson(
        path.join(projectRoot, '.mcp', 'analysis.json'),
        analysisResult,
        { spaces: 2 }
      );
      
      Logger.success('Analysis results saved to .mcp/analysis.json');
      Logger.info('Next step: Run "npx mcp-e2e generate" to create test flows');
    } else {
      Logger.warn('No testable components found. Make sure your components have data-testid attributes.');
    }
    
  } catch (error) {
    Logger.error('Analysis failed:', error);
    process.exit(1);
  }
}

function extractComponentName(filePath: string): string {
  const basename = path.basename(filePath, path.extname(filePath));
  
  // 移除常见后缀
  const cleanName = basename
    .replace(/\.(component|page|view|container)$/i, '')
    .replace(/Component$/i, '');
  
  // 转换为 PascalCase
  return cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
}

function inferRoute(filePath: string, projectRoot: string): string {
  const relativePath = path.relative(projectRoot, filePath);
  
  // 尝试从路径推断路由
  if (relativePath.includes('/pages/') || relativePath.includes('/views/')) {
    const routePart = relativePath
      .split('/pages/')[1] || relativePath.split('/views/')[1]
      || relativePath;
    
    return '/' + routePart
      .replace(/\.(tsx?|jsx?|vue)$/, '')
      .replace(/\/index$/, '')
      .replace(/\\/g, '/');
  }
  
  // 默认路由
  const componentName = extractComponentName(filePath);
  return `/${componentName.toLowerCase()}`;
}