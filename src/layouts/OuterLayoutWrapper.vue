<template>
  <v-app>
    <!-- Dynamic Navbar Selection -->
    <OuterNavbar
      v-if="data?.ui?.navbarComponent === '1'"
      :config="data?.ui"
    />
    <OuterNavbar2
      v-else-if="data?.ui?.navbarComponent === '2'"
      :config="data?.ui"
    />
    <OuterNavbar3
      v-else-if="data?.ui?.navbarComponent === '3'"
      :config="data?.ui"
    />
    <OuterNavbar4
      v-else-if="data?.ui?.navbarComponent === '4'"
      :config="data?.ui"
    />

    <v-main class="pa-0">
      <slot name="content"></slot>
    </v-main>

    <!-- Dynamic Footer Selection -->
    <OuterFooter
      v-if="data?.ui?.footerComponent === '1'"
      :config="data?.ui"
    />
    <OuterFooter2
      v-else-if="data?.ui?.footerComponent === '2'"
      :config="data?.ui"
    />
  </v-app>
</template>

<script lang="ts" setup>
  import { onMounted } from 'vue'
  import OuterFooter from '@/components/common/outerFooters/OuterFooter.vue'
  import OuterFooter2 from '@/components/common/outerFooters/OuterFooter2.vue'
  import OuterNavbar from '@/components/common/outerNavbars/OuterNavbar1.vue'
  import OuterNavbar2 from '@/components/common/outerNavbars/OuterNavbar2.vue'
  import OuterNavbar3 from '@/components/common/outerNavbars/OuterNavbar3.vue'
  import OuterNavbar4 from '@/components/common/outerNavbars/OuterNavbar4.vue'
  import { useLandingController } from '@/controller/landingController'

  const { data, fetchLandingData } = useLandingController()

  onMounted(async () => {
    await fetchLandingData()
  })
</script>

<style scoped>
  /* Remove default v-main padding for floating navbar */
  :deep(.v-main) {
    padding-top: 0 !important;
    padding-left: 0 !important;
    padding-right: 0 !important;
    padding-bottom: 0 !important;
  }

  /* Ensure content starts from the very top */
  :deep(.v-main__wrap) {
    padding-top: 0 !important;
  }
</style>
