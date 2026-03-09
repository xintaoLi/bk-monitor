// Auto-generated stub
export default {} as any;
export const getRetrieveList = (...args: any[]) => Promise.resolve({} as any);
export const createRetrieve = (...args: any[]) => Promise.resolve({} as any);
export const updateRetrieve = (...args: any[]) => Promise.resolve({} as any);

export enum ClusteringConfigStatus {
  RUNNING = 'running',
  STOPPED = 'stopped',
  FAILED = 'failed',
}

export interface Histogram {
  time?: number;
  count?: number;
  [key: string]: any;
}

export interface LogSearchResult {
  list?: any[];
  total?: number;
  [key: string]: any;
}

export interface IndexSetDataList {
  index_set_id?: number;
  name?: string;
  [key: string]: any;
}

export interface UserGroupList {
  group_id?: number;
  group_name?: string;
  users?: any[];
  [key: string]: any;
}

export interface ClusteringInfo {
  clustering_id?: number;
  status?: string;
  [key: string]: any;
}
