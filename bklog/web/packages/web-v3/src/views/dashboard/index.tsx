import { defineComponent } from 'vue';

export default defineComponent({
  name: 'DashboardIndex',
  
  setup() {
    return () => (
      <div class="dashboard-page">
        <t-card title="仪表盘" bordered={false}>
          <t-empty description="功能开发中..." />
        </t-card>
      </div>
    );
  },
});
