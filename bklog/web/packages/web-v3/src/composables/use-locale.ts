/**
 * use-locale.ts - 国际化 Composable（Vue3）
 * 对齐原 src/hooks/use-locale.ts，适配 vue-i18n v9 Composition API
 */

import { useI18n } from 'vue-i18n';

/**
 * 使用国际化翻译
 */
export function useLocale() {
  const { t } = useI18n();
  return { t, $t: t };
}

export default useLocale;
