import { Project } from "ts-morph";
import path from "path";

export function createTsProject(root: string) {
  const tsConfigPath = path.join(root, "tsconfig.json");
  
  return new Project({
    tsConfigFilePath: tsConfigPath,
    skipAddingFilesFromTsConfig: false
  });
}

export function createTsProjectWithoutConfig(root: string) {
  const project = new Project({
    compilerOptions: {
      target: 5, // ES2018
      module: 1, // CommonJS
      jsx: 2, // React
      allowJs: true,
      esModuleInterop: true,
      skipLibCheck: true
    }
  });

  // 添加常见的前端文件
  project.addSourceFilesAtPaths([
    path.join(root, "src/**/*.{ts,tsx,js,jsx}"),
    path.join(root, "**/*.{ts,tsx,js,jsx}")
  ]);

  return project;
}