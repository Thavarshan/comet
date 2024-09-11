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
  RefreshCw
} from 'lucide-vue-next';
import {
  AUDIO_CONVERSION_FORMATS as audioFormats,
} from '@/consts/formats';
import { ref, onMounted } from 'vue';
import type { StoreDefinition } from 'pinia';

const defaultSaveDirectory = ref<string | undefined>(undefined);
const defaultFormat = 'mp3';

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
      text="Drag and drop your audio files here"
      @file-uploaded="store.handleUpload"
      :supported-formats="audioFormats"
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
          :options="audioFormats"
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
        />
      </div>
      <div class="h-14">&nbsp;</div>
    </ScrollArea>
    <Controls class="absolute bottom-0 w-full">
      <template #left>
        <Button variant="outline" @click="store.clearItems">
          <Trash2 class="size-4 text-destructive mr-2" />
          Clear
        </Button>
      </template>
      <template #right>
        <div class="flex items-center justify-end gap-x-2">
          <Button variant="outline" @click="store.cancelConversion">
            <Ban class="size-4 mr-2" />
            Cancel
          </Button>
          <Button @click="store.performConversion">
            <RefreshCw class="size-4 mr-2" />
            Convert
          </Button>
        </div>
      </template>
    </Controls>
  </div>
</template>
