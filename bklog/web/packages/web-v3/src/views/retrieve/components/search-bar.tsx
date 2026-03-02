/**
 * search-bar.tsx - 检索搜索栏组件（Vue3 TSX）
 * 对齐原 src/views/retrieve-v3/search-bar/index.tsx 功能：
 * - 索引集选择（单/联合）
 * - 时间范围选择
 * - 关键词输入（UI 模式 / Lucene 模式）
 * - 过滤条件添加
 * - 搜索触发
 */

import { computed, defineComponent, nextTick, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useRetrieveStore } from '@/stores/retrieve';
import { useAppStore } from '@/stores/app';
import { useRetrieveParams } from '@/composables/use-retrieve-params';
import { useResizeObserver } from '@/composables/use-resize-observer';
import type { FilterCondition, IndexSetItem } from '@/types';
import './search-bar.scss';

export default defineComponent({
  name: 'SearchBar',
  emits: ['heightChange'],
  setup(_, { emit }) {
    const { t } = useI18n();
    const retrieveStore = useRetrieveStore();
    const appStore = useAppStore();
    const { syncParamsToUrl } = useRetrieveParams();

    const { indexSetList, indexItem, isSearchLoading, indexId } = storeToRefs(retrieveStore);

    // ==================== 本地状态 ====================
    const searchBarRef = ref<HTMLElement | null>(null);
    const keywordInputRef = ref<HTMLInputElement | null>(null);
    const isIndexSetDropdownVisible = ref(false);
    const indexSetSearchKeyword = ref('');
    const isUnionMode = ref(false);
    const selectedUnionIds = ref<string[]>([]);

    // ==================== 计算属性 ====================
    const currentIndexSet = computed(() => {
      return indexSetList.value.find((item) => String(item.index_set_id) === String(indexId.value));
    });

    const filteredIndexSetList = computed(() => {
      const keyword = indexSetSearchKeyword.value.toLowerCase();
      if (!keyword) return indexSetList.value;
      return indexSetList.value.filter((item) => item.index_set_name.toLowerCase().includes(keyword));
    });

    const searchMode = computed(() => indexItem.value.search_mode || 'ui');

    const keyword = computed({
      get: () => indexItem.value.keyword || '',
      set: (val) => retrieveStore.updateKeyword(val),
    });

    // ==================== 高度监听（通知父组件）====================
    useResizeObserver(searchBarRef, (entry) => {
      const height = entry.contentRect.height;
      emit('heightChange', height);
    });

    // ==================== 索引集选择 ====================
    function handleIndexSetSelect(item: IndexSetItem) {
      isIndexSetDropdownVisible.value = false;
      indexSetSearchKeyword.value = '';
      retrieveStore.setIndexId(item.index_set_id);
      retrieveStore.updateIndexItem({
        ids: [String(item.index_set_id)],
        isUnionIndex: false,
      });
      // 重新加载字段
      retrieveStore.requestIndexSetFieldInfo();
    }

    function handleUnionSelect(id: string) {
      const idx = selectedUnionIds.value.indexOf(id);
      if (idx === -1) {
        selectedUnionIds.value.push(id);
      } else {
        selectedUnionIds.value.splice(idx, 1);
      }
    }

    function confirmUnionSearch() {
      if (!selectedUnionIds.value.length) return;
      retrieveStore.updateIndexItem({
        ids: selectedUnionIds.value,
        isUnionIndex: true,
      });
      isIndexSetDropdownVisible.value = false;
      retrieveStore.requestIndexSetFieldInfo();
    }

    // ==================== 搜索模式切换 ====================
    function toggleSearchMode() {
      const newMode = searchMode.value === 'ui' ? 'lucene' : 'ui';
      retrieveStore.updateIndexItem({ search_mode: newMode });
    }

    // ==================== 执行搜索 ====================
    async function handleSearch() {
      if (isSearchLoading.value) return;
      // 同步 URL
      await syncParamsToUrl();
      // 执行检索
      await retrieveStore.requestIndexSetQuery();
    }

    function handleKeydown(e: KeyboardEvent) {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey || searchMode.value === 'lucene')) {
        handleSearch();
      }
    }

    // ==================== 过滤条件 ====================
    function handleAddFilter(condition: FilterCondition) {
      const addition = [...(indexItem.value.addition || []), condition];
      retrieveStore.updateAddition(addition);
    }

    function handleRemoveFilter(index: number) {
      const addition = [...(indexItem.value.addition || [])];
      addition.splice(index, 1);
      retrieveStore.updateAddition(addition);
    }

    return () => (
      <div ref={searchBarRef} class='search-bar'>
        {/* 第一行：索引集选择 + 时间范围 */}
        <div class='search-bar__row search-bar__row--top'>
          {/* 索引集选择器 */}
          <div class='index-set-selector'>
            <div
              class={['selector-trigger', isIndexSetDropdownVisible.value && 'is-active']}
              onClick={() => (isIndexSetDropdownVisible.value = !isIndexSetDropdownVisible.value)}
            >
              <span class='selector-label'>
                {currentIndexSet.value?.index_set_name || t('请选择索引集')}
              </span>
              <i class='t-icon t-icon-chevron-down' />
            </div>

            {isIndexSetDropdownVisible.value && (
              <div class='index-set-dropdown'>
                {/* 搜索 */}
                <div class='dropdown-search'>
                  <input
                    v-model={indexSetSearchKeyword.value}
                    placeholder={t('搜索索引集')}
                    class='search-input'
                    onClick={(e: Event) => e.stopPropagation()}
                  />
                </div>

                {/* 模式切换 */}
                <div class='dropdown-tabs'>
                  <span
                    class={['tab', !isUnionMode.value && 'is-active']}
                    onClick={() => (isUnionMode.value = false)}
                  >
                    {t('单索引集')}
                  </span>
                  <span
                    class={['tab', isUnionMode.value && 'is-active']}
                    onClick={() => (isUnionMode.value = true)}
                  >
                    {t('联合查询')}
                  </span>
                </div>

                {/* 索引集列表 */}
                <ul class='index-set-list'>
                  {filteredIndexSetList.value.map((item) => (
                    <li
                      key={item.index_set_id}
                      class={[
                        'index-set-item',
                        !isUnionMode.value && String(item.index_set_id) === String(indexId.value) && 'is-active',
                        isUnionMode.value && selectedUnionIds.value.includes(String(item.index_set_id)) && 'is-selected',
                      ]}
                      onClick={() => {
                        if (isUnionMode.value) {
                          handleUnionSelect(String(item.index_set_id));
                        } else {
                          handleIndexSetSelect(item);
                        }
                      }}
                    >
                      {isUnionMode.value && (
                        <input
                          type='checkbox'
                          checked={selectedUnionIds.value.includes(String(item.index_set_id))}
                          onClick={(e: Event) => e.stopPropagation()}
                        />
                      )}
                      <span class='item-name'>{item.index_set_name}</span>
                    </li>
                  ))}
                  {!filteredIndexSetList.value.length && (
                    <li class='index-set-item index-set-item--empty'>{t('暂无数据')}</li>
                  )}
                </ul>

                {/* 联合检索确认 */}
                {isUnionMode.value && (
                  <div class='dropdown-footer'>
                    <button
                      class='confirm-btn'
                      disabled={!selectedUnionIds.value.length}
                      onClick={confirmUnionSearch}
                    >
                      {t('确定')}（{selectedUnionIds.value.length}）
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 时间范围（使用 TDesign DateRangePicker）*/}
          <div class='time-range-wrapper'>
            <t-date-range-picker
              value={[indexItem.value.start_time || '', indexItem.value.end_time || '']}
              mode='date'
              enableTimePicker
              placeholder={[t('开始时间'), t('结束时间')]}
              onChange={(val: string[]) => {
                retrieveStore.updateTimeRange(val[0] || '', val[1] || '', val);
              }}
            />
          </div>
        </div>

        {/* 第二行：关键词输入 + 搜索模式 + 搜索按钮 */}
        <div class='search-bar__row search-bar__row--keyword'>
          {/* 搜索模式切换 */}
          <div class='search-mode-toggle' onClick={toggleSearchMode}>
            <span class={['mode-tag', searchMode.value === 'ui' ? 'mode-tag--ui' : 'mode-tag--lucene']}>
              {searchMode.value === 'ui' ? 'UI' : 'Lucene'}
            </span>
          </div>

          {/* 关键词输入框 */}
          <div class='keyword-input-wrapper'>
            <input
              ref={keywordInputRef}
              class='keyword-input'
              value={keyword.value}
              placeholder={t('请输入搜索关键词')}
              onInput={(e: Event) => {
                keyword.value = (e.target as HTMLInputElement).value;
              }}
              onKeydown={handleKeydown}
            />
          </div>

          {/* 搜索按钮 */}
          <t-button
            class='search-btn'
            theme='primary'
            loading={isSearchLoading.value}
            onClick={handleSearch}
          >
            {t('查询')}
          </t-button>
        </div>

        {/* 第三行：过滤条件 */}
        {(indexItem.value.addition?.length || 0) > 0 && (
          <div class='search-bar__row search-bar__row--addition'>
            {indexItem.value.addition?.map((condition, idx) => (
              <div key={idx} class='filter-tag'>
                <span class='filter-field'>{condition.field}</span>
                <span class='filter-operator'>{condition.operator}</span>
                <span class='filter-value'>{String(condition.value)}</span>
                <i class='t-icon t-icon-close' onClick={() => handleRemoveFilter(idx)} />
              </div>
            ))}
            <div class='filter-add-btn' onClick={() => handleAddFilter({ field: '', operator: '=', value: '' })}>
              <i class='t-icon t-icon-add' />
              {t('添加过滤条件')}
            </div>
          </div>
        )}
      </div>
    );
  },
});
