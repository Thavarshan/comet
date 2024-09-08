<script setup lang="ts">
defineProps({
  title: String
});
</script>

<template>
  <div class="h-[35px] flex items-center justify-center">
    <div class="text-center text-sm font-semibold w-full text-foreground">
      {{ title }}
    </div>
  </div>
</template>

<style scoped></style>
