<script setup lang="ts">
import InnerLayoutWrapper from '@/layouts/InnerLayoutWrapper.vue';
import TeacherAnswerKeyWidget from './components/TeacherAnswerKeyWidget.vue';
</script>

<template>
  <InnerLayoutWrapper>
    <template #content>
      <TeacherAnswerKeyWidget />
    </template>
  </InnerLayoutWrapper>
</template>
