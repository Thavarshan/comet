<script setup lang="ts">
import { cn } from '@/ui/utils';
import { HTMLAttributes } from 'vue';

const props = defineProps<{
  class?: HTMLAttributes['class'];
}>();
</script>

<template>
  <div :class="cn('flex h-12 items-center justify-between space-x-1 rounded-lg border bg-background p-1', props.class)">
    <slot name="left" />
    <slot name="right" />
  </div>
</template>

