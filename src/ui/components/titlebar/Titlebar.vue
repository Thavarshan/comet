<script setup lang="ts">
defineProps({
  title: String
});
</script>

<template>
  <div class="h-10 flex items-center justify-center draggable cursor-move border-b -mx-6">
    <div class="text-center text-sm font-semibold w-full text-foreground">
      {{ title }}
    </div>
  </div>
</template>

<style scoped>
.draggable {
  -webkit-app-region: drag;
}
</style>
