import { defineComponent } from 'vue';

export default defineComponent({
  name: 'TraceLog',
  
  setup() {
    return () => (
      <div class="trace-page">
        <t-card title="Trace 日志" bordered={false}>
          <t-empty description="功能开发中..." />
        </t-card>
      </div>
    );
  },
});
