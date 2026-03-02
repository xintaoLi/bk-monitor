/**
 * auth-dialog.tsx - 鉴权弹窗组件（Vue3 TSX）
 * 对齐原 src/components/auth 功能：
 * - 展示需要申请的权限列表
 * - 跳转权限申请页
 */

import { defineComponent } from 'vue';
import { useI18n } from 'vue-i18n';
import type { AuthInfo } from '@/types';
import './auth-dialog.scss';

export default defineComponent({
  name: 'AuthDialog',
  props: {
    permission: {
      type: Object as () => AuthInfo | null,
      default: null,
    },
  },
  emits: ['close'],
  setup(props, { emit }) {
    const { t } = useI18n();

    function handleApply() {
      const applyUrl = props.permission?.apply_url;
      if (applyUrl) {
        window.open(applyUrl, '_blank');
      }
      emit('close');
    }

    return () => (
      <t-dialog
        visible
        header={t('无权限访问')}
        confirmBtn={t('去申请')}
        cancelBtn={t('取消')}
        onConfirm={handleApply}
        onClose={() => emit('close')}
        onCancel={() => emit('close')}
      >
        <div class='auth-dialog-content'>
          <p class='auth-dialog-desc'>{t('您没有以下操作权限，请申请后再访问：')}</p>
          {props.permission?.permission && (
            <ul class='auth-dialog-list'>
              {Object.entries(props.permission.permission).map(([action, resources]) => (
                <li key={action} class='auth-dialog-item'>
                  <span class='item-action'>{action}</span>
                  {Array.isArray(resources) && resources.length > 0 && (
                    <span class='item-resources'>
                      {(resources as string[]).join(', ')}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </t-dialog>
    );
  },
});
