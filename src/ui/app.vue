<script setup lang="ts">
import {
  ref,
  onMounted,
  onBeforeUnmount
} from 'vue';
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/ui/components/tooltip';
import { Progress } from '@/ui/components/progress';
import {
  RefreshCw,
  X,
  Ban,
  FileVideo,
  CircleCheck,
  Trash2,
  Combine
} from 'lucide-vue-next';
import { v4 as uuidv4 } from 'uuid';
import { CONVERSION_FORMATS } from '@/consts/formats';
import type { Item } from '@/types/item';
import { filesize } from 'filesize';

const { toast } = useToast();
const INITIAL_PROGRESS = 0;
const items = ref<Item[]>([]);
const saveDirectory = ref<string | undefined>();
const convertTo = ref<string | undefined>('mp4');
const conversionInProgress = ref(false);

onMounted(async () => {
  saveDirectory.value = await window.electron.getDesktopPath();

  window.electron.on('conversion-progress', (event, { id, progress }) => {
    console.log('conversion-progress', progress);

    const item = items.value.find((item: Item) => item.id === id);
    if (item) {
      item.progress = progress;
    }
  });

  window.electron.on('conversion-canceled', (event, { id }) => {
    const item = items.value.find((item: Item) => item.id === id);
    if (item) {
      item.converting = false;
      item.progress = 0; // Reset progress after cancellation
      conversionInProgress.value = false;
      toast({
        title: 'Conversion canceled',
        description: `Conversion for ${item.name} has been canceled.`,
      });
    }
  });
});

onBeforeUnmount(() => {
  window.electron.removeAllListeners('conversion-progress');
  window.electron.removeAllListeners('conversion-canceled');
});

function handleUpload(uploads: FileList) {
  items.value = items.value.concat(
    Array.from(uploads).map((file) => ({
      id: uuidv4(),
      name: file.name,
      size: filesize(file.size),
      path: window.electron.getFilePath(file),
      converted: false,
      converting: false,
      progress: INITIAL_PROGRESS,
    } as unknown as Item))
  );
}

function handleSaveDirectoryUpdate(directory: string) {
  saveDirectory.value = directory;
}

function setFormat(format: string) {
  convertTo.value = format;
}

function removeItem(index: number) {
  const item = items.value[index];
  if (item.converting) {
    cancelConversion(index);
  }
  items.value = items.value.filter((_, i) => i !== index);
}

function clearAllItems() {
  items.value = [];
}

async function convertItems() {
  if (!items.value || !convertTo.value || !saveDirectory.value) {
    toast({
      title: 'Error',
      description: 'Please select files and a save directory.',
      variant: 'destructive',
    });
    return;
  }

  conversionInProgress.value = true;

  for (const item of items.value) {
    if (item.converted) {
      continue;
    }

    try {
      item.converting = true;
      item.progress = 0;

      const outputFilePath = await window.electron.convertVideo(
        item.id as string,
        item.path,
        convertTo.value,
        saveDirectory.value
      );

      item.converting = false;
      item.converted = true;
      item.progress = 100;

      toast({
        title: 'File converted',
        description: `Converted file saved to ${outputFilePath}`,
      });
    } catch (error) {
      item.converting = false;
      item.progress = 0;

      if (error.message && error.message.includes('Conversion canceled by user')) {
        // Do nothing as the conversion cancellation message is already displayed.
      } else {
        toast({
          title: 'Error converting file',
          description: error.message || 'An error occurred during the conversion.',
          variant: 'destructive',
        });
      }
    }
  }

  conversionInProgress.value = false;
}

function cancelConversion(index: number) {
  const item = items.value[index];

  if (!item.converting) {
    return;
  }

  window.electron.cancelConversion(item.id)
    .then((success) => {
      if (!success) {
        toast({
          title: 'Error',
          description: `Failed to cancel conversion for ${item.name}.`,
          variant: 'destructive',
        });
      }
    })
    .catch((error) => {
      toast({
        title: 'Error',
        description: error.message || 'An unexpected error occurred while canceling the conversion.',
        variant: 'destructive',
      });
    });
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
              <Combine class="size-4 mr-2" />
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
                  <li v-for="format in CONVERSION_FORMATS" :key="format" class="flex items-center gap-2">
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
          v-if="items?.length"
          type="button"
          variant="outline"
          class="text-destructive"
          @click="clearAllItems"
          :disabled="conversionInProgress"
        >
          <Trash2 class="size-4 mr-2" /> Clear all
        </Button>
        <Button
          v-if="!conversionInProgress"
          type="button"
          @click="convertItems"
          :disabled="!items?.length || !saveDirectory"
          class="bg-blue-500 text-white"
        >
          <RefreshCw class="size-4 mr-2" /> Convert
        </Button>
        <Button
          v-else
          type="button"
          disabled
          class="bg-blue-500 text-white flex items-center"
        >
          <RefreshCw class="size-4 mr-2 animate-spin" /> Converting...
        </Button>
      </div>
    </div>
    <div class="bg-white h-[435px]">
      <ScrollArea class="h-[435px] w-full px-6">
        <ul role="list" class="divide-y divide-slate-100 h-full overflow-y-auto">
          <li class="flex justify-between items-center gap-x-6" v-for="(item, index) in items" :key="item.name">
            <div class="flex items-center min-w-0 gap-x-3 py-6">
              <div class="p-4 rounded-lg bg-slate-100 border border-slate-200">
                <FileVideo :stroke-width="1" class="size-8 text-slate-400" />
              </div>
              <div class="min-w-0 flex-auto">
                <div class="flex items-center gap-x-1">
                  <CircleCheck class="size-4 text-emerald-500" v-if="item.converted" />
                  <p class="text-sm font-semibold leading-4 text-slate-800 truncate">{{ item.name }}</p>
                </div>
                <div class="flex items-center gap-x-2">
                  <p class="text-xs text-slate-500">{{ item.size }}</p>
                  <span>&middot;</span>
                  <p class="text-xs text-slate-500">
                    Converting from
                    <span class="font-mono text-slate-800 mx-1 p-1 rounded bg-slate-100">{{ item.name.split('.').pop() }}</span>
                    to
                    <span class="font-mono text-slate-800 mx-1 p-1 rounded bg-slate-100">{{ convertTo }}</span>
                  </p>
                </div>
                <div class="mt-1.5">
                  <Progress v-model="item.progress" class="w-36" />
                </div>
              </div>
            </div>
            <div class="shrink-0 flex items-center gap-x-3">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Button type="button" variant="outline" class="text-dark" @click="cancelConversion(index)" :disabled="!item.converting">
                      <Ban class="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Cancel
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Button type="button" variant="outline" class="text-destructive" @click="removeItem(index)" :disabled="item.converting">
                      <X class="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Remove
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </li>
        </ul>
      </ScrollArea>
    </div>
  </div>
</template>
