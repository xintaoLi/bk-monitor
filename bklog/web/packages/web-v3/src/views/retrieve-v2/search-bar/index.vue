<template>
  <div class="v2-search-bar">
    <slot />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

/**
 * V2 搜索栏占位组件
 * 用于兼容 V3 中对 V2 组件的引用
 */
export default defineComponent({
  name: 'V2SearchBar',
});
</script>

<style lang="scss" scoped>
.v2-search-bar {
  width: 100%;
}
</style>
