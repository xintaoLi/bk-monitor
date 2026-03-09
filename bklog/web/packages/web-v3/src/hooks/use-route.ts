/**
 * useRoute hook - provides current route information
 * Compatibility wrapper for Vue Router
 */
import { useRoute as vueUseRoute } from 'vue-router';
import type { RouteLocationNormalizedLoaded } from 'vue-router';

export function useRouteHook(): RouteLocationNormalizedLoaded {
  return vueUseRoute();
}

export { useRouteHook as useRoute };
export default useRouteHook;
