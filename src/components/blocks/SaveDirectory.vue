<script setup lang="ts">
import { ref } from 'vue';
import { Button } from '@/components/ui/button';
import {
  ClipboardIcon,
} from '@radix-icons/vue';

const props = defineProps<{
  defaultSaveDirectory?: string;
}>();

const selectedDirectory = ref<string | undefined>(props.defaultSaveDirectory);

const emit = defineEmits(['directory-selected']);

async function handleDirectorySelection(event: Event) {
  const directory = await window.electron.selectDirectory();

  if (directory) {
    selectedDirectory.value = directory;
  }

  // Emit the value of selectedDirectory, not the ref object itself
  emit('directory-selected', selectedDirectory.value);
}
</script>

<template>
  <div class="flex items-center gap-x-4 code">
    <Button variant="outline" type="button" @click="handleDirectorySelection">
      <ClipboardIcon class="size-4 mr-2" /> Save to
    </Button>
    <p v-if="selectedDirectory" class="rounded px-2 py-1 bg-slate-200 border border-slate-300 font-mono font-medium text-slate-900 text-xs">:{{ selectedDirectory }}</p>
  </div>
</template>
