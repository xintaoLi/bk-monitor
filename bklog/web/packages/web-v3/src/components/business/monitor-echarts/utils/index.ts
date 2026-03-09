// Auto-generated stub
export * from './chart-in-view';
export * from './watermark-maker';
export const formatValue = (val: any) => val;
export default {} as any;

export const hexToRgbA = (hex: string, opacity = 1): string => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return hex;
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  return `rgba(${r},${g},${b},${opacity})`;
};
