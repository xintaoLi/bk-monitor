import readline from 'readline';
import chalk from 'chalk';

/**
 * 创建 readline 接口
 */
function createReadlineInterface(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

/**
 * 交互式确认询问
 * @param question 问题内容
 * @param defaultValue 默认值
 * @returns 用户选择结果
 */
export async function promptConfirm(question: string, defaultValue = false): Promise<boolean> {
  const rl = createReadlineInterface();

  const hint = defaultValue ? '[Y/n]' : '[y/N]';
  const formattedQuestion = chalk.cyan(`? ${question} ${hint} `);

  return new Promise(resolve => {
    rl.question(formattedQuestion, answer => {
      rl.close();

      const trimmed = answer.trim().toLowerCase();

      if (trimmed === '') {
        resolve(defaultValue);
      } else if (trimmed === 'y' || trimmed === 'yes') {
        resolve(true);
      } else if (trimmed === 'n' || trimmed === 'no') {
        resolve(false);
      } else {
        resolve(defaultValue);
      }
    });
  });
}

/**
 * 交互式输入询问
 * @param question 问题内容
 * @param defaultValue 默认值
 * @returns 用户输入内容
 */
export async function promptInput(question: string, defaultValue = ''): Promise<string> {
  const rl = createReadlineInterface();

  const hint = defaultValue ? ` (${defaultValue})` : '';
  const formattedQuestion = chalk.cyan(`? ${question}${hint}: `);

  return new Promise(resolve => {
    rl.question(formattedQuestion, answer => {
      rl.close();

      const trimmed = answer.trim();
      resolve(trimmed || defaultValue);
    });
  });
}

/**
 * 交互式选择询问
 * @param question 问题内容
 * @param choices 选项列表
 * @param defaultIndex 默认选项索引
 * @returns 用户选择的选项
 */
export async function promptSelect<T extends string>(
  question: string,
  choices: Array<{ value: T; label: string }>,
  defaultIndex = 0
): Promise<T> {
  const rl = createReadlineInterface();

  console.log(chalk.cyan(`? ${question}`));
  choices.forEach((choice, index) => {
    const marker = index === defaultIndex ? chalk.green('❯') : ' ';
    const label = index === defaultIndex ? chalk.green(choice.label) : choice.label;
    console.log(`  ${marker} ${index + 1}. ${label}`);
  });

  const formattedQuestion = chalk.cyan(`  请输入选项编号 [1-${choices.length}]: `);

  return new Promise(resolve => {
    rl.question(formattedQuestion, answer => {
      rl.close();

      const trimmed = answer.trim();
      const index = parseInt(trimmed, 10) - 1;

      if (trimmed === '' || isNaN(index) || index < 0 || index >= choices.length) {
        resolve(choices[defaultIndex].value);
      } else {
        resolve(choices[index].value);
      }
    });
  });
}
