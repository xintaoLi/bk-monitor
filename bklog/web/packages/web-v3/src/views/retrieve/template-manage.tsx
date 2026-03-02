/**
 * template-manage.tsx - 检索模板管理页（Vue3 TSX）
 * 对齐原项目检索模板管理功能
 */

import { defineComponent, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import http from '@/api';

interface Template {
  id: string | number;
  name: string;
  keyword: string;
  created_at: string;
}

export default defineComponent({
  name: 'TemplateManageView',
  setup() {
    const { t } = useI18n();
    const templates = ref<Template[]>([]);
    const isLoading = ref(false);

    async function loadTemplates() {
      isLoading.value = true;
      try {
        const data = await http.request<Template[]>('retrieve/getTemplateList', {});
        templates.value = data || [];
      } catch {
        templates.value = [];
      } finally {
        isLoading.value = false;
      }
    }

    onMounted(loadTemplates);

    return () => (
      <div style={{ padding: '20px', height: '100%', background: '#f4f7fa' }}>
        <div style={{ background: '#fff', borderRadius: '4px', padding: '20px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 500, marginBottom: '16px', color: '#313238' }}>
            {t('检索模板管理')}
          </h2>
          {isLoading.value ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#c4c6cc' }}>{t('加载中...')}</div>
          ) : templates.value.length ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f5f6fa' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: '#63656e' }}>{t('模板名称')}</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: '#63656e' }}>{t('关键词')}</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: '#63656e' }}>{t('创建时间')}</th>
                </tr>
              </thead>
              <tbody>
                {templates.value.map((tpl) => (
                  <tr key={tpl.id} style={{ borderBottom: '1px solid #f0f1f5' }}>
                    <td style={{ padding: '10px 12px', color: '#313238' }}>{tpl.name}</td>
                    <td style={{ padding: '10px 12px', color: '#63656e' }}>{tpl.keyword}</td>
                    <td style={{ padding: '10px 12px', color: '#63656e' }}>{tpl.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#c4c6cc' }}>{t('暂无模板')}</div>
          )}
        </div>
      </div>
    );
  },
});
