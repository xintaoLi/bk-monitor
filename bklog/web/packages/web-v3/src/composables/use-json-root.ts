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
import UseJsonFormatter from '../hooks/use-json-formatter';

import type { Ref } from 'vue';

/**
 * 根字段操作类型
 */
type RootFieldOperator = {
  isJson: boolean;
  ref: Ref<HTMLElement>;
  value: boolean | number | object | string;
  editor?: UseJsonFormatter;
  field: any;
};

/**
 * 根字段类型
 */
type RootField = {
  name: string;
  formatter: {
    isJson: boolean;
    ref: Ref<HTMLElement>;
    value: boolean | number | object | string;
    field: any;
  };
};

/**
 * JSON 根节点管理 Composable
 * 用于管理 JSON 根节点的格式化器和展开状态
 * @param options - 配置选项
 * @returns 根节点管理对象
 */
export default ({ fields, onSegmentClick }: { fields: any[]; onSegmentClick: (...args: any[]) => void }) => {
  const rootFieldOperator = new Map<string, RootFieldOperator>();
  let initEditPromise: Promise<any>;

  /**
   * 初始化根节点操作器
   * @param depth - 展开深度
   * @returns Promise
   */
  const initRootOperator = (depth: number) => {
    initEditPromise = new Promise(resolve => {
      for (const value of rootFieldOperator.values()) {
        if (!value.editor) {
          value.editor = new UseJsonFormatter({
            target: value.ref,
            fields,
            jsonValue: value.value,
            onSegmentClick,
            field: value.field,
          });
        }

        if (value.isJson && value.ref.value) {
          value.editor?.initEditor(depth);
        }

        if (!value.isJson) {
          value.editor?.destroy();
          // value.editor?.initStringAsValue();
        }
      }

      resolve(rootFieldOperator);
    });

    return initEditPromise;
  };

  /**
   * 设置编辑器
   * @param depth - 展开深度
   */
  const setEditor = (depth: number) => {
    for (const value of rootFieldOperator.values()) {
      if (!value.editor) {
        value.editor = new UseJsonFormatter({
          target: value.ref,
          fields,
          jsonValue: value.value,
          onSegmentClick,
          field: value.field,
        });
      }

      if (value.isJson && value.ref.value) {
        value.editor?.initEditor(depth);
        value.editor?.setValue.call(value.editor, depth);
      }

      if (!value.isJson) {
        value.editor?.initStringAsValue(value.value as string);
      }
    }
  };

  /**
   * 销毁所有编辑器
   */
  const destroy = () => {
    for (const value of rootFieldOperator.values()) {
      if (value.isJson && value.ref.value) {
        value.editor?.destroy();
      }

      if (!value.isJson) {
        value.editor?.destroy();
      }
    }
  };

  /**
   * 更新根字段操作器
   * @param rootFieldList - 根字段列表
   * @param depth - 展开深度
   * @returns Promise
   */
  const updateRootFieldOperator = (rootFieldList: RootField[], depth: number) => {
    for (const fieldItem of rootFieldList) {
      const { name, formatter } = fieldItem;
      if (rootFieldOperator.has(name)) {
        Object.assign(rootFieldOperator.get(name), {
          isJson: formatter.isJson,
          ref: formatter.ref,
          value: formatter.value,
          field: formatter.field,
        });

        rootFieldOperator.get(name).editor?.update({
          target: formatter.ref,
          fields,
          jsonValue: formatter.value,
          onSegmentClick,
          field: formatter.field,
        });
      } else {
        rootFieldOperator.set(name, {
          isJson: formatter.isJson,
          ref: formatter.ref,
          value: formatter.value,
          field: formatter.field,
        });
      }
    }

    for (const key of rootFieldOperator.keys()) {
      if (!rootFieldList.some(f => f.name === key)) {
        const target = rootFieldOperator.get(key).editor;
        target?.destroy?.();
        rootFieldOperator.delete(key);
      }
    }

    return initRootOperator(depth);
    // .then(() => {
    //   rootFieldOperator.values().forEach(val => {
    //     if (val.isJson) {
    //       val.editor?.setValue.call(val.editor, depth);
    //     }
    //   });
    // });
  };

  /**
   * 设置展开状态
   * @param depth - 展开深度
   */
  const setExpand = (depth: number) => {
    for (const item of rootFieldOperator.values()) {
      if (item.isJson) {
        item.editor?.setExpand(depth);
      }
    }
  };

  return {
    updateRootFieldOperator,
    setExpand,
    setEditor,
    destroy,
  };
};
