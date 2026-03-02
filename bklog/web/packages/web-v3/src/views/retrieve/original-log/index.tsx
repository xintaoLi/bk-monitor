/**
 * original-log/index.tsx - 原始日志模块主入口（Vue3 TSX）
 * 整合 data-filter + origin-log-result 两个子组件
 */
import { defineComponent, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import DataFilter from './components/data-filter/index';
import OriginLogResult from './components/origin-log-result/index';

import './index.scss';

export default defineComponent({
  name: 'OriginalLog',
  props: {
    isRealTime: {
      type: Boolean,
      default: false,
    },
  },
  setup(props) {
    const { t } = useI18n();
    const dataFilterRef = ref<any>(null);
    const logResultRef = ref<any>(null);

    // 过滤条件变化 → 传给日志结果组件
    const filterState = ref({
      filterKey: '',
      filterType: 'include',
      ignoreCase: false,
      highlightList: [] as any[],
      showType: 'log',
      interval: { prev: 0, next: 0 },
    });

    const handleFilter = (key: string, value: any) => {
      (filterState.value as any)[key] = value;
    };

    const handleFieldsConfigUpdate = (list: string[]) => {
      // 字段配置更新后，通知 store 刷新
    };

    const handleTogglePoll = (isPolling: boolean) => {
      // 实时日志轮询开关
    };

    return () => (
      <div class='original-log-container'>
        <DataFilter
          ref={dataFilterRef}
          isRealTime={props.isRealTime}
          onHandle-filter={handleFilter}
          onToggle-poll={handleTogglePoll}
          onFields-config-update={handleFieldsConfigUpdate}
        />
        <OriginLogResult
          ref={logResultRef}
          indexSetId={0}
          logIndex={0}
          retrieveParams={{}}
        />
      </div>
    );
  },
});
