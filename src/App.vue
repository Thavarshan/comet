<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import SaveDirectory from '@/components/SaveDirectory.vue';
import { useToast } from '@/components/ui/toast/use-toast';
import { Toaster } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Cross1Icon,
  UpdateIcon,
  TrashIcon,
  ReloadIcon,
} from '@radix-icons/vue';

const files = ref<File[] | undefined>();
const saveDirectory = ref<string | undefined>();
const convertTo = ref<string | undefined>('mp4');
const { toast } = useToast();
const conversionProgress = ref<Record<string, number>>({});
const converting = ref(false);

onMounted(async () => {
  saveDirectory.value = await window.electron.getDownloadsPath();

  // Listen for backend messages
  window.electron.on('ffmpeg-status', (_event: any, message: string) => {
    toast({
      title: 'FFmpeg Status',
      description: message,
    });
  });

  window.electron.on('conversion-progress', (_event: any, { filePath, progress }: { filePath: string, progress: number; }) => {
    conversionProgress.value[filePath] = progress;
  });

  window.electron.on('conversion-error', (_event: any, error: string) => {
    converting.value = false;
    toast({
      title: 'Error',
      description: error,
      variant: 'destructive',
    });
  });
});

onUnmounted(() => {
  // Cleanup IPC listeners to avoid memory leaks
  window.electron.removeAllListeners('ffmpeg-status');
  window.electron.removeAllListeners('conversion-progress');
  window.electron.removeAllListeners('conversion-error');
});

const emit = defineEmits(['files-uploaded']);

const conversionFormats = [
  'mp4', 'webm', 'ogg', 'flv', 'avi',
  'mov', 'wmv', '3gp', 'mkv', 'm4v',
  'mpg', 'mpeg', 'vob', 'ts', 'asf',
  'f4v', 'h264', 'hevc', 'm2ts', 'm2v',
  'mts', 'ogv', 'rm', 'swf', 'xvid',
];

function handleUpload(event: Event) {
  const inputElement = event.target as HTMLInputElement;
  files.value = Array.from(inputElement.files ?? []);
  emit('files-uploaded', files);
}

function handleSaveDirectoryUpdate(directory: string) {
  saveDirectory.value = directory;
}

function setFormat(format: string) {
  convertTo.value = format;
}

function removeFile(index: number) {
  if (files.value) {
    const file = files.value[index];
    delete conversionProgress.value[file.path];
    files.value.splice(index, 1);
  }
}

function clearAllFiles() {
  files.value = [];
  conversionProgress.value = {};
}

async function convertFiles() {
  if (!files.value || !convertTo.value || !saveDirectory.value) {
    toast({
      title: 'Error',
      description: 'Please select files and a save directory.',
      variant: 'destructive',
    });
    return;
  }

  converting.value = true;

  for (const file of files.value) {
    try {
      const filePath = (file as any).path;
      const outputFormat = convertTo.value;
      const outputDirectory = saveDirectory.value;

      const outputFilePath = await window.electron.convertVideo(filePath, outputFormat, outputDirectory);

      toast({
        title: 'File converted',
        description: `Converted file saved to ${outputFilePath}`,
      });

      delete conversionProgress.value[filePath]; // Clear progress once done
    } catch (error) {
      toast({
        title: 'Error converting file',
        description: error.message || 'An error occurred during the conversion.',
        variant: 'destructive',
      });
    }
  }

  converting.value = false;
}
</script>

<template>
  <Toaster />
  <div>
    <div class="bg-slate-50 p-6 overflow-hidden">
      <label for="file-uploader"
        class="bg-slate-50 font-semibold text-base rounded-lg h-52 flex flex-col items-center justify-center cursor-pointer border-2 border-slate-400 border-dashed mx-auto">
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
    </div>
    <div class="flex items-center justify-between px-6 py-4 bg-slate-100 border-y border-slate-200">
      <SaveDirectory v-if="saveDirectory" :default-save-directory="saveDirectory" @directory-selected="handleSaveDirectoryUpdate" />
      <div class="flex items-center space-x-3">
        <Button
          v-if="files?.length"
          type="button"
          variant="outline"
          class="text-destructive"
          @click="clearAllFiles"
          :disabled="converting"
        >
          <TrashIcon class="size-4 mr-2" /> Clear all
        </Button>
        <Button
          v-if="!converting"
          type="button"
          @click="convertFiles"
          :disabled="!files?.length || !saveDirectory"
          class="bg-blue-500 text-white"
        >
          <UpdateIcon class="size-4 mr-2" /> Convert
        </Button>
        <Button
          v-else
          type="button"
          disabled
          class="bg-blue-500 text-white flex items-center"
        >
          <ReloadIcon class="size-4 mr-2 animate-spin" /> Converting...
        </Button>
      </div>
    </div>
    <div class="bg-white py-3 h-60">
      <ul role="list" class="divide-y divide-slate-100 h-full overflow-y-auto px-6">
        <li class="flex justify-between items-center gap-x-6" v-for="(file, index) in files" :key="file.name">
          <div class="flex min-w-0 gap-x-4 py-3">
            <div class="p-4 rounded-lg bg-slate-100 border border-slate-200">
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
                  <span class="font-mono text-slate-800">{{ file.name.split('.').pop() }}</span>
                  to
                  <Dialog>
                    <DialogTrigger as-child>
                      <button class="p-1 rounded bg-slate-100 text-slate-800 font-mono underline">{{ convertTo }}</button>
                    </DialogTrigger>
                    <DialogContent class="sm:max-w-[425px] rounded-lg">
                      <DialogHeader>
                        <DialogTitle>Choose format</DialogTitle>
                        <DialogDescription>
                          Select the format you want to convert the file to.
                        </DialogDescription>
                      </DialogHeader>
                      <div class="h-56 overflow-hidden">
                        <div class="mt-4 h-56 overflow-y-auto">
                          <ul role="list" class="grid grid-cols-3 gap-4">
                            <li v-for="format in conversionFormats" :key="format" class="flex items-center gap-2">
                              <button
                                type="button"
                                class="flex items-center justify-center p-2 rounded-lg flex-1"
                                :class="convertTo === format ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'bg-slate-50 hover:bg-slate-100 text-slate-800'"
                                @click.prevent="setFormat(format)"
                              >
                                <span class="text-sm font-medium">{{ format }}</span>
                              </button>
                            </li>
                          </ul>
                        </div>
                      </div>
                      <DialogFooter>
                        <DialogClose as-child>
                          <Button type="button" variant="outline">
                            Close
                          </Button>
                        </DialogClose>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </p>
              </div>
            </div>
          </div>
          <div class="shrink-0 flex items-center gap-x-3">
            <Button type="button" variant="outline" class="text-destructive" @click="removeFile(index)" :disabled="converting">
              <Cross1Icon class="size-4" />
            </Button>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>
