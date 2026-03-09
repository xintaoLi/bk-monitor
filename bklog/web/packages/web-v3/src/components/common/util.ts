// Auto-generated stub
export const deepClone = (obj: any) => JSON.parse(JSON.stringify(obj));
export const debounce = (fn: Function, delay: number = 300) => {
  let timer: any = null;
  return (...args: any[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};
export const throttle = (fn: Function, delay: number = 300) => {
  let last = 0;
  return (...args: any[]) => {
    const now = Date.now();
    if (now - last >= delay) { last = now; fn(...args); }
  };
};
export const formatDate = (date: any, format?: string) => String(date);
export default {} as any;

export const formatNumberWithRegex = (val: number | string): string => String(val);
export const parseTableRowData = (row: any) => row || {};
export const getValueByPath = (obj: any, path: string) => {
  return path.split('.').reduce((acc, key) => acc?.[key], obj);
};
export const copyText = (text: string) => {
  navigator.clipboard?.writeText(text).catch(() => {});
};
