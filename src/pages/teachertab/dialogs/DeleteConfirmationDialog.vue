<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  modelValue: boolean
  title?: string
  message?: string
  itemName?: string
  loading?: boolean
  confirmText?: string
  cancelText?: string
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm'): void
  (e: 'cancel'): void
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Confirm Delete',
  message: 'Are you sure you want to delete this item? This action cannot be undone.',
  itemName: '',
  loading: false,
  confirmText: 'Delete',
  cancelText: 'Cancel'
})

const emit = defineEmits<Emits>()

// Computed
const isOpen = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
})

// Functions
const handleConfirm = () => {
  emit('confirm')
}

const handleCancel = () => {
  emit('cancel')
  isOpen.value = false
}
</script>

<template>
  <v-dialog
    v-model="isOpen"
    max-width="400"
    persistent
  >
    <v-card>
      <v-card-title class="text-h5 font-weight-bold text-error">
        <v-icon class="mr-2" color="error">mdi-delete</v-icon>
        {{ title }}
      </v-card-title>

      <v-card-text>
        <div class="text-body-1 mb-4">
          {{ message }}
        </div>

        <v-card v-if="itemName" variant="outlined" class="mb-4">
          <v-card-text>
            <div class="text-center">
              <div class="font-weight-medium">{{ itemName }}</div>
            </div>
          </v-card-text>
        </v-card>

        <v-alert
          type="warning"
          variant="tonal"
          class="mb-4"
        >
          <div class="text-body-2">
            <strong>Warning:</strong> This action cannot be undone.
          </div>
        </v-alert>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn
          variant="outlined"
          @click="handleCancel"
          :disabled="loading"
        >
          {{ cancelText }}
        </v-btn>
        <v-btn
          color="error"
          variant="flat"
          @click="handleConfirm"
          :loading="loading"
        >
          <v-icon start>mdi-delete</v-icon>
          {{ confirmText }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
