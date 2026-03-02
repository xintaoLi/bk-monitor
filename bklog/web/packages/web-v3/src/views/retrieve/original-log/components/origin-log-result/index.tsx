/**
 * origin-log-result/index.tsx - 原始日志结果展示（Vue3 TSX）
 * 迁移自 retrieve-v3/search-result/original-log/components/origin-log-result/index.tsx
 * 变更：
 * - useStore(Vuex) → useRetrieveStore(Pinia)
 * - axiosInstance + readBlobRespToJson → http.request
 * - RetrieveHelper.formatDateValue → 内联实现
 * - JsonFormatter(.vue) → 简化 JSON 渲染
 * - SearchBar(Vue2) → 移除（使用 store 中的 keyword）
 * - useLocale → useI18n
 * - v-bkloading → t-loading
 */
import { computed, defineComponent, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { cloneDeep, debounce } from 'lodash-es';
import DOMPurify from 'dompurify';
import dayjs from 'dayjs';
import { useRetrieveStore } from '@/stores/retrieve';
import http from '@/api';
import { parseTableRowData, xssFilter } from '@/utils/index';
import RenderJsonCell from './render-json-cell/index';

import './index.scss';

/**
 * 格式化日期值（替代 RetrieveHelper.formatDateValue）
 */
function formatDateValue(data: string | number, fieldType: string): string {
  if (!data) return '--';
  const formatFn: Record<string, (val: any) => string> = {
    date: (val) => {
      const ts = /^\d+$/.test(String(val)) ? Number(val) : val;
      return dayjs(ts).format('YYYY-MM-DD HH:mm:ss') || String(val);
    },
    date_nanos: (val) => {
      // 纳秒精度处理
      const str = String(val);
      if (/^\d+$/.test(str)) {
        return dayjs(Math.floor(Number(str) / 1e6)).format('YYYY-MM-DD HH:mm:ss.SSS') || str;
      }
      return dayjs(val).format('YYYY-MM-DD HH:mm:ss.SSS') || str;
    },
  };

  if (formatFn[fieldType]) {
    if (`${data}`.startsWith('<mark>')) {
      const value = `${data}`.replace(/^<mark>/i, '').replace(/<\/mark>$/i, '');
      return `<mark>${formatFn[fieldType](value)}</mark>`;
    }
    return formatFn[fieldType](data) || String(data) || '--';
  }
  return String(data);
}

export default defineComponent({
  name: 'LogResult',
  props: {
    indexSetId: {
      type: Number,
      default: 0,
    },
    logIndex: {
      type: Number,
      default: 0,
    },
    retrieveParams: {
      type: Object,
      required: true,
    },
  },
  emits: ['choose-row', 'toggle-collapse'],
  setup(props, { emit, expose }) {
    const { t } = useI18n();
    const retrieveStore = useRetrieveStore();
    const { indexFieldInfo, indexSetQueryResult } = storeToRefs(retrieveStore);

    const tableRef = ref<HTMLElement>();
    const logList = ref<any[]>([]);
    const choosedIndex = ref(props.logIndex);
    const listLoading = ref(false);
    const isCollapsed = ref(false);

    const fieldsMap = computed(() =>
      (indexFieldInfo.value.fields ?? []).reduce<Record<string, any>>((map, item) => {
        map[item.field_name] = item;
        return map;
      }, {}),
    );

    const timeField = computed(() => indexFieldInfo.value.time_field ?? '');
    const timeFieldType = computed(() => fieldsMap.value[timeField.value]?.field_type ?? 'date');
    const visibleFields = computed(() =>
      (indexFieldInfo.value.fields ?? []).filter((f) => f.is_display !== false),
    );

    let begin = 0;
    const size = 50;
    let total = 0;

    // 请求参数（本地副本，可被搜索框修改）
    const requestOtherparams = cloneDeep(props.retrieveParams);
    delete (requestOtherparams as any).format;

    watch(
      () => props.logIndex,
      () => { choosedIndex.value = props.logIndex; },
      { immediate: true },
    );

    // ==================== 数据请求 ====================
    const requestLogList = async (isManualSearch = true) => {
      listLoading.value = true;
      try {
        const data = await http.request<{ list: any[]; total: number }>('retrieve/getIndexSetQueryResult', {
          params: { index_set_id: props.indexSetId || retrieveStore.indexId },
          data: {
            ...requestOtherparams,
            sort_list: (indexFieldInfo.value.default_sort_list ?? []).filter(
              (item: any[]) => item.length > 0 && !!item[1],
            ),
            size,
            begin,
          },
        });

        if (data?.list) {
          begin += size;
          total = data.total ?? 0;
          logList.value.push(...data.list);
          if (isManualSearch) {
            choosedIndex.value = -1;
            if (data.list[0]) handleChooseRow(0, data.list[0]);
          }
        }
      } catch (err) {
        console.error('[LogResult] requestLogList error:', err);
      } finally {
        listLoading.value = false;
      }
    };

    // ==================== 行交互 ====================
    const handleChooseRow = (index: number, row: any) => {
      if (choosedIndex.value === index) return;
      choosedIndex.value = index;

      const contextFields = retrieveStore.indexSetOperatorConfig?.contextAndRealtime?.extra?.context_fields;
      const tf = timeField.value;
      const dialogNewParams: Record<string, any> = {
        dtEventTimeStamp: row.dtEventTimeStamp,
      };

      if (Array.isArray(contextFields) && contextFields.length) {
        contextFields.push(tf);
        contextFields.forEach((field: string) => {
          dialogNewParams[field] = parseTableRowData(row, field, '', false, '');
        });
      } else {
        Object.assign(dialogNewParams, row);
      }
      emit('choose-row', dialogNewParams);
    };

    const handleScrollContent = debounce((e: Event) => {
      if (logList.value.length >= total) return;
      const target = e.target as HTMLElement;
      const { scrollTop, scrollHeight, clientHeight } = target;
      if (scrollHeight - scrollTop - clientHeight <= 1) {
        requestLogList(false);
      }
    }, 600);

    const handleReset = () => {
      logList.value = [];
      begin = 0;
    };

    const handleCollpaseToggle = () => {
      isCollapsed.value = !isCollapsed.value;
      emit('toggle-collapse', isCollapsed.value);
    };

    // ==================== 渲染时间列 ====================
    const renderTimeCell = (row: any) => {
      const raw = row[timeField.value];
      return xssFilter(DOMPurify.sanitize(formatDateValue(raw, timeFieldType.value)));
    };

    // ==================== 渲染 JSON 日志列 ====================
    const renderLogCell = (row: any) => {
      const entries = visibleFields.value.length > 0
        ? visibleFields.value.map((f) => [f.field_name, row[f.field_name]])
        : Object.entries(row);

      return (
        <RenderJsonCell>
          <div class='bklog-column-wrapper'>
            {entries.map(([key, val]) => (
              <span key={key} class='json-field'>
                <span class='json-key'>{key}:</span>
                <span class='json-val'>
                  {typeof val === 'object' ? JSON.stringify(val) : String(val ?? '')}
                </span>
              </span>
            ))}
          </div>
        </RenderJsonCell>
      );
    };

    // ==================== 生命周期 ====================
    onMounted(() => {});
    onBeforeUnmount(() => {});

    expose({
      init: () => {
        // 从 store 中获取已有数据
        const outerResult = indexSetQueryResult.value;
        total = outerResult.total ?? 0;
        logList.value = (outerResult.list ?? []).slice();
        begin = logList.value.length;

        if (logList.value.length > 0) {
          handleChooseRow(0, logList.value[0]);
        }
      },
      reset: handleReset,
    });

    const rowStyle = 'font-family: var(--bklog-v3-row-ctx-font); font-size: var(--table-fount-size); color: var(--table-fount-color);';

    return () => (
      <div class='log-result-main'>
        {/* 折叠按钮 */}
        <div class='collapse-main' onClick={handleCollpaseToggle}>
          <i class={`t-icon ${isCollapsed.value ? 't-icon-chevron-right' : 't-icon-chevron-left'}`} />
        </div>

        {/* 标题 */}
        <div class='title-main'>
          <div class='title'>{t('原始日志检索结果')}</div>
          <div class='split-line' />
          <div class='desc'>{t('可切换原始日志，查看该日志的上下文')}</div>
        </div>

        {/* 日志表格 */}
        <div class='content-main' onScroll={handleScrollContent}>
          <t-loading loading={listLoading.value} size='small'>
            <table ref={tableRef} class='log-result-table'>
              <thead>
                <tr class='table-header'>
                  <th style='width:90px;padding-left:42px'>{t('行号')}</th>
                  <th style='width:200px'>{t('时间')}</th>
                  <th style='min-width:300px'>{t('原始日志')}</th>
                </tr>
              </thead>
              <tbody>
                {logList.value.map((row, index) => (
                  <tr
                    key={`${index}_${row.dtEventTimeStamp ?? index}`}
                    class={{ 'is-choosed': choosedIndex.value === index }}
                    onClick={() => handleChooseRow(index, row)}
                  >
                    <td>
                      <div class='index-column'>
                        <span>{index + 1}</span>
                        <div class='choosed-bgd'>
                          <div class='check-icon-main'>
                            <i class='t-icon t-icon-check' />
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={rowStyle} innerHTML={renderTimeCell(row)} />
                    <td style='padding:4px 0'>{renderLogCell(row)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </t-loading>
        </div>
      </div>
    );
  },
});
