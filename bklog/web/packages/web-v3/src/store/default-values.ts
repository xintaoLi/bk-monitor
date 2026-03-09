/**
 * Store 默认值 stub
 */

export interface RetrieveParams {
  spaceUid?: string;
  bkBizId?: number | string;
  search_mode?: string;
  ids?: any[];
  [key: string]: any;
}

export function getDefaultRetrieveParams(overrides: Partial<RetrieveParams> = {}): RetrieveParams {
  return {
    spaceUid: '',
    bkBizId: 0,
    search_mode: 'ui',
    ids: [],
    ...overrides,
  };
}

export function updateURLArgs(route: any): void {
  console.log('updateURLArgs', route);
  // TODO: 实现 URL 参数更新逻辑
}

export default {
  getDefaultRetrieveParams,
  updateURLArgs,
};
