<script setup lang="ts">
import { onMounted, computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useToast } from 'vue-toastification';
import { useStudentQuizStore } from '@/stores/studentQuiz';
import OuterLayoutWrapper from '@/layouts/OuterLayoutWrapper.vue';
import UploadImageDialog from './dialogs/UploadImageDialog.vue';
import CameraDialog from './dialogs/CameraDialog.vue';

const route = useRoute();
const toast = useToast();
const studentQuizStore = useStudentQuizStore();

// State
const showUploadDialog = ref(false);
const showCameraDialog = ref(false);

// Computed properties
const quizId = computed(() => {
  const params = route.params as { id?: string };
  return params.id || '';
});

const quizInfo = computed(() => studentQuizStore.getQuizDisplayInfo());
const quizTitle = computed(() => quizInfo.value?.title || 'Quiz Not Found');
const quizDescription = computed(() => quizInfo.value?.description || 'No description available.');
const isQuizActive = computed(() => quizInfo.value?.isActive || false);
const isQuizLoaded = computed(() => studentQuizStore.isQuizLoaded);
const loading = computed(() => !isQuizLoaded.value && quizId.value !== '');

/**
 * Fetch quiz information based on the route parameter
 */
const fetchQuizInfo = async () => {
  if (!quizId.value) {
    toast.error('Invalid quiz ID');
    return;
  }

  try {
    const { data, error } = await studentQuizStore.loadQuiz(quizId.value);

    if (error) {
      console.error('Error fetching quiz:', error);
      toast.error('Failed to load quiz information');
      return;
    }

    if (data && !data.is_active) {
      toast.warning('This quiz is currently inactive');
    }
  } catch (error) {
    console.error('Error:', error);
    toast.error('An unexpected error occurred');
  }
};

/**
 * Open camera dialog
 */
const openCameraDialog = () => {
  showCameraDialog.value = true;
};

/**
 * Open upload dialog
 */
const openUploadDialog = () => {
  showUploadDialog.value = true;
};

/**
 * Handle image submission from dialog
 */
const handleImageSubmit = async (image: File | Blob) => {
  try {
    console.log('Submitting image for quiz:', quizId.value);
    console.log('Image:', image);

    // TODO: Implement actual submission logic
    // For now, just show success message
    toast.success('Answer submitted successfully!');

    // Here you would typically:
    // 1. Upload the image to your backend
    // 2. Process the answer sheet
    // 3. Save the results

  } catch (error) {
    console.error('Error submitting answer:', error);
    toast.error('Failed to submit answer. Please try again.');
  }
};

// Lifecycle
onMounted(() => {
  fetchQuizInfo();
});
</script>

<template>
  <OuterLayoutWrapper>
    <template #content>
      <v-container fluid class="min-vh-100 pa-4 my-5">
        <v-row justify="center">
          <v-col cols="12" md="8" lg="6">

              <!-- Image at the top -->
              <div class="text-center mb-6">
                <v-img
                  src="/assets/logo.svg"
                  alt="Quiz Icon"
                  max-width="120"
                  class="mx-auto"
                />
              </div>

              <!-- Quiz Info Header -->
              <v-card-title class="text-h5 text-center mb-3">
                {{ quizTitle }}
              </v-card-title>

              <v-card-text class="text-center text-body-2 text-medium-emphasis mb-6">
                {{ quizDescription }}
              </v-card-text>

              <!-- Action Buttons Section -->
              <div class="text-center">
                <p class="text-body-2 text-medium-emphasis mb-4">
                  Choose how to submit your answer:
                </p>

                <v-row class="mb-4" justify="center">
                  <!-- Camera Button -->
                  <v-col cols="12" sm="6">
                    <v-btn
                      size="large"
                      color="primary"
                      variant="flat"
                      @click="openCameraDialog"
                      :disabled="!isQuizActive"
                      block
                      height="60"
                    >
                      <v-icon left>mdi-camera</v-icon>
                      Use Camera
                    </v-btn>
                  </v-col>

                  <!-- Upload Image Button -->
                  <v-col cols="12" sm="6">
                    <v-btn
                      size="large"
                      color="primary"
                      variant="outlined"
                      @click="openUploadDialog"
                      :disabled="!isQuizActive"
                      block
                      height="60"
                    >
                      <v-icon left>mdi-upload</v-icon>
                      Upload Image
                    </v-btn>
                  </v-col>
                </v-row>

                <!-- Status Messages -->
                <v-alert
                  v-if="!isQuizActive"
                  type="warning"
                  variant="tonal"
                  density="compact"
                  class="mt-4"
                >
                  This quiz is currently inactive
                </v-alert>

                <v-alert
                  v-else-if="!quizId"
                  type="error"
                  variant="tonal"
                  density="compact"
                  class="mt-4"
                >
                  Invalid quiz ID
                </v-alert>
              </div>

          </v-col>
        </v-row>

        <!-- Loading Overlay -->
        <v-overlay
          :model-value="loading"
          class="align-center justify-center"
          persistent
        >
          <v-progress-circular
            indeterminate
            size="48"
            color="primary"
          />
          <div class="mt-3 text-center">
            <p class="text-body-1">Loading...</p>
          </div>
        </v-overlay>

        <!-- Camera Dialog -->
        <CameraDialog
          v-model="showCameraDialog"
          :quiz-title="quizTitle"
          @submit="handleImageSubmit"
        />

        <!-- Upload Image Dialog -->
        <UploadImageDialog
          v-model="showUploadDialog"
          :quiz-title="quizTitle"
          @submit="handleImageSubmit"
        />
      </v-container>
    </template>
  </OuterLayoutWrapper>
</template>
