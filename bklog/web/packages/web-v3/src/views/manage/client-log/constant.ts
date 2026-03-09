/*
 * Client log constants
 */

export const COLLECTION_STATUS = {
  PENDING: 'pending',
  SUCCESS: 'success',
  FAILED: 'failed',
};

export default {
  COLLECTION_STATUS,
};

export const TRIGGER_FREQUENCY_OPTIONS = [
  { label: '每分钟', value: 'minute' },
  { label: '每小时', value: 'hour' },
  { label: '每天', value: 'day' },
];

export const CLIENT_TYPE_OPTIONS = [
  { label: 'Windows', value: 'windows' },
  { label: 'Linux', value: 'linux' },
  { label: 'macOS', value: 'macos' },
];

export const TASK_STAGE_OPTIONS = [
  { label: '待部署', value: 'pending' },
  { label: '部署中', value: 'deploying' },
  { label: '已部署', value: 'deployed' },
  { label: '失败', value: 'failed' },
];

export const SUSTAIN_TIME_OPTIONS = [
  { label: '10分钟', value: 600 },
  { label: '30分钟', value: 1800 },
  { label: '1小时', value: 3600 },
];
