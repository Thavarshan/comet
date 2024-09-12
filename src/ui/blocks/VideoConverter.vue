<script setup lang="ts">
import {
  Controls,
  Dropfile,
  SaveDirectory,
  Options,
  FileItem
} from '@/ui/blocks';
import { Button } from '@/ui/components/button';
import { Combobox } from '@/ui/components/combobox';
import { ScrollArea } from '@/ui/components/scroll-area';
import {
  Trash2,
  Ban,
  RefreshCw,
  FileVideo
} from 'lucide-vue-next';
import {
  VIDEO_CONVERSION_FORMATS as videoFormats,
} from '@/consts/formats';
import { ref, onMounted } from 'vue';
import type { StoreDefinition } from 'pinia';
import { VideoFormat } from '@/enum/video-format';

const defaultSaveDirectory = ref<string | undefined>(undefined);
const defaultFormat = VideoFormat.MP4;

const props = defineProps<{
  store: ReturnType<StoreDefinition>;
}>();

onMounted(async () => {
  props.store.setFormat(defaultFormat);
  defaultSaveDirectory.value = await props.store.getInitialSaveDirectory();
});
</script>

<template>
  <div class="space-y-3 relative h-full">
    <Dropfile
      text="Drag and drop your video files here"
      @file-uploaded="store.handleUpload"
      :supported-formats="videoFormats"
    />
    <Options>
      <template #left>
        <SaveDirectory
          v-if="defaultSaveDirectory"
          :defaultSaveDirectory="defaultSaveDirectory"
          @directory-selected="store.handleSaveDirectoryUpdate"
        />
      </template>
      <template #right>
        <Combobox
          :options="videoFormats"
          @change="store.setFormat"
          placeholder="Select format"
          :convertTo="store.convertTo || defaultFormat"
        />
      </template>
    </Options>
    <ScrollArea class="h-[350px] w-full">
      <div class="divide-y -my-3">
        <FileItem
          v-for="(item, index) in store.items"
          :key="item.id"
          :item="item"
          :index="index"
          @remove="store.removeItem"
          @cancel="store.cancelItem"
          :convertTo="store.convertTo"
        >
          <template #icon>
            <FileVideo class="size-6 text-slate-300" />
          </template>
        </FileItem>
      </div>
      <div class="h-14">&nbsp;</div>
    </ScrollArea>
    <Controls class="absolute bottom-0 w-full">
      <template #left>
        <Button
          variant="outline"
          @click="store.clearItems"
          :disabled="store.conversionInProgress"
        >
          <Trash2 class="size-4 text-destructive mr-2" />
          Clear
        </Button>
      </template>
      <template #right>
        <div class="flex items-center justify-end gap-x-2">
          <Button
            variant="outline"
            @click="store.cancelConversion"
            :disabled="!store.conversionInProgress"
          >
            <Ban class="size-4 mr-2" />
            Cancel
          </Button>
          <Button
            v-if="!store.conversionInProgress"
            @click="store.performConversion"
            :disabled="!store.items?.length || !store.saveDirectory"
          >
            <RefreshCw class="size-4 mr-2" />
            Convert
          </Button>
          <Button v-else disabled>
            <RefreshCw class="size-4 mr-2 animate-spin" />
            Converting...
          </Button>
        </div>
      </template>
    </Controls>
  </div>
</template>
