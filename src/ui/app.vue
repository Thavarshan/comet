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
import { Titlebar } from '@/ui/components/titlebar';
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
  <Toaster :duration="3000" />
  <div>
    <Titlebar title="Comet" />
  </div>
</template>
