// Auto-generated stub
import dayjs from 'dayjs';
export default dayjs;

export const updateTimezone = (tz: string) => {
  try {
    const dayjs = require('dayjs');
    dayjs.tz?.setDefault(tz);
  } catch {}
};
