import { defineComponent } from 'vue';
import { useRouter } from 'vue-router';

export default defineComponent({
  name: 'Error500',
  
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
          status="500"
          title="500"
          description="抱歉，服务器出错了"
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
