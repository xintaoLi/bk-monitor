import fs from "fs-extra";
import path from "path";
import { FlowConfig, generateBasicFlowTemplate, generateInteractiveFlowTemplate, generateFormFlowTemplate } from "./flowTemplate.js";

export interface GeneratedFlow {
  filePath: string;
  componentName: string;
  route: string;
  type: 'basic' | 'interactive' | 'form';
}

export class FlowWriter {
  private outputDir: string;
  
  constructor(projectRoot: string) {
    this.outputDir = path.join(projectRoot, "tests", "mcp", "generated");
  }

  async ensureOutputDir(): Promise<void> {
    await fs.ensureDir(this.outputDir);
  }

  async writeFlow(config: FlowConfig, type: 'basic' | 'interactive' | 'form' = 'basic'): Promise<GeneratedFlow> {
    await this.ensureOutputDir();
    
    const fileName = `${config.componentName.toLowerCase()}.flow.js`;
    const filePath = path.join(this.outputDir, fileName);
    
    let content: string;
    switch (type) {
      case 'interactive':
        content = generateInteractiveFlowTemplate(config);
        break;
      case 'form':
        content = generateFormFlowTemplate(config);
        break;
      default:
        content = generateBasicFlowTemplate(config);
    }
    
    await fs.writeFile(filePath, content, 'utf-8');
    
    return {
      filePath,
      componentName: config.componentName,
      route: config.route,
      type
    };
  }

  async writeMultipleFlows(configs: FlowConfig[]): Promise<GeneratedFlow[]> {
    const results: GeneratedFlow[] = [];
    
    for (const config of configs) {
      const type = this.detectFlowType(config);
      const result = await this.writeFlow(config, type);
      results.push(result);
    }
    
    return results;
  }

  private detectFlowType(config: FlowConfig): 'basic' | 'interactive' | 'form' {
    const { selectors } = config;
    
    // 检查是否是表单
    const hasInputs = selectors.some(s => s.element === 'input' || s.element === 'textarea');
    const hasSubmitButton = selectors.some(s => 
      s.element === 'button' && 
      (s.selector.includes('submit') || s.selector.includes('confirm'))
    );
    
    if (hasInputs && hasSubmitButton) {
      return 'form';
    }
    
    // 检查是否有交互元素
    const hasInteractiveElements = selectors.some(s => 
      s.element && ['button', 'a', 'input', 'select'].includes(s.element)
    );
    
    if (hasInteractiveElements) {
      return 'interactive';
    }
    
    return 'basic';
  }

  async generateFlowIndex(): Promise<void> {
    const indexPath = path.join(this.outputDir, "index.js");
    const files = await fs.readdir(this.outputDir);
    const flowFiles = files.filter(f => f.endsWith('.flow.js') && f !== 'index.js');
    
    const imports = flowFiles.map(file => {
      const name = path.basename(file, '.flow.js');
      return `import ${name}Flow from "./${file}";`;
    }).join('\n');
    
    const exports = flowFiles.map(file => {
      const name = path.basename(file, '.flow.js');
      return `  ${name}: ${name}Flow,`;
    }).join('\n');
    
    const content = `${imports}

export const generatedFlows = {
${exports}
};

export default generatedFlows;
`;
    
    await fs.writeFile(indexPath, content, 'utf-8');
  }

  async cleanGeneratedFlows(): Promise<void> {
    if (await fs.pathExists(this.outputDir)) {
      await fs.emptyDir(this.outputDir);
    }
  }

  getGeneratedFlowsPath(): string {
    return this.outputDir;
  }
}