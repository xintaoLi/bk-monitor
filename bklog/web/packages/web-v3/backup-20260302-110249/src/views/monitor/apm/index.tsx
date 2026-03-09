import { defineComponent } from 'vue';

export default defineComponent({
  name: 'ApmLog',
  
  setup() {
    return () => (
      <div class="apm-page">
        <t-card title="APM 日志" bordered={false}>
          <t-empty description="功能开发中..." />
        </t-card>
      </div>
    );
  },
});
