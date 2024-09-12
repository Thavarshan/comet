<script setup lang="ts">
import Layout from '@/ui/layouts/DefaultLayout.vue';
import { VideoConverter, AudioConverter } from '@/ui/blocks';
import { createConverterStore } from '@/ui/stores';
import { onMounted, onBeforeUnmount } from 'vue';

const useVideoConverterStore = createConverterStore();
const videoStore = useVideoConverterStore();

const useAudioConverterStore = createConverterStore();
const audioStore = useAudioConverterStore();

onMounted(async () => {
  await videoStore.init();
  await audioStore.init();
});

onBeforeUnmount(() => {
  videoStore.clearListeners();
  audioStore.clearListeners();
});
</script>

<template>
  <Layout title="Comet" v-cloak>
    <template #video>
      <VideoConverter :store="videoStore" />
    </template>
    <template #audio>
      <AudioConverter :store="audioStore" />
    </template>
  </Layout>
</template>
