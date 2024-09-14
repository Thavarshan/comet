<script setup lang="ts">
import { ref, type HTMLAttributes } from 'vue';
import { cn } from '@/ui/utils';
import {
  MoonStar,
  Sun,
} from 'lucide-vue-next';
import { Button } from '@/ui/components/button';
import { useColourMode } from '../composables/colour-mode';

const {
  mode,
  toggleMode,
} = useColourMode();

const props = defineProps<{
  class?: HTMLAttributes['class'];
}>();
</script>

<template>
  <div :class="cn(props.class)">
    <Button variant="outline" size="icon" @click="toggleMode">
      <MoonStar v-if="mode == 'light'" class="size-4" />
      <Sun v-if="mode == 'dark'" class="size-4" />
    </Button>
  </div>
</template>

