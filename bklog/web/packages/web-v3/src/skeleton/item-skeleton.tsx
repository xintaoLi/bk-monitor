import { defineComponent } from 'vue';

export default defineComponent({
  name: 'ItemSkeleton',
  setup() {
    return () => (
      <div class="item-skeleton">
        <div class="skeleton-line" style="width: 60%; height: 16px; background: #f0f0f0; margin-bottom: 8px;"></div>
        <div class="skeleton-line" style="width: 40%; height: 14px; background: #f0f0f0;"></div>
      </div>
    );
  },
});
