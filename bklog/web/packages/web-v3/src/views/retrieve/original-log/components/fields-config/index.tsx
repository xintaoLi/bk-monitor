/**
 * fields-config/index.tsx - 字段显示配置组件（Vue3 TSX）
 * 迁移自 retrieve-v3/search-result/original-log/components/data-filter/fields-config/index.tsx
 * 变更：
 * - useStore(Vuex) → useRetrieveStore(Pinia)
 * - messageSuccess(bkmagic) → TDesign MessagePlugin
 * - useLocale → useI18n
 * - VueDraggable → sortablejs 原生拖拽
 * - bk-button → t-button
 */
import { computed, defineComponent, onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { MessagePlugin } from 'tdesign-vue-next';
import { useRetrieveStore } from '@/stores/retrieve';
import http from '@/api';

import './index.scss';

export default defineComponent({
  name: 'FieldsConfig',
  setup(_, { emit, expose }) {
    const { t } = useI18n();
    const retrieveStore = useRetrieveStore();
    const { indexFieldInfo, indexId } = storeToRefs(retrieveStore);

    const fieldConfigRef = ref<HTMLElement>();
    const displayFieldNames = ref<string[]>([]);
    const confirmLoading = ref(false);

    // 拖拽相关
    let dragSrc: number | null = null;

    const totalFieldNames = computed(() => (indexFieldInfo.value.fields ?? []).map((f) => f.field_name));
    const restFieldNames = computed(() =>
      totalFieldNames.value.filter((field) => !displayFieldNames.value.includes(field)),
    );
    const disabledRemove = computed(() => displayFieldNames.value.length <= 1);

    // 监听 store 中的字段配置变化
    watch(
      () => retrieveStore.catchFieldCustomConfig?.contextDisplayFields,
      (fields) => {
        if (fields?.length > 0) {
          displayFieldNames.value = fields.filter((f: string) => totalFieldNames.value.includes(f));
        }
        setTimeout(() => emit('success', displayFieldNames.value));
      },
      { immediate: true, deep: true },
    );

    // ==================== 拖拽排序（原生 HTML5 DnD）====================
    const handleDragStart = (index: number) => {
      dragSrc = index;
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleDrop = (e: DragEvent, targetIndex: number) => {
      e.preventDefault();
      if (dragSrc === null || dragSrc === targetIndex) return;
      const arr = [...displayFieldNames.value];
      const [removed] = arr.splice(dragSrc, 1);
      arr.splice(targetIndex, 0, removed);
      displayFieldNames.value = arr;
      dragSrc = null;
    };

    // ==================== 操作 ====================
    const removeItem = (index: number) => {
      if (!disabledRemove.value) {
        displayFieldNames.value.splice(index, 1);
      }
    };

    const addItem = (fieldName: string) => {
      displayFieldNames.value.push(fieldName);
    };

    const handleConfirm = async () => {
      confirmLoading.value = true;
      try {
        await http.request('retrieve/userFieldConfigChange', {
          params: { index_set_id: indexId.value },
          data: { contextDisplayFields: displayFieldNames.value },
        });
        MessagePlugin.success(t('设置成功'));
        emit('success', displayFieldNames.value);
      } catch (err: any) {
        MessagePlugin.error(err?.message || t('设置失败'));
      } finally {
        confirmLoading.value = false;
      }
    };

    const handleCancel = () => {
      emit('cancel');
    };

    expose({
      getDom: () => fieldConfigRef.value,
    });

    return () => (
      <div style='display: none'>
        <div ref={fieldConfigRef} class='fields-config-tippy'>
          <div class='config-title'>{t('设置显示与排序')}</div>
          <div class='field-list-container'>
            {/* 已选字段（可拖拽排序） */}
            <div class='field-list'>
              <div class='list-title'>
                {t('显示字段')}（{t('已选')} {displayFieldNames.value.length} {t('条')}）
              </div>
              <ul>
                {displayFieldNames.value.map((field, index) => (
                  <li
                    key={field}
                    class='list-item display-item'
                    draggable={true}
                    onDragstart={() => handleDragStart(index)}
                    onDragover={handleDragOver}
                    onDrop={(e) => handleDrop(e, index)}
                  >
                    <span class='icon bklog-icon bklog-drag-dots drag-handle' />
                    <div class='field_name'>{field}</div>
                    <div
                      class={['operate-button', disabledRemove.value && 'disabled']}
                      onClick={() => removeItem(index)}
                    >
                      {t('删除')}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            {/* 其他字段 */}
            <div class='field-list'>
              <div class='list-title'>{t('其他字段')}</div>
              <ul>
                {restFieldNames.value.map((field) => (
                  <li key={field} class='list-item rest-item'>
                    <div class='field_name'>{field}</div>
                    <div class='operate-button' onClick={() => addItem(field)}>
                      {t('添加')}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div class='config-buttons'>
            <t-button
              style='margin-right: 8px'
              loading={confirmLoading.value}
              size='small'
              theme='primary'
              onClick={handleConfirm}
            >
              {t('确定')}
            </t-button>
            <t-button style='margin-right: 24px' size='small' onClick={handleCancel}>
              {t('取消')}
            </t-button>
          </div>
        </div>
      </div>
    );
  },
});
