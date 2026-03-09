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
import { defineComponent } from 'vue'
import { Tabs as TTabs } from 'tdesign-vue-next'
import './basic-tab.scss'

export interface BasicTabProps {
  /** 当前激活的标签 */
  value?: string | number
  /** 标签位置 */
  placement?: 'top' | 'bottom' | 'left' | 'right'
  /** 标签主题 */
  theme?: 'normal' | 'card'
}

/**
 * 基础标签页组件
 * 基于 TDesign Tabs 封装
 */
export const BasicTab = defineComponent({
  name: 'BasicTab',
  props: {
    value: {
      type: [String, Number],
      default: '',
    },
    placement: {
      type: String as () => 'top' | 'bottom' | 'left' | 'right',
      default: 'top',
    },
    theme: {
      type: String as () => 'normal' | 'card',
      default: 'card',
    },
  },
  emits: ['change', 'update:value'],
  setup(props, { emit, attrs, slots }) {
    const handleChange = (value: string | number) => {
      emit('update:value', value)
      emit('change', value)
    }

    return () => (
      <TTabs
        class="custom-tab"
        value={props.value}
        placement={props.placement}
        theme={props.theme}
        onChange={handleChange}
        {...attrs}
      >
        {slots.default?.()}
        {slots.setting && (
          <template v-slot:setting>{slots.setting()}</template>
        )}
        {slots.add && (
          <template v-slot:add>{slots.add()}</template>
        )}
      </TTabs>
    )
  },
})

export default BasicTab
