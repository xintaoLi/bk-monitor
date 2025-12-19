import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';

export async function findProjectFiles(
  projectRoot: string,
  extensions: string[] = ['.ts', '.tsx', '.js', '.jsx', '.vue']
): Promise<string[]> {
  const patterns = extensions.map(ext => `**/*${ext}`);
  const files: string[] = [];
  
  for (const pattern of patterns) {
    const matches = await glob(pattern, {
      cwd: projectRoot,
      ignore: [
        'node_modules/**',
        'dist/**',
        'build/**',
        '.git/**',
        'coverage/**',
        '**/*.test.*',
        '**/*.spec.*'
      ]
    });
    
    files.push(...matches.map(file => path.resolve(projectRoot, file)));
  }
  
  return [...new Set(files)]; // 去重
}

export async function findTsConfigPath(projectRoot: string): Promise<string | null> {
  const possiblePaths = [
    'tsconfig.json',
    'jsconfig.json',
    'src/tsconfig.json'
  ];
  
  for (const configPath of possiblePaths) {
    const fullPath = path.join(projectRoot, configPath);
    if (await fs.pathExists(fullPath)) {
      return fullPath;
    }
  }
  
  return null;
}

export async function findPackageJson(projectRoot: string): Promise<any | null> {
  const packagePath = path.join(projectRoot, 'package.json');
  
  if (await fs.pathExists(packagePath)) {
    try {
      return await fs.readJson(packagePath);
    } catch (error) {
      console.warn('Failed to parse package.json:', error);
    }
  }
  
  return null;
}

export async function detectFramework(projectRoot: string): Promise<'react' | 'vue' | 'unknown'> {
  const packageJson = await findPackageJson(projectRoot);
  
  if (packageJson) {
    const deps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    };
    
    if (deps.react || deps['@types/react']) {
      return 'react';
    }
    
    if (deps.vue || deps['@vue/cli-service']) {
      return 'vue';
    }
  }
  
  // 检查文件扩展名
  const files = await findProjectFiles(projectRoot, ['.tsx', '.jsx', '.vue']);
  const hasVue = files.some(f => f.endsWith('.vue'));
  const hasReact = files.some(f => f.endsWith('.tsx') || f.endsWith('.jsx'));
  
  if (hasVue) return 'vue';
  if (hasReact) return 'react';
  
  return 'unknown';
}

export async function copyTemplate(
  templatePath: string,
  targetPath: string,
  replacements: Record<string, string> = {}
): Promise<void> {
  await fs.ensureDir(path.dirname(targetPath));
  
  if (await fs.pathExists(templatePath)) {
    let content = await fs.readFile(templatePath, 'utf-8');
    
    // 替换模板变量
    for (const [key, value] of Object.entries(replacements)) {
      content = content.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    
    await fs.writeFile(targetPath, content, 'utf-8');
  }
}

export async function ensureDirectories(projectRoot: string): Promise<void> {
  const dirs = [
    'tests/mcp/flows',
    'tests/mcp/generated',
    'tests/mcp/utils',
    '.mcp',
    '.codebuddy'
  ];
  
  for (const dir of dirs) {
    await fs.ensureDir(path.join(projectRoot, dir));
  }
}