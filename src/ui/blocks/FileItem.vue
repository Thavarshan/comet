<script setup lang="ts">
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/ui/components/tooltip';
import { Progress } from '@/ui/components/progress';
import { Button } from '@/ui/components/button';
import {
  X,
  Ban,
  FileVideo,
  CircleCheck
} from 'lucide-vue-next';
import { Item } from '@/types/item';
import { computed } from 'vue';

const emit = defineEmits(['remove', 'cancel']);

const props = defineProps<{
  index: number;
  item: Item;
  convertTo: string;
}>();

const progress = computed(() => formatNumber(props.item.progress));

function removeItem(index: number) {
  emit('remove', index);
}

function cancelItem(index: number) {
  emit('cancel', index);
}

function formatNumber(number: number): string {
  const clampedNumber = Math.min(100, Math.max(0, number));
  const truncatedNumber = Math.trunc(clampedNumber);
  const limitedDigits = truncatedNumber.toString().slice(0, 3);
  return `${limitedDigits}%`;
}

function extractFileName(filename: string): string {
  return filename.split('.').slice(0, -1).join('.');
}
</script>

<template>
  <div class="flex justify-between items-center gap-x-6 py-3">
    <div class="flex items-center min-w-0 gap-x-3">
      <div class="p-4 rounded-lg bg-muted border">
        <slot name="icon" />
      </div>
      <div class="min-w-0 flex-auto">
        <div class="flex items-center gap-x-1">
          <CircleCheck class="size-4 text-emerald-500" v-if="item.converted" />
          <p class="text-sm font-semibold leading-4 text-foreground truncate">{{ extractFileName(item.name) }}</p>
        </div>
        <div class="mt-0.5 flex items-center gap-x-2">
          <p class="text-xs text-muted-foreground font-medium">{{ item.size }}</p>
          <span>&middot;</span>
          <p class="text-xs text-muted-foreground">
            Converting from
            <span class="text-foreground mx-1 px-1 py-px rounded font-medium bg-muted">{{ item.name.split('.').pop() }}</span>
            to
            <span class="text-foreground mx-1 px-1 py-px rounded font-medium bg-muted">{{ item.converted ? item.convertTo : convertTo }}</span>
          </p>
        </div>
        <div class="mt-1.5 flex items-center gap-x-2">
          <Progress v-model="progress" class="w-60" />
          <span class="text-xs">{{ `${progress}%` }}</span>
        </div>
      </div>
    </div>
    <div class="shrink-0 flex items-center gap-x-1">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Button type="button" variant="secondary" size="icon" class="text-foreground" @click="cancelItem(index)" :disabled="!item.converting">
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
            <Button type="button" variant="secondary" size="icon" class="text-destructive" @click="removeItem(index)" :disabled="item.converting">
              <X class="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Remove
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  </div>
</template>
