<script setup lang="ts">
import { type HTMLAttributes, computed } from 'vue';
import type { ComboboxContentEmits, ComboboxContentProps } from 'radix-vue';
import { ComboboxContent, useForwardPropsEmits } from 'radix-vue';
import { cn } from '@/ui/utils';
import { ScrollArea } from '@/ui/components/scroll-area';

const props = withDefaults(defineProps<ComboboxContentProps & { class?: HTMLAttributes['class']; }>(), {
  dismissable: false,
});
const emits = defineEmits<ComboboxContentEmits>();

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props;

  return delegated;
});

const forwarded = useForwardPropsEmits(delegatedProps, emits);
</script>

<template>
  <ScrollArea>
    <ComboboxContent v-bind="forwarded" :class="cn(props.class)">
      <ScrollArea role="presentation" class="h-[250px]">
        <slot />
      </ScrollArea>
    </ComboboxContent>
  </ScrollArea>
</template>
