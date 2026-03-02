/**
 * use-retrieve-params.ts - 检索参数 URL 同步 Composable（Vue3）
 * 对齐原 src/hooks/use-retrieve-params.ts
 * 功能：将检索参数（keyword、addition）同步到 URL query
 */

import { useRoute, useRouter } from 'vue-router';
import { useRetrieveStore } from '@/stores/retrieve';
import type { FilterCondition } from '@/types';

// ==================== URL 参数序列化 ====================
function serializeAddition(addition: FilterCondition[]): string {
  if (!addition?.length) return '';
  try {
    return encodeURIComponent(JSON.stringify(addition));
  } catch {
    return '';
  }
}

function deserializeAddition(str: string): FilterCondition[] {
  if (!str) return [];
  try {
    return JSON.parse(decodeURIComponent(str));
  } catch {
    return [];
  }
}

/**
 * 检索参数与 URL 同步
 */
export function useRetrieveParams() {
  const route = useRoute();
  const router = useRouter();
  const retrieveStore = useRetrieveStore();

  /**
   * 将当前检索参数同步到 URL
   */
  function syncParamsToUrl(extra: Record<string, string> = {}) {
    const { keyword, addition } = retrieveStore.indexItem;
    const query: Record<string, string | undefined> = {
      ...(route.query as Record<string, string>),
      keyword: keyword || undefined,
      addition: addition?.length ? serializeAddition(addition) : undefined,
      ...extra,
    };
    // 清理空值
    Object.keys(query).forEach((key) => {
      if (query[key] === undefined || query[key] === '') {
        delete query[key];
      }
    });
    return router.replace({ query });
  }

  /**
   * 从 URL 恢复检索参数
   */
  function restoreParamsFromUrl() {
    const { keyword, addition, start_time, end_time, datePickerValue } = route.query;

    const params: Record<string, unknown> = {};

    if (keyword) {
      params.keyword = String(keyword);
    }

    if (addition) {
      params.addition = deserializeAddition(String(addition));
    }

    if (start_time && end_time) {
      params.start_time = String(start_time);
      params.end_time = String(end_time);
    }

    if (datePickerValue) {
      try {
        params.datePickerValue = JSON.parse(decodeURIComponent(String(datePickerValue)));
      } catch {
        // 忽略解析失败
      }
    }

    if (Object.keys(params).length) {
      retrieveStore.updateIndexItem(params as Parameters<typeof retrieveStore.updateIndexItem>[0]);
    }
  }

  return {
    syncParamsToUrl,
    restoreParamsFromUrl,
    serializeAddition,
    deserializeAddition,
  };
}

export default useRetrieveParams;
