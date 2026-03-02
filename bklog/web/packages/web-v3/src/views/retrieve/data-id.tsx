/**
 * data-id.tsx - DataId URL 跳转页（Vue3 TSX）
 * 对齐原 src/views/data-id-url 功能：根据 data_id 跳转到对应索引集
 */

import { defineComponent, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import http from '@/api';

export default defineComponent({
  name: 'DataIdView',
  setup() {
    const { t } = useI18n();
    const route = useRoute();
    const router = useRouter();

    onMounted(async () => {
      const dataId = route.query.data_id || route.params.dataId;
      if (!dataId) {
        router.replace({ name: 'retrieve' });
        return;
      }

      try {
        const data = await http.request<{ index_set_id: string; space_uid: string }>(
          'retrieve/getIndexSetByDataId',
          { query: { data_id: dataId } },
        );

        if (data?.index_set_id) {
          router.replace({
            name: 'retrieve',
            query: {
              indexId: data.index_set_id,
              spaceUid: data.space_uid || route.query.spaceUid,
            },
          });
        } else {
          router.replace({ name: 'retrieve' });
        }
      } catch {
        router.replace({ name: 'retrieve' });
      }
    });

    return () => (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div class='loading-spinner' />
        <span style={{ marginLeft: '8px', color: '#63656e' }}>{t('正在跳转...')}</span>
      </div>
    );
  },
});
