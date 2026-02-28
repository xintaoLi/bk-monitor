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
import { isElement, debounce } from 'lodash-es';

import type { Ref } from 'vue';

/**
 * 深度查询 Shadow DOM 选择器
 * @param selector - CSS 选择器
 * @returns 找到的 HTML 元素或 null
 */
function deepQueryShadowSelector(selector: string): HTMLElement | null {
  // 搜索当前根下的元素
  const searchInRoot = (root: HTMLElement | ShadowRoot): HTMLElement | null => {
    // 尝试直接查找
    const el = root.querySelector(selector);
    if (el) {
      return el as HTMLElement;
    }
    // 查找当前根下所有可能的 Shadow Host
    const shadowHosts = Array.from(root.querySelectorAll('*')).filter(elItem => elItem.shadowRoot);
    // 递归穿透每个 Shadow Host
    for (const host of shadowHosts) {
      const result = searchInRoot(host.shadowRoot!);
      if (result) {
        return result;
      }
    }
    return null;
  };

  // 从 document.body 开始搜索
  return searchInRoot(document.body);
}

/**
 * 获取目标元素
 * @param target - 目标元素（函数、HTML 元素、Ref 或选择器字符串）
 * @returns HTML 元素
 */
export const getTargetElement = (
  target: (() => HTMLElement) | HTMLElement | Ref<HTMLElement> | string,
): HTMLElement | null => {
  if (typeof target === 'string') {
    if (window.__IS_MONITOR_TRACE__) {
      return deepQueryShadowSelector(target);
    }
    return document.querySelector(target);
  }

  if (isElement(target)) {
    return target as HTMLElement;
  }

  if (typeof target === 'function') {
    return target?.();
  }

  return (target as Ref<HTMLElement>)?.value;
};

/**
 * Token 类型定义
 */
export interface Token {
  text: string;
  isMark: boolean;
  isCursorText: boolean;
  isBlobWord?: boolean;
}

/**
 * 优化的字符串分割函数
 * @param str - 要分割的字符串
 * @param delimiterPattern - 分隔符模式
 * @param wordsplit - 是否分词
 * @returns Token 数组
 */
export const optimizedSplit = (str: string, delimiterPattern: string, wordsplit = true): Token[] => {
  if (!str) {
    return [];
  }

  const tokens: Token[] = [];
  let processedLength = 0;
  const CHUNK_SIZE = 200;

  if (wordsplit) {
    const MAX_TOKENS = 500;
    // 转义特殊字符，并构建用于分割的正则表达式
    const regexPattern = delimiterPattern
      .split('')
      .map(delimiter => `\\${delimiter}`)
      .join('|');

    const DELIMITER_REGEX = new RegExp(`(${regexPattern})`);
    const MARK_REGEX = /<mark>(.*?)<\/mark>/gis;

    const segments = str.split(/(<mark>.*?<\/mark>)/gi);

    for (const segment of segments) {
      if (tokens.length >= MAX_TOKENS) {
        break;
      }
      const isMark = MARK_REGEX.test(segment);

      const segmengtSplitList = segment.replace(MARK_REGEX, '$1').split(DELIMITER_REGEX).filter(Boolean);
      const normalTokens = segmengtSplitList.slice(0, MAX_TOKENS - tokens.length);

      if (isMark) {
        processedLength += '<mark>'.length;

        if (normalTokens.length === segmengtSplitList.length) {
          processedLength += '</mark>'.length;
        }
      }

      for (const t of normalTokens) {
        processedLength += t.length;
        tokens.push({
          text: t,
          isMark,
          isCursorText: !DELIMITER_REGEX.test(t),
        });
      }
    }
  }

  if (processedLength < str.length) {
    const remaining = str.slice(processedLength);

    const segments = remaining.split(/(<mark>.*?<\/mark>)/gi);
    for (const segment of segments) {
      const MARK_REGEX = /<mark>(.*?)<\/mark>/gis;
      const isMark = MARK_REGEX.test(segment);
      const chunkCount = Math.ceil(segment.length / CHUNK_SIZE);

      if (isMark) {
        tokens.push({
          text: segment.replace(MARK_REGEX, '$1'),
          isMark: true,
          isCursorText: false,
          isBlobWord: false,
        });
      } else {
        for (let i = 0; i < chunkCount; i++) {
          tokens.push({
            text: segment.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE),
            isMark: false,
            isCursorText: false,
            isBlobWord: false,
          });
        }
      }
    }
  }

  return tokens;
};

/**
 * 滚动加载列表返回类型
 */
export interface ScrollLoadCell {
  reset: (list: unknown[]) => void;
  setListItem: (size?: number, next?: () => void) => void;
  addScrollEvent: (next?: () => void) => void;
  removeScrollEvent: () => void;
}

/**
 * 设置滚动加载列表
 * @param wordList - 数据列表
 * @param rootElement - 根元素
 * @param contentElement - 内容元素
 * @param renderFn - 渲染函数
 * @returns 滚动加载列表控制对象
 */
export const setScrollLoadCell = (
  wordList: unknown[],
  rootElement: HTMLElement,
  contentElement: HTMLElement,
  renderFn: (item: unknown) => HTMLElement,
): ScrollLoadCell => {
  let startIndex = 0;
  let scrollEvtAdded = false;
  const pageSize = 50;

  const defaultRenderFn = (item: any) => {
    const child = document.createElement('span');
    child.classList.add('item-text');
    child.textContent = item?.text?.length ? item.text : "''";
    return child;
  };

  /**
   * 渲染一个占位符，避免正好满一行，点击展开收起遮挡文本
   */
  const appendLastTag = () => {
    if (!contentElement?.lastElementChild?.classList?.contains('last-placeholder')) {
      const { scrollHeight = 0, offsetHeight = 0 } = contentElement ?? {};
      if (scrollHeight > offsetHeight) {
        const child = document.createElement('span');
        child.classList.add('last-placeholder');
        contentElement?.append?.(child);
      }
    }
  };

  const appendPageItems = (size?: number) => {
    if (startIndex > wordList.length) {
      requestAnimationFrame(appendLastTag);
      startIndex = wordList.length;
      return false;
    }

    const fragment = document.createDocumentFragment();
    const pageItems = wordList.slice(startIndex, startIndex + (size ?? pageSize));
    for (const item of pageItems) {
      const child = renderFn?.(item) ?? defaultRenderFn(item);

      fragment.appendChild(child);
    }

    startIndex += size ?? pageSize;
    contentElement?.append?.(fragment);
    return true;
  };

  const handleScrollEvent = (next?: () => void) =>
    debounce(() => {
      if (rootElement) {
        const { offsetHeight, scrollHeight } = rootElement;
        const { scrollTop } = rootElement;
        if (scrollHeight - offsetHeight - scrollTop < 60) {
          appendPageItems();
          next?.();
        }
      }
    });

  const addScrollEvent = (next?: () => void) => {
    scrollEvtAdded = true;
    rootElement?.addEventListener('scroll', handleScrollEvent(next));
  };

  const removeScrollEvent = () => {
    scrollEvtAdded = false;
    rootElement?.removeEventListener('scroll', handleScrollEvent);
  };

  /**
   * 初始化列表
   * 动态渲染列表，根据内容高度自动判定是否添加滚动监听事件
   */
  const setListItem = (size?: number, next?: () => void) => {
    if (appendPageItems(size)) {
      requestAnimationFrame(() => {
        if (rootElement) {
          const { offsetHeight, scrollHeight } = rootElement;
          if (offsetHeight * 1.2 > scrollHeight) {
            setListItem(undefined, next);
          } else {
            next?.();
            if (!scrollEvtAdded) {
              addScrollEvent(next);
            }
          }
        }
      });
    }
  };

  const reset = (list: unknown[]) => {
    // biome-ignore lint/style/noParameterAssign: reason
    wordList = list;
    startIndex = 0;
    contentElement.innerHTML = '';
    removeScrollEvent();
  };

  return {
    reset,
    setListItem,
    addScrollEvent,
    removeScrollEvent,
  };
};

/**
 * 点击目标位置信息
 */
export interface ClickTargetOffset {
  offsetX: number;
  offsetY: number;
}

/**
 * 获取点击目标元素的偏移量
 * @param pointer - 鼠标事件
 * @returns 偏移量对象
 */
export const getClickTargetElement = (pointer: MouseEvent): ClickTargetOffset => {
  const textNode = pointer.target as HTMLElement;
  if (textNode) {
    return { offsetX: 0, offsetY: 0 };
  }

  const range = document.createRange();
  range.selectNodeContents(textNode);
  const lineRects = Array.from(range.getClientRects());
  const { clientX, clientY } = pointer;

  // 遍历所有行，找到点击位置所在的行
  let targetLineIndex = -1;
  for (let i = 0; i < lineRects.length; i++) {
    const rect = lineRects[i];
    if (clientY >= rect.top && clientY <= rect.bottom && clientX >= rect.left && clientX <= rect.right) {
      targetLineIndex = i;
      break;
    }
  }

  const target = lineRects?.[targetLineIndex];
  return { offsetX: 0, offsetY: (target?.bottom ?? pointer.clientY) - pointer.clientY };
};

/**
 * 设置指针单元格点击目标处理器
 * @param e - 鼠标事件
 * @param offset - 偏移量
 * @returns 虚拟目标元素
 */
export const setPointerCellClickTargetHandler = (
  e: MouseEvent,
  { offsetY = 0, offsetX = 0 }: Partial<ClickTargetOffset> = {},
): HTMLElement => {
  const x = e.clientX;
  const y = e.clientY;
  let virtualTarget = document.body.querySelector('.bklog-virtual-target') as HTMLElement;
  if (!virtualTarget) {
    virtualTarget = document.createElement('span') as HTMLElement;
    virtualTarget.className = 'bklog-virtual-target';
    virtualTarget.style.setProperty('position', 'fixed');
    virtualTarget.style.setProperty('visibility', 'hidden');
    virtualTarget.style.setProperty('z-index', '-1');
    document.body.appendChild(virtualTarget);
  }

  virtualTarget.style.setProperty('left', `${x + offsetX}px`);
  virtualTarget.style.setProperty('top', `${y + offsetY}px`);

  return virtualTarget;
};
