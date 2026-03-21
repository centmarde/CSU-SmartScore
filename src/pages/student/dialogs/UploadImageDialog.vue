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
  'submit': [image: File];
}>();



// State
const selectedFile = ref<File | null>(null);
const previewUrl = ref<string | null>(null);
const isDragging = ref(false);
const fileInputRef = ref<HTMLInputElement | null>(null);

/**
 * Validate and process file
 */
const processFile = (file: File) => {
  // Validate file type
  if (!file.type.startsWith('image/')) {
    console.error('Please select an image file');
    return false;
  }

  // Validate file size (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    console.error('File size must be less than 10MB');
    return false;
  }

  selectedFile.value = file;

  // Create preview
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value);
  }
  previewUrl.value = URL.createObjectURL(file);
  console.log('🖼️ Image selected successfully');
  return true;
};

/**
 * Handle file selection from input
 */
const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    processFile(file);
  }
};

/**
 * Handle file drop
 */
const handleDrop = (event: DragEvent) => {
  event.preventDefault();
  isDragging.value = false;

  const files = event.dataTransfer?.files;
  if (files && files.length > 0) {
    processFile(files[0]);
  }
};

/**
 * Handle drag over
 */
const handleDragOver = (event: DragEvent) => {
  event.preventDefault();
  isDragging.value = true;
};

/**
 * Handle drag leave
 */
const handleDragLeave = () => {
  isDragging.value = false;
};

/**
 * Trigger file input click
 */
const triggerFileInput = () => {
  fileInputRef.value?.click();
};

/**
 * Remove selected file
 */
const removeFile = () => {
  selectedFile.value = null;
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value);
    previewUrl.value = null;
  }
};

/**
 * Submit the image
 */
const handleSubmit = () => {
  if (!selectedFile.value) return;

  console.log('📤 Submitting uploaded image for processing...');
  emit('submit', selectedFile.value);
  handleClose();
};

/**
 * Handle dialog close
 */
const handleClose = () => {
  removeFile();
  emit('update:modelValue', false);
};

/**
 * Watch dialog open/close
 */
watch(() => props.modelValue, (isOpen) => {
  if (!isOpen) {
    removeFile();
  }
});

// Cleanup on unmount
onUnmounted(() => {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value);
  }
});
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    max-width="600"
    persistent
  >
    <v-card>
      <v-card-title class="d-flex align-center pa-4">
        <v-icon left>mdi-upload</v-icon>
        Upload Image - {{ quizTitle }}
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
        <!-- Drop Zone (when no file selected) -->
        <div v-if="!selectedFile">
          <div
            class="drop-zone"
            :class="{ 'drop-zone-active': isDragging }"
            @drop="handleDrop"
            @dragover="handleDragOver"
            @dragleave="handleDragLeave"
            @click="triggerFileInput"
          >
            <v-icon size="64" :color="isDragging ? 'primary' : 'grey'">
              mdi-cloud-upload
            </v-icon>
            <p class="text-h6 mt-4 mb-2">
              {{ isDragging ? 'Drop image here' : 'Drag & drop image here' }}
            </p>
            <p class="text-body-2 text-medium-emphasis mb-3">
              or click to browse
            </p>
            <v-chip variant="outlined" size="small">
              <v-icon left size="small">mdi-information</v-icon>
              Max 10MB • JPG, PNG, GIF
            </v-chip>
          </div>

          <!-- Hidden File Input -->
          <input
            ref="fileInputRef"
            type="file"
            accept="image/*"
            style="display: none;"
            @change="handleFileChange"
          />
        </div>

        <!-- File Preview -->
        <div v-else-if="selectedFile && previewUrl" class="file-preview">
          <v-img
            :src="previewUrl"
            aspect-ratio="16/9"
            cover
            class="rounded mb-3"
          />

          <v-chip
            color="primary"
            variant="outlined"
            class="mb-3"
          >
            <v-icon left>mdi-file-image</v-icon>
            {{ selectedFile.name }}
          </v-chip>

          <v-btn
            color="error"
            variant="outlined"
            block
            @click="removeFile"
            prepend-icon="mdi-delete"
          >
            Remove File
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
          :disabled="!selectedFile"
          prepend-icon="mdi-check"
        >
          Submit
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.drop-zone {
  border: 2px dashed #ccc;
  border-radius: 12px;
  padding: 3rem 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;

}

.drop-zone:hover {
  border-color: #F77F00;

}

.drop-zone-active {
  border-color: #F77F00;

  border-width: 3px;
}

.file-preview {
  width: 100%;
}
</style>
