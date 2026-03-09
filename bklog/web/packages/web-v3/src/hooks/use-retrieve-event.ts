/**
 * useRetrieveEvent hook
 * 用于检索事件管理
 */

import { onMounted, onBeforeUnmount } from 'vue';

export enum RetrieveEvent {
  // 现有事件
  TREND_GRAPH_SEARCH = 'trend-graph-search',
  LEFT_FIELD_INFO_UPDATE = 'left-field-info-update',
  QUERY_LOG = 'query-log',
  
  // 新增事件类型
  SEARCHBAR_HEIGHT_CHANGE = 'searchbar-height-change',
  FAVORITE_WIDTH_CHANGE = 'favorite-width-change',
  FAVORITE_SHOWN_CHANGE = 'favorite-shown-change',
  FAVORITE_ACTIVE_CHANGE = 'favorite-active-change',
  TREND_GRAPH_HEIGHT_CHANGE = 'trend-graph-height-change',
  GLOBAL_SCROLL = 'global-scroll',
  SEARCH_VALUE_CHANGE = 'search-value-change',
  SEARCH_TIME_CHANGE = 'search-time-change',
  AUTO_REFRESH = 'auto-refresh',
  SEARCHING_CHANGE = 'searching-change',
  INDEX_SET_ID_CHANGE = 'index-set-id-change',
  INDEX_SET_CHANGE = 'index-set-change',
  AI_CLOSE = 'ai-close',
  LEFT_FIELD_SETTING_SHOWN_CHANGE = 'left-field-setting-shown-change',
  LEFT_FIELD_SETTING_WIDTH_CHANGE = 'left-field-setting-width-change',
}

type EventCallback = (...args: any[]) => void;

const eventMap = new Map<string, Set<EventCallback>>();

export default function useRetrieveEvent() {
  const listeners = new Map<string, EventCallback>();

  const on = (event: string, callback: EventCallback) => {
    if (!eventMap.has(event)) {
      eventMap.set(event, new Set());
    }
    eventMap.get(event)!.add(callback);
    listeners.set(event, callback);
  };

  const off = (event: string, callback?: EventCallback) => {
    if (!eventMap.has(event)) return;
    
    if (callback) {
      eventMap.get(event)!.delete(callback);
    } else {
      eventMap.delete(event);
    }
  };

  const emit = (event: string, ...args: any[]) => {
    if (!eventMap.has(event)) return;
    
    eventMap.get(event)!.forEach(callback => {
      callback(...args);
    });
  };

  // addEvent 别名，兼容旧代码
  const addEvent = on;

  // 自动清理
  onBeforeUnmount(() => {
    listeners.forEach((callback, event) => {
      off(event, callback);
    });
    listeners.clear();
  });

  return {
    on,
    off,
    emit,
    addEvent,
  };
}

// 导出全局事件管理器
export const RetrieveHelper = {
  on: (event: string, callback: EventCallback) => {
    if (!eventMap.has(event)) {
      eventMap.set(event, new Set());
    }
    eventMap.get(event)!.add(callback);
  },
  
  off: (event: string, callback?: EventCallback) => {
    if (!eventMap.has(event)) return;
    
    if (callback) {
      eventMap.get(event)!.delete(callback);
    } else {
      eventMap.delete(event);
    }
  },
  
  fire: (event: string, ...args: any[]) => {
    if (!eventMap.has(event)) return;
    
    eventMap.get(event)!.forEach(callback => {
      callback(...args);
    });
  },
  
  // addEvent 别名
  addEvent: (event: string, callback: EventCallback) => {
    if (!eventMap.has(event)) {
      eventMap.set(event, new Set());
    }
    eventMap.get(event)!.add(callback);
  },
  
  setIndexsetId: (id: any, type?: any, flag?: boolean) => {
    console.log('RetrieveHelper.setIndexsetId', id, type, flag);
    // 触发 INDEX_SET_ID_CHANGE 事件
    RetrieveHelper.fire(RetrieveEvent.INDEX_SET_ID_CHANGE, id, type, flag);
  },
};
