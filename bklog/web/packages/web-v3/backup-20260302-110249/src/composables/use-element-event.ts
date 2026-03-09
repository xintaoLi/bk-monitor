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

import { onBeforeUnmount, onMounted } from 'vue';

/**
 * 事件信息类型
 */
interface EventInfo {
  element: HTMLElement | Document;
  eventName: string;
  callback: (e: Event) => void;
  options?: AddEventListenerOptions | boolean;
}

/**
 * 元素事件管理 Composable
 * 用于管理 DOM 元素事件的添加和移除，自动在组件生命周期中处理
 * @returns 事件管理对象
 */
export default () => {
  const events: EventInfo[] = [];

  /**
   * 添加元素事件监听
   * @param element - 目标元素
   * @param eventName - 事件名称
   * @param callback - 事件回调函数
   * @param options - 事件选项
   */
  const addElementEvent = (
    element: HTMLElement | Document,
    eventName: string,
    callback: (e: Event) => void,
    options?: AddEventListenerOptions,
  ) => {
    events.push({ element, eventName, callback, options: options || false });
  };

  onMounted(() => {
    events.forEach(({ element, eventName, callback, options }) => {
      element.addEventListener(eventName, callback, options);
    });
  });

  onBeforeUnmount(() => {
    events.forEach(({ element, eventName, callback, options }) => {
      element.removeEventListener(eventName, callback, options);
    });
  });

  return {
    addElementEvent,
  };
};
