// Auto-generated stub
export interface UseJsonFormatterOptions {
  fields?: any[];
  jsonValue?: any;
  field?: any;
  onSegmentClick?: (...args: any[]) => void;
  [key: string]: any;
}

export function useJsonFormatter(options: UseJsonFormatterOptions = {}) {
  return {
    formattedValue: null as any,
    format: (...args: any[]) => ({} as any),
    destroy: () => {},
  };
}

export default useJsonFormatter;
