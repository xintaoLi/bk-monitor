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

/**
 * Base64 解码
 * @param str - Base64 编码的字符串
 * @returns 解码后的字符串
 */
export function base64Decode(str: string): string {
  if (!str) return ''
  try {
    return decodeURIComponent(escape(atob(str)))
  } catch (error) {
    console.error('Base64 decode error:', error)
    return str
  }
}

/**
 * Base64 编码
 * @param str - 原始字符串
 * @returns Base64 编码后的字符串
 */
export function base64Encode(str: string): string {
  if (!str) return ''
  try {
    return btoa(unescape(encodeURIComponent(str)))
  } catch (error) {
    console.error('Base64 encode error:', error)
    return str
  }
}

/**
 * Base64 字符串转规则列表
 * @param str - Base64 编码的规则字符串
 * @returns 规则列表
 */
export function base64ToRuleList(str: string): Array<Record<string, any>> {
  if (!str) {
    return []
  }
  try {
    const ruleList = JSON.parse(base64Decode(str))
    const ruleNewList = ruleList.reduce((pre: any[], cur: string, index: number) => {
      const itemObj: Record<string, any> = {}
      const matchVal = cur.match(/:(.*)/)
      if (!matchVal) return pre
      
      const key = cur.substring(0, matchVal.index)
      itemObj[key] = matchVal[1]
      itemObj.__Index__ = index
      pre.push(itemObj)
      return pre
    }, [])
    return ruleNewList
  } catch (error) {
    console.error('Base64 to rule list error:', error)
    return []
  }
}
