// Auto-generated stub for tenant manager
export interface UserInfoLoadedEventData {
  username: string;
  tenant_id?: string;
  [key: string]: any;
}

export interface TenantManager {
  batchGetUserDisplayInfo(usernames: string[]): Promise<Record<string, string>>;
  loadUserInfo(): Promise<UserInfoLoadedEventData>;
  getTenantId(): string;
  isMultiTenant(): boolean;
  on(event: string, callback: (...args: any[]) => void): void;
  off(event: string, callback?: (...args: any[]) => void): void;
}

export const tenantManager: TenantManager = {
  loadUserInfo: async () => ({ username: '' }),
  getTenantId: () => '',
  isMultiTenant: () => false,
  batchGetUserDisplayInfo: async (usernames: string[]) => {
    return Object.fromEntries(usernames.map(u => [u, u]));
  },
  on: (_event, _callback) => {},
  off: (_event, _callback) => {},
};

export default tenantManager;
