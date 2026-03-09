// Auto-generated stub
export default {} as any;
export const getLogClusterList = (...args: any[]) => Promise.resolve({} as any);
export const createLogCluster = (...args: any[]) => Promise.resolve({} as any);
export const updateLogCluster = (...args: any[]) => Promise.resolve({} as any);
export const deleteLogCluster = (...args: any[]) => Promise.resolve({} as any);
export const getClusterConfig = (...args: any[]) => Promise.resolve({} as any);

export interface LogPattern {
  pattern?: string;
  count?: number;
  signature?: string;
  [key: string]: any;
}

export interface ConfigInfo {
  clustering_id?: number;
  config_id?: number;
  [key: string]: any;
}

export interface RuleTemplate {
  template_id?: number;
  template_name?: string;
  rules?: any[];
  [key: string]: any;
}
