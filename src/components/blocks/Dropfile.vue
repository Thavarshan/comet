<script setup lang="ts">
import { ref } from 'vue';

const emit = defineEmits(['file-uploaded']);
const isDragging = ref(false);

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
    <svg xmlns="http://www.w3.org/2000/svg" class="w-12 h-12 mb-2 fill-slate-400" viewBox="0 0 32 32">
      <path
        d="M23.75 11.044a7.99 7.99 0 0 0-15.5-.009A8 8 0 0 0 9 27h3a1 1 0 0 0 0-2H9a6 6 0 0 1-.035-12 1.038 1.038 0 0 0 1.1-.854 5.991 5.991 0 0 1 11.862 0A1.08 1.08 0 0 0 23 13a6 6 0 0 1 0 12h-3a1 1 0 0 0 0 2h3a8 8 0 0 0 .75-15.956z"
        data-original="#000000" />
      <path
        d="M20.293 19.707a1 1 0 0 0 1.414-1.414l-5-5a1 1 0 0 0-1.414 0l-5 5a1 1 0 0 0 1.414 1.414L15 16.414V29a1 1 0 0 0 2 0V16.414z"
        data-original="#000000" />
    </svg>
    <input type="file" id='file-uploader' class="hidden" @change="handleUpload" multiple accept="video/*">
    <p class="text-sm font-medium text-slate-400 mt-2 max-w-xs text-center">Drag your files here</p>
  </label>
</template>
