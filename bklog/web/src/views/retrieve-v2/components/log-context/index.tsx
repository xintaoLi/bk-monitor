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
import { computed, defineComponent, ref } from 'vue';

import TeleportMini from '@/global/teleport-mini';

import './index.scss';

export default defineComponent({
  name: 'LogContext',
  props: {
    row: {
      type: Object,
      required: true,
      default: () => ({}),
    },
    options: {
      type: Object,
      required: true,
      default: () => ({}),
    },
  },
  setup(props) {
    const isContextShow = ref(false);

    const isActive = computed(() => props.options?.contextAndRealtime?.is_active ?? false);

    const toggleContext = (e: MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();

      if (isActive.value) {
        isContextShow.value = !isContextShow.value;
      }
    };

    const getContext = () => {
      if (!isContextShow.value) {
        return '';
      }

      return (
        <TeleportMini>
          <div class='bklog-v3-row-context'>
            <div>
              <bk-button onClick={toggleContext}>Close</bk-button>
            </div>
          </div>
        </TeleportMini>
      );
    };

    return () => (
      <span>
        <span
          class={`icon bklog-icon bklog-shangxiawen ${!isActive.value && 'is-disable'}`}
          v-bk-tooltips={{
            disabled: !isActive.value,
            allowHtml: true,
            content: props.options?.toolMessage?.contextLog ?? 'context log',
          }}
          onClick={toggleContext}
        ></span>
        {getContext()}
      </span>
    );
  },
});
