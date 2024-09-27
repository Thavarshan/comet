<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Button } from '@/ui/components/button';
import { FolderOpenDot } from 'lucide-vue-next';

const emit = defineEmits(['directory-selected']);

const props = defineProps<{
  saveDirectory?: string;
}>();

const selectedDirectory = ref<string | undefined>(undefined);

onMounted(() => {
  if (!selectedDirectory.value) {
    selectedDirectory.value = props.saveDirectory;
  }
});

async function handleDirectorySelection() {
  const directory = await window.electron.selectDirectory();

  if (directory) {
    selectedDirectory.value = directory;
  }

  emit('directory-selected', selectedDirectory.value);
}

function formatPath(path?: string) {
  if (!path) {
    return;
  }

  let formatted = path.replace(/\\/g, '/').replace(/^\//, '').replace(/\//g, ' → ');

  if (formatted.length > 40) {
    formatted = formatted.slice(formatted.lastIndexOf('→') + 2);
  }

  return formatted;
}
</script>

<template>
  <div class="flex items-center rounded-lg bg-muted gap-x-3 pl-1 pr-3">
    <Button type="button" variant="outline" @click="handleDirectorySelection" size="icon">
      <FolderOpenDot class="size-4" />
    </Button>
    <div class="text-xs font-medium text-foreground max-w-64 truncate mr-px">
      {{ formatPath(selectedDirectory) }}
    </div>
  </div>
</template>
