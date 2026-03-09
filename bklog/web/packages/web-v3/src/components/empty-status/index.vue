<template>
  <div class="empty-status"><slot></slot></div>
</template>
<script setup lang="ts">
interface Props {
  emptyType?: string;
  type?: string;
  showText?: boolean;
  [key: string]: any;
}

withDefaults(defineProps<Props>(), {
  emptyType: 'empty',
  type: 'empty',
  showText: true,
});

defineEmits<{
  'operation': [type: string];
  'on-operation': [type: string];
}>();
</script>
