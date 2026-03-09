/**
 * useRouter hook - provides router instance
 * Compatibility wrapper for Vue Router
 */
import { useRouter as vueUseRouter, useRoute as vueUseRoute } from 'vue-router';
import type { Router, RouteLocationNormalizedLoaded } from 'vue-router';

export function useRouterHook(): Router {
  return vueUseRouter();
}

export { useRouterHook as useRouter };
export default useRouterHook;
