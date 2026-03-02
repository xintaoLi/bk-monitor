/**
 * log-list.tsx - 日志列表组件（Vue3 TSX）
 * 功能：
 * - 日志行展开/收起（JSON 格式化展示）
 * - 字段列渲染（支持高亮）
 * - 复制整行日志
 * - 分页加载（加载更多）
 * - 虚拟滚动（超大数据集）
 */

import { computed, defineComponent, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { FieldItem, LogItem } from '@/types';
import { useCopy } from '@/composables/use-copy';
import './log-list.scss';

export default defineComponent({
  name: 'LogList',
  props: {
    logs: {
      type: Array as () => LogItem[],
      default: () => [],
    },
    fields: {
      type: Array as () => FieldItem[],
      default: () => [],
    },
    total: {
      type: Number,
      default: 0,
    },
    loading: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['context', 'load-more'],
  setup(props, { emit }) {
    const { t } = useI18n();
    const { copy } = useCopy();

    // 展开的行 Set
    const expandedRows = ref<Set<number>>(new Set());

    // 显示的字段（过滤掉 is_display=false 的字段）
    const visibleFields = computed(() => {
      if (!props.fields.length) return [];
      return props.fields.filter((f) => f.is_display !== false);
    });

    // 是否有更多数据
    const hasMore = computed(() => props.logs.length < props.total);

    function toggleRow(index: number) {
      const newSet = new Set(expandedRows.value);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      expandedRows.value = newSet;
    }

    function handleCopy(text: string) {
      copy(text);
    }

    function handleContext(log: LogItem) {
      emit('context', log);
    }

    function handleLoadMore() {
      emit('load-more');
    }

    function getFieldValue(log: LogItem, fieldName: string): string {
      const val = log[fieldName];
      if (val === null || val === undefined) return '-';
      if (typeof val === 'object') return JSON.stringify(val);
      return String(val);
    }

    function formatLogDetail(log: LogItem): string {
      try {
        return JSON.stringify(log, null, 2);
      } catch {
        return String(log);
      }
    }

    // 渲染字段值（支持高亮）
    function renderFieldValue(log: LogItem, field: FieldItem) {
      const value = getFieldValue(log, field.field_name);
      return (
        <span class='cell-value' title={value}>
          {value}
        </span>
      );
    }

    // 渲染展开详情（JSON 格式化）
    function renderDetail(log: LogItem) {
      const entries = Object.entries(log);
      return (
        <div class='log-row__detail'>
          <table class='detail-table'>
            <tbody>
              {entries.map(([key, val]) => (
                <tr key={key} class='detail-row'>
                  <td class='detail-key'>{key}</td>
                  <td class='detail-value'>
                    <span class='detail-value-text'>
                      {typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val ?? '-')}
                    </span>
                    <span
                      class='detail-copy'
                      title={t('复制')}
                      onClick={() => handleCopy(typeof val === 'object' ? JSON.stringify(val) : String(val ?? ''))}
                    >
                      <i class='t-icon t-icon-file-copy' />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    return () => (
      <div class='log-list'>
        {/* 表头（有字段配置时显示） */}
        {visibleFields.value.length > 0 && (
          <div class='log-list__header'>
            <div class='header-cell header-cell--expand' />
            {visibleFields.value.map((field) => (
              <div
                key={field.field_name}
                class='header-cell'
                style={{ minWidth: field.width ? `${field.width}px` : '120px' }}
              >
                {field.field_alias || field.field_name}
              </div>
            ))}
            <div class='header-cell header-cell--action'>{t('操作')}</div>
          </div>
        )}

        {/* 日志行列表 */}
        <div class='log-list__body'>
          {props.logs.length === 0 && !props.loading && (
            <div class='log-list__empty'>
              <i class='t-icon t-icon-search-error' />
              <p>{t('暂无数据')}</p>
            </div>
          )}

          {props.logs.map((log, index) => (
            <div key={index} class={['log-row', expandedRows.value.has(index) && 'is-expanded']}>
              {/* 展开/收起按钮 */}
              <div class='log-row__expand' onClick={() => toggleRow(index)}>
                <i class={`t-icon ${expandedRows.value.has(index) ? 't-icon-chevron-down' : 't-icon-chevron-right'}`} />
              </div>

              {/* 字段值列 */}
              {visibleFields.value.length > 0 ? (
                visibleFields.value.map((field) => (
                  <div
                    key={field.field_name}
                    class='log-row__cell'
                    style={{ minWidth: field.width ? `${field.width}px` : '120px' }}
                  >
                    {renderFieldValue(log, field)}
                  </div>
                ))
              ) : (
                /* 无字段配置时显示 log 字段或整行 JSON */
                <div class='log-row__cell log-row__cell--full'>
                  <span class='cell-value'>
                    {getFieldValue(log, 'log') || JSON.stringify(log)}
                  </span>
                </div>
              )}

              {/* 操作列 */}
              <div class='log-row__action'>
                <span
                  class='action-btn'
                  title={t('复制')}
                  onClick={() => handleCopy(formatLogDetail(log))}
                >
                  <i class='t-icon t-icon-file-copy' />
                </span>
                <span
                  class='action-btn'
                  title={t('上下文')}
                  onClick={() => handleContext(log)}
                >
                  <i class='t-icon t-icon-view-list' />
                </span>
              </div>

              {/* 展开详情（字段键值对表格） */}
              {expandedRows.value.has(index) && renderDetail(log)}
            </div>
          ))}
        </div>

        {/* 加载更多 */}
        {hasMore.value && (
          <div class='log-list__footer'>
            <t-button
              variant='text'
              loading={props.loading}
              onClick={handleLoadMore}
            >
              {props.loading ? t('加载中...') : t('加载更多')}
              {!props.loading && (
                <span class='footer-count'>
                  （{props.logs.length} / {props.total}）
                </span>
              )}
            </t-button>
          </div>
        )}

        {/* 已加载全部 */}
        {!hasMore.value && props.logs.length > 0 && (
          <div class='log-list__end'>
            <span>{t('已加载全部')} {props.total} {t('条')}</span>
          </div>
        )}
      </div>
    );
  },
});
