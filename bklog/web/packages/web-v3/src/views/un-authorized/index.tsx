/**
 * index.tsx - 无权限页面（Vue3 TSX）
 */

import { defineComponent } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import './index.scss';

export default defineComponent({
  name: 'UnAuthorizedView',
  setup() {
    const { t } = useI18n();
    const router = useRouter();

    return () => (
      <div class='un-authorized-view'>
        <div class='un-authorized-content'>
          <i class='t-icon t-icon-lock-on un-authorized-icon' />
          <h2 class='un-authorized-title'>{t('无权限访问')}</h2>
          <p class='un-authorized-desc'>{t('您没有访问该页面的权限，请联系管理员申请权限')}</p>
          <t-button theme='primary' onClick={() => router.push('/')}>
            {t('返回首页')}
          </t-button>
        </div>
      </div>
    );
  },
});
