<script setup lang="ts">
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/components/tabs';
import { Toaster } from '@/ui/components/toast';
import { Titlebar } from '@/ui/components/titlebar';
import { Spinner } from '@/ui/components/spinner';
import { LanguageSwitcher, ThemeSwitcher } from '@/ui/blocks';
import { computed } from 'vue';
import { Platform } from '@/enum/platform';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

withDefaults(
  defineProps<{
    title: string;
    isInitialised?: boolean;
  }>(),
  {
    isInitialised: false,
  },
);

const showTitleBar = computed(() => {
  return !(window.electron.platform !== Platform.DARWIN);
});
</script>

<template>
  <Toaster :duration="3000" />
  <div v-if="!isInitialised" class="absolute inset-0 bg-white flex items-center justify-center w-full h-full z-50">
    <Spinner />
  </div>
  <div v-else class="relative px-3 space-y-3 h-full flex flex-col">
    <Titlebar :title="title" v-if="showTitleBar" />
    <div class="absolute right-3 flex items-center gap-x-3" :class="showTitleBar ? 'top-10' : 'top-3'">
      <LanguageSwitcher />
      <ThemeSwitcher />
    </div>
    <div class="flex flex-col justify-between flex-1">
      <div class="space-y-3 flex-1">
        <Tabs default-value="video">
          <TabsList>
            <TabsTrigger value="video">
              {{ t('media.video') }}
            </TabsTrigger>
            <TabsTrigger value="audio">
              {{ t('media.audio') }}
            </TabsTrigger>
            <TabsTrigger value="image">
              {{ t('media.image') }}
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
              <TabsContent value="image">
                <slot name="image" />
              </TabsContent>
            </div>
          </KeepAlive>
        </Tabs>
      </div>
    </div>
  </div>
</template>
