/**
 * grep/index.tsx - Grep CLI 主视图（Vue3 TSX）
 * 迁移自 src/views/retrieve-v3/grep/index.tsx
 * 变更：
 * - useStore(Vuex) → useRetrieveStore(Pinia)
 * - vue-router/composables → vue-router
 * - useRetrieveEvent → 移除（使用 watch 替代）
 * - RetrieveHelper → 移除（使用 Pinia store 替代）
 * - axiosInstance 直接调用 → http.request
 */
import { defineComponent, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { debounce } from 'lodash-es';
import { useRetrieveStore } from '@/stores/retrieve';
import { useAppStore } from '@/stores/app';
import http from '@/api';
import GrepCli from './grep-cli';
import GrepCliResult from './grep-cli-result';
import GrepCliTotal from './grep-cli-total';
import type { GrepRequestResult } from './types';

import './grep-cli.scss';

export default defineComponent({
  name: 'GrepView',
  setup() {
    const route = useRoute();
    const router = useRouter();
    const retrieveStore = useRetrieveStore();
    const appStore = useAppStore();
    const { indexItem, indexId, indexFieldInfo } = storeToRefs(retrieveStore);

    const searchValue = ref('');
    const field = ref((route.query.grep_field as string) ?? '');
    const grepQuery = ref((route.query.grep_query as string) ?? '');
    const grepRequestResult = ref<GrepRequestResult>({
      offset: 0,
      is_loading: true,
      list: [],
      has_more: true,
      is_error: false,
      exception_msg: '',
    });

    const matchMode = ref({
      caseSensitive: false,
      regexMode: false,
      wordMatch: false,
    });

    const totalMatches = ref(0);
    const searchListTotal = ref(0);

    // 取消请求的控制器
    let abortController: AbortController | null = null;

    /**
     * 设置默认字段值（优先 log 字段，其次第一个 text 类型字段）
     */
    const setDefaultFieldValue = () => {
      if (field.value === '' && indexFieldInfo.value.fields.length > 0) {
        const logField = indexFieldInfo.value.fields.find((f) => f.field_name === 'log');
        if (logField) {
          field.value = logField.field_name;
        } else {
          const textField = indexFieldInfo.value.fields.find((f) => f.field_type === 'text');
          if (textField) {
            field.value = textField.field_name;
          }
        }

        if (field.value) {
          router.replace({
            params: route.params as Record<string, string>,
            query: { ...route.query, grep_field: field.value },
          });
        }
      }
    };

    const resetGrepRequestResult = () => {
      grepRequestResult.value.has_more = true;
      grepRequestResult.value.list.splice(0, grepRequestResult.value.list.length);
      grepRequestResult.value.offset = 0;
    };

    /**
     * 获取 grep 检索结果
     */
    const requestGrepList = debounce(async () => {
      if (!grepRequestResult.value.has_more) return;

      grepRequestResult.value.is_loading = true;
      grepRequestResult.value.is_error = false;
      grepRequestResult.value.exception_msg = '';

      // 取消上一次请求
      abortController?.abort();
      abortController = new AbortController();

      const { start_time, end_time, keyword, addition } = indexItem.value;

      try {
        const data = await http.request<{ list: any[]; total?: number }>('retrieve/getIndexSetGrepQuery', {
          params: { index_set_id: indexId.value },
          data: {
            start_time,
            end_time,
            keyword,
            addition,
            grep_query: grepQuery.value,
            grep_field: field.value,
            begin: grepRequestResult.value.offset,
            size: 100,
          },
        });

        grepRequestResult.value.has_more = (data?.list?.length ?? 0) === 100;
        grepRequestResult.value.list.push(...(data?.list ?? []));
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        grepRequestResult.value.is_error = true;
        grepRequestResult.value.exception_msg = err?.message || String(err);
      } finally {
        grepRequestResult.value.is_loading = false;
      }
    }, 120);

    /**
     * 获取 grep 检索总条数
     */
    const initGetGrepResultTotal = async () => {
      searchListTotal.value = 0;
      if (!field.value) return;

      const { start_time, end_time, keyword, addition } = indexItem.value;
      try {
        const res = await http.request<{ total: number }>('retrieve/getGrepResultTotal', {
          params: { index_set_id: indexId.value },
          data: {
            start_time,
            end_time,
            keyword,
            addition,
            grep_query: grepQuery.value,
            grep_field: field.value,
          },
        });
        searchListTotal.value = res?.total ?? 0;
      } catch {
        searchListTotal.value = 0;
      }
    };

    const reloadGrepDataAndTotal = () => {
      requestGrepList();
      initGetGrepResultTotal();
    };

    // ==================== 事件处理 ====================
    const handleSearchUpdate = (data: any) => {
      searchValue.value = data.searchValue;
    };

    const handleMatchModeUpdate = (mode: any) => {
      Object.assign(matchMode.value, mode);
    };

    const handleFieldChange = (v: string) => {
      field.value = v;
      resetGrepRequestResult();
      router.replace({
        params: route.params as Record<string, string>,
        query: { ...route.query, grep_field: v },
      });
      reloadGrepDataAndTotal();
    };

    const handleGrepEnter = (value: string) => {
      grepQuery.value = value;
      resetGrepRequestResult();
      router.replace({
        params: route.params as Record<string, string>,
        query: { ...route.query, grep_query: value },
      });
      if (field.value === '') return;
      reloadGrepDataAndTotal();
    };

    const handleLoadMore = () => {
      if (field.value === '') return;
      grepRequestResult.value.offset += 100;
      requestGrepList();
    };

    const handleParamsChange = ({ isParamsChange, option }: { isParamsChange: boolean; option: any }) => {
      if (isParamsChange) {
        resetGrepRequestResult();
        reloadGrepDataAndTotal();
      }
      if (option?.operation === 'highlight') {
        searchValue.value = option.value;
      }
    };

    // ==================== 监听检索参数变化 ====================
    watch(
      () => [indexItem.value.start_time, indexItem.value.end_time, indexItem.value.keyword],
      () => {
        resetGrepRequestResult();
        reloadGrepDataAndTotal();
      },
    );

    // ==================== 生命周期 ====================
    onMounted(() => {
      resetGrepRequestResult();
      setDefaultFieldValue();
    });

    onBeforeUnmount(() => {
      abortController?.abort();
      resetGrepRequestResult();
    });

    return () => (
      <div class='grep-view'>
        <GrepCli
          field-value={field.value}
          search-count={totalMatches.value}
          search-value={searchValue.value}
          onField-change={handleFieldChange}
          onGrep-enter={handleGrepEnter}
          onMatch-mode={handleMatchModeUpdate}
          onSearch-change={handleSearchUpdate}
        />
        <GrepCliTotal total={searchListTotal.value} text={'- 共检索出{total}条结果 -'} />
        <GrepCliResult
          fieldName={field.value}
          grepRequestResult={grepRequestResult.value}
          onLoad-more={handleLoadMore}
          onParams-change={handleParamsChange}
        />
      </div>
    );
  },
});
