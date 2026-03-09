// Auto-generated stub
export interface IAnnotation {
  id?: string;
  title?: string;
  points?: any[];
  color?: string;
  [key: string]: any;
}

export interface IAnnotationListItem {
  id?: string;
  title?: string;
  [key: string]: any;
}

export interface ILegendItem {
  name?: string;
  value?: string;
  color?: string;
  show?: boolean;
  [key: string]: any;
}

export interface IMoreToolItem {
  id: string;
  label: string;
  icon?: string;
  [key: string]: any;
}

export interface MoreChartToolItem extends IMoreToolItem {}

export interface ITextSeries {
  value?: any;
  name?: string;
  [key: string]: any;
}

export interface IStatusSeries {
  name?: string;
  data?: any[];
  color?: string;
  [key: string]: any;
}

export interface IStatusChartOption {
  series?: IStatusSeries[];
  [key: string]: any;
}

export interface ITextChartOption {
  series?: ITextSeries[];
  [key: string]: any;
}

export interface IMonitorEchartsOptions {
  title?: string;
  subtitle?: string;
  series?: any[];
  xAxis?: any;
  yAxis?: any;
  tooltip?: any;
  legend?: any;
  grid?: any;
  [key: string]: any;
}

export interface IChartTitleConfig {
  title?: string;
  subtitle?: string;
  unit?: string;
  showMore?: boolean;
  [key: string]: any;
}

export type ChartType = 'line' | 'bar' | 'pie' | 'scatter' | 'custom';
export interface ISeriesItem {
  name: string;
  type: ChartType;
  data: any[];
  [key: string]: any;
}

export default {} as any;
