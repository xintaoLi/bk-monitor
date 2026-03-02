/**
 * grep-cli.tsx - Grep CLI 输入组件（Vue3 TSX）
 * 迁移自 src/views/retrieve-v3/grep/grep-cli.tsx
 * 变更：
 * - useStore(Vuex) → useRetrieveStore(Pinia)
 * - vue-router/composables → vue-router
 * - bk-select/bk-option/bk-input → TDesign t-select/t-input
 * - useLocale → useI18n
 */
import { defineComponent, ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';
import { debounce } from 'lodash-es';
import { useRetrieveStore } from '@/stores/retrieve';
import GrepCliEditor from './grep-cli-editor';

import './grep-cli.scss';

export default defineComponent({
  name: 'GrepCli',
  props: {
    searchCount: {
      type: Number,
      default: null,
    },
    searchValue: {
      type: String,
      default: '',
    },
    fieldValue: {
      type: String,
      default: '',
    },
  },
  emits: ['search-change', 'match-mode', 'grep-enter', 'field-change'],
  setup(props, { emit }) {
    const route = useRoute();
    const { t } = useI18n();
    const retrieveStore = useRetrieveStore();
    const { indexFieldInfo } = storeToRefs(retrieveStore);

    const grepValue = ref((route.query.grep_query as string) ?? '');

    // 高亮匹配规则
    const matchMode = ref({
      caseSensitive: false,
      regexMode: false,
      wordMatch: false,
    });

    // 只显示 text 类型的字段
    const fieldList = computed(() =>
      (indexFieldInfo.value.fields ?? []).filter((field) => field.field_type === 'text'),
    );

    // 选择字段
    const handleFieldChange = (id: string) => {
      emit('field-change', id);
    };

    // 编辑器内容变化
    const handleEditorChange = (newValue: string) => {
      grepValue.value = newValue;
    };

    // 搜索输入（高亮关键词）
    const handleSearchInput = debounce((value: string) => {
      emit('search-change', {
        content: value,
        searchValue: value,
        matchMode: matchMode.value,
      });
    }, 300);

    // 匹配模式切换
    const toggleCaseSensitive = () => {
      matchMode.value.caseSensitive = !matchMode.value.caseSensitive;
      emit('match-mode', { ...matchMode.value });
    };

    const toggleRegexMode = () => {
      matchMode.value.regexMode = !matchMode.value.regexMode;
      emit('match-mode', { ...matchMode.value });
    };

    const toggleWordMatch = () => {
      matchMode.value.wordMatch = !matchMode.value.wordMatch;
      emit('match-mode', { ...matchMode.value });
    };

    const handleEditorEnter = (value: string) => {
      emit('grep-enter', value);
    };

    return () => (
      <div class='grep-cli-container grep-cli-flex'>
        {/* 左侧：字段选择 + 编辑器 */}
        <div class='grep-cli-left'>
          <div style={{ display: 'flex', alignItems: 'center', width: '128px' }}>
            <span class='grep-cli-label'>{t('字段')}:</span>
            <t-select
              style='min-width: 80px; border: none;'
              class='grep-cli-select'
              size='small'
              value={props.fieldValue}
              onChange={handleFieldChange}
            >
              {fieldList.value.map((option) => (
                <t-option
                  key={option.field_name}
                  value={option.field_name}
                  label={option.field_name}
                />
              ))}
            </t-select>
          </div>
          <div class='grep-cli-editor'>
            <GrepCliEditor
              placeholder={
                '"Common Text" | -i "ignore-case text" | -v "excluded text" | -E "regex match like [0-9]+" | -iv -E "multiple options"'
              }
              autoHeight={true}
              maxHeight='160px'
              minHeight='34px'
              value={grepValue.value}
              onChange={handleEditorChange}
              onEnter={handleEditorEnter}
            />
          </div>
        </div>

        {/* 右侧：搜索高亮 + 匹配模式 */}
        <div class='grep-cli-right'>
          <div class='grep-cli-search-section'>
            <t-input
              class='grep-cli-search-input'
              clearable
              placeholder={t('输入后高亮')}
              size='small'
              value={props.searchValue}
              onChange={handleSearchInput}
            />
            {/* 匹配模式按钮组 */}
            <div class='match-mode-group'>
              <span
                class={['match-mode-btn', matchMode.value.caseSensitive && 'is-active']}
                title={t('区分大小写')}
                onClick={toggleCaseSensitive}
              >
                Aa
              </span>
              <span
                class={['match-mode-btn', matchMode.value.wordMatch && 'is-active']}
                title={t('全词匹配')}
                onClick={toggleWordMatch}
              >
                [W]
              </span>
              <span
                class={['match-mode-btn', matchMode.value.regexMode && 'is-active']}
                title={t('正则匹配')}
                onClick={toggleRegexMode}
              >
                .*
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  },
});
