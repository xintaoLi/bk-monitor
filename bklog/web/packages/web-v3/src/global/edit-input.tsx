import { defineComponent } from 'vue';
export default defineComponent({
  name: 'EditInput',
  setup() {
    return () => <input class="edit-input" />;
  },
});
