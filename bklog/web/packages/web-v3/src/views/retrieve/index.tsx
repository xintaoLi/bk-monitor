import { defineComponent } from 'vue';

/**
 * 检索页面
 */
export default defineComponent({
  name: 'RetrieveIndex',

  setup() {
    return () => (
      <div class="retrieve-page">
        <t-card title="日志检索" bordered={false}>
          <div class="retrieve-container">
            <div class="search-bar">
              <t-input
                placeholder="请输入检索关键词"
                clearable
                style={{ width: '100%' }}
              />
            </div>
            
            <div class="result-area mt-lg">
              <t-empty description="暂无数据" />
            </div>
          </div>
        </t-card>
      </div>
    );
  },
});
