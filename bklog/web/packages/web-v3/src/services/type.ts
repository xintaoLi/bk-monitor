// Auto-generated stub
export default {} as any;
export type ITableItem = Record<string, any>;
export type ITableColumn = Record<string, any>;
export type ILogItem = Record<string, any>;
export type IClusterItem = Record<string, any>;
export type IClusterData = Record<string, any>;
export type IRuleItem = Record<string, any>;
export type IServiceType = Record<string, any>;

export interface IResponseData<T = any> {
  result: boolean;
  code: number;
  message: string;
  data: T;
}
