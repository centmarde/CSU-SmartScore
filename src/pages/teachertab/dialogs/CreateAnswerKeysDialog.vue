<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAnswerKeysStore } from '@/stores/answerKeysData'

interface Props {
  modelValue: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const answerKeysStore = useAnswerKeysStore()

// Form data
const formData = ref({
  title: '',
  description: '',
  is_active: true,
  answer_keys: null as any,
  answer_images: null as string | null
})

// Form validation
const titleRules = [
  (v: string) => !!v || 'Title is required',
  (v: string) => (v && v.length <= 100) || 'Title must be less than 100 characters'
]

// File handling
const imageFile = ref<File | null>(null)
const answerKeyFile = ref<File | null>(null)
const imagePreview = ref<string | null>(null)

// Computed
const isOpen = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
})

const loading = computed(() => answerKeysStore.loading)

// Functions
const handleImageUpload = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]

  if (file) {
    imageFile.value = file
    const reader = new FileReader()
    reader.onload = (e) => {
      imagePreview.value = e.target?.result as string
    }
    reader.readAsDataURL(file)
  }
}

const handleAnswerKeyUpload = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]

  if (file) {
    answerKeyFile.value = file
    // Parse JSON file
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        formData.value.answer_keys = JSON.parse(content)
      } catch (error) {
        console.error('Error parsing answer key file:', error)
      }
    }
    reader.readAsText(file)
  }
}

const removeImage = () => {
  imageFile.value = null
  imagePreview.value = null
  formData.value.answer_images = null
}

const resetForm = () => {
  formData.value = {
    title: '',
    description: '',
    is_active: true,
    answer_keys: null,
    answer_images: null
  }
  imageFile.value = null
  answerKeyFile.value = null
  imagePreview.value = null
}

const handleSubmit = async () => {
  try {
    let imageUrl = null

    // Upload image if provided
    if (imageFile.value) {
      const imagePath = `answer_key_${Date.now()}_${imageFile.value.name}`
      const uploadResult = await answerKeysStore.uploadAnswerImage(imageFile.value, imagePath)

      if (uploadResult.imageUrl) {
        imageUrl = uploadResult.imageUrl
      }
    }

    // Create answer key
    const answerKeyData = {
      title: formData.value.title,
      description: formData.value.description,
      is_active: formData.value.is_active,
      answer_keys: formData.value.answer_keys,
      answer_images: imageUrl || undefined
    }

    const result = await answerKeysStore.createAnswerKey(answerKeyData)

    if (result.error === null) {
      resetForm()
      isOpen.value = false
    }
  } catch (error) {
    console.error('Error creating answer key:', error)
  }
}

const handleClose = () => {
  resetForm()
  isOpen.value = false
}
</script>

<template>
  <v-dialog
    v-model="isOpen"
    max-width="800"
    persistent
    scrollable
  >
    <v-card>
      <v-card-title class="text-h5 font-weight-bold">
        <v-icon class="mr-2" color="primary">mdi-plus</v-icon>
        Create Answer Key
      </v-card-title>

      <v-card-text>
        <v-form @submit.prevent="handleSubmit">
          <v-row>
            <!-- Title -->
            <v-col cols="12">
              <v-text-field
                v-model="formData.title"
                label="Title *"
                :rules="titleRules"
                variant="outlined"
                required
              />
            </v-col>

            <!-- Description -->
            <v-col cols="12">
              <v-textarea
                v-model="formData.description"
                label="Description"
                variant="outlined"
                rows="3"
                counter="500"
              />
            </v-col>

            <!-- Status -->
            <v-col cols="12">
              <v-switch
                v-model="formData.is_active"
                label="Active"
                color="primary"
                inset
              />
            </v-col>

            <!-- Answer Key File Upload -->
            <v-col cols="12">
              <v-file-input
                label="Answer Key JSON File"
                variant="outlined"
                accept=".json"
                prepend-icon="mdi-file-document"
                @change="handleAnswerKeyUpload"
              >
                <template v-slot:selection="{ fileNames }">
                  <v-chip
                    v-for="name in fileNames"
                    :key="name"
                    size="small"
                    label
                    color="primary"
                    class="me-2"
                  >
                    {{ name }}
                  </v-chip>
                </template>
              </v-file-input>
            </v-col>

            <!-- Image Upload -->
            <v-col cols="12">
              <v-file-input
                label="Answer Images"
                variant="outlined"
                accept="image/*"
                prepend-icon="mdi-camera"
                @change="handleImageUpload"
              />

              <!-- Image Preview -->
              <div v-if="imagePreview" class="mt-2">
                <v-card variant="outlined" class="pa-2">
                  <div class="d-flex align-center">
                    <v-img
                      :src="imagePreview"
                      max-height="100"
                      max-width="100"
                      class="me-3"
                    />
                    <div class="flex-grow-1">
                      <div class="text-body-2">Image Preview</div>
                      <div class="text-caption text-medium-emphasis">
                        {{ imageFile?.name }}
                      </div>
                    </div>
                    <v-btn
                      icon="mdi-close"
                      size="small"
                      variant="text"
                      @click="removeImage"
                    />
                  </div>
                </v-card>
              </div>
            </v-col>

            <!-- Answer Keys Preview -->
            <v-col v-if="formData.answer_keys" cols="12">
              <v-card variant="outlined">
                <v-card-title class="text-subtitle-1">
                  Answer Keys Preview
                </v-card-title>
                <v-card-text>
                  <pre class="text-caption">{{ JSON.stringify(formData.answer_keys, null, 2) }}</pre>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-form>
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
          color="primary"
          @click="handleSubmit"
          :loading="loading"
          :disabled="!formData.title"
        >
          Create Answer Key
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
pre {
  background-color: rgb(var(--v-theme-surface-variant));
  padding: 8px;
  border-radius: 4px;
  overflow-x: auto;
  max-height: 200px;
}
</style>
