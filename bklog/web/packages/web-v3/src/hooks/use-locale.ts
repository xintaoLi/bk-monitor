/*
 * Tencent is pleased to support the open source community by making
 * 蓝鲸智云PaaS平台 (BlueKing PaaS) available.
 *
 * Copyright (C) 2021 THL A29 Limited, a Tencent company.  All rights reserved.
 *
 * 蓝鲸智云PaaS平台 (BlueKing PaaS) is licensed under the MIT License.
 *
 * License for 蓝鲸智云PaaS平台 (BlueKing PaaS):
 *
 * ---------------------------------------------------
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
 * documentation files (the "Software"), to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and
 * to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of
 * the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO
 * THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF
 * CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 */

import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

/**
 * 国际化 Hook
 * 提供 i18n 相关功能的封装
 */
export function useLocale() {
  const { t, locale, availableLocales } = useI18n();

  /**
   * 当前语言
   */
  const currentLocale = computed(() => locale.value);

  /**
   * 是否是中文
   */
  const isZhCN = computed(() => locale.value === 'zh-CN' || locale.value === 'zh-cn' || locale.value === 'zh');

  /**
   * 切换语言
   */
  const changeLocale = (lang: string) => {
    locale.value = lang;
  };

  /**
   * 翻译函数
   */
  const translate = (key: string, params?: Record<string, any>) => {
    return t(key, params);
  };

  return {
    t,
    $t: t, // Alias for Vue2 compatibility
    locale: currentLocale,
    isZhCN,
    availableLocales,
    changeLocale,
    translate,
  };
}

export default useLocale;

// Named export for direct t() usage (compatibility)
export const t = (key: string, ...args: any[]) => {
  try {
    const { t: tFn } = useI18n?.() || {};
    return tFn ? tFn(key, ...args) : key;
  } catch { return key; }
};
