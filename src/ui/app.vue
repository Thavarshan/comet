<script setup lang="ts">
import Layout from '@/ui/layouts/DefaultLayout.vue';
import { VideoConverter, AudioConverter } from '@/ui/blocks';
import { createConverterStore } from '@/ui/stores';

const useVideoConverterStore = createConverterStore();
const videoStore = useVideoConverterStore();

const useAudioConverterStore = createConverterStore();
const audeoStore = useAudioConverterStore();
</script>

<template>
  <KeepAlive>
    <Layout title="Comet" v-cloak>
      <template #video>
        <VideoConverter :store="videoStore" />
      </template>
      <template #audio>
        <AudioConverter :store="audeoStore" />
      </template>
    </Layout>
  </KeepAlive>
</template>
