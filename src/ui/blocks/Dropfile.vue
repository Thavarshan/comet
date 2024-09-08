<script setup lang="ts">
import { ref, computed } from 'vue';
import { Button } from '@/ui/components/button';
import {
  Upload,
} from 'lucide-vue-next';

const emit = defineEmits(['file-uploaded']);

const props = defineProps<{
  text: string;
  supportedFormats: string[];
}>();

const fileInput = ref<HTMLInputElement | null>(null);

const isDragging = ref(false);

const acceptableFormats = computed(() => {
  return props.supportedFormats.map((format) => `.${format}`).join(',');
});

function handleUpload(event: Event) {
  const files = (event.target as HTMLInputElement).files;
  if (!files) return;

  emit('file-uploaded', files);
};

function handleDragOver(event: DragEvent) {
  event.preventDefault();
  isDragging.value = true;
};

function handleDragLeave() {
  isDragging.value = false;
};

function handleDrop(event: DragEvent) {
  event.preventDefault();
  isDragging.value = false;

  const files = event.dataTransfer?.files;
  if (!files) return;

  emit('file-uploaded', files);
};

function triggerFileInput() {
  fileInput?.value?.click();
};
</script>

<template>
  <div class="py-1">
    <label
      for="file-uploader"
      class="group bg-muted/10 rounded-xl h-52 flex flex-col items-center justify-center cursor-pointer border-2 border-dashed mx-auto"
      :class="{ 'border-primary': isDragging }"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      @drop="handleDrop"
    >
      <Upload class="size-12 text-muted-foreground/50" />
      <input ref="fileInput" type="file" id="file-uploader" class="hidden" @change="handleUpload" multiple :accept="acceptableFormats">
      <div class="font-semibold text-sm text-foreground mt-2 max-w-xs text-center">{{ text }}</div>
      <div class="mt-1 text-xs text-muted-foreground">or click here to select files for upload</div>
      <div class="mt-4">
        <Button @click="triggerFileInput" variant="secondary" class="group-hover:bg-secondary/80">Select files</Button>
      </div>
    </label>
  </div>
</template>
