<script setup lang="ts">
import {
  ref,
  onMounted,
  onBeforeUnmount
} from 'vue';
import Layout from '@/ui/layouts/DefaultLayout.vue';
import {
  Dropfile,
  SaveDirectory,
  Controls,
  Options,
  FileItem
} from '@/ui/blocks';
import { useToast } from '@/ui/components/toast/use-toast';
import { Button } from '@/ui/components/button';
import { Combobox } from '@/ui/components/combobox';
import { ScrollArea } from '@/ui/components/scroll-area';
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
import {
  VIDEO_CONVERSION_FORMATS as videoFormats,
  AUDIO_CONVERSION_FORMATS as audioFormats
} from '@/consts/formats';
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

  window.electron.on('conversion-progress', (_event, { id, progress }) => {
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
    cancelItem(index);
  }
  items.value = items.value.filter((_, i) => i !== index);
}

function clearItems() {
  items.value = [];
}

async function performConversion() {
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

function cancelItem(index: number) {
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

function cancelConversion() {
  //
}
</script>

<template>
  <Layout title="Comet" v-cloak>
    <template #video>
      <Dropfile text="Drag and drop your video files here" :supported-formats="videoFormats" />
      <Options>
        <template #left>
          <SaveDirectory
          v-if="saveDirectory"
            :defaultSaveDirectory="saveDirectory"
            @directory-selected="handleSaveDirectoryUpdate"
          />
        </template>
        <template #right>
          <Combobox
            :options="videoFormats"
            @change="setFormat"
            placeholder="Select format"
          />
        </template>
      </Options>
      <ScrollArea class="h-[295px] w-full">
        <FileItem
          v-for="(item, index) in items"
          :key="item.id"
          :item="item"
          :index="index"
          @remove="removeItem"
          @cancel="cancelItem"
        />
      </ScrollArea>
    </template>
    <template #audio>
      <Dropfile text="Drag and drop your audio files here" :supported-formats="audioFormats" />
      <Options>
        <template #left>
          <SaveDirectory
            v-if="saveDirectory"
            :defaultSaveDirectory="saveDirectory"
            @directory-selected="handleSaveDirectoryUpdate"
          />
        </template>
        <template #right>
          <Combobox
            :options="audioFormats"
            @change="setFormat"
            placeholder="Select format"
          />
        </template>
      </Options>
      <ScrollArea class="h-[295px] w-full">
        <FileItem
          v-for="(item, index) in items"
          :key="item.id"
          :item="item"
          :index="index"
          @remove="removeItem"
          @cancel="cancelItem"
        />
      </ScrollArea>
    </template>
    <template #controls>
      <Controls>
        <template #left>
          <Button variant="outline" @click="clearItems">
            <Trash2 class="size-4 text-destructive mr-2" />
            Clear
          </Button>
        </template>
        <template #right>
          <div class="flex items-center justify-end gap-x-2">
            <Button variant="outline" @click="cancelConversion">
              <Ban class="size-4 mr-2" />
              Cancel
            </Button>
            <Button @click="performConversion">
              <RefreshCw class="size-4 mr-2" />
              Convert
            </Button>
          </div>
        </template>
      </Controls>
    </template>
  </Layout>
</template>
