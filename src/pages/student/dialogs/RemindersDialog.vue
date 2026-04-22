<script setup lang="ts">
import { ref } from 'vue';
import ImageSamplesDialog from './ImageSamplesDialog.vue';

/**
 * RemindersDialog
 * Shown before UploadImageDialog/CameraDialog to remind users that AI extraction can fail.
 */
interface Props {
  modelValue: boolean;
  quizTitle?: string;
}

withDefaults(defineProps<Props>(), {
  modelValue: false,
  quizTitle: 'Quiz'
});

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  proceed: [];
}>();

const handleClose = () => {
  emit('update:modelValue', false);
};

const handleProceed = () => {
  emit('update:modelValue', false);
  emit('proceed');
};

const showSamplesDialog = ref(false);
const initialSample = ref<'accepted' | 'rejected'>('accepted');

const openSample = (sample: 'accepted' | 'rejected') => {
  initialSample.value = sample;
  showSamplesDialog.value = true;
};
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    max-width="650"
    persistent
  >
    <v-card>
      <v-card-title class="d-flex align-center pa-4">
        <v-icon left color="warning">mdi-robot-confused</v-icon>
        Reminders before uploading - {{ quizTitle }}
        <v-spacer />
        <v-btn icon variant="text" size="small" @click="handleClose">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-4">
        <v-alert type="warning" variant="tonal" class="mb-4">
          Our AI isn’t perfect. If the system extracts <strong>0 answers</strong> (or misses some),
          please retake the photo and try again.
        </v-alert>

        <div class="text-body-2">
          <p class="text-subtitle-1 mb-2">For best results:</p>
          <ul class="reminders-list">
            <li>
              Make sure your answers are written with <strong>numbers</strong> starting at
              <strong>1.</strong> (example: <code>1. Photosynthesis</code>)
            </li>
            <li>Take a <strong>clear</strong> photo (good lighting, no shadows, no blur).</li>
            <li>Capture the whole paper and keep it <strong>flat</strong> (avoid angles/cropping).</li>
            <li>
              If extraction fails, retake from a <strong>different angle</strong> and slightly closer.
            </li>
            <li>
              Avoid complex/dirty backgrounds. The AI isn’t trained for messy/dirty images and may get
              confused.
            </li>
          </ul>
        </div>

        <v-row class="mt-5" dense>
          <v-col cols="12" md="6">
            <v-card variant="outlined" class="sample-card accepted">
              <v-card-title class="text-subtitle-2 d-flex align-center">
                <v-icon left color="success">mdi-check-circle</v-icon>
                Recommended
              </v-card-title>
              <v-divider />
              <v-img
                src="/assets/sample-accepted.svg"
                alt="Recommended sample image"
                aspect-ratio="16/9"
                cover
                class="clickable"
                @click="openSample('accepted')"
              />
            </v-card>
          </v-col>

          <v-col cols="12" md="6">
            <v-card variant="outlined" class="sample-card rejected">
              <v-card-title class="text-subtitle-2 d-flex align-center">
                <v-icon left color="error">mdi-close-circle</v-icon>
                Not recommended
              </v-card-title>
              <v-divider />

              <v-carousel
                height="220"
                hide-delimiter-background
                show-arrows="hover"
                class="not-rec-carousel"
              >
                <v-carousel-item>
                  <v-img
                    src="/assets/sample-not-accepted.svg"
                    alt="Not recommended sample (blurry/angled/no numbering)"
                    aspect-ratio="16/9"
                    cover
                    class="clickable"
                    @click="openSample('rejected')"
                  />
                </v-carousel-item>
                <v-carousel-item>
                  <v-img
                    src="/assets/sample-not-recommended-real.svg"
                    alt="Not recommended sample (complex handwriting)"
                    aspect-ratio="16/9"
                    cover
                    class="clickable"
                    @click="openSample('rejected')"
                  />
                </v-carousel-item>
              </v-carousel>
            </v-card>
          </v-col>
        </v-row>

        <v-alert type="info" variant="tonal" density="compact" class="mt-4">
          Tip: Use dark pen/marker and write large enough. Keep spacing between answers.
        </v-alert>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-btn variant="outlined" @click="handleClose">Cancel</v-btn>
        <v-spacer />
        <v-btn color="primary" variant="flat" prepend-icon="mdi-arrow-right" @click="handleProceed">
          I understand, continue
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <ImageSamplesDialog
    v-model="showSamplesDialog"
    :initial-sample="initialSample"
  />
</template>

<style scoped>
.reminders-list {
  margin: 0.25rem 0 0;
  padding-left: 1.25rem;
}
.reminders-list li {
  margin: 0.35rem 0;
}

.sample-card {
  border-radius: 12px;
  overflow: hidden;
}

.sample-card.accepted {
  border-color: rgba(34, 197, 94, 0.35);
}

.sample-card.rejected {
  border-color: rgba(239, 68, 68, 0.35);
}

.clickable {
  cursor: pointer;
}

.not-rec-carousel :deep(.v-carousel__controls) {
  padding-bottom: 6px;
}
</style>
