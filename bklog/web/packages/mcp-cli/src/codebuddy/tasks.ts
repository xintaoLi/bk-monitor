import path from 'path';
import fs from 'fs-extra';
import { Logger } from '../utils/log.js';

export interface CodeBuddyTask {
  id: string;
  name: string;
  description: string;
  trigger: 'on_change' | 'on_commit' | 'manual' | 'scheduled';
  files: string[];
  command: string;
  enabled: boolean;
  conditions?: TaskCondition[];
}

export interface TaskCondition {
  type: 'file_exists' | 'file_changed' | 'git_branch' | 'env_var';
  value: string;
}

export class CodeBuddyTaskManager {
  private projectRoot: string;
  private tasksPath: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.tasksPath = path.join(projectRoot, '.codebuddy', 'tasks.json');
  }

  async loadTasks(): Promise<CodeBuddyTask[]> {
    if (!await fs.pathExists(this.tasksPath)) {
      return [];
    }

    try {
      const config = await fs.readJson(this.tasksPath);
      return config.tasks || [];
    } catch (error) {
      Logger.warn('Failed to load CodeBuddy tasks:', error);
      return [];
    }
  }

  async saveTasks(tasks: CodeBuddyTask[]): Promise<void> {
    await fs.ensureDir(path.dirname(this.tasksPath));
    
    const config = {
      tasks,
      updated_at: new Date().toISOString()
    };

    await fs.writeJson(this.tasksPath, config, { spaces: 2 });
  }

  async addTask(task: CodeBuddyTask): Promise<void> {
    const tasks = await this.loadTasks();
    
    // 检查是否已存在相同 ID 的任务
    const existingIndex = tasks.findIndex(t => t.id === task.id);
    
    if (existingIndex >= 0) {
      tasks[existingIndex] = task;
      Logger.info(`Updated existing task: ${task.name}`);
    } else {
      tasks.push(task);
      Logger.info(`Added new task: ${task.name}`);
    }

    await this.saveTasks(tasks);
  }

  async removeTask(taskId: string): Promise<void> {
    const tasks = await this.loadTasks();
    const filteredTasks = tasks.filter(t => t.id !== taskId);
    
    if (filteredTasks.length < tasks.length) {
      await this.saveTasks(filteredTasks);
      Logger.info(`Removed task: ${taskId}`);
    } else {
      Logger.warn(`Task not found: ${taskId}`);
    }
  }

  async enableTask(taskId: string): Promise<void> {
    const tasks = await this.loadTasks();
    const task = tasks.find(t => t.id === taskId);
    
    if (task) {
      task.enabled = true;
      await this.saveTasks(tasks);
      Logger.info(`Enabled task: ${taskId}`);
    } else {
      Logger.warn(`Task not found: ${taskId}`);
    }
  }

  async disableTask(taskId: string): Promise<void> {
    const tasks = await this.loadTasks();
    const task = tasks.find(t => t.id === taskId);
    
    if (task) {
      task.enabled = false;
      await this.saveTasks(tasks);
      Logger.info(`Disabled task: ${taskId}`);
    } else {
      Logger.warn(`Task not found: ${taskId}`);
    }
  }

  // 预定义的 MCP E2E 任务
  static getDefaultMcpTasks(): CodeBuddyTask[] {
    return [
      {
        id: 'mcp-e2e-analyze',
        name: 'MCP E2E Analysis',
        description: 'Analyze component dependencies when files change',
        trigger: 'on_change',
        files: ['src/**/*.{ts,tsx,js,jsx,vue}'],
        command: 'npx mcp-e2e analyze',
        enabled: true,
        conditions: [
          {
            type: 'file_exists',
            value: '.mcp/servers.json'
          }
        ]
      },
      {
        id: 'mcp-e2e-generate',
        name: 'MCP E2E Generate Tests',
        description: 'Generate test flows after analysis',
        trigger: 'on_change',
        files: ['.mcp/analysis.json'],
        command: 'npx mcp-e2e generate',
        enabled: true
      },
      {
        id: 'mcp-e2e-run-on-commit',
        name: 'MCP E2E Run Tests on Commit',
        description: 'Run all tests before commit',
        trigger: 'on_commit',
        files: ['**/*.{ts,tsx,js,jsx,vue}'],
        command: 'npx mcp-e2e run',
        enabled: false // 默认禁用，避免提交时间过长
      },
      {
        id: 'mcp-e2e-run-manual',
        name: 'MCP E2E Run Tests (Manual)',
        description: 'Manually run E2E tests',
        trigger: 'manual',
        files: [],
        command: 'npx mcp-e2e run',
        enabled: true
      }
    ];
  }

  async setupDefaultTasks(): Promise<void> {
    const defaultTasks = CodeBuddyTaskManager.getDefaultMcpTasks();
    
    for (const task of defaultTasks) {
      await this.addTask(task);
    }
    
    Logger.success('Default MCP E2E tasks configured');
  }
}