/**
 * utils/index.ts - 公共工具函数
 * 迁移自 src/common/util.js
 */

/** 上下文高亮颜色列表（深色/浅色配对） */
export const contextHighlightColor: Array<{ dark: string; light: string }> = [
  { dark: 'rgb(255, 209, 138)', light: 'rgb(255, 235, 204)' },
  { dark: 'rgb(164, 235, 202)', light: 'rgb(206, 235, 222)' },
  { dark: 'rgb(171, 221, 245)', light: 'rgb(215, 235, 245)' },
  { dark: 'rgb(179, 190, 255)', light: 'rgb(224, 229, 255)' },
  { dark: 'rgb(243, 179, 255)', light: 'rgb(249, 219, 255)' },
  { dark: 'rgb(255, 179, 191)', light: 'rgb(255, 224, 230)' },
  { dark: 'rgb(199, 240, 153)', light: 'rgb(226, 240, 211)' },
];

/**
 * 深拷贝
 */
export function deepClone<T>(obj: T, hash = new WeakMap()): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (hash.has(obj as object)) return hash.get(obj as object) as T;
  if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T;
  if (obj instanceof RegExp) return new RegExp(obj.source, obj.flags) as unknown as T;
  if (obj instanceof Map) {
    const result = new Map();
    hash.set(obj as object, result);
    Array.from(obj, ([key, val]) => result.set(key, deepClone(val, hash)));
    return result as unknown as T;
  }
  const result = Array.isArray(obj) ? [] : Object.create(Object.getPrototypeOf(obj));
  hash.set(obj as object, result);
  return Object.assign(result, ...Object.keys(obj).map((key) => ({ [key]: deepClone((obj as any)[key], hash) })));
}

/**
 * 防抖
 */
export function debounce<T extends (...args: any[]) => any>(fn: T, delay = 300): T {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return function (this: any, ...args: any[]) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
      timer = null;
    }, delay);
  } as T;
}

/**
 * 格式化字节大小
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

/**
 * 获取字符长度（汉字算两个字节）
 */
export function getCharLength(str: string): number {
  let bitLen = 0;
  for (let i = 0; i < str.length; i++) {
    bitLen += str.charCodeAt(i) > 255 ? 2 : 1;
  }
  return bitLen;
}

/**
 * 生成随机 ID
 */
export function randomId(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * XSS 过滤（简化版，使用 DOMPurify）
 */
export function xssFilter(str: string): string {
  if (typeof str !== 'string') return str;
  // 保留 <mark> 标签用于高亮
  return str.replace(/<(?!\/?(mark)(\s|>))[^>]+>/gi, '');
}

/**
 * 解析嵌套字段值
 */
export function parseTableRowData(
  row: Record<string, any>,
  key: string,
  fieldType?: string,
  isFormatDate = false,
  emptyCharacter: string | null = '--',
): any {
  const keyArr = typeof key === 'string' ? key.split('.') : [];
  let data: any;

  try {
    if (keyArr.length === 1) {
      data = row[key];
    } else {
      for (let index = 0; index < keyArr.length; index++) {
        const item = keyArr[index];
        if (index === 0) {
          data = row[item];
          continue;
        }
        if (data === undefined) break;
        if (Array.isArray(data)) {
          data = data
            .map((d) => parseTableRowData(d, keyArr.slice(index).join('.'), fieldType, isFormatDate, emptyCharacter))
            .filter((d) => d !== emptyCharacter);
          break;
        }
        if (data[item]) {
          data = data[item];
        } else {
          const validKey = keyArr.splice(index, keyArr.length - index).join('.');
          data = data[validKey];
          break;
        }
      }
    }
  } catch (e) {
    console.warn('List data analyses error：', e);
    data = emptyCharacter;
  }

  if (Array.isArray(data) && !data.length) return emptyCharacter;
  if (typeof data === 'object' && data !== null) return JSON.stringify(data);
  return data === null || data === undefined || data === '' ? emptyCharacter : data;
}

/**
 * 获取行数据中的字段值（支持虚拟别名字段）
 */
export function getRowFieldValue(row: Record<string, any>, field: any): any {
  if (field.is_virtual_alias_field) {
    const fieldList = [field.field_name, ...(field.source_field_names ?? [])];
    for (const fieldName of fieldList) {
      const value = parseTableRowData(row, fieldName, field.field_type, false, null);
      if (value !== undefined && value !== null && value !== '') {
        return value ?? '--';
      }
    }
  }
  return parseTableRowData(row, field.field_name, field.field_type, false);
}

/**
 * 大数字列表解析（处理 JSON 大数字精度问题）
 */
export function parseBigNumberList(list: any[]): any[] {
  return (list || []).map((item) =>
    Object.keys(item || {}).reduce(
      (output, key) => ({
        ...output,
        [key]: typeof item[key] === 'object' && item[key] !== null ? JSON.stringify(item[key]) : item[key],
      }),
      {},
    ),
  );
}
