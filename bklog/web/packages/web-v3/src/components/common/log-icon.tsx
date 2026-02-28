/*
 * Tencent is pleased to support the open source community by making
 * 蓝鲸智云PaaS平台 (BlueKing PaaS) available.
 *
 * Copyright (C) 2021 THL A29 Limited, a Tencent company.  All rights reserved.
 *
 * 蓝鲸智云PaaS平台 (BlueKing PaaS) is licensed under the MIT License.
 *
 * License for 蓝鲸智云PaaS平台 (BlueKing PaaS):
 *
 * ---------------------------------------------------
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
 * documentation files (the "Software"), to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and
 * to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of
 * the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO
 * THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF
 * CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 */
import { defineComponent, computed, type PropType } from 'vue'
import './log-icon.scss'

export interface LogIconProps {
  /** 是否使用 SVG 图标 */
  svg?: boolean
  /** 图标类型 */
  type: string
  /** 是否使用通用图标前缀 */
  common?: boolean
}

/**
 * 日志图标组件
 * 支持 iconfont 和 SVG 两种方式
 */
export const LogIcon = defineComponent({
  name: 'LogIcon',
  props: {
    svg: {
      type: Boolean as PropType<boolean>,
      default: false,
    },
    type: {
      type: String as PropType<string>,
      required: true,
    },
    common: {
      type: Boolean as PropType<boolean>,
      default: false,
    },
  },
  emits: ['click'],
  setup(props, { emit }) {
    const commonPrefix = computed(() => (props.common ? 'bk' : 'bklog'))
    const iconPrefix = computed(() => (props.common ? 'icon' : 'bklog'))

    const handleClick = (e: MouseEvent) => {
      emit('click', e)
    }

    return () => {
      if (props.svg) {
        return (
          <svg class="log-svg-icon">
            <title>{props.type}</title>
            <use xlinkHref={`#${iconPrefix.value}-${props.type}`} />
          </svg>
        )
      }

      const classes = {
        [`${iconPrefix.value}-${props.type}`]: true,
        [`${commonPrefix.value}-icon`]: true,
      }

      return (
        <i
          class={classes}
          onClick={handleClick}
        />
      )
    }
  },
})

export default LogIcon
