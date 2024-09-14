<script setup lang="ts">
import { type HTMLAttributes } from 'vue';
import { cn } from '@/ui/utils';
import {
  Earth
} from 'lucide-vue-next';
import { Button } from '@/ui/components/button';
import { useLanguagePreferences } from '@/ui/composables/language-mode';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/ui/components/dropdown-menu';

const {
  currentLocale,
  setLocale
} = useLanguagePreferences();

const props = defineProps<{
  class?: HTMLAttributes['class'];
}>();
</script>

<template>
  <div :class="cn(props.class)">
    <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button variant="outline" @click.stop class="capitalize">
        <Earth class="size-4 mr-2" />
        {{ currentLocale }}
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent>
      <DropdownMenuItem @click="setLocale('en')">English</DropdownMenuItem>
      <DropdownMenuItem @click="setLocale('es')">Spanish</DropdownMenuItem>
      <DropdownMenuItem @click="setLocale('fr')">French</DropdownMenuItem>
      <DropdownMenuItem @click="setLocale('de')">German</DropdownMenuItem>
      <DropdownMenuItem @click="setLocale('ru')">Russian</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
  </div>
</template>

