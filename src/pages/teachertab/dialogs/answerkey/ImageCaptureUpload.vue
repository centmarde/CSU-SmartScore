<template>
  <div>
    <!-- Upload Mode -->
    <div v-if="imageSource === 'upload'">
      <div class="text-center mb-4">
        <h3 class="text-h6 mb-2">Upload Answer Sheet Image</h3>
        <p class="text-body-2 text-medium-emphasis">
          Drag and drop an image or click to select
        </p>
      </div>

      <!-- Dropzone -->
      <div
        class="dropzone"
        :class="{ 'dragover': isDragOver, 'error': hasError }"
        @drop="onDrop"
        @dragover="onDragOver"
        @dragenter="onDragEnter"
        @dragleave="onDragLeave"
        @click="openFileDialog"
      >
        <div class="dropzone-content">
          <div class="upload-icon-container">
            <v-icon size="72" :color="isDragOver ? 'primary' : 'grey-darken-1'" class="upload-icon">
              {{ isDragOver ? 'mdi-cloud-upload' : 'mdi-image-plus' }}
            </v-icon>
          </div>

          <div class="text-h5 font-weight-medium mb-3" :class="{ 'text-primary': isDragOver }">
            {{ isDragOver ? 'Drop image here' : 'Upload Answer Sheet' }}
          </div>

          <div class="text-body-1 mb-3" :class="isDragOver ? 'text-primary' : 'text-medium-emphasis'">
            {{ isDragOver ? 'Release to upload your file' : 'Drag and drop an image or click to browse' }}
          </div>

          <v-divider class="my-3 mx-auto" style="max-width: 200px;"></v-divider>

          <div class="text-body-2 text-medium-emphasis mb-2">
            <v-chip size="small" variant="outlined" class="mx-1">JPG</v-chip>
            <v-chip size="small" variant="outlined" class="mx-1">PNG</v-chip>
            <v-chip size="small" variant="outlined" class="mx-1">GIF</v-chip>
          </div>

          <div class="text-caption text-medium-emphasis">
            Maximum file size: 10MB
          </div>

          <!-- Error message -->
          <v-alert
            v-if="errorMessage"
            type="error"
            density="compact"
            class="mt-4"
            :text="errorMessage"
          />
        </div>

        <!-- Hidden file input -->
        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          style="display: none"
          @change="handleFileSelect"
        />
      </div>

      <!-- Upload progress (if needed in future) -->
      <div v-if="isUploading" class="mt-4">
        <v-progress-linear
          :model-value="uploadProgress"
          color="primary"
          height="6"
          rounded
        />
        <div class="text-center text-caption mt-1">
          Uploading... {{ uploadProgress }}%
        </div>
      </div>
    </div>

    <!-- Camera Mode -->
    <div v-if="imageSource === 'camera' && showCamera">
      <div class="text-center mb-4">
        <h3 class="text-h6 mb-2">Capture Answer Sheet</h3>
        <p class="text-body-2 text-medium-emphasis">
          Position the answer sheet in the camera view and tap capture
        </p>
      </div>

      <v-card variant="outlined" class="mb-4">
        <div class="camera-container">
          <video
            ref="videoElement"
            autoplay
            playsinline
            class="camera-video"
          />
          <canvas ref="canvasElement" style="display: none;" />
        </div>
        <v-card-actions class="justify-center">
          <v-btn
            color="primary"
            size="large"
            icon="mdi-camera"
            @click="captureImage"
          />
        </v-card-actions>
      </v-card>
    </div>

    <!-- Image Preview -->
    <div v-if="imagePreview">
      <div class="text-center mb-4">
        <h3 class="text-h6 mb-2">Image Preview</h3>
      </div>

      <v-card variant="outlined" class="mb-4">
        <v-img
          :src="imagePreview"
          max-height="400"
          contain
        />
        <v-card-actions class="justify-center">
          <v-btn
            variant="outlined"
            @click="$emit('retake')"
            prepend-icon="mdi-camera-retake"
          >
            Retake
          </v-btn>
          <v-btn
            color="primary"
            @click="$emit('continue')"
            prepend-icon="mdi-check"
          >
            Continue
          </v-btn>
        </v-card-actions>
      </v-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'

interface Props {
  imageSource: 'upload' | 'camera' | null
  imagePreview: string | null
  showCamera: boolean
}

interface Emits {
  (e: 'imageUploaded', file: File): void
  (e: 'imageCaptured', data: { file: File, preview: string }): void
  (e: 'retake'): void
  (e: 'continue'): void
  (e: 'cameraReady'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Camera refs
const videoElement = ref<HTMLVideoElement | null>(null)
const canvasElement = ref<HTMLCanvasElement | null>(null)
const cameraStream = ref<MediaStream | null>(null)

// Dropzone refs and state
const fileInput = ref<HTMLInputElement | null>(null)
const isDragOver = ref(false)
const hasError = ref(false)
const errorMessage = ref('')
const isUploading = ref(false)
const uploadProgress = ref(0)

// File validation
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif']

const startCamera = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' } // Use back camera if available
    })
    cameraStream.value = stream
    emit('cameraReady')

    // Wait for next tick to ensure video element exists
    await new Promise(resolve => setTimeout(resolve, 100))

    if (videoElement.value) {
      videoElement.value.srcObject = stream
      videoElement.value.play()
    }
  } catch (error) {
    console.error('Error accessing camera:', error)
    alert('Unable to access camera. Please check permissions.')
  }
}

const stopCamera = () => {
  if (cameraStream.value) {
    cameraStream.value.getTracks().forEach(track => track.stop())
    cameraStream.value = null
  }
}

const captureImage = () => {
  if (videoElement.value && canvasElement.value) {
    const canvas = canvasElement.value
    const video = videoElement.value
    const context = canvas.getContext('2d')

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    if (context) {
      context.drawImage(video, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `captured_${Date.now()}.jpg`, { type: 'image/jpeg' })
          const preview = canvas.toDataURL('image/jpeg')
          emit('imageCaptured', { file, preview })
          stopCamera()
        }
      }, 'image/jpeg', 0.8)
    }
  }
}

// File validation
const validateFile = (file: File): boolean => {
  clearError()

  if (!ALLOWED_TYPES.includes(file.type)) {
    setError('Please select a valid image file (JPG, PNG, GIF)')
    return false
  }

  if (file.size > MAX_FILE_SIZE) {
    setError('File size must be less than 10MB')
    return false
  }

  return true
}

const setError = (message: string) => {
  errorMessage.value = message
  hasError.value = true
}

const clearError = () => {
  errorMessage.value = ''
  hasError.value = false
}

// Dropzone event handlers
const onDragEnter = (e: DragEvent) => {
  e.preventDefault()
  e.stopPropagation()
  isDragOver.value = true
}

const onDragLeave = (e: DragEvent) => {
  e.preventDefault()
  e.stopPropagation()

  // Only set dragOver to false if we're leaving the dropzone entirely
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const x = e.clientX
  const y = e.clientY

  if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
    isDragOver.value = false
  }
}

const onDragOver = (e: DragEvent) => {
  e.preventDefault()
  e.stopPropagation()
  isDragOver.value = true
}

const onDrop = (e: DragEvent) => {
  e.preventDefault()
  e.stopPropagation()
  isDragOver.value = false

  const files = e.dataTransfer?.files
  if (files && files.length > 0) {
    const file = files[0]
    handleFileProcess(file)
  }
}

const openFileDialog = () => {
  fileInput.value?.click()
}

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]

  if (file) {
    handleFileProcess(file)
  }
}

const handleFileProcess = (file: File) => {
  if (validateFile(file)) {
    // Simulate upload progress (remove if not needed)
    isUploading.value = true
    uploadProgress.value = 0

    const interval = setInterval(() => {
      uploadProgress.value += 10
      if (uploadProgress.value >= 100) {
        clearInterval(interval)
        isUploading.value = false
        emit('imageUploaded', file)
      }
    }, 100)
  }
}

// Legacy function for compatibility (if still used elsewhere)
const handleImageUpload = (event: Event) => {
  handleFileSelect(event)
}

// Watch for camera mode activation
watch(() => props.imageSource, (newSource) => {
  if (newSource === 'camera' && props.showCamera) {
    startCamera()
  }
})

onMounted(() => {
  if (props.imageSource === 'camera' && props.showCamera) {
    startCamera()
  }
})

onUnmounted(() => {
  stopCamera()
})
</script>

<style scoped>
.camera-container {
  position: relative;
  width: 100%;
  max-width: 500px;
  margin: 0 auto;
}

.camera-video {
  width: 100%;
  height: auto;
  border-radius: 8px;
}

/* Dropzone Styles */
.dropzone {
  border: 3px dashed rgb(var(--v-theme-outline));
  border-radius: 16px;
  padding: 48px 24px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  background: linear-gradient(145deg, rgb(var(--v-theme-surface)), rgb(var(--v-theme-surface-variant)));
  min-height: 280px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.dropzone::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle at center, rgba(var(--v-theme-primary), 0.1) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.dropzone:hover {
  border-color: rgb(var(--v-theme-primary));
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(var(--v-theme-primary), 0.15);
}

.dropzone:hover::before {
  opacity: 1;
}

.dropzone.dragover {
  border-color: rgb(var(--v-theme-primary));
  border-style: solid;
  background: linear-gradient(145deg, rgba(var(--v-theme-primary), 0.05), rgba(var(--v-theme-primary), 0.1));
  transform: translateY(-4px) scale(1.02);
  box-shadow: 0 12px 30px rgba(var(--v-theme-primary), 0.2);
}

.dropzone.dragover::before {
  opacity: 1;
}

.dropzone.error {
  border-color: rgb(var(--v-theme-error));
  background: linear-gradient(145deg, rgba(var(--v-theme-error), 0.05), rgba(var(--v-theme-error), 0.1));
  animation: shake 0.5s ease-in-out;
}

.dropzone-content {
  width: 100%;
  position: relative;
  z-index: 1;
}

.upload-icon-container {
  margin-bottom: 16px;
}

.upload-icon {
  transition: all 0.3s ease;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
}

.dropzone:hover .upload-icon {
  transform: scale(1.1);
}

.dropzone.dragover .upload-icon {
  transform: scale(1.2) rotate(5deg);
  color: rgb(var(--v-theme-primary)) !important;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}

.text-primary {
  color: #1976d2 !important;
}

.text-error {
  color: #d32f2f !important;
}

/* Upload progress animation */
.v-progress-linear {
  border-radius: 3px;
}

/* Responsive design */
@media (max-width: 600px) {
  .dropzone {
    padding: 32px 16px;
    min-height: 220px;
  }

  .upload-icon {
    font-size: 56px !important;
  }

  .text-h5 {
    font-size: 1.25rem !important;
  }

  .text-body-1 {
    font-size: 0.95rem !important;
  }
}
</style>
