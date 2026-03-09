// Augment dayjs with timezone plugin support
import 'dayjs';

declare module 'dayjs' {
  interface Dayjs {
    tz(timezone?: string): Dayjs;
  }
  
  // Add tz to the dayjs function itself as namespace
  namespace dayjs {
    function tz(date?: ConfigType | undefined, timezone?: string): Dayjs;
    function tz(date?: ConfigType | undefined, format?: string, timezone?: string): Dayjs;
    namespace tz {
      function setDefault(timezone: string): void;
      function guess(): string;
    }
  }
}
