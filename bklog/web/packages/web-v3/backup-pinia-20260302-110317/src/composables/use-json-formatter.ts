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
import RetrieveHelper from '@/views/retrieve-helper';

import JsonView from '../global/json-view';
import segmentPopInstance from '../global/utils/segment-pop-instance';
import {
  getClickTargetElement,
  optimizedSplit,
  setPointerCellClickTargetHandler,
  setScrollLoadCell,
} from './hooks-helper';
import LuceneSegment from './lucene.segment';
import UseSegmentPropInstance from './use-segment-pop';

import type { Ref } from 'vue';

/**
 * 格式化配置类型
 */
export type FormatterConfig = {
  target: Ref<HTMLElement | null>;
  fields: any[];
  jsonValue: any;
  field: any;
  onSegmentClick: (_args: any) => void;
  options?: Record<string, any>;
};

/**
 * 段落追加文本类型
 */
export type SegmentAppendText = { text: string; onClick?: (..._args: any[]) => void; attributes?: Record<string, string> };

/**
 * JSON 格式化器 Composable
 * 用于格式化和显示 JSON 数据，支持字段分词和高亮
 */
export default class UseJsonFormatter {
  editor: JsonView;
  config: FormatterConfig;
  setValuePromise: Promise<any>;
  localDepth: number;
  getSegmentContent: (_keyRef: object, _fn: (..._args: any[]) => void) => Ref<HTMLElement>;
  keyRef: any;

  constructor(cfg: FormatterConfig) {
    this.config = cfg;
    this.setValuePromise = Promise.resolve(true);
    this.localDepth = 1;
    this.keyRef = {};
    this.getSegmentContent = UseSegmentPropInstance.getSegmentContent.bind(UseSegmentPropInstance);
  }

  /**
   * 更新配置
   * @param cfg - 新的配置
   */
  update(cfg: FormatterConfig) {
    this.config = cfg;
  }

  /**
   * 获取字段信息
   * @param fieldName - 字段名
   * @returns 字段信息
   */
  getField(fieldName: string) {
    return this.config.fields.find(item => item.field_name === fieldName);
  }

  /**
   * 获取字段名和值
   * @returns 字段名和值对象
   */
  getFieldNameValue() {
    const tippyInstance = segmentPopInstance.getInstance();
    const target = tippyInstance.reference;
    let name = target.getAttribute('data-field-name');
    let value = target.getAttribute('data-field-value');
    let depth = target.getAttribute('data-field-dpth');

    if (value === undefined) {
      value = target.textContent;
    }

    if (name === undefined) {
      const valueElement = tippyInstance.reference.closest('.field-value') as HTMLElement;
      name = valueElement?.getAttribute('data-field-name');
    }

    if (depth === undefined) {
      depth = target.closest('[data-depth]')?.getAttribute('data-depth');
    }

    return { value, name, depth };
  }

  /**
   * 处理段落枚举点击事件
   * @param val - 操作类型
   * @param isLink - 是否为链接
   */
  onSegmentEnumClick(val: string, isLink: boolean) {
    const { name, value, depth } = this.getFieldNameValue();
    const activeField = this.getField(name);
    const target = ['date', 'date_nanos'].includes(activeField?.field_type)
      ? this.config.jsonValue?.[activeField?.field_name]
      : value;

    const option = {
      fieldName: activeField?.field_name,
      fieldType: activeField?.field_type,
      operation: val === 'not' ? 'is not' : val,
      value: target ?? value,
      depth,
    };

    this.config.onSegmentClick?.({ option, isLink });
    segmentPopInstance.hide();
  }

  /**
   * 验证是否为有效的 TraceID
   * @param traceId - TraceID
   * @returns 是否有效
   */
  isValidTraceId(traceId: string) {
    const traceIdPattern = /^[a-f0-9]{32}$/;
    return traceIdPattern.test(traceId);
  }

  /**
   * 处理段落点击事件
   * @param e - 鼠标事件
   * @param value - 值
   */
  handleSegmentClick(e: MouseEvent, value: any) {
    // 如果是点击划选文本，则不进行处理
    if (RetrieveHelper.isClickOnSelection(e, 2) || window?.getSelection()?.toString()?.length > 1) {
      return;
    }
    if (!value.toString() || value === '--') {
      return;
    }

    const valueElement = (e.target as HTMLElement).closest('.field-value') as HTMLElement;
    const fieldName = valueElement?.getAttribute('data-field-name');
    const fieldType = valueElement?.getAttribute('data-field-type');

    const content = this.getSegmentContent(this.keyRef, this.onSegmentEnumClick.bind(this));
    const traceView = content.value.querySelector('[data-item-id="trace-view"]') as HTMLElement;
    traceView?.style.setProperty('display', this.isValidTraceId(value) ? 'inline-flex' : 'none');

    // 根据字段信息隐藏虚拟字段相关的选项
    const isVirtualField = fieldType === '__virtual__';
    const virtualFieldHiddenItems = ['is', 'not', 'new-search-page-is']; // 需要隐藏的选项

    virtualFieldHiddenItems.forEach(itemId => {
      const element = content.value.querySelector(`[data-item-id="${itemId}"]`) as HTMLElement;
      element?.style.setProperty('display', isVirtualField ? 'none' : 'inline-flex');
    });

    // 这里的动态样式用于只显示"添加到本次检索"、"从本次检索中排除"
    const hasSegmentLightStyle = document.getElementById('dynamic-segment-light-style') !== null;

    // 若是应用了动态样式(实时日志/上下文)，且是虚拟字段，则不显示弹窗(弹窗无内容)
    if (hasSegmentLightStyle && isVirtualField) {
      return;
    }

    const { offsetX, offsetY } = getClickTargetElement(e);
    const target = setPointerCellClickTargetHandler(e, { offsetX, offsetY });

    const depth = valueElement.closest('[data-depth]')?.getAttribute('data-depth');

    target.setAttribute('data-field-value', value);
    target.setAttribute('data-field-name', fieldName);
    target.setAttribute('data-field-dpth', depth);

    segmentPopInstance.show(target, this.getSegmentContent(this.keyRef, this.onSegmentEnumClick.bind(this)));
  }

  /**
   * 判断是否为文本字段
   * @param field - 字段信息
   * @returns 是否为文本字段
   */
  isTextField(field: any) {
    return field?.field_type === 'text';
  }

  /**
   * 判断是否已分析
   * @param field - 字段信息
   * @returns 是否已分析
   */
  isAnalyzed(field: any) {
    return field?.is_analyzed ?? false;
  }

  /**
   * 转义字符串
   * @param val - 字符串值
   * @returns 转义后的字符串
   */
  escapeString(val: string) {
    const map: Record<string, string> = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#x27;': "'",
    };

    return typeof val !== 'string'
      ? val
      : val.replace(new RegExp(`(${Object.keys(map).join('|')})`, 'g'), match => map[match]);
  }

  /**
   * 获取分词列表
   * @param field - 字段信息
   * @param content - 内容
   * @returns 分词列表
   */
  getSplitList(field: any, content: any) {
    /** 检索高亮分词字符串 */
    const markRegStr = '<mark>(.*?)</mark>';
    const value = this.escapeString(`${content}`);
    if (this.isAnalyzed(field)) {
      if (field.tokenize_on_chars) {
        // 这里进来的都是开了分词的情况
        return optimizedSplit(value, field.tokenize_on_chars);
      }

      return LuceneSegment.split(value, 1000);
    }

    return [
      {
        text: value.replace(/<mark>/g, '').replace(/<\/mark>/g, ''),
        isNotParticiple: this.isTextField(field),
        isMark: new RegExp(markRegStr).test(value),
        isCursorText: true,
      },
    ];
  }

  /**
   * 获取子项元素
   * @param item - 项信息
   * @returns DOM 元素
   */
  getChildItem(item: any): HTMLElement {
    if (item.text === '\n') {
      const brNode = document.createElement('br');
      return brNode;
    }

    if (item.isMark) {
      const mrkNode = document.createElement('mark');
      mrkNode.textContent = item.text.replace(/<mark>/g, '').replace(/<\/mark>/g, '');
      mrkNode.classList.add('valid-text');
      return mrkNode;
    }

    if (!(item.isNotParticiple || item.isBlobWord)) {
      const validTextNode = document.createElement('span');
      if (item.isCursorText) {
        validTextNode.classList.add('valid-text');
      }
      validTextNode.textContent = item.text?.length ? item.text : '""';
      return validTextNode;
    }

    const textNode = document.createElement('span');
    textNode.classList.add('others-text');
    textNode.textContent = item.text?.length ? item.text : '""';
    return textNode;
  }

  /**
   * 创建段落节点
   * @returns 段落节点
   */
  creatSegmentNodes = () => {
    const segmentNode = document.createElement('span');
    segmentNode.classList.add('segment-content');
    segmentNode.classList.add('bklog-scroll-cell');

    return segmentNode;
  };

  /**
   * 初始化字符串值
   * @param text - 文本
   * @param appendText - 追加文本
   */
  initStringAsValue(text?: string, appendText?: SegmentAppendText) {
    let root = this.getTargetRoot() as HTMLElement;
    if (root) {
      if (root.classList.contains('field-value')) {
        root = root.parentElement;
      }

      const fieldName = (root.querySelector('.field-name .black-mark') as HTMLElement)?.getAttribute('data-field-name');
      this.setNodeValueWordSplit(root, fieldName, '.field-value', text, appendText);
    }
  }

  /**
   * 添加词分段点击事件
   * @param root - 根元素
   */
  addWordSegmentClick(root: HTMLElement) {
    if (!root.hasAttribute('data-word-segment-click')) {
      root.setAttribute('data-word-segment-click', '1');
      root.addEventListener('click', e => {
        if ((e.target as HTMLElement).classList.contains('valid-text')) {
          this.handleSegmentClick(e, (e.target as HTMLElement).textContent);
        }
      });
    }
  }

  /**
   * 设置节点值分词
   * @param target - 目标元素
   * @param fieldName - 字段名
   * @param valueSelector - 值选择器
   * @param textValue - 文本值
   * @param appendText - 追加文本
   */
  setNodeValueWordSplit(
    target: HTMLElement,
    fieldName: string,
    valueSelector = '.bklog-json-field-value',
    textValue?: string,
    appendText?: SegmentAppendText,
  ) {
    this.addWordSegmentClick(target);
    for (const element of target.querySelectorAll(valueSelector)) {
      if (!element.getAttribute('data-has-word-split')) {
        const text = textValue ?? element.textContent;
        const field = this.getField(fieldName);
        const vlaues = this.getSplitList(field, text);
        element?.setAttribute('data-has-word-split', '1');
        element?.setAttribute('data-field-name', fieldName);
        element?.setAttribute('data-field-type', field?.field_type);

        if (element.hasAttribute('data-with-intersection')) {
          (element as HTMLElement).style.setProperty('min-height', `${(element as HTMLElement).offsetHeight}px`);
        }

        element.innerHTML = '';

        const segmentContent = this.creatSegmentNodes();

        const { setListItem, removeScrollEvent } = setScrollLoadCell(
          vlaues,
          element as HTMLElement,
          segmentContent,
          this.getChildItem,
        );
        removeScrollEvent();

        element.append(segmentContent);
        setListItem(1000);

        if (appendText !== undefined) {
          const appendElement = document.createElement('span');
          appendElement.textContent = appendText.text;
          if (appendText.onClick) {
            appendElement.addEventListener('click', appendText.onClick);
          }

          for (const key of Object.keys(appendText.attributes ?? {})) {
            appendElement.setAttribute(key, appendText.attributes[key]);
          }

          element.firstChild.appendChild(appendElement);
        }

        requestAnimationFrame(() => {
          element.style.removeProperty('min-height');
        });
      }
    }
  }

  /**
   * 处理展开节点
   * @param args - 参数
   */
  handleExpandNode(args: any) {
    if (args.isExpand) {
      // const target = args.targetElement as HTMLElement;
      // const rootElement = args.rootElement as HTMLElement;
      // const fieldName = (rootElement.parentNode.querySelector('.field-name .black-mark') as HTMLElement)?.innerText;
      // this.setNodeValueWordSplit(target, fieldName, '.bklog-json-field-value');
    }
  }

  /**
   * 计算后的选项
   */
  get computedOptions() {
    return {
      mode: 'view',
      navigationBar: false,
      statusBar: false,
      mainMenuBar: false,
      onExpand: this.handleExpandNode.bind(this),
      ...(this.config.options ?? {}),
    };
  }

  /**
   * 获取目标根元素
   * @returns 根元素
   */
  getTargetRoot(): HTMLElement | null {
    if (Array.isArray(this.config.target.value)) {
      return this.config.target.value[0];
    }

    return this.config.target.value;
  }

  /**
   * 初始化编辑器
   * @param depth - 深度
   */
  initEditor(depth: number) {
    if (this.getTargetRoot()) {
      this.localDepth = depth;
      this.editor = new JsonView(this.getTargetRoot(), {
        onNodeExpand: this.handleExpandNode.bind(this),
        depth,
        field: this.config.field,
        segmentRender: (value: string, rootNode: HTMLElement) => {
          const vlaues = this.getSplitList(this.config.field, value);
          const segmentContent = this.creatSegmentNodes();
          rootNode.append(segmentContent);

          if (!rootNode.classList.contains('bklog-scroll-box')) {
            rootNode.classList.add('bklog-scroll-box');
          }

          const { setListItem, removeScrollEvent } = setScrollLoadCell(
            vlaues,
            rootNode,
            segmentContent,
            this.getChildItem,
          );
          removeScrollEvent();
          setListItem(600);
        },
      });

      this.editor.initClickEvent(e => {
        if ((e.target as HTMLElement).classList.contains('valid-text')) {
          this.handleSegmentClick(e, (e.target as HTMLElement).textContent);
        }
      });
    }
  }

  /**
   * 设置节点展开
   * @param currentDepth - 当前深度
   */
  setNodeExpand([currentDepth]: [number]) {
    this.editor.expand(currentDepth);
  }

  /**
   * 设置值
   * @param depth - 深度
   * @returns Promise
   */
  setValue(depth: number) {
    this.setValuePromise = new Promise((resolve, reject) => {
      try {
        this.editor.setValue(this.config.jsonValue);
        this.setNodeExpand([depth]);
        this.localDepth = depth;
        resolve(true);
      } catch (e) {
        reject(e);
      }
    });

    return this.setValuePromise;
  }

  /**
   * 设置展开状态
   * @param depth - 深度
   */
  setExpand(depth: number) {
    this.setValuePromise?.then(() => {
      this.setNodeExpand([depth]);
      this.localDepth = depth;
    });
  }

  /**
   * 销毁编辑器
   */
  destroy() {
    this.editor?.destroy();
    const root = this.getTargetRoot() as HTMLElement;
    if (root) {
      let target = root;
      if (!root.classList.contains('field-value')) {
        target = root.querySelector('.field-value');
      }

      if (target?.hasAttribute('data-has-word-split')) {
        target.removeAttribute('data-has-word-split');
      }

      if (target && typeof this.config.jsonValue === 'string') {
        target.textContent = this.config.jsonValue;
      }
    }
  }

  /**
   * 获取编辑器实例
   * @returns 编辑器方法对象
   */
  getEditor() {
    return {
      setValue: this.setValue.bind(this),
      setExpand: this.setExpand.bind(this),
      initEditor: this.initEditor.bind(this),
      destroy: this.destroy.bind(this),
    };
  }
}
