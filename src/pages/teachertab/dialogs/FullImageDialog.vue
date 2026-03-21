<script setup lang="ts">
import { ref, computed } from 'vue'

interface Props {
  imageUrl?: string | null
  title?: string
}

const props = withDefaults(defineProps<Props>(), {
  imageUrl: null,
  title: 'Image Preview'
})

// Props
const model = defineModel<boolean>({ default: false })

// State
const loading = ref(false)
const imageLoaded = ref(false)

// Computed
const hasImage = computed(() => !!props.imageUrl)

// Methods
const closeDialog = () => {
  model.value = false
}

const onImageLoad = () => {
  loading.value = false
  imageLoaded.value = true
}

const onImageError = () => {
  loading.value = false
  imageLoaded.value = false
}

const downloadImage = () => {
  if (props.imageUrl && props.title) {
    const link = document.createElement('a')
    link.href = props.imageUrl
    link.download = `${props.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_fullsize.jpg`
    link.target = '_blank'
    link.click()
  }
}

const openInNewTab = () => {
  if (props.imageUrl) {
    window.open(props.imageUrl, '_blank')
  }
}

// Reset loading state when dialog opens
const onDialogUpdate = (isOpen: boolean) => {
  if (isOpen) {
    loading.value = true
    imageLoaded.value = false
  }
}
</script>

<template>
  <v-dialog
    v-model="model"
    max-width="1200px"
    @update:model-value="onDialogUpdate"
  >
    <v-card>
      <!-- Header -->
      <v-card-title class="text-h5 font-weight-bold d-flex align-center justify-space-between">
        <div>
          <v-icon class="mr-2" color="primary">mdi-image</v-icon>
          {{ title }}
        </div>
        <div class="d-flex align-center">
          <!-- Action buttons -->
          <v-btn
            v-if="hasImage"
            icon="mdi-download"
            variant="text"
            size="small"
            @click="downloadImage"
            class="mr-2"
          >
            <v-icon>mdi-download</v-icon>
            <v-tooltip activator="parent" location="bottom">
              Download Image
            </v-tooltip>
          </v-btn>

          <v-btn
            v-if="hasImage"
            icon="mdi-open-in-new"
            variant="text"
            size="small"
            @click="openInNewTab"
            class="mr-2"
          >
            <v-icon>mdi-open-in-new</v-icon>
            <v-tooltip activator="parent" location="bottom">
              Open in New Tab
            </v-tooltip>
          </v-btn>

          <v-btn
            icon="mdi-close"
            variant="text"
            @click="closeDialog"
          />
        </div>
      </v-card-title>

      <!-- Image content -->
      <v-card-text class="pa-0">
          <div v-if="hasImage" class="pa-4 d-flex align-center justify-center position-relative" style="min-height: 500px;">
            <!-- Loading indicator -->
            <v-progress-circular
              v-if="loading"
              indeterminate
              color="primary"
              size="64"
              width="4"
              class="position-absolute"
              style="z-index: 2;"
            />

            <!-- Main image -->
            <v-img
              :src="imageUrl || ''"
              :alt="title"
              max-height="500"
              contain
              class="rounded"
              @load="onImageLoad"
              @error="onImageError"
            >
              <template v-slot:placeholder>
                <v-row
                  class="fill-height ma-0"
                  align="center"
                  justify="center"
                >
                  <v-progress-circular
                    indeterminate
                    color="primary"
                    size="64"
                    width="4"
                  />
                </v-row>
              </template>

              <template v-slot:error>
                <v-row
                  class="fill-height ma-0"
                  align="center"
                  justify="center"
                >
                  <div class="text-center">
                    <v-icon size="64" color="error" class="mb-4">
                      mdi-alert-circle-outline
                    </v-icon>
                    <div class="text-h6 mb-2">
                      Failed to Load Image
                    </div>
                    <div class="text-body-2 text-medium-emphasis">
                      The image could not be displayed
                    </div>
                  </div>
                </v-row>
              </template>
            </v-img>
          </div>

          <!-- No image state -->
          <div v-else class="text-center pa-8">
            <v-icon size="128" color="grey-lighten-2" class="mb-4">
              mdi-image-off-outline
            </v-icon>
            <div class="text-h5 text-medium-emphasis mb-2">
              No Image Available
            </div>
            <div class="text-body-1 text-medium-emphasis">
              The image could not be found or loaded
            </div>
          </div>

      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<style scoped>
/* Smooth transitions */
.v-img {
  transition: transform 0.2s ease;
}

.position-absolute {
  position: absolute;
}

/* Dialog content styling */
.v-card {
  max-height: 90vh;
  overflow-y: auto;
}
</style>
