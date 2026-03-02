/**
 * data-filter/index.tsx - 日志过滤工具栏（Vue3 TSX）
 * 迁移自 retrieve-v3/search-result/original-log/components/data-filter/index.tsx
 * 变更：
 * - bk-select/bk-option → t-select/t-option
 * - bk-input → t-input
 * - bk-tag-input → t-tag-input
 * - bk-checkbox → t-checkbox
 * - bk-button → t-button
 * - useLocale → useI18n
 * - deepClone/@/common/util → @/utils/index
 * - tippy.js → TDesign t-popup
 */
import { computed, defineComponent, nextTick, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { cloneDeep } from 'lodash-es';
import tippy from 'tippy.js';
import { contextHighlightColor, deepClone } from '@/utils/index';
import FieldsConfig from '../fields-config/index';
import HighlightControl from '../highlight-control/index';

import './index.scss';

export default defineComponent({
  name: 'DataFilter',
  props: {
    isRealTime: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['handle-filter', 'toggle-poll', 'copy', 'fix-current-row', 'fields-config-update'],
  setup(props, { emit, expose }) {
    const { t } = useI18n();

    const fieldConfigRef = ref<any>(null);
    const highlightControlRef = ref<any>(null);
    const tagInputRef = ref<any>(null);

    const filterType = ref('include');
    const filterKey = ref('');
    const catchFilterKey = ref('');
    const ignoreCase = ref(false);
    const highlightList = ref<string[]>([]);
    const colorHighlightList = ref<any[]>([]);
    const intervalSwitcher = ref(true);
    const showType = ref('log');
    const isPolling = ref(true);
    const interval = ref({ prev: 0, next: 0 });

    const filterTypeList = [
      { id: 'include', name: t('包含') },
      { id: 'uninclude', name: t('不包含') },
    ];

    const tipColorList = [
      { color: '#E1ECFF', name: t('默认定位') },
      { color: '#FAEEB1', name: t('上下文命中') },
      { color: '#CBF0DA', name: t('新增') },
    ];

    const baseInterval = { prev: 0, next: 0 };

    let fieldConfigPopoverInstance: any = null;

    watch(ignoreCase, () => {
      emit('handle-filter', 'ignoreCase', ignoreCase.value);
    });

    watch(
      interval,
      () => {
        emit('handle-filter', 'interval', intervalSwitcher.value ? interval.value : baseInterval);
      },
      { deep: true },
    );

    const catchColorIndexList = computed(() => colorHighlightList.value.map((item) => item.colorIndex));

    const filterLog = () => {
      catchFilterKey.value = filterKey.value;
      emit('handle-filter', 'filterKey', filterKey.value);
    };

    const blurFilterLog = () => {
      if (!catchFilterKey.value && !filterKey.value) return;
      filterLog();
    };

    const changeLightList = () => {
      const colorIndex = contextHighlightColor.findIndex((_, index) => !catchColorIndexList.value.includes(index));
      const catchCloneColorList = deepClone(colorHighlightList.value);
      colorHighlightList.value = highlightList.value.map((item) => {
        const notChangeItem = catchCloneColorList.find((cItem: any) => cItem.heightKey === item);
        if (notChangeItem) return notChangeItem;
        return {
          heightKey: item,
          colorIndex,
          color: contextHighlightColor[colorIndex],
        };
      });
      nextTick(() => initTagInputColor());
      emit('handle-filter', 'highlightList', colorHighlightList.value);
    };

    const handleFilterType = (val: string) => {
      filterType.value = val;
      emit('handle-filter', 'filterType', val);
    };

    const handleSelectShowType = (type: string) => {
      showType.value = type;
      emit('handle-filter', 'showType', type);
    };

    const handleChangeIntervalShow = (state: boolean) => {
      intervalSwitcher.value = state;
      emit('handle-filter', 'interval', state ? interval.value : baseInterval);
    };

    const pasteFn = (pasteValue: string) => {
      const trimPasteValue = pasteValue.trim();
      if (!highlightList.value.includes(trimPasteValue) && highlightList.value.length < 5) {
        highlightList.value.push(trimPasteValue);
        changeLightList();
      }
      return [];
    };

    const initTagInputColor = () => {
      if (!tagInputRef.value?.$el) return;
      const childEl = tagInputRef.value.$el.querySelectorAll('.key-node');
      childEl.forEach((child: HTMLElement) => {
        const tag = child.querySelectorAll('.tag')[0] as HTMLElement;
        if (!tag) return;
        const colorObj = colorHighlightList.value.find((item) => item.heightKey === tag.innerText);
        if (!colorObj) return;
        [child, tag].forEach((item) => {
          Object.assign((item as HTMLElement).style, { backgroundColor: colorObj.color.light });
        });
      });
    };

    const handleOpenFieldsConfig = (e: MouseEvent) => {
      if (!fieldConfigPopoverInstance) {
        fieldConfigPopoverInstance = tippy(e.target as Element, {
          allowHTML: true,
          appendTo: () => document.body,
          content: fieldConfigRef.value?.getDom(),
          placement: 'bottom',
          trigger: 'click',
          maxWidth: 380,
          theme: 'light field-config-popover',
          hideOnClick: false,
          interactive: true,
          arrow: true,
        });
      }
      fieldConfigPopoverInstance.show();
    };

    const handleTogglePolling = () => {
      isPolling.value = !isPolling.value;
      emit('toggle-poll', isPolling.value);
    };

    const handleFieldConfigSuccess = (list: string[]) => {
      fieldConfigPopoverInstance?.hide();
      emit('fields-config-update', list);
    };

    expose({
      reset: () => {
        isPolling.value = true;
        highlightList.value = [];
        interval.value = cloneDeep(baseInterval);
        ignoreCase.value = false;
        filterKey.value = '';
        showType.value = 'log';
        filterType.value = 'include';
        fieldConfigPopoverInstance?.hide();
      },
      getHighlightControl: () => highlightControlRef.value,
    });

    return () => (
      <div class='filter-bar-main'>
        {/* 顶部行：过滤 + 高亮 */}
        <div class='filter-item-top'>
          <div class='filter-main'>
            <t-select
              class='filter-select-main'
              clearable={false}
              value={filterType.value}
              onChange={handleFilterType}
              style='min-width: 80px;'
            >
              {filterTypeList.map((option) => (
                <t-option key={option.id} value={option.id} label={option.name} />
              ))}
            </t-select>
            <t-input
              class='filter-key-input'
              placeholder={t('输入关键字进行过滤')}
              value={filterKey.value}
              clearable
              onBlur={blurFilterLog}
              onChange={(value: string) => { filterKey.value = value; }}
              onClear={filterLog}
              onEnter={filterLog}
            />
          </div>

          <div class='highlight-main'>
            <div class='prefix-text'>{t('高亮')}</div>
            <t-tag-input
              ref={tagInputRef}
              class='highlight-tag-input'
              value={highlightList.value}
              onChange={(value: string[]) => {
                highlightList.value = value;
                changeLightList();
              }}
            />
            {highlightList.value.length > 0 && (
              <HighlightControl
                ref={highlightControlRef}
                lightList={highlightList.value}
                showType={showType.value}
              />
            )}
          </div>

          {props.isRealTime && (
            <div class='realtime-control-main'>
              <div class='control-item play-pause' onClick={handleTogglePolling}>
                <i class={`t-icon ${isPolling.value ? 't-icon-pause-circle' : 't-icon-play-circle'}`} />
              </div>
              <div class='control-item' onClick={() => emit('copy')}>
                <i class='t-icon t-icon-file-copy' />
              </div>
            </div>
          )}
        </div>

        {/* 底部行：大小写 + 前后行 + 颜色说明 + 定位 + 显示类型 + 设置 */}
        <div class='filter-item-bottom'>
          <div class='operate-left'>
            <t-checkbox
              style='margin-right: 6px'
              checked={ignoreCase.value}
              onChange={(value: boolean) => { ignoreCase.value = value; }}
            />
            <span>{t('大小写敏感')}</span>

            {filterType.value === 'include' && (
              <div style='margin-left: 14px' class='row-control'>
                <t-checkbox
                  style='margin-right: 6px'
                  checked={intervalSwitcher.value}
                  onChange={handleChangeIntervalShow}
                />
                <span>{t('显示前')}</span>
                <t-input
                  class='row-control-input'
                  style='width: 60px; margin: 0 4px;'
                  type='number'
                  size='small'
                  value={String(interval.value.prev)}
                  onChange={(v: string) => { interval.value.prev = Number(v); }}
                />
                <span>{t('行')}</span>
                <span>，</span>
                <span>{t('后')}</span>
                <t-input
                  class='row-control-input'
                  style='width: 60px; margin: 0 4px;'
                  type='number'
                  size='small'
                  value={String(interval.value.next)}
                  onChange={(v: string) => { interval.value.next = Number(v); }}
                />
                <span>{t('行')}</span>
              </div>
            )}
          </div>

          <div class='operate-right'>
            <div class='color-tip-main'>
              {tipColorList.map((item, index) => (
                <div key={index} class='color-item'>
                  <div style={{ background: item.color }} class='rect' />
                  <div>{item.name}</div>
                </div>
              ))}
            </div>

            <t-button variant='outline' size='small' onClick={() => emit('fix-current-row')}>
              <i class='icon bklog-icon bklog-position' style='font-size:14px; margin-right:5px' />
              <span style='font-size:12px'>{t('定位到当前行')}</span>
            </t-button>

            <div class='log-display-type-main'>
              <div
                class={['type-item', showType.value === 'log' && 'is-selected']}
                onClick={() => handleSelectShowType('log')}
              >
                {t('日志')}
              </div>
              <div
                class={['type-item', showType.value === 'code' && 'is-selected']}
                onClick={() => handleSelectShowType('code')}
              >
                {t('代码')}
              </div>
            </div>

            {!props.isRealTime && (
              <div class='setting-main' onClick={handleOpenFieldsConfig}>
                <i class='icon bklog-icon bklog-set-icon' style='font-size: 16px' />
              </div>
            )}
          </div>
        </div>

        <FieldsConfig
          ref={fieldConfigRef}
          onCancel={() => fieldConfigPopoverInstance?.hide()}
          onSuccess={handleFieldConfigSuccess}
        />
      </div>
    );
  },
});
