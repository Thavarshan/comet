<script setup lang="ts">
import { type HTMLAttributes, onMounted } from 'vue';
import { cn } from '@/ui/utils';
import { MoonStar, Sun, SunMoon } from 'lucide-vue-next';
import { Button } from '@/ui/components/button';
import { useColourMode } from '../composables/colour-mode';

const { mode, toggleMode, handleColorModeChange } = useColourMode();

const props = defineProps<{
  class?: HTMLAttributes['class'];
}>();

onMounted(() => {
  handleColorModeChange();
});
</script>

<template>
  <div :class="cn(props.class)">
    <Button variant="outline" size="icon" @click="toggleMode">
      <MoonStar v-if="mode === 'light'" class="size-4" />
      <Sun v-if="mode === 'dark'" class="size-4" />
      <SunMoon v-if="mode === 'system'" class="size-4" />
    </Button>
  </div>
</template>
