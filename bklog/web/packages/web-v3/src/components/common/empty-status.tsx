/**
 * empty-status.tsx - 空状态组件（Vue3 TSX）
 * 对齐原 src/components/empty-status
 */

import { defineComponent } from 'vue';
import { useI18n } from 'vue-i18n';
import './empty-status.scss';

export default defineComponent({
  name: 'EmptyStatus',
  props: {
    type: {
      type: String as () => 'empty' | 'search-empty' | 'no-permission' | 'error',
      default: 'empty',
    },
    showText: {
      type: Boolean,
      default: true,
    },
  },
  setup(props) {
    const { t } = useI18n();

    const textMap: Record<string, string> = {
      empty: '暂无数据',
      'search-empty': '搜索结果为空',
      'no-permission': '无权限查看',
      error: '数据加载失败',
    };

    const iconMap: Record<string, string> = {
      empty: 't-icon-inbox',
      'search-empty': 't-icon-search-error',
      'no-permission': 't-icon-lock-on',
      error: 't-icon-close-circle',
    };

    return () => (
      <div class={['empty-status', `empty-status--${props.type}`]}>
        <i class={`t-icon ${iconMap[props.type]} empty-status__icon`} />
        {props.showText && (
          <p class='empty-status__text'>{t(textMap[props.type] || '暂无数据')}</p>
        )}
      </div>
    );
  },
});
