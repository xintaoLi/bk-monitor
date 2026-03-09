/**
 * Log Button 组件 - 日志操作按钮
 * 从 Vue2 迁移到 Vue3 + TypeScript + TSX
 * 替换 bkui-vue 为 TDesign Vue Next
 */
import { defineComponent, computed, PropType } from 'vue';
import { Button, Tooltip } from 'tdesign-vue-next';

export interface LogButtonProps {
  /** 按钮主题 */
  theme?: 'primary' | 'default' | 'success' | 'warning' | 'danger';
  /** 按钮文字 */
  buttonText?: string;
  /** 是否为文字按钮 */
  text?: boolean;
  /** 额外的类名 */
  extCls?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 提示配置 */
  tipsConf?: string | {
    content?: string;
    placement?: 'top' | 'bottom' | 'left' | 'right';
    [key: string]: any;
  };
}

export default defineComponent({
  name: 'LogButton',
  props: {
    theme: {
      type: String as PropType<LogButtonProps['theme']>,
      default: 'default',
    },
    buttonText: {
      type: String,
      default: '',
    },
    text: {
      type: Boolean,
      default: false,
    },
    extCls: {
      type: String,
      default: '',
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    tipsConf: {
      type: [String, Object] as PropType<LogButtonProps['tipsConf']>,
      default: '',
    },
  },
  emits: ['click'],
  setup(props, { emit }) {
    // 计算 tooltip 配置
    const tooltipConfig = computed(() => {
      const conf = typeof props.tipsConf === 'string' 
        ? { content: props.tipsConf } 
        : props.tipsConf || {};
      
      return {
        content: conf.content || '',
        placement: conf.placement || 'top',
        delay: conf.delay || 100,
        showArrow: conf.showArrow !== false,
      };
    });

    // 是否显示 tooltip
    const showTooltip = computed(() => {
      return props.disabled && tooltipConfig.value.content !== '';
    });

    // 处理点击事件
    const handleClick = (e: MouseEvent) => {
      e.stopPropagation();
      if (!props.disabled) {
        emit('click', e);
      }
    };

    return {
      tooltipConfig,
      showTooltip,
      handleClick,
    };
  },
  render() {
    const buttonContent = (
      <Button
        theme={this.theme}
        variant={this.text ? 'text' : 'base'}
        disabled={this.disabled}
        class={['log-button', this.extCls]}
        onClick={this.handleClick}
      >
        {this.buttonText || this.$slots.default?.()}
      </Button>
    );

    // 如果需要显示 tooltip，则包裹 Tooltip 组件
    if (this.showTooltip) {
      return (
        <Tooltip
          content={this.tooltipConfig.content}
          placement={this.tooltipConfig.placement}
          delay={this.tooltipConfig.delay}
          showArrow={this.tooltipConfig.showArrow}
        >
          {buttonContent}
        </Tooltip>
      );
    }

    return buttonContent;
  },
});
