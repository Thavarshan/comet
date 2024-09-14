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
  BadgeCheck
} from 'lucide-vue-next';
import { Item } from '@/types/item';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

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

function formatNumber(number: number): number {
  // Check if progress is a valid number, otherwise default to 0
  if (isNaN(number) || number === null || number === undefined) {
    return 0;
  }

  // Ensure number is a positive value
  const positiveProgress = Math.max(0, number);

  // Round to the nearest whole number
  const roundedProgress = Math.round(positiveProgress);

  // Cap the value at 100
  const percentage = Math.min(roundedProgress, 100);

  return percentage;
}

function extractFileName(filename: string): string {
  return filename.split('.').slice(0, -1).join('.');
}
</script>

<template>
  <div class="flex justify-between items-center gap-x-6 py-3">
    <div class="flex items-center min-w-0 gap-x-3">
      <div class="p-4 rounded-lg bg-muted border relative">
        <BadgeCheck class="size-4 text-primary absolute top-0 right-0 m-0.5" v-if="item.converted" />
        <slot name="icon" />
      </div>
      <div class="min-w-0 flex-auto">
        <div class="flex items-center gap-x-1">
          <p class="text-sm font-semibold leading-4 text-foreground truncate">{{ extractFileName(item.name) }}</p>
        </div>
        <div class="mt-0.5 flex items-center gap-x-2">
          <p class="text-xs text-muted-foreground font-medium">{{ item.size }}</p>
          <span>&middot;</span>
          <p class="text-xs text-muted-foreground">
            {{ t('item.from') }}
            <span class="text-foreground mx-1 px-1 py-px rounded font-medium bg-muted">{{ item.name.split('.').pop() }}</span>
            {{ t('item.to') }}
            <span class="text-foreground mx-1 px-1 py-px rounded font-medium bg-muted">{{ item.converted ? item.convertTo : convertTo }}</span>
          </p>
        </div>
        <div class="mt-1.5 flex items-center gap-x-2">
          <Progress v-model="progress" class="w-60" />
          <span class="text-xs">{{ `${progress === undefined ? 0 : progress}%` }}</span>
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
            {{ t('buttons.cancel') }}
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
            {{ t('buttons.remove') }}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  </div>
</template>
