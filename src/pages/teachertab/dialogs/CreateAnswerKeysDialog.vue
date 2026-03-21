<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { useAnswerKeysStore } from '@/stores/answerKeysData'
import { useImageProcessor } from '@/pages/teachertab/composables/processImage'
import { useToast } from 'vue-toastification'
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
const toast = useToast()

// Initialize image processor
const {
  processImage,
  isProcessing: isImageProcessing,
  progress: imageProgress,
  currentStatus: imageStatus,
  streamingContent: imageStreamingContent,
  cleanup: cleanupImageProcessor
} = useImageProcessor()

// Additional status for submission process
const submissionStatus = ref('')// Step management
const currentStep = ref(1)
const totalSteps = 3

// Image source selection
const imageSource = ref<'upload' | 'camera' | null>(null)

// Form data
const formData = ref({
  title: '',
  description: '',
  is_active: true,
  answer_images: null as string | null,
  answer_keys: null as any // JSONB field for processed answer key data
})

// Image processing state
const imageResult = ref<any>(null)
const processingStep = ref<'uploading' | 'ai' | 'saving' | 'complete' | null>(null)

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

const loading = computed(() => answerKeysStore.loading || isImageProcessing.value)

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
}// Process image with AI vision
const processImageWithAI = async (file: File) => {
  try {
    processingStep.value = 'ai'

    // Process the image directly with AI vision
    const result = await processImage(file, false)

    // Store the results
    imageResult.value = result
    formData.value.answer_keys = result.answerKeyData

    // Auto-populate title if we found questions
    if (result.answerKeyData?.metadata?.total_questions) {
      const questionCount = result.answerKeyData.metadata.total_questions
      const subject = result.answerKeyData.metadata.subject !== 'Unknown'
        ? ` - ${result.answerKeyData.metadata.subject}`
        : ''
      formData.value.title = `Answer Key${subject} (${questionCount} Questions)`
    }

    // Auto-populate description with metadata
    if (result.answerKeyData?.metadata?.instructions) {
      formData.value.description = result.answerKeyData.metadata.instructions
    }

    processingStep.value = 'complete'

  } catch (error) {
    console.error('Error processing image:', error)
    processingStep.value = null
    // Reset image processing data on error
    imageResult.value = null
    formData.value.answer_keys = null
  }
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
    answer_images: null,
    answer_keys: null
  }
  imageFile.value = null
  imagePreview.value = null
  showCamera.value = false
  imageResult.value = null
  processingStep.value = null
  submissionStatus.value = ''
}

const handleSubmit = async () => {
  try {
    let imageUrl = null

    // First, upload the image if provided
    if (imageFile.value) {
      processingStep.value = 'uploading'
      submissionStatus.value = 'Uploading image...'

      const imagePath = `answer_key_${Date.now()}_${imageFile.value.name}`
      const uploadResult = await answerKeysStore.uploadAnswerImage(imageFile.value, imagePath)

      if (uploadResult.imageUrl) {
        imageUrl = uploadResult.imageUrl
      }
    }

    // Process image with AI if we have an image
    let processedAnswerKeys = null
    if (imageFile.value) {
      submissionStatus.value = 'Processing image with AI...'
      processingStep.value = 'ai'

      try {
        // Process the image directly with AI vision
        const result = await processImage(imageFile.value, false)

        // Store the results
        imageResult.value = result
        processedAnswerKeys = result.answerKeyData

        // Auto-populate title if we found questions and user hasn't set one
        if (!formData.value.title && result.answerKeyData?.metadata?.total_questions) {
          const questionCount = result.answerKeyData.metadata.total_questions
          const subject = result.answerKeyData.metadata.subject !== 'Unknown'
            ? ` - ${result.answerKeyData.metadata.subject}`
            : ''
          formData.value.title = `Answer Key${subject} (${questionCount} Questions)`
        }

        // Auto-populate description if user hasn't set one
        if (!formData.value.description && result.answerKeyData?.metadata?.instructions) {
          formData.value.description = result.answerKeyData.metadata.instructions
        }

      } catch (aiError) {
        console.warn('AI processing failed, continuing without processed data:', aiError)
        // Continue with manual data entry
      }
    }

    // Save to database
    processingStep.value = 'saving'
    submissionStatus.value = 'Saving answer key...'

    const answerKeyData = {
      title: formData.value.title,
      description: formData.value.description,
      is_active: formData.value.is_active,
      answer_images: imageUrl || undefined,
      answer_keys: processedAnswerKeys // Include processed OCR/AI data
    }

    const result = await answerKeysStore.createAnswerKey(answerKeyData)

    if (result.error === null) {
      processingStep.value = 'complete'
      submissionStatus.value = 'Answer key created successfully!'

      // Show success message with AI processing results summary
      if (processedAnswerKeys?.questions?.length) {
        toast.success(`Answer key created with ${processedAnswerKeys.questions.length} questions detected!`)
      }

      resetForm()
      isOpen.value = false
    }
  } catch (error) {
    console.error('Error creating answer key:', error)
    processingStep.value = null
    submissionStatus.value = 'Error occurred during processing'
  }
}

const handleClose = () => {
  resetForm()
  isOpen.value = false
}

// Cleanup on component unmount
onUnmounted(() => {
  cleanupImageProcessor()
})
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
        <!-- Processing Overlay -->
        <v-overlay
          v-model="loading"
          contained
          persistent
          class="d-flex align-center justify-center"
        >
          <v-card class="pa-6" min-width="400">
            <v-card-text class="text-center">
              <v-progress-circular
                :model-value="imageProgress || 50"
                :size="80"
                :width="6"
                color="primary"
                class="mb-4"
                :indeterminate="!imageProgress"
              >
                <span v-if="imageProgress">{{ Math.round(imageProgress) }}%</span>
              </v-progress-circular>

              <h3 class="text-h6 mb-2">Processing Answer Key</h3>
              <p class="text-body-2 text-medium-emphasis">{{ submissionStatus || imageStatus }}</p>

              <div class="mt-4">
                <v-chip
                  v-if="processingStep === 'uploading'"
                  size="small"
                  color="orange"
                  prepend-icon="mdi-upload"
                >
                  Uploading Image
                </v-chip>
                <v-chip
                  v-else-if="processingStep === 'ai'"
                  size="small"
                  color="success"
                  prepend-icon="mdi-brain"
                >
                  AI Vision Analysis
                </v-chip>
                <v-chip
                  v-else-if="processingStep === 'saving'"
                  size="small"
                  color="primary"
                  prepend-icon="mdi-content-save"
                >
                  Saving Answer Key
                </v-chip>
              </div>

              <!-- AI Streaming Content Preview -->
              <div v-if="imageStreamingContent && processingStep === 'ai'" class="mt-4">
                <v-card variant="outlined" class="pa-3">
                  <div class="text-caption text-medium-emphasis mb-2">
                    <v-icon size="small" class="me-1">mdi-lightning-bolt</v-icon>
                    Live AI Processing...
                  </div>
                  <div class="text-body-2" style="max-height: 200px; overflow-y: auto;">
                    <pre class="text-wrap">{{ imageStreamingContent }}</pre>
                  </div>
                </v-card>
              </div>
            </v-card-text>
          </v-card>
        </v-overlay>

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
          :image-result="imageResult"
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
          :disabled="!formData.title"
        >
          {{ imageFile ? 'Process with AI & Create Answer Key' : 'Create Answer Key' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
/* Minimal styles needed for the main dialog */
</style>
