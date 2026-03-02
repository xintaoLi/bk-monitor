/**
 * index.tsx - 监控日志视图（Vue3 TSX）
 * 对齐原 src/views/monitor 功能：APM/Trace 日志嵌入
 */

import { defineComponent, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useRetrieveStore } from '@/stores/retrieve';
import RetrieveView from '@/views/retrieve/index';

export default defineComponent({
  name: 'MonitorView',
  setup() {
    const { t } = useI18n();
    const route = useRoute();
    const retrieveStore = useRetrieveStore();
    const isReady = ref(false);

    onMounted(async () => {
      const indexId = route.params.indexId as string;
      if (indexId) {
        retrieveStore.setIndexId(indexId);
        retrieveStore.updateIndexItem({ ids: [indexId], isUnionIndex: false });
        await retrieveStore.requestIndexSetFieldInfo();
      }
      isReady.value = true;
    });

    return () => (
      <div class='monitor-view' style={{ height: '100%' }}>
        {isReady.value ? <RetrieveView /> : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <div class='loading-spinner' />
          </div>
        )}
      </div>
    );
  },
});
