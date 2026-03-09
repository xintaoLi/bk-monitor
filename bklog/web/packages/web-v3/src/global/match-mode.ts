// Auto-generated stub
export const MATCH_MODES = {
  CONTAINS: 'contains',
  EXACT: 'exact',
  REGEX: 'regex',
} as const;
export type MatchMode = typeof MATCH_MODES[keyof typeof MATCH_MODES];
export default MATCH_MODES;
