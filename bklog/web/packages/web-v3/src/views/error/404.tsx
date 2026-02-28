import { defineComponent } from 'vue';
import { useRouter } from 'vue-router';

export default defineComponent({
  name: 'Error404',
  
  setup() {
    const router = useRouter();
    
    const goBack = () => {
      router.back();
    };
    
    const goHome = () => {
      router.push('/');
    };
    
    return () => (
      <div class="error-page">
        <t-result
          status="404"
          title="404"
          description="抱歉，您访问的页面不存在"
        >
          {{
            extra: () => (
              <div>
                <t-button theme="primary" onClick={goHome}>返回首页</t-button>
                <t-button onClick={goBack} style={{ marginLeft: '16px' }}>返回上一页</t-button>
              </div>
            )
          }}
        </t-result>
      </div>
    );
  },
});
