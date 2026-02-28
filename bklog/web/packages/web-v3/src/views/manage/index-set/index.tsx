import { defineComponent } from 'vue';

export default defineComponent({
  name: 'IndexSet',
  
  setup() {
    return () => (
      <div class="index-set-page">
        <t-card title="索引集管理" bordered={false}>
          <t-empty description="功能开发中..." />
        </t-card>
      </div>
    );
  },
});
