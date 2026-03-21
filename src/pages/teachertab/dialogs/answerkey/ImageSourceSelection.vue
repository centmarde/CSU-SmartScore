<template>
  <div>
    <div class="text-center mb-6">
      <v-icon size="64" color="primary" class="mb-4">mdi-camera</v-icon>
      <h3 class="text-h6 mb-2">Choose Image Source</h3>
      <p class="text-body-2 text-medium-emphasis">
        Select how you want to add the answer sheet image
      </p>
    </div>

    <v-row class="justify-center">
      <v-col cols="12" sm="6">
        <v-card
          variant="outlined"
          class="pa-4 text-center cursor-pointer hover-card"
          @click="selectSource('upload')"
          :class="{ 'bg-primary-lighten-5': selectedSource === 'upload' }"
        >
          <v-icon size="48" color="primary" class="mb-3">mdi-upload</v-icon>
          <div class="text-h6 mb-2">Upload Image</div>
          <div class="text-body-2 text-medium-emphasis">
            Select an image file from your device
          </div>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6">
        <v-card
          variant="outlined"
          class="pa-4 text-center cursor-pointer hover-card"
          @click="selectSource('camera')"
          :class="{ 'bg-primary-lighten-5': selectedSource === 'camera' }"
        >
          <v-icon size="48" color="primary" class="mb-3">mdi-camera</v-icon>
          <div class="text-h6 mb-2">Use Camera</div>
          <div class="text-body-2 text-medium-emphasis">
            Take a photo using your camera
          </div>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
interface Props {
  selectedSource: 'upload' | 'camera' | null
}

interface Emits {
  (e: 'select', source: 'upload' | 'camera'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const selectSource = (source: 'upload' | 'camera') => {
  emit('select', source)
}
</script>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}

.hover-card {
  transition: all 0.3s ease;
}

.hover-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.bg-primary-lighten-5 {
  background-color: rgba(var(--v-theme-primary), 0.1);
}
</style>
