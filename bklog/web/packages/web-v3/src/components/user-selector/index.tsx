// Auto-generated stub
import { defineComponent } from 'vue';
export const UserSelector = defineComponent({
  name: 'UserSelector',
  props: {
    value: { type: Array, default: () => [] },
    modelValue: { type: Array, default: () => [] },
  },
  emits: ['update:modelValue', 'change'],
  setup() { return {}; },
  render() { return <div class="user-selector"></div>; },
});
export default UserSelector;
