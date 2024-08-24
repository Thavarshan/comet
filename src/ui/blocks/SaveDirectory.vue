<script setup lang="ts">
import { ref } from 'vue';
import { Button } from '@/ui/components/button';
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
import {
  FolderInput,
  FolderOpenDot
} from 'lucide-vue-next';

const props = defineProps<{
  defaultSaveDirectory?: string;
}>();

const selectedDirectory = ref<string | undefined>(props.defaultSaveDirectory);

const emit = defineEmits(['directory-selected']);

async function handleDirectorySelection(event: Event) {
  const directory = await window.electron.selectDirectory();

  if (directory) {
    selectedDirectory.value = directory;
  }

  // Emit the value of selectedDirectory, not the ref object itself
  emit('directory-selected', selectedDirectory.value);
}
</script>

<template>
  <div class="flex items-center gap-x-4 code">
    <Dialog>
      <DialogTrigger>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Button variant="outline" type="button">
                <FolderInput class="size-4 mr-2" /> Save to
              </Button>
            </TooltipTrigger>
            <TooltipContent align="start">
              {{ selectedDirectory }}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Save to directory
          </DialogTitle>
          <DialogDescription>
            <div>
              <p class="text-slate-500 text-sm">
                Choose the directory where the converted files will be saved.
              </p>
              <div v-if="selectedDirectory" class="mt-4 flex items-center gap-x-4 border border-slate-300 rounded-lg bg-slate-100 p-1">
                <Button type="button" variant="outline" @click="handleDirectorySelection">
                  <FolderOpenDot class="size-4" />
                </Button>
                <div class="flex-1 font-mono font-medium text-slate-800 text-xs truncate">:{{ selectedDirectory }}</div>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose as-child>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
