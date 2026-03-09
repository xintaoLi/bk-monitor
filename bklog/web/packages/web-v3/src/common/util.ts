/**
 * 通用工具函数 stub
 * 用于兼容从 v2 迁移过来的代码
 */

import dayjs from 'dayjs';

/**
 * 复制文本到剪贴板
 */
export function copyText(text: string): boolean {
  try {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      return true;
    }
    // fallback
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    return true;
  } catch (error) {
    console.error('Failed to copy text:', error);
    return false;
  }
}

/**
 * 复制消息（带提示）
 */
export function copyMessage(text: string, callback?: () => void): boolean {
  const result = copyText(text);
  if (result && callback) callback();
  return result;
}

/**
 * 生成唯一 ID
 */
export function generateId(prefix = 'id'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 生成随机数
 */
export function random(min = 0, max = 100): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 深拷贝
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * 深度相等比较
 */
export function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  
  if (keysA.length !== keysB.length) return false;
  
  return keysA.every(key => deepEqual(a[key], b[key]));
}

/**
 * 防抖
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return function (this: any, ...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

/**
 * 节流
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let previous = 0;
  return function (this: any, ...args: Parameters<T>) {
    const now = Date.now();
    const remaining = wait - (now - previous);
    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      previous = now;
      func.apply(this, args);
    } else if (!timeout) {
      timeout = setTimeout(() => {
        previous = Date.now();
        timeout = null;
        func.apply(this, args);
      }, remaining);
    }
  };
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * 格式化日期
 */
export function formatDate(date: any, format = 'YYYY-MM-DD HH:mm:ss'): string {
  if (!date) return '';
  return dayjs(date).format(format);
}

/**
 * 格式化数字（添加千分位）
 */
export function formatNumberWithRegex(num: number | string): string {
  const numStr = String(num);
  return numStr.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * 下载文件
 */
export function downloadFile(url: string, filename?: string): void {
  const a = document.createElement('a');
  a.href = url;
  if (filename) a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * 下载文件（别名）
 */
export function downFile(url: string, filename?: string): void {
  downloadFile(url, filename);
}

/**
 * Blob 下载
 */
export function blobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  downloadFile(url, filename);
  URL.revokeObjectURL(url);
}

/**
 * Base64 编码
 */
export function base64Encode(str: string): string {
  try {
    return btoa(encodeURIComponent(str));
  } catch {
    return '';
  }
}

/**
 * Base64 解码
 */
export function base64Decode(str: string): string {
  try {
    return decodeURIComponent(atob(str));
  } catch {
    return '';
  }
}

/**
 * XSS 过滤
 */
export function xssFilter(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * 正则表达式生成
 */
export function getRegExp(pattern: string, flags?: string): RegExp | null {
  try {
    return new RegExp(pattern, flags);
  } catch {
    return null;
  }
}

/**
 * 判断是否为 IPv6 地址
 */
export function isIPv6(ip: string): boolean {
  const ipv6Pattern = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::1|::)$/;
  return ipv6Pattern.test(ip);
}

/**
 * 解析大数字列表
 */
export function parseBigNumberList(str: string): number[] {
  if (!str) return [];
  return str.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
}

/**
 * 清除表格过滤
 */
export function clearTableFilter(tableRef: any): void {
  if (tableRef?.clearFilter) {
    tableRef.clearFilter();
  }
}

/**
 * 解析表格行数据
 */
export function parseTableRowData(row: any): any {
  return { ...row };
}

/**
 * 获取扁平对象值
 */
export function getFlatObjValues(obj: Record<string, any>): any[] {
  return Object.values(obj).flat();
}

/**
 * 读取 Blob 响应为 JSON
 */
export async function readBlobRespToJson(blob: Blob): Promise<any> {
  const text = await blob.text();
  try {
    return JSON.parse(text);
  } catch {
    return { error: 'Invalid JSON' };
  }
}

/**
 * 上下文高亮颜色
 */
export function contextHighlightColor(level: string): string {
  const colorMap: Record<string, string> = {
    error: '#ff5656',
    warning: '#ff9c01',
    info: '#3a84ff',
    debug: '#979ba5',
  };
  return colorMap[level] || '#979ba5';
}

/**
 * 获取操作系统命令标签
 */
export function getOsCommandLabel(os: string): string {
  const osMap: Record<string, string> = {
    linux: 'Linux',
    windows: 'Windows',
    macos: 'macOS',
  };
  return osMap[os?.toLowerCase()] || os;
}

/**
 * 项目管理相关
 */
export function projectManages(): any {
  return {
    // 项目管理相关功能
  };
}

/**
 * 获取默认设置选中字段
 */
export function getDefaultSettingSelectFiled(cacheKey?: string, defaultValue?: any[]): any[] {
  const key = cacheKey ? `bklog_${cacheKey}_select_fields` : 'bklog_default_select_fields';
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : (defaultValue || []);
}

/**
 * 设置默认设置选中字段
 */
export function setDefaultSettingSelectFiled(cacheKey?: string, fields?: any[]): void {
  if (Array.isArray(cacheKey)) {
    // Called with just fields array
    localStorage.setItem('bklog_default_select_fields', JSON.stringify(cacheKey));
    return;
  }
  const key = cacheKey ? `bklog_${cacheKey}_select_fields` : 'bklog_default_select_fields';
  localStorage.setItem(key, JSON.stringify(fields || []));
}

/**
 * 更新最后选中的索引 ID
 */
export function updateLastSelectedIndexId(indexId: string): void {
  localStorage.setItem('bklog_last_selected_index_id', indexId);
}

export default {
  copyText,
  copyMessage,
  generateId,
  random,
  deepClone,
  deepEqual,
  debounce,
  throttle,
  formatFileSize,
  formatDate,
  formatNumberWithRegex,
  downloadFile,
  downFile,
  blobDownload,
  base64Encode,
  base64Decode,
  xssFilter,
  getRegExp,
  isIPv6,
  parseBigNumberList,
  clearTableFilter,
  parseTableRowData,
  getFlatObjValues,
  readBlobRespToJson,
  contextHighlightColor,
  getOsCommandLabel,
  projectManages,
  getDefaultSettingSelectFiled,
  setDefaultSettingSelectFiled,
  updateLastSelectedIndexId,
};
