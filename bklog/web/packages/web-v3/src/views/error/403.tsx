import { defineComponent } from 'vue';
import { useRouter } from 'vue-router';

export default defineComponent({
  name: 'Error403',
  
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
          status="403"
          title="403"
          description="抱歉，您没有权限访问此页面"
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
