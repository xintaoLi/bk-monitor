// Auto-generated stub
export const defaultEchartOptions = {
  grid: { top: 10, bottom: 40, left: 20, right: 20, containLabel: true },
  tooltip: { trigger: 'axis' },
  legend: { type: 'scroll' },
  xAxis: { type: 'category', boundaryGap: false },
  yAxis: { type: 'value' },
};
export const createEchartOptions = (options: any = {}) => ({
  ...defaultEchartOptions,
  ...options,
});
export default { defaultEchartOptions, createEchartOptions };
