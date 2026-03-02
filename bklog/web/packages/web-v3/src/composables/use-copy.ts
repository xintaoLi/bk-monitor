/**
 * use-copy.ts - 复制到剪贴板 Composable（Vue3）
 * 对齐原项目复制功能逻辑
 */

import { ref } from 'vue';

export function useCopy() {
  const copied = ref(false);
  let timer: ReturnType<typeof setTimeout> | null = null;

  async function copy(text: string): Promise<boolean> {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      } else {
        // 降级方案
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      copied.value = true;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        copied.value = false;
      }, 2000);
      return true;
    } catch {
      return false;
    }
  }

  return { copy, copied };
}

export default useCopy;
