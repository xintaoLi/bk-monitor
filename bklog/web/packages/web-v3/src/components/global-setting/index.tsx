/**
 * index.tsx - 全局设置弹窗（Vue3 TSX）
 * 对齐原 src/components/global-setting 功能：
 * - 我申请的权限
 * - 我的订阅
 * - 全局脱敏设置
 */

import { defineComponent, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useAppStore } from '@/stores/app';
import './index.scss';

export default defineComponent({
  name: 'GlobalSettingDialog',
  props: {
    activeTab: {
      type: String,
      default: '',
    },
  },
  emits: ['close'],
  setup(props, { emit }) {
    const { t } = useI18n();
    const appStore = useAppStore();
    const { globalSettingList } = storeToRefs(appStore);

    const currentTab = ref(props.activeTab || '');

    // 初始化默认 tab
    if (!currentTab.value && globalSettingList.value.length) {
      currentTab.value = (globalSettingList.value[0] as { id: string }).id;
    }

    return () => (
      <t-dialog
        visible
        width={800}
        header={t('全局设置')}
        footer={false}
        onClose={() => emit('close')}
      >
        <div class='global-setting-dialog'>
          {/* Tab 导航 */}
          <div class='setting-tabs'>
            {(globalSettingList.value as { id: string; name: string }[]).map((item) => (
              <div
                key={item.id}
                class={['tab-item', currentTab.value === item.id && 'is-active']}
                onClick={() => (currentTab.value = item.id)}
              >
                {item.name}
              </div>
            ))}
          </div>

          {/* Tab 内容 */}
          <div class='setting-content'>
            {currentTab.value === 'my-applied' && (
              <div class='setting-panel'>
                <p style={{ color: '#63656e', fontSize: '13px' }}>{t('我申请的权限列表')}</p>
              </div>
            )}
            {currentTab.value === 'my-report' && (
              <div class='setting-panel'>
                <p style={{ color: '#63656e', fontSize: '13px' }}>{t('我的订阅列表')}</p>
              </div>
            )}
            {currentTab.value === 'masking-setting' && (
              <div class='setting-panel'>
                <p style={{ color: '#63656e', fontSize: '13px' }}>{t('全局脱敏配置')}</p>
              </div>
            )}
          </div>
        </div>
      </t-dialog>
    );
  },
});
