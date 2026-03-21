<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue';

// Props
interface Props {
  modelValue: boolean;
  quizTitle?: string;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  quizTitle: 'Quiz',
});

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'submit': [image: Blob];
}>();



// State
const previewUrl = ref<string | null>(null);
const isCapturing = ref(false);

// Camera refs
const videoRef = ref<HTMLVideoElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const stream = ref<MediaStream | null>(null);
const capturedImage = ref<Blob | null>(null);

/**
 * Start camera stream
 */
const startCamera = async () => {
  try {
    isCapturing.value = true;
    stream.value = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }, // Use back camera on mobile
      audio: false,
    });

    if (videoRef.value) {
      videoRef.value.srcObject = stream.value;
      await videoRef.value.play();
    }
    console.log('📹 Camera started successfully');
  } catch (error) {
    console.error('Error accessing camera:', error);
    isCapturing.value = false;
  }
};

/**
 * Stop camera stream
 */
const stopCamera = () => {
  if (stream.value) {
    stream.value.getTracks().forEach(track => track.stop());
    stream.value = null;
  }
  if (videoRef.value) {
    videoRef.value.srcObject = null;
  }
  isCapturing.value = false;
};

/**
 * Capture photo from camera
 */
const capturePhoto = () => {
  if (!videoRef.value || !canvasRef.value) return;

  const video = videoRef.value;
  const canvas = canvasRef.value;

  // Set canvas dimensions to match video
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  // Draw video frame to canvas
  const context = canvas.getContext('2d');
  if (context) {
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to blob
    canvas.toBlob((blob) => {
      if (blob) {
        capturedImage.value = blob;

        // Create preview URL
        if (previewUrl.value) {
          URL.revokeObjectURL(previewUrl.value);
        }
        previewUrl.value = URL.createObjectURL(blob);

        // Stop camera after capture
        stopCamera();
        console.log('📸 Photo captured successfully');
      }
    }, 'image/jpeg', 0.95);
  }
};

/**
 * Retake photo
 */
const retakePhoto = () => {
  capturedImage.value = null;
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value);
    previewUrl.value = null;
  }
  startCamera();
};

/**
 * Submit the captured image
 */
const handleSubmit = () => {
  if (!capturedImage.value) return;

  console.log('📤 Submitting captured image for processing...');
  emit('submit', capturedImage.value);
  handleClose();
};

/**
 * Handle dialog close
 */
const handleClose = () => {
  stopCamera();
  capturedImage.value = null;
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value);
    previewUrl.value = null;
  }
  emit('update:modelValue', false);
};

/**
 * Watch dialog open/close
 */
watch(() => props.modelValue, (isOpen) => {
  if (!isOpen) {
    stopCamera();
    capturedImage.value = null;
    if (previewUrl.value) {
      URL.revokeObjectURL(previewUrl.value);
      previewUrl.value = null;
    }
  }
});

// Cleanup on unmount
onUnmounted(() => {
  stopCamera();
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value);
  }
});
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    max-width="700"
    persistent
  >
    <v-card>
      <v-card-title class="d-flex align-center pa-4">
        <v-icon left>mdi-camera</v-icon>
        Camera Capture - {{ quizTitle }}
        <v-spacer />
        <v-btn
          icon
          variant="text"
          size="small"
          @click="handleClose"
        >
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-4">
        <!-- Camera Preview or Captured Image -->
        <div class="camera-container mb-4">
          <!-- Video Preview (when camera is active) -->
          <video
            v-show="isCapturing && !capturedImage"
            ref="videoRef"
            class="camera-preview"
            autoplay
            playsinline
          />

          <!-- Hidden canvas for capturing -->
          <canvas ref="canvasRef" style="display: none;" />

          <!-- Captured Image Preview -->
          <div v-if="capturedImage && previewUrl" class="captured-preview">
            <v-img
              :src="previewUrl"
              aspect-ratio="16/9"
              cover
              class="rounded"
            />
          </div>

          <!-- Placeholder when camera is not active -->
          <div
            v-if="!isCapturing && !capturedImage"
            class="camera-placeholder"
          >
            <v-icon size="64" color="grey">mdi-camera-outline</v-icon>
            <p class="text-body-2 text-grey mt-2">Click "Start Camera" to begin</p>
          </div>
        </div>

        <!-- Camera Controls -->
        <div class="d-flex gap-2 justify-center flex-wrap">
          <v-btn
            v-if="!isCapturing && !capturedImage"
            color="primary"
            variant="flat"
            @click="startCamera"
            prepend-icon="mdi-camera"
          >
            Start Camera
          </v-btn>

          <v-btn
            v-if="isCapturing && !capturedImage"
            color="success"
            variant="flat"
            size="large"
            @click="capturePhoto"
            prepend-icon="mdi-camera-iris"
          >
            Capture Photo
          </v-btn>

          <v-btn
            v-if="capturedImage"
            color="primary"
            variant="outlined"
            @click="retakePhoto"
            prepend-icon="mdi-camera-retake"
          >
            Retake
          </v-btn>
        </div>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-btn
          variant="outlined"
          @click="handleClose"
        >
          Cancel
        </v-btn>
        <v-spacer />
        <v-btn
          color="primary"
          variant="flat"
          @click="handleSubmit"
          :disabled="!capturedImage"
          prepend-icon="mdi-check"
        >
          Submit
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.camera-container {
  position: relative;
  width: 100%;
  min-height: 300px;
  background-color: #000;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.camera-preview {
  width: 100%;
  height: auto;
  display: block;
}

.camera-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.captured-preview {
  width: 100%;
}

.gap-2 {
  gap: 0.5rem;
}
</style>
