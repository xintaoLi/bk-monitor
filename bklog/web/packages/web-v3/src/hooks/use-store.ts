/**
 * useStore composable - provides access to all Pinia stores
 * Compatibility layer for Vue2 -> Vue3 migration
 */
import { useGlobalStore } from '@/stores/global';
import { useRetrieveStore } from '@/stores/retrieve';
import { useUserStore } from '@/stores/user';
import { useStorageStore } from '@/stores/storage';
import { useIndexFieldStore } from '@/stores/index-field';
import { useCollectStore } from '@/stores/collect';
import { useDashboardStore } from '@/stores/dashboard';

// Re-export all stores as named exports
export { useGlobalStore, useRetrieveStore, useUserStore, useStorageStore, useIndexFieldStore, useCollectStore, useDashboardStore };

// Default export: function that returns all stores
export default function useStore() {
  const globalStore = useGlobalStore();
  const retrieveStore = useRetrieveStore();
  const userStore = useUserStore();
  const storageStore = useStorageStore();
  const indexFieldStore = useIndexFieldStore();
  const collectStore = useCollectStore();
  const dashboardStore = useDashboardStore();
  return {
    globalStore,
    retrieveStore,
    userStore,
    storageStore,
    indexFieldStore,
    collectStore,
    dashboardStore,
    // Vuex compatibility shim
    getters: globalStore as any,
    state: globalStore as any,
  };
}
