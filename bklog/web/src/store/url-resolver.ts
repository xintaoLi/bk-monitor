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

// @ts-ignore
import { handleTransformToTimestamp, intTimestampStr } from '@/components/time-range/utils';

import { ConditionOperator } from './condition-operator';

class RouteUrlResolver {
  private route;
  private resolver: Map<string, (str) => unknown>;
  private resolveFieldList: string[];

  constructor({ route, resolveFieldList }) {
    this.route = route;
    this.resolver = new Map<string, (str) => unknown>();
    this.resolveFieldList = resolveFieldList ?? this.getDefaultResolveFieldList();
    this.setDefaultResolver();
  }

  get query() {
    return this.route?.query ?? {};
  }

  public setDefaultResolveFieldList(val?) {
    this.resolveFieldList = val ?? this.getDefaultResolveFieldList();
  }

  public setResolver(key: string, fn: (str) => unknown) {
    this.resolver.set(key, fn);
  }

  /**
   * 将URL参数解析为store里面缓存的数据结构
   */
  public convertQueryToStore(): Record<string, any> {
    const isEmptySearchMode = !['sql', 'ui'].includes(this.query?.search_mode);
    const restult = this.resolveFieldList.reduce((output, key) => {
      const value = this.resolver.get(key)?.(this.query?.[key]) ?? this.commonResolver(this.query?.[key]);
      if (value !== undefined) {
        return Object.assign(output, { [key]: value });
      }

      return output;
    }, {});

    return this.formatDefAddition(restult, isEmptySearchMode);
  }

  /**
   * 需要清理URL参数时，获取默认的参数配置列表
   * @returns
   */
  public getDefUrlQuery() {
    const routeQuery = this.query;
    const appendParamKeys = [...this.resolveFieldList, 'end_time'];
    const undefinedQuery = appendParamKeys.reduce((out, key) => Object.assign(out, { [key]: undefined }), {});
    return {
      ...routeQuery,
      ...undefinedQuery,
    };
  }

  /**
   * 根据URL参数获取默认的附加参数
   * 这里主要用于处理默认条件转换，处理以下情况的参数合并
   * （1）旧版日志检索跳转时，keyword 和 addition 同时存在
   */
  private formatDefAddition(result, resetAddition = false) {
    result.__reset_router_query = undefined;
    if (result?.keyword?.length && result?.addition?.length && resetAddition) {
      result.addition.push({ field: '__query_string__', operator: 'contains match phrase', value: result.keyword });
      result.keyword = undefined;
      result.__reset_router_query = {
        addition: JSON.stringify(result.addition),
        keyword: undefined,
      };
    }

    return result;
  }

  private getDefaultResolveFieldList() {
    // 这里start_time 和 end_time 是一对，用于时间日期选择器
    // 所以如果解析必须要以 [start_time, end_time] 格式
    return [
      'addition',
      'keyword',
      'start_time',
      'end_time',
      'timezone',
      'unionList',
      'datePickerValue',
      'host_scopes',
      'ip_chooser',
      'search_mode',
      'clusterParams',
    ];
  }

  private commonResolver(str, next?) {
    if (str !== undefined && str !== null) {
      const val = decodeURIComponent(str);
      return next?.(val) ?? val;
    }

    return undefined;
  }

  private objectResolver(str) {
    return this.commonResolver(str, val => JSON.parse(decodeURIComponent(val)));
  }

  private arrayResolver(str) {
    return this.objectResolver(str);
  }

  private getTimeSecVal(val: number) {
    const diff = `${val}`.length - 10;
    let temp = 1;
    for (let i = 0; i < diff; i++) {
      temp = temp * 10;
    }

    return val / temp;
  }

  /**
   * datepicker时间范围格式化为标准时间格式
   * @param timeRange [start_time, end_time]
   */
  private dateTimeRangeResolver(timeRange: string[]) {
    const decodeValue = timeRange.map(t => {
      const r = decodeURIComponent(t);
      return intTimestampStr(r);
    });

    const result: number[] = handleTransformToTimestamp(decodeValue);
    return { start_time: this.getTimeSecVal(result[0]), end_time: this.getTimeSecVal(result[1]) };
  }

  private additionResolver(str) {
    return this.commonResolver(str, val => {
      return (JSON.parse(decodeURIComponent(val)) ?? []).map(val => {
        const instance = new ConditionOperator(val);
        return instance.formatApiOperatorToFront();
      });
    });
  }

  private datePickerValueResolver() {
    return this.commonResolver(this.query.start_time, value => {
      const endTime = this.commonResolver(this.query.end_time) ?? value;
      return [intTimestampStr(value), intTimestampStr(endTime)];
    });
  }

  private searchModeResolver() {
    if (['sql', 'ui'].includes(this.query.search_mode)) {
      return this.query.search_mode;
    }

    if (this.query.keyword?.length && this.query.addition?.length) {
      return 'ui';
    }

    if (this.query.keyword?.length) {
      return 'sql';
    }

    if (this.query.additon?.length) {
      return 'ui';
    }

    return 'ui';
  }

  private setDefaultResolver() {
    this.resolver.set('addition', this.additionResolver.bind(this));
    this.resolver.set('unionList', this.arrayResolver.bind(this));
    this.resolver.set('host_scopes', this.objectResolver.bind(this));
    this.resolver.set('ip_chooser', this.objectResolver.bind(this));
    this.resolver.set('clusterParams', this.objectResolver.bind(this));
    this.resolver.set('timeRange', this.dateTimeRangeResolver.bind(this));
    this.resolver.set('search_mode', this.searchModeResolver.bind(this));

    // datePicker默认直接获取URL中的 start_time, end_time
    this.resolver.set('datePickerValue', this.datePickerValueResolver.bind(this));

    this.resolver.set('start_time', val => {
      return this.commonResolver(val, value => {
        const end_time = this.commonResolver(this.query?.end_time) ?? value;
        return this.dateTimeRangeResolver([value, end_time]).start_time;
      });
    });

    this.resolver.set('end_time', val => {
      return this.commonResolver(val, value => {
        const start_time = this.commonResolver(this.query?.start_time) ?? value;
        return this.dateTimeRangeResolver([start_time, value]).end_time;
      });
    });
  }
}

class RetrieveUrlResolver {
  routeQueryParams;
  storeFieldKeyMap;
  constructor(params) {
    this.routeQueryParams = params;
    // store中缓存的字段和URL中参数的字段key映射
    this.storeFieldKeyMap = {
      bk_biz_id: 'bizId',
    };
  }

  resolveParamsToUrl() {
    const getEncodeString = val => JSON.stringify(val);

    /**
     * 路由参数格式化字典函数
     * 不同的字段需要不同的格式化函数
     */
    const routeQueryMap = {
      host_scopes: val => {
        const isEmpty = !Object.keys(val ?? {}).some(k => {
          if (typeof val[k] === 'object') {
            return Array.isArray(val[k]) ? val[k].length : Object.keys(val[k] ?? {}).length;
          }

          return val[k]?.length;
        });

        return isEmpty ? undefined : getEncodeString(val);
      },
      start_time: () => this.routeQueryParams.datePickerValue[0],
      end_time: () => this.routeQueryParams.datePickerValue[1],
      keyword: val => (/^\s*\*\s*$/.test(val) ? undefined : val),
      unionList: val => {
        if (this.routeQueryParams.isUnionIndex && val?.length) {
          return getEncodeString(val);
        }

        return undefined;
      },
      default: val => {
        if (typeof val === 'object' && val !== null) {
          if (Array.isArray(val) && val.length) {
            return getEncodeString(val);
          }

          if (Object.keys(val).length) {
            return getEncodeString(val);
          }

          return undefined;
        }

        return val?.length ? val : undefined;
      },
    };

    const getRouteQueryValue = () => {
      return Object.keys(this.routeQueryParams)
        .filter(key => {
          return !['ids', 'isUnionIndex', 'datePickerValue'].includes(key);
        })
        .reduce((result, key) => {
          const val = this.routeQueryParams[key];
          const valueFn = typeof routeQueryMap[key] === 'function' ? routeQueryMap[key] : routeQueryMap.default;
          const value = valueFn(val);
          const fieldName = this.storeFieldKeyMap[key] ?? key;
          return Object.assign(result, { [fieldName]: value });
        }, {});
    };

    return getRouteQueryValue();
  }
}

export default RouteUrlResolver;
export { RetrieveUrlResolver };
