import { defineComponent } from 'vue';
import { Popup } from 'tdesign-vue-next';

export default defineComponent({
  name: 'BklogPopover',
  props: {
    content: String,
    placement: {
      type: String,
      default: 'top',
    },
  },
  setup(props, { slots }) {
    return () => (
      <Popup
        content={props.content}
        placement={props.placement as any}
      >
        {slots.default?.()}
      </Popup>
    );
  },
});
