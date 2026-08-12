export type GenerateQueryStringResponse = {
  result?: boolean;
  data?: {
    querystring?: string;
  };
};

export type UiToSqlConvertOutcome =
  | { ok: true; keyword: string; autoQuery: false }
  | { ok: false; autoQuery: false; warn: true };

export function shouldConvertUiToSqlOnModeSwitch(
  fromIndex: number,
  toIndex: number,
  additionLength: number,
): boolean {
  return fromIndex === 0 && toIndex === 1 && additionLength > 0;
}

export function resolveUiToSqlConvertOutcome(
  res: GenerateQueryStringResponse | null | undefined,
): UiToSqlConvertOutcome {
  if (res?.result) {
    return {
      ok: true,
      keyword: res.data?.querystring || '',
      autoQuery: false,
    };
  }

  return {
    ok: false,
    autoQuery: false,
    warn: true,
  };
}
