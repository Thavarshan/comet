<script setup lang="ts">
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/ui/components/tabs';
import { Toaster } from '@/ui/components/toast';
import { Titlebar } from '@/ui/components/titlebar';
import ThemeSwitcher from '@/ui/blocks/ThemeSwitcher.vue';

defineProps<{
  title: string;
}>();
</script>

<template>
  <Toaster :duration="3000" />
  <div class="relative px-3 space-y-3 h-full flex flex-col">
    <Titlebar :title="title" />
    <ThemeSwitcher class="absolute top-10 right-3" />
    <div class="flex flex-col justify-between flex-1">
      <div class="space-y-3 flex-1">
        <Tabs default-value="video">
          <TabsList>
            <TabsTrigger value="video">
              Video
            </TabsTrigger>
            <TabsTrigger value="audio">
              Audio
            </TabsTrigger>
          </TabsList>
          <KeepAlive>
            <div>
              <TabsContent value="video">
                <slot name="video" />
              </TabsContent>
              <TabsContent value="audio">
                <slot name="audio" />
              </TabsContent>
            </div>
          </KeepAlive>
        </Tabs>
      </div>
    </div>
  </div>
</template>
