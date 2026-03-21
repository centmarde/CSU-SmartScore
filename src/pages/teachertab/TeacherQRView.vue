<script setup lang="ts">
import InnerLayoutWrapper from '@/layouts/InnerLayoutWrapper.vue';
import TeacherQRWidget from './components/TeacherQRWidget.vue';
</script>
<template>
  <InnerLayoutWrapper>
    <template #content>
      <TeacherQRWidget />
    </template>
  </InnerLayoutWrapper>
</template>
