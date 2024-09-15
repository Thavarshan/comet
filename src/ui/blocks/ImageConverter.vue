<script setup lang="ts">
import { Controls, Dropfile, SaveDirectory, Options, FileItem } from '@/ui/blocks';
import { Button } from '@/ui/components/button';
import { Combobox } from '@/ui/components/combobox';
import { ScrollArea } from '@/ui/components/scroll-area';
import { Trash2, Ban, RefreshCw, FileImage } from 'lucide-vue-next';
import { IMAGE_CONVERSION_FORMATS as imageFormats } from '@/consts/formats';
import { ref, onMounted } from 'vue';
import type { StoreDefinition } from 'pinia';
import { ImageFormat } from '@/enum/image-format';
import { useI18n } from 'vue-i18n';

const defaultSaveDirectory = ref<string | undefined>(undefined);
const defaultFormat = ImageFormat.JPG;

const { t } = useI18n();

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
      :text="t('upload.title', { type: t('media.image').toLowerCase() })"
      @file-uploaded="store.handleUpload"
      :supported-formats="imageFormats"
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
          :options="imageFormats"
          @change="store.setFormat"
          :placeholder="t('formats.select')"
          :convertTo="store.convertTo || defaultFormat"
        />
      </template>
    </Options>
    <ScrollArea class="h-[350px] w-full">
      <div class="divide-y divide-muted -my-3">
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
            <FileImage class="size-6 text-slate-300" />
          </template>
        </FileItem>
      </div>
      <div class="h-14">&nbsp;</div>
    </ScrollArea>
    <Controls class="absolute bottom-0 w-full">
      <template #left>
        <Button variant="outline" @click="store.clearItems" :disabled="store.conversionInProgress">
          <Trash2 class="size-4 text-destructive mr-2" />
          {{ t('buttons.clear') }}
        </Button>
      </template>
      <template #right>
        <div class="flex items-center justify-end gap-x-2">
          <Button variant="outline" @click="store.cancelConversion" :disabled="!store.conversionInProgress">
            <Ban class="size-4 mr-2" />
            {{ t('buttons.cancel') }}
          </Button>
          <Button
            v-if="!store.conversionInProgress"
            @click="store.performConversion"
            :disabled="!store.items?.length || !store.saveDirectory"
          >
            <RefreshCw class="size-4 mr-2" />
            {{ t('buttons.convert') }}
          </Button>
          <Button v-else disabled>
            <RefreshCw class="size-4 mr-2 animate-spin" />
            {{ t('buttons.converting') }}
          </Button>
        </div>
      </template>
    </Controls>
  </div>
</template>
