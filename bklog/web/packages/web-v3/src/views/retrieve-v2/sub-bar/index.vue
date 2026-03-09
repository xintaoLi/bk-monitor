<template>
  <div class="v2-sub-bar">
    <slot />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

/**
 * V2 子工具栏占位组件
 */
export default defineComponent({
  name: 'V2SubBar',
});
</script>

<style lang="scss" scoped>
.v2-sub-bar {
  width: 100%;
}
</style>
