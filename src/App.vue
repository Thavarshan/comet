<script setup lang="ts">
import { ref, onMounted } from 'vue';
import SaveDirectory from './components/SaveDirectory.vue';
import {
  TransitionRoot,
  TransitionChild,
  Dialog,
  DialogPanel,
  DialogTitle,
} from '@headlessui/vue';

const isOpen = ref<boolean>(false);
const files = ref<File[] | undefined>();
const saveDirectory = ref<string | undefined>();
const convertTo = ref<string | undefined>('mp4');

onMounted(async () => {
  saveDirectory.value = await window.electron.getDownloadsPath();
});

const emit = defineEmits(['files-uploaded']);

const conversionFormats = [
  'mp4', 'webm', 'ogg', 'flv', 'avi',
  'mov', 'wmv', '3gp', 'mkv', 'm4v',
  'mpg', 'mpeg', 'vob', 'rmvb', 'ts',
  'asf', 'divx', 'f4v', 'h264', 'hevc',
  'm2ts', 'm2v', 'mts', 'ogv', 'rm',
  'swf', 'vob', 'xvid',
];

function handleUpload(event: Event) {
  const inputElement = event.target as HTMLInputElement;
  files.value = Array.from(inputElement.files ?? []);

  emit('files-uploaded', files);
}

function handleSaveDirectoryUpdate(directory: string) {
  saveDirectory.value = directory;
}

function setIsOpen(value) {
  isOpen.value = value;
}

function setConvertTo(format: string) {
  convertTo.value = format;
  setIsOpen(false);
}
</script>

<template>
  <div class="font-[sans-serif] antialiased text-slate-600">
    <div class="bg-slate-50 p-6">
      <label for="file-uploader"
        class="bg-slate-50 font-semibold text-base rounded-xl h-52 flex flex-col items-center justify-center cursor-pointer border-2 border-slate-400 border-dashed mx-auto">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-12 h-12 mb-2 fill-slate-400" viewBox="0 0 32 32">
          <path
            d="M23.75 11.044a7.99 7.99 0 0 0-15.5-.009A8 8 0 0 0 9 27h3a1 1 0 0 0 0-2H9a6 6 0 0 1-.035-12 1.038 1.038 0 0 0 1.1-.854 5.991 5.991 0 0 1 11.862 0A1.08 1.08 0 0 0 23 13a6 6 0 0 1 0 12h-3a1 1 0 0 0 0 2h3a8 8 0 0 0 .75-15.956z"
            data-original="#000000" />
          <path
            d="M20.293 19.707a1 1 0 0 0 1.414-1.414l-5-5a1 1 0 0 0-1.414 0l-5 5a1 1 0 0 0 1.414 1.414L15 16.414V29a1 1 0 0 0 2 0V16.414z"
            data-original="#000000" />
        </svg>
        <input type="file" id='file-uploader' class="hidden" @change="handleUpload" multiple>
        <p class="text-sm font-medium text-slate-400 mt-2 max-w-xs text-center">Drag your files here. The file size should be less than 15 MB.</p>
      </label>
    </div>
    <div class="px-6 py-4 bg-slate-100 border-y border-slate-200">
      <SaveDirectory v-if="saveDirectory" :default-save-directory="saveDirectory" @directory-selected="handleSaveDirectoryUpdate" />
    </div>
    <div class="bg-white px-6">
      <ul role="list" class="divide-y divide-slate-100">
        <li class="flex justify-between items-center gap-x-6" v-for="file in files" :key="file.name">
          <div class="flex min-w-0 gap-x-4 py-6">
            <div class="p-4 rounded-xl bg-slate-100 border border-slate-200">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
            </div>
            <div class="min-w-0 flex-auto">
              <p class="text-sm font-semibold leading-6 text-slate-800 truncate">{{ file.name }}</p>
              <div class="flex items-center gap-x-2">
                <p class="text-xs font-medium text-slate-500">{{ Math.round(file.size * 0.000001) }} MB</p>
                <span>&middot;</span>
                <p class="text-xs font-medium text-slate-500">
                  Converting from
                  <span class="font-mono p-1 rounded bg-slate-100 text-slate-600">{{ file.name.split('.').pop() }}</span>
                  to
                  <button class="p-1 rounded bg-slate-100 text-slate-600 font-mono underline" type="button" @click.prevent="setIsOpen(true)">.{{ convertTo }}</button>
                </p>
              </div>
            </div>
          </div>
          <div class="shrink-0 flex items-center gap-x-3">
            <button class="inline-flex items-center justify-center gap-x-1 px-3 py-1 text-sm font-semibold leading-6 text-white whitespace-no-wrap bg-blue-500 border border-blue-500 rounded-md shadow-sm hover:bg-blue-600 focus:outline-none focus:shadow-none" type="button">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-4">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              <span>Convert</span>
            </button>
          </div>
        </li>
      </ul>
    </div>
    <TransitionRoot :show="isOpen" as="template">
        <Dialog @close="setIsOpen">
          <TransitionChild
            enter="duration-300 ease-out"
            enter-from="opacity-0"
            enter-to="opacity-100"
            leave="duration-200 ease-in"
            leave-from="opacity-100"
            leave-to="opacity-0"
          >
            <div class="fixed inset-0 bg-black/30" />
          </TransitionChild>
          <TransitionChild
            enter="duration-300 ease-out"
            enter-from="opacity-0 scale-95"
            enter-to="opacity-100 scale-100"
            leave="duration-200 ease-in"
            leave-from="opacity-100 scale-100"
            leave-to="opacity-0 scale-95"
          >
            <DialogPanel class="fixed inset-0 flex items-center justify-center p-4">
              <div class="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
                <DialogTitle class="text-lg font-medium text-slate-900">Choose conversion format</DialogTitle>
                <div class="h-56 overflow-hidden">
                  <div class="mt-4 h-56 overflow-y-auto">
                    <ul role="list" class="grid grid-cols-3 gap-4">
                      <li v-for="format in conversionFormats" :key="format" class="flex items-center gap-2 text-center">
                        <button type="button" class="flex items-center justify-center p-2 rounded-lg bg-slate-50 hover:bg-slate-100 flex-1" @click.prevent="setConvertTo(format)">
                          <span class="text-sm font-medium text-slate-800">{{ format }}</span>
                        </button>
                      </li>
                    </ul>
                  </div>
                </div>
                <div class="mt-6 flex justify-end space-x-4">
                  <button class="inline-flex items-center justify-center px-3 py-1 text-sm font-semibold leading-6 text-slate-600 whitespace-no-wrap bg-white border border-slate-200 rounded-md shadow-sm hover:bg-slate-50 focus:outline-none focus:shadow-none" type="button" @click.prevent="setIsOpen(false)">Close</button>
                </div>
              </div>
            </DialogPanel>
          </TransitionChild>
        </Dialog>
    </TransitionRoot>
  </div>
</template>
