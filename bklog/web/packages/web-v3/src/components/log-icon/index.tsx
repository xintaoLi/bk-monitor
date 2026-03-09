// Auto-generated stub
import { defineComponent } from 'vue';
export const LogIcon = defineComponent({
  name: 'LogIcon',
  props: {
    type: { type: String, default: '' },
    size: { type: [String, Number], default: 16 },
  },
  setup() { return {}; },
  render() { return <i class={`log-icon icon-${this.type}`}></i>; },
});
export default LogIcon;
