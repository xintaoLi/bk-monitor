import { defineComponent } from 'vue';

export default defineComponent({
  name: 'Collection',
  
  setup() {
    return () => (
      <div class="collection-page">
        <t-card title="日志采集" bordered={false}>
          <t-empty description="功能开发中..." />
        </t-card>
      </div>
    );
  },
});
