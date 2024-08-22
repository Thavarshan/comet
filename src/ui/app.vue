<script setup lang="ts">
import { webUtils } from 'electron';
import { ref, onMounted, onUnmounted } from 'vue';
import {
  Dropfile,
  SaveDirectory,
} from '@/ui/blocks';
import { useToast } from '@/ui/components/toast/use-toast';
import { Toaster } from '@/ui/components/toast';
import { Button } from '@/ui/components/button';
import { ScrollArea } from '@/ui/components/scroll-area';
import { Badge } from '@/ui/components/badge';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/ui/components/dialog';
import {
  Cross1Icon,
  UpdateIcon,
  TrashIcon,
  ReloadIcon,
  VideoIcon,
  WidthIcon,
} from '@radix-icons/vue';

const files = ref<File[]>([]);
const saveDirectory = ref<string | undefined>();
const convertTo = ref<string | undefined>('mp4');
const { toast } = useToast();
const conversionProgress = ref<Record<string, number>>({});
const converting = ref(false);

const FORMATS = [
  'mp4', 'webm', 'ogg', 'flv', 'avi',
  'mov', 'wmv', '3gp', 'mkv', 'm4v',
  'mpg', 'mpeg', 'vob', 'ts', 'asf',
  'f4v', 'h264', 'hevc', 'm2ts', 'm2v',
  'mts', 'ogv', 'rm', 'swf', 'xvid',
];

onMounted(async () => {
  saveDirectory.value = await window.electron.getDesktopPath();
});

function handleUpload(uploads: FileList) {
  files.value = files.value.concat(Array.from(uploads));
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
      const filePath = window.electron.getFilePath(file);
      const outputFormat = convertTo.value;
      const outputDirectory = saveDirectory.value;

      const outputFilePath = await window.electron.convertVideo(
        filePath,
        outputFormat,
        outputDirectory
      );

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
      <Dropfile @file-uploaded="handleUpload" />
    </div>
    <div class="flex items-center justify-between px-6 py-4 bg-slate-100 border-y border-slate-200">
      <div class="flex items-center gap-x-2">
        <SaveDirectory v-if="saveDirectory" :default-save-directory="saveDirectory" @directory-selected="handleSaveDirectoryUpdate" />
        <Dialog>
          <DialogTrigger as-child>
            <Button variant="outline">
              <WidthIcon class="size-4 mr-2" />
              Convert to: <Badge variant="secondary" class="ml-2">{{ convertTo }}</Badge>
            </Button>
          </DialogTrigger>
          <DialogContent class="sm:max-w-[425px] rounded-lg">
            <DialogHeader>
              <DialogTitle>Choose format</DialogTitle>
              <DialogDescription>
                Select the format you want to convert the file to.
              </DialogDescription>
            </DialogHeader>
            <div class="h-56 overflow-hidden">
              <ScrollArea class="mt-4 h-56 w-full py-4">
                <ul role="list" class="grid grid-cols-3 gap-4">
                  <li v-for="format in FORMATS" :key="format" class="flex items-center gap-2">
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
              </ScrollArea>
            </div>
            <DialogFooter>
              <DialogClose as-child>
                <Button variant="outline">Close</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
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
    <div class="bg-white h-60">
      <ScrollArea class="h-60 w-full px-6 py-4">
        <ul role="list" class="divide-y divide-slate-100 h-full overflow-y-auto">
          <li class="flex justify-between items-center gap-x-6" v-for="(file, index) in files" :key="file.name">
            <div class="flex items-center min-w-0 gap-x-3 py-3">
              <div class="p-4 rounded-lg bg-slate-100 border border-slate-200">
                <VideoIcon class="size-8 text-slate-400" />
              </div>
              <div class="min-w-0 flex-auto">
                <p class="text-sm font-semibold leading-6 text-slate-800 truncate">{{ file.name }}</p>
                <div class="flex items-center gap-x-2">
                  <p class="text-xs text-slate-500">{{ (file.size * 0.000001).toFixed(2) }} MB</p>
                  <span>&middot;</span>
                  <p class="text-xs text-slate-500">
                    Converting from
                    <span class="font-mono text-slate-800 mx-1 p-1 rounded bg-slate-100">{{ file.name.split('.').pop() }}</span>
                    to
                    <span class="font-mono text-slate-800 mx-1 p-1 rounded bg-slate-100">{{ convertTo }}</span>
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
      </ScrollArea>
    </div>
  </div>
</template>
