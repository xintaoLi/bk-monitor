/** Field type visual meta (aligned with store/constant.js fieldTypeMap). Icons may be pending in font. */
export interface FieldTypeVisual {
  iconClass: string;
  color: string;
  textColor: string;
}

const DEFAULT: FieldTypeVisual = {
  iconClass: 'bklog-icon bklog-unkown',
  color: '#E8EAF0',
  textColor: '#979BA5',
};

const MAP: Record<string, FieldTypeVisual> = {
  any: { iconClass: 'bklog-icon bklog-unkown', color: '#DCDEE5', textColor: '#979BA5' },
  number: { iconClass: 'bklog-icon bklog-number-2', color: '#DDEBE6', textColor: '#60A087' },
  integer: { iconClass: 'bklog-icon bklog-number-2', color: '#DDEBE6', textColor: '#60A087' },
  double: { iconClass: 'bklog-icon bklog-number-2', color: '#DDEBE6', textColor: '#60A087' },
  float: { iconClass: 'bklog-icon bklog-number-2', color: '#DDEBE6', textColor: '#60A087' },
  long: { iconClass: 'bklog-icon bklog-number-2', color: '#DDEBE6', textColor: '#60A087' },
  keyword: { iconClass: 'bklog-icon bklog-str-2', color: '#D9E5EB', textColor: '#6498B3' },
  string: { iconClass: 'bklog-icon bklog-str-2', color: '#D9E5EB', textColor: '#6498B3' },
  text: { iconClass: 'bklog-icon bklog-text-2', color: '#E1E7F2', textColor: '#508CC8' },
  date: { iconClass: 'bklog-icon bklog-time-2', color: '#EDE7DB', textColor: '#CDAE71' },
  date_nanos: { iconClass: 'bklog-icon bklog-time-2', color: '#EDE7DB', textColor: '#CDAE71' },
  boolean: { iconClass: 'bklog-icon bklog-buer-2', color: '#F0DFDF', textColor: '#CB7979' },
  conflict: { iconClass: 'bklog-icon bklog-time-2', color: '#EDE7DB', textColor: '#CDAE71' },
  __virtual__: { iconClass: 'bklog-icon bklog-ext-2', color: '#EAE4EB', textColor: '#B68ABB' },
  object: { iconClass: 'bklog-icon bklog-object-2', color: '#E8EAF0', textColor: '#979BA5' },
  flattened: { iconClass: 'bklog-icon bklog-fllatend', color: '#E8EAF0', textColor: '#63656e' },
};

export function getFieldTypeVisual(fieldType?: string): FieldTypeVisual {
  if (!fieldType) return DEFAULT;
  return MAP[fieldType] || DEFAULT;
}
