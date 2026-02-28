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

import { ref, Ref } from 'vue'

/**
 * localStorage 存储 Hook
 * @param key - 存储键名
 * @param defaultValue - 默认值
 * @returns 存储值和操作方法
 */
export function useStorage<T = any>(key: string, defaultValue?: T) {
  /**
   * 从 localStorage 读取值
   */
  const getValue = (): T | undefined => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue
    } catch (error) {
      console.error(`Failed to get storage item "${key}":`, error)
      return defaultValue
    }
  }

  /**
   * 保存值到 localStorage
   */
  const setValue = (value: T): void => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
      storageValue.value = value
    } catch (error) {
      console.error(`Failed to set storage item "${key}":`, error)
    }
  }

  /**
   * 从 localStorage 删除值
   */
  const removeValue = (): void => {
    try {
      window.localStorage.removeItem(key)
      storageValue.value = defaultValue
    } catch (error) {
      console.error(`Failed to remove storage item "${key}":`, error)
    }
  }

  const storageValue: Ref<T | undefined> = ref(getValue())

  return {
    /** 存储的值 */
    value: storageValue,
    /** 设置值 */
    setValue,
    /** 删除值 */
    removeValue,
    /** 获取值（直接访问 localStorage） */
    getValue,
  }
}
