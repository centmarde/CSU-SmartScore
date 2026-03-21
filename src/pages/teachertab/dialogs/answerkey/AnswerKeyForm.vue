<template>
  <div>
    <v-form @submit.prevent="$emit('submit')">
      <v-row>
        <!-- Title -->
        <v-col cols="12">
          <v-text-field
            :model-value="formData.title"
            @update:model-value="updateField('title', $event)"
            label="Title *"
            :rules="titleRules"
            variant="outlined"
            required
          />
        </v-col>

        <!-- Description -->
        <v-col cols="12">
          <v-textarea
            :model-value="formData.description"
            @update:model-value="updateField('description', $event)"
            label="Description"
            variant="outlined"
            rows="3"
            counter="500"
          />
        </v-col>

        <!-- Status -->
        <v-col cols="12">
          <v-switch
            :model-value="formData.is_active"
            @update:model-value="updateField('is_active', $event)"
            label="Active"
            color="primary"
            inset
          />
        </v-col>

        <!-- Selected Image Display -->
        <v-col v-if="imagePreview" cols="12">
          <v-card variant="outlined" class="pa-2">
            <v-card-title class="text-subtitle-2">Selected Image</v-card-title>
            <div class="d-flex align-center">
              <v-img
                :src="imagePreview"
                max-height="100"
                max-width="100"
                class="me-3"
              />
              <div class="flex-grow-1">
                <div class="text-body-2">Answer Sheet Image</div>
                <div class="text-caption text-medium-emphasis">
                  {{ imageFileName || 'Captured Image' }}
                </div>
              </div>
              <v-btn
                icon="mdi-pencil"
                size="small"
                variant="text"
                @click="$emit('editImage')"
              />
            </div>
          </v-card>
        </v-col>
      </v-row>
    </v-form>
  </div>
</template>

<script setup lang="ts">
interface FormData {
  title: string
  description: string
  is_active: boolean
  answer_images: string | null
}

interface Props {
  formData: FormData
  imagePreview: string | null
  imageFileName: string | null
}

interface Emits {
  (e: 'update:formData', value: FormData): void
  (e: 'editImage'): void
  (e: 'submit'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Form validation
const titleRules = [
  (v: string) => !!v || 'Title is required',
  (v: string) => (v && v.length <= 100) || 'Title must be less than 100 characters'
]

const updateField = (field: keyof FormData, value: any) => {
  const updatedData = { ...props.formData, [field]: value }
  emit('update:formData', updatedData)
}
</script>

<style scoped>
pre {
  background-color: rgb(var(--v-theme-surface-variant));
  padding: 8px;
  border-radius: 4px;
  overflow-x: auto;
  max-height: 200px;
}
</style>
