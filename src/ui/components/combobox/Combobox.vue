<script setup lang="ts">
import { Check, ChevronsUpDown } from 'lucide-vue-next';
import { ref } from 'vue';
import { cn } from '@/ui/utils';
import { Button } from '@/ui/components/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/ui/components/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/ui/components/popover';
import { Badge } from '@/ui/components/badge';

const emit = defineEmits(['change']);
const open = ref(false);

const props = defineProps<{
  placeholder: string;
  options: string[];
  convertTo?: string;
}>();

const value = ref(props.convertTo);

function setOption(option: string) {
  value.value = option;
  open.value = false;

  emit('change', option);
}
</script>

<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <Button
        variant="secondary"
        role="combobox"
        :aria-expanded="open"
        class="w-62 justify-between">
        <span v-if="value" class="mr-2 text-foreground text-xs">Converting to: </span>
        <Badge v-if="value">
          {{ options.find((option: string) => option === value) }}
        </Badge>
        <span v-else class="text-foreground text-xs">{{ placeholder }}</span>
        <ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
    </PopoverTrigger>
    <PopoverContent class="w-40 p-0" align="end">
      <Command v-model="value">
        <CommandInput placeholder="Search option..." />
        <CommandEmpty>No option found.</CommandEmpty>
        <CommandList>
          <CommandGroup>
            <CommandItem
              v-for="(option, index) in options"
              :key="index"
              :value="option"
              @select="setOption">
              <Check :class="cn(
                'mr-2 h-4 w-4',
                value === option ? 'opacity-100' : 'opacity-0',
              )"/>
              {{ option }}
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>
</template>
