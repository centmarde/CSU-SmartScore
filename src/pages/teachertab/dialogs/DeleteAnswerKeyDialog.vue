<script setup lang="ts">
import { computed } from 'vue'
import { useAnswerKeysStore } from '@/stores/answerKeysData'
import { formatDate } from '@/pages/student/utils/helpers'

interface Props {
  modelValue: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const answerKeysStore = useAnswerKeysStore()

// Computed
const isOpen = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
})

const loading = computed(() => answerKeysStore.loading)
const selectedAnswerKey = computed(() => answerKeysStore.selectedAnswerKey)

// Functions
const handleDelete = async () => {
  if (!selectedAnswerKey.value?.id) return

  try {
    const result = await answerKeysStore.deleteAnswerKey(selectedAnswerKey.value.id)

    if (result.error === null) {
      isOpen.value = false
    }
  } catch (error) {
    console.error('Error deleting answer key:', error)
  }
}

const handleClose = () => {
  isOpen.value = false
}


</script>

<template>
  <v-dialog
    v-model="isOpen"
    max-width="500"
    persistent
  >
    <v-card>
      <v-card-title class="text-h5 font-weight-bold text-error">
        <v-icon class="mr-2" color="error">mdi-delete</v-icon>
        Delete Answer Key
      </v-card-title>

      <v-card-text>
        <div class="text-body-1 mb-4">
          Are you sure you want to delete this answer key? This action cannot be undone.
        </div>

        <v-card v-if="selectedAnswerKey" variant="outlined" class="mb-4">
          <v-card-text>
            <div class="d-flex flex-column gap-2">
              <div class="d-flex align-center">
                <v-chip size="small" color="primary" variant="outlined" class="me-2">
                  #{{ selectedAnswerKey.id }}
                </v-chip>
                <span class="font-weight-medium">{{ selectedAnswerKey.title }}</span>
              </div>

              <div v-if="selectedAnswerKey.description" class="text-body-2 text-medium-emphasis">
                {{ selectedAnswerKey.description }}
              </div>

              <div class="d-flex align-center gap-4 mt-2">
                <div class="d-flex align-center">
                  <v-icon size="small" class="me-1">mdi-calendar</v-icon>
                  <span class="text-caption">{{ formatDate(selectedAnswerKey.created_at) }}</span>
                </div>

                <v-chip
                  :color="selectedAnswerKey.is_active ? 'success' : 'error'"
                  size="small"
                  variant="flat"
                >
                  {{ selectedAnswerKey.is_active ? 'Active' : 'Inactive' }}
                </v-chip>
              </div>

              <div v-if="selectedAnswerKey.answer_images" class="d-flex align-center mt-2">
                <v-icon size="small" class="me-1" color="warning">mdi-image</v-icon>
                <span class="text-caption">Has attached images (will be deleted)</span>
              </div>
            </div>
          </v-card-text>
        </v-card>

        <v-alert
          type="warning"
          variant="tonal"
          class="mb-4"
        >
          <div class="text-body-2">
            <strong>Warning:</strong> This will permanently delete:
          </div>
          <ul class="text-body-2 mt-1 ms-4">
            <li>The answer key record</li>
            <li v-if="selectedAnswerKey?.answer_images">Associated images from storage</li>
            <li>QR code link access</li>
            <li>All related data</li>
          </ul>
        </v-alert>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn
          variant="outlined"
          @click="handleClose"
          :disabled="loading"
        >
          Cancel
        </v-btn>
        <v-btn
          color="error"
          variant="flat"
          @click="handleDelete"
          :loading="loading"
        >
          <v-icon start>mdi-delete</v-icon>
          Delete Answer Key
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
