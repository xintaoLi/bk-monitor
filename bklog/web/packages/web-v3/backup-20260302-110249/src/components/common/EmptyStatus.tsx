/**
 * Empty Status 组件 - 空状态展示
 * 从 Vue2 迁移到 Vue3 + TypeScript + TSX
 * 使用 TDesign Empty 组件
 */
import { defineComponent, computed, PropType } from 'vue';
import { Empty } from 'tdesign-vue-next';
import { useI18n } from 'vue-i18n';
import './EmptyStatus.scss';

export type EmptyType = 'empty' | 'search-empty' | '500' | '403';
export type SceneType = 'part' | 'page';

export interface EmptyStatusProps {
  /** 空状态类型 */
  emptyType?: EmptyType;
  /** 场景类型 */
  scene?: SceneType;
  /** 是否显示操作按钮 */
  showOperation?: boolean;
  /** 是否显示文本 */
  showText?: boolean;
}

export default defineComponent({
  name: 'EmptyStatus',
  props: {
    emptyType: {
      type: String as PropType<EmptyType>,
      default: 'empty',
    },
    scene: {
      type: String as PropType<SceneType>,
      default: 'part',
    },
    showOperation: {
      type: Boolean,
      default: true,
    },
    showText: {
      type: Boolean,
      default: true,
    },
  },
  emits: ['operation'],
  setup(props, { emit, slots }) {
    const { t } = useI18n();

    // 默认文本映射
    const defaultTextMap: Record<EmptyType, string> = {
      'empty': t('暂无数据'),
      'search-empty': t('搜索结果为空'),
      '500': t('数据获取异常'),
      '403': t('无业务权限'),
    };

    // 类型文本
    const typeText = computed(() => defaultTextMap[props.emptyType]);

    // 图片类型映射
    const imageType = computed(() => {
      const typeMap: Record<EmptyType, string> = {
        'empty': 'empty',
        'search-empty': 'search',
        '500': 'error',
        '403': 'forbid',
      };
      return typeMap[props.emptyType] || 'empty';
    });

    // 处理操作
    const handleOperation = (type: string) => {
      emit('operation', type);
    };

    // 渲染操作文本
    const renderOperation = () => {
      if (!props.showOperation) return null;

      if (props.emptyType === 'search-empty') {
        return (
          <div class="operation-text">
            {t('可以尝试')}
            <span style="margin: 0 3px">{t('调整关键词')}</span>
            {t('或')}
            <span
              class="operation-btn"
              onClick={() => handleOperation('clear-filter')}
            >
              {t('清空筛选条件')}
            </span>
          </div>
        );
      }

      if (props.emptyType === '500') {
        return (
          <span
            class="operation-btn"
            onClick={() => handleOperation('refresh')}
          >
            {t('刷新')}
          </span>
        );
      }

      return null;
    };

    return {
      typeText,
      imageType,
      renderOperation,
      slots,
    };
  },
  render() {
    const description = () => {
      if (this.$slots.default) {
        return (
          <div class="empty-text-content">
            {this.showText && <p class="empty-text">{this.typeText}</p>}
            <p class="empty-text">{this.$slots.default()}</p>
          </div>
        );
      }

      return (
        <div class="empty-text-content">
          {this.showText && <p class="empty-text">{this.typeText}</p>}
          {this.renderOperation()}
        </div>
      );
    };

    return (
      <div class={['empty-status-container', `scene-${this.scene}`]}>
        <Empty
          image={this.imageType}
          v-slots={{
            description,
          }}
        />
      </div>
    );
  },
});
