<script setup lang="ts">
import { Check, ChevronsUpDown } from 'lucide-vue-next';
import { ref } from 'vue';
import { cn } from '@/ui/utils';
import { Button } from '@/ui/components/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/ui/components/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/components/popover';
import { Badge } from '@/ui/components/badge';
import { useI18n } from 'vue-i18n';

const emit = defineEmits(['change']);
const open = ref(false);
const listId = `combobox-list-${Math.random().toString(36).substr(2, 9)}`;

const { t } = useI18n();

const props = defineProps<{
  placeholder: string;
  options: string[];
  convertTo?: string;
}>();

const value = ref(props.convertTo);

function setOption(event: CustomEvent) {
  value.value = event.detail.value;
  open.value = false;

  emit('change', value.value);
}
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <div class="p-1 rounded-lg bg-muted">
        <Button
          variant="secondary"
          role="combobox"
          :aria-expanded="open"
          :aria-controls="listId"
          class="justify-between shadow-none"
        >
          <span v-if="value" class="mr-2 text-foreground text-xs">{{ t('formats.convertsTo') }}: </span>
          <Badge v-if="value" class="rounded-sm">
            {{ options.find((option: string) => option === value) }}
          </Badge>
          <span v-else class="text-foreground text-xs">{{ placeholder }}</span>
          <ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </div>
    </PopoverTrigger>
    <PopoverContent class="w-48 p-0" align="end">
      <Command v-model="value">
        <CommandInput :placeholder="`${t('formats.search')}...`" />
        <CommandEmpty>{{ t('formats.empty') }}</CommandEmpty>
        <CommandList :id="listId"> <!-- Use the generated ID here -->
          <CommandGroup>
            <CommandItem v-for="(option, index) in options" :key="index" :value="option" @select="setOption">
              <Check :class="cn('mr-2 h-4 w-4', value === option ? 'opacity-100' : 'opacity-0')" />
              {{ option }}
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>
</template>
