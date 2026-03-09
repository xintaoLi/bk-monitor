/*
 * Tencent is pleased to support the open source community by making
 * 蓝鲸智云PaaS平台 (BlueKing PaaS) available.
 *
 * Copyright (C) 2021 THL A29 Limited, a Tencent company.  All rights reserved.
 *
 * 蓝鲸智云PaaS平台 (BlueKing PaaS) is licensed under the MIT License.
 */
import { defineComponent, computed, type PropType } from 'vue'
import { Button as TButton, Tooltip as TTooltip } from 'tdesign-vue-next'
import './log-button.scss'

export type ButtonTheme = 'default' | 'primary' | 'success' | 'warning' | 'danger'

export interface LogButtonProps {
  /** 按钮主题 */
  theme?: ButtonTheme
  /** 按钮文本 */
  buttonText?: string
  /** 是否为文本按钮 */
  text?: boolean
  /** 额外类名 */
  extCls?: string
  /** 是否禁用 */
  disabled?: boolean
  /** 提示配置 */
  tipsConf?: string | { content: string; placement?: string }
}

/**
 * 日志按钮组件
 * 带 tooltip 提示的按钮封装
 */
export const LogButton = defineComponent({
  name: 'LogButton',
  props: {
    theme: {
      type: String as PropType<ButtonTheme>,
      default: 'default',
    },
    buttonText: {
      type: String as PropType<string>,
      default: '',
    },
    text: {
      type: Boolean as PropType<boolean>,
      default: false,
    },
    extCls: {
      type: String as PropType<string>,
      default: '',
    },
    disabled: {
      type: Boolean as PropType<boolean>,
      default: false,
    },
    tipsConf: {
      type: [String, Object] as PropType<string | { content: string; placement?: string }>,
      default: '',
    },
  },
  emits: ['click'],
  setup(props, { emit, slots }) {
    const tooltipContent = computed(() => {
      if (typeof props.tipsConf === 'string') {
        return props.tipsConf
      }
      return props.tipsConf?.content || ''
    })

    const tooltipPlacement = computed(() => {
      if (typeof props.tipsConf === 'object') {
        return props.tipsConf?.placement || 'top'
      }
      return 'top'
    })

    const showTooltip = computed(() => {
      return props.disabled && tooltipContent.value !== ''
    })

    const handleClick = (e: MouseEvent) => {
      e.stopPropagation()
      if (!props.disabled) {
        emit('click', e)
      }
    }

    const renderButton = () => (
      <TButton
        class={props.extCls}
        theme={props.theme}
        variant={props.text ? 'text' : 'base'}
        disabled={props.disabled}
        onClick={handleClick}
      >
        {slots.default ? slots.default() : props.buttonText}
      </TButton>
    )

    return () => (
      <section class="log-button">
        {showTooltip.value ? (
          <TTooltip
            content={tooltipContent.value}
            placement={tooltipPlacement.value}
            showArrow={true}
          >
            {renderButton()}
          </TTooltip>
        ) : (
          renderButton()
        )}
      </section>
    )
  },
})

export default LogButton
