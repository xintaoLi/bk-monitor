import simpleGit, { SimpleGit } from 'simple-git';
import path from 'path';

export class GitAnalyzer {
  private git: SimpleGit;
  
  constructor(private projectRoot: string) {
    this.git = simpleGit(projectRoot);
  }

  async getChangedFiles(baseBranch: string = 'HEAD~1'): Promise<string[]> {
    try {
      const diff = await this.git.diff([baseBranch, 'HEAD', '--name-only']);
      return diff
        .split('\n')
        .filter(file => file.trim())
        .map(file => path.resolve(this.projectRoot, file))
        .filter(file => this.isRelevantFile(file));
    } catch (error) {
      console.warn('Failed to get git diff, falling back to staged files');
      return this.getStagedFiles();
    }
  }

  async getStagedFiles(): Promise<string[]> {
    try {
      const status = await this.git.status();
      return [
        ...status.staged,
        ...status.modified,
        ...status.created
      ]
        .map(file => path.resolve(this.projectRoot, file))
        .filter(file => this.isRelevantFile(file));
    } catch (error) {
      console.error('Failed to get git status:', error);
      return [];
    }
  }

  async getUncommittedFiles(): Promise<string[]> {
    try {
      const status = await this.git.status();
      return [
        ...status.modified,
        ...status.not_added,
        ...status.created,
        ...status.staged
      ]
        .map(file => path.resolve(this.projectRoot, file))
        .filter(file => this.isRelevantFile(file));
    } catch (error) {
      console.error('Failed to get uncommitted files:', error);
      return [];
    }
  }

  private isRelevantFile(filePath: string): boolean {
    const extensions = ['.ts', '.tsx', '.js', '.jsx', '.vue'];
    const ext = path.extname(filePath);
    return extensions.includes(ext) && !filePath.includes('node_modules');
  }

  async getCurrentBranch(): Promise<string> {
    try {
      const branch = await this.git.revparse(['--abbrev-ref', 'HEAD']);
      return branch.trim();
    } catch (error) {
      return 'main';
    }
  }

  async getCommitHash(ref: string = 'HEAD'): Promise<string> {
    try {
      const hash = await this.git.revparse([ref]);
      return hash.trim();
    } catch (error) {
      return '';
    }
  }
}