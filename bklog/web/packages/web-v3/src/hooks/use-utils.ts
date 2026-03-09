/**
 * Utility composable hook
 * Provides common utility functions
 */
import dayjs from 'dayjs';

interface TimeZoneFormatOptions {
  format?: string;
  timezone?: string;
  [key: string]: any;
}

export function useUtils() {
  /**
   * Format response list datetime strings with timezone
   */
  const formatResponseListTimeZoneString = (
    list: any[],
    options: TimeZoneFormatOptions = {},
    fields: string[] = []
  ): any[] => {
    const format = options.format || 'YYYY-MM-DD HH:mm:ss';
    return list.map(item => {
      const newItem = { ...item };
      fields.forEach(field => {
        if (newItem[field]) {
          newItem[field] = dayjs(newItem[field]).format(format);
        }
      });
      return newItem;
    });
  };

  /**
   * Format a single datetime string with timezone
   */
  const formatDateWithTimezone = (date: any, format = 'YYYY-MM-DD HH:mm:ss'): string => {
    if (!date) return '';
    return dayjs(date).format(format);
  };

  /**
   * Generate random string
   */
  const generateId = (len = 8): string => {
    return Math.random().toString(36).substr(2, len);
  };

  /**
   * Deep clone an object
   */
  const deepClone = <T>(obj: T): T => {
    return JSON.parse(JSON.stringify(obj)) as T;
  };

  return {
    formatResponseListTimeZoneString,
    formatDateWithTimezone,
    generateId,
    deepClone,
  };
}

export default useUtils;
