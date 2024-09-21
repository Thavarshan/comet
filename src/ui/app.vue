<script setup lang="ts">
import Layout from '@/ui/layouts/DefaultLayout.vue';
import { VideoConverter, AudioConverter, ImageConverter } from '@/ui/blocks';
import { createConverterStore } from '@/ui/stores';
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { useLanguagePreferences } from '@/ui/composables/language-mode';
import { APP_NAME } from '@/consts/app';

const isInitialised = ref(false);

const useVideoConverterStore = createConverterStore();
const videoStore = useVideoConverterStore();

const useAudioConverterStore = createConverterStore();
const audioStore = useAudioConverterStore();

const useImageConverterStore = createConverterStore();
const imageStore = useImageConverterStore();

const { currentLocale, setLocale } = useLanguagePreferences();

onMounted(async () => {
  await videoStore.init();
  await audioStore.init();
  await imageStore.init();

  setLocale(currentLocale.value);

  isInitialised.value = true;
});

onBeforeUnmount(() => {
  videoStore.clearListeners();
  audioStore.clearListeners();
  imageStore.clearListeners();
});
</script>

<template>
  <Layout :title="APP_NAME" :isInitialised="isInitialised" v-cloak>
    <template #video>
      <VideoConverter v-if="isInitialised" :store="videoStore" />
    </template>
    <template #audio>
      <AudioConverter v-if="isInitialised" :store="audioStore" />
    </template>
    <template #image>
      <ImageConverter v-if="isInitialised" :store="imageStore" />
    </template>
  </Layout>
</template>
