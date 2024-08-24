<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  CloudUpload,
} from 'lucide-vue-next';
import { CONVERSION_FORMATS } from '@/consts/formats';

const emit = defineEmits(['file-uploaded']);
const isDragging = ref(false);

const acceptFormats = computed(() => {
  return CONVERSION_FORMATS.map((format) => `.${format}`).join(',');
});

const handleUpload = (event: Event) => {
  const files = (event.target as HTMLInputElement).files;
  if (!files) return;

  emit('file-uploaded', files);
};

const handleDragOver = (event: DragEvent) => {
  event.preventDefault();
  isDragging.value = true;
};

const handleDragLeave = () => {
  isDragging.value = false;
};

const handleDrop = (event: DragEvent) => {
  event.preventDefault();
  isDragging.value = false;

  const files = event.dataTransfer?.files;
  if (!files) return;

  emit('file-uploaded', files);
};
</script>

<template>
  <label
    for="file-uploader"
    class="bg-slate-50 font-semibold text-base rounded-lg h-52 flex flex-col items-center justify-center cursor-pointer border-2 border-slate-400 border-dashed mx-auto"
    :class="{ 'bg-slate-100': isDragging }"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
  >
    <CloudUpload class="size-12 mb-2 text-slate-400" />
    <input type="file" id="file-uploader" class="hidden" @change="handleUpload" multiple :accept="acceptFormats">
    <p class="text-sm font-medium text-slate-400 mt-2 max-w-xs text-center">Drag and drop your files here</p>
  </label>
</template>
