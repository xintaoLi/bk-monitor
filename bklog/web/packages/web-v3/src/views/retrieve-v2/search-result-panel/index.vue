<template>
  <div class="v2-placeholder">
    <slot />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
export default defineComponent({
  name: 'V2Placeholder',
});
</script>

<style lang="scss" scoped>
.v2-placeholder {
  width: 100%;
}
</style>
