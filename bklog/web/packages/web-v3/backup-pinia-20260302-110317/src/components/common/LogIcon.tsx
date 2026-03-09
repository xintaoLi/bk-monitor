/**
 * Log Icon 组件 - 日志图标组件
 * 从 Vue2 迁移到 Vue3 + TypeScript + TSX
 * 使用 TDesign Icon 或自定义 SVG 图标
 */
import { defineComponent, computed, PropType } from 'vue';
import './LogIcon.scss';

export interface LogIconProps {
  /** 是否使用 SVG */
  svg?: boolean;
  /** 图标类型 */
  type: string;
  /** 是否为通用图标 (bk-icon) */
  common?: boolean;
  /** 图标大小 */
  size?: string | number;
  /** 图标颜色 */
  color?: string;
}

export default defineComponent({
  name: 'LogIcon',
  props: {
    svg: {
      type: Boolean,
      default: false,
    },
    type: {
      type: String,
      required: true,
    },
    common: {
      type: Boolean,
      default: false,
    },
    size: {
      type: [String, Number] as PropType<string | number>,
      default: '',
    },
    color: {
      type: String,
      default: '',
    },
  },
  emits: ['click'],
  setup(props, { emit }) {
    // 图标前缀
    const commonPrefix = computed(() => (props.common ? 'bk' : 'bklog'));
    const iconPrefix = computed(() => (props.common ? 'icon' : 'bklog'));

    // 图标样式
    const iconStyle = computed(() => {
      const style: Record<string, string> = {};
      if (props.size) {
        const size = typeof props.size === 'number' ? `${props.size}px` : props.size;
        style.fontSize = size;
        style.width = size;
        style.height = size;
      }
      if (props.color) {
        style.color = props.color;
      }
      return style;
    });

    // 处理点击事件
    const handleClick = (e: MouseEvent) => {
      emit('click', e);
    };

    return {
      commonPrefix,
      iconPrefix,
      iconStyle,
      handleClick,
    };
  },
  render() {
    // SVG 图标
    if (this.svg) {
      return (
        <svg
          class="log-svg-icon"
          style={this.iconStyle}
          onClick={this.handleClick}
        >
          <title>{this.type}</title>
          <use xlinkHref={`#${this.iconPrefix}-${this.type}`} />
        </svg>
      );
    }

    // 字体图标
    const classes = {
      [`${this.iconPrefix}-${this.type}`]: true,
      [`${this.commonPrefix}-icon`]: true,
      'log-icon': true,
    };

    return (
      <i
        class={classes}
        style={this.iconStyle}
        onClick={this.handleClick}
      />
    );
  },
});
