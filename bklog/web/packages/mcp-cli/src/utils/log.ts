import chalk from 'chalk';

export class Logger {
  static info(message: string, ...args: any[]): void {
    console.log(chalk.blue('ℹ'), message, ...args);
  }

  static success(message: string, ...args: any[]): void {
    console.log(chalk.green('✅'), message, ...args);
  }

  static warn(message: string, ...args: any[]): void {
    console.log(chalk.yellow('⚠️'), message, ...args);
  }

  static error(message: string, ...args: any[]): void {
    console.log(chalk.red('❌'), message, ...args);
  }

  static debug(message: string, ...args: any[]): void {
    if (process.env.DEBUG) {
      console.log(chalk.gray('🐛'), message, ...args);
    }
  }

  static step(step: number, total: number, message: string): void {
    console.log(chalk.cyan(`[${step}/${total}]`), message);
  }

  static header(title: string): void {
    console.log();
    console.log(chalk.bold.blue('='.repeat(50)));
    console.log(chalk.bold.blue(`  ${title}`));
    console.log(chalk.bold.blue('='.repeat(50)));
    console.log();
  }

  static table(data: Array<Record<string, any>>): void {
    if (data.length === 0) return;
    
    const keys = Object.keys(data[0]);
    const maxWidths = keys.map(key => 
      Math.max(key.length, ...data.map(row => String(row[key] || '').length))
    );

    // 打印表头
    const header = keys.map((key, i) => key.padEnd(maxWidths[i])).join(' | ');
    console.log(chalk.bold(header));
    console.log(keys.map((_, i) => '-'.repeat(maxWidths[i])).join('-|-'));

    // 打印数据行
    data.forEach(row => {
      const line = keys.map((key, i) => 
        String(row[key] || '').padEnd(maxWidths[i])
      ).join(' | ');
      console.log(line);
    });
  }

  static progress(current: number, total: number, message: string = ''): void {
    const percentage = Math.round((current / total) * 100);
    const barLength = 30;
    const filledLength = Math.round((barLength * current) / total);
    const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
    
    process.stdout.write(`\r${chalk.cyan(bar)} ${percentage}% ${message}`);
    
    if (current === total) {
      console.log(); // 换行
    }
  }

  static divider(): void {
    console.log(chalk.gray('-'.repeat(60)));
  }
}