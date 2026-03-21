<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useAnswerKeysStore } from '@/stores/answerKeysData'
import ImageSourceSelection from '../dialogs/answerkey/ImageSourceSelection.vue'
import ImageCaptureUpload from '../dialogs/answerkey/ImageCaptureUpload.vue'
import AnswerKeyForm from '../dialogs/answerkey/AnswerKeyForm.vue'

interface Props {
  modelValue: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const answerKeysStore = useAnswerKeysStore()

// Step management
const currentStep = ref(1)
const totalSteps = 3

// Image source selection
const imageSource = ref<'upload' | 'camera' | null>(null)

// Form data
const formData = ref({
  title: '',
  description: '',
  is_active: true,
  answer_images: null as string | null
})

// Form validation
const titleRules = [
  (v: string) => !!v || 'Title is required',
  (v: string) => (v && v.length <= 100) || 'Title must be less than 100 characters'
]

// File handling
const imageFile = ref<File | null>(null)
const imagePreview = ref<string | null>(null)

// Camera related
const showCamera = ref(false)

// Computed
const isOpen = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
})

const loading = computed(() => answerKeysStore.loading)

// Functions
const nextStep = () => {
  if (currentStep.value < totalSteps) {
    currentStep.value++
  }
}

const prevStep = () => {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

const selectImageSource = (source: 'upload' | 'camera') => {
  imageSource.value = source
  if (source === 'camera') {
    showCamera.value = true
  }
  nextStep()
}

const retakePhoto = () => {
  imageFile.value = null
  imagePreview.value = null
  currentStep.value = 1
  imageSource.value = null
  showCamera.value = false
}

const handleImageUploaded = (file: File) => {
  imageFile.value = file
  const reader = new FileReader()
  reader.onload = (e) => {
    imagePreview.value = e.target?.result as string
    nextStep()
  }
  reader.readAsDataURL(file)
}

const handleImageCaptured = (data: { file: File, preview: string }) => {
  imageFile.value = data.file
  imagePreview.value = data.preview
  showCamera.value = false
  nextStep()
}

const removeImage = () => {
  imageFile.value = null
  imagePreview.value = null
  formData.value.answer_images = null
}

const resetForm = () => {
  currentStep.value = 1
  imageSource.value = null
  formData.value = {
    title: '',
    description: '',
    is_active: true,
    answer_images: null
  }
  imageFile.value = null
  imagePreview.value = null
  showCamera.value = false
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
        <v-spacer />
        <v-chip size="small" color="primary" variant="outlined">
          Step {{ currentStep }} of {{ totalSteps }}
        </v-chip>
      </v-card-title>

      <v-card-text>
        <!-- Step 1: Choose Image Source -->
        <ImageSourceSelection
          v-if="currentStep === 1"
          :selected-source="imageSource"
          @select="selectImageSource"
        />

        <!-- Step 2: Image Capture/Upload -->
        <ImageCaptureUpload
          v-if="currentStep === 2"
          :image-source="imageSource"
          :image-preview="imagePreview"
          :show-camera="showCamera"
          @image-uploaded="handleImageUploaded"
          @image-captured="handleImageCaptured"
          @retake="retakePhoto"
          @continue="nextStep"
          @camera-ready="showCamera = true"
        />

        <!-- Step 3: Form Details -->
        <AnswerKeyForm
          v-if="currentStep === 3"
          v-model:form-data="formData"
          :image-preview="imagePreview"
          :image-file-name="imageFile?.name || null"
          @edit-image="retakePhoto"
          @submit="handleSubmit"
        />
      </v-card-text>

      <v-card-actions>
        <v-btn
          v-if="currentStep > 1"
          variant="outlined"
          @click="prevStep"
          prepend-icon="mdi-arrow-left"
        >
          Back
        </v-btn>

        <v-spacer />

        <v-btn
          variant="outlined"
          @click="handleClose"
          :disabled="loading"
        >
          Cancel
        </v-btn>

        <v-btn
          v-if="currentStep === 3"
          color="primary"
          @click="handleSubmit"
          :loading="loading"
          :disabled="!formData.title || !imagePreview"
        >
          Create Answer Key
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
/* Minimal styles needed for the main dialog */
</style>
