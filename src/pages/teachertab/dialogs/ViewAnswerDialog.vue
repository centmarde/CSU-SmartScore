<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useAnswerKeysStore, type AnswerKey } from '@/stores/answerKeysData'
import FullImageDialog from './FullImageDialog.vue'

interface AnswerKeyData {
  questions: Array<{
    question_number: number;
    question_text?: string;
    correct_answer: string;
    answer_type: 'multiple_choice' | 'true_false' | 'fill_blank' | 'essay' | 'matching';
    options?: string[];
    points?: number;
  }>;
  metadata: {
    total_questions: number;
    subject?: string;
    difficulty?: string;
    instructions?: string;
  };
}

// Props
const model = defineModel<boolean>({ default: false })

// Stores
const answerKeysStore = useAnswerKeysStore()

// State
const loading = ref(false)
const saving = ref(false)
const numberOfQuestions = ref(10)
const individualAnswers = ref<{ [key: number]: string }>({})
const showFullImageDialog = ref(false)
const selectedAnswers = ref<Set<number>>(new Set())
const bulkDeleteMode = ref(false)
const answerKeyData = ref<AnswerKeyData>({
  questions: [],
  metadata: {
    total_questions: 0,
    subject: '',
    difficulty: '',
    instructions: ''
  }
})

// Computed
const selectedAnswerKey = computed(() => answerKeysStore.selectedAnswerKey)
const hasImage = computed(() => selectedAnswerKey.value?.answer_images)
const imageUrl = computed(() => {
  if (!hasImage.value || !selectedAnswerKey.value?.answer_images) return null

  const answerImages = selectedAnswerKey.value.answer_images

  // If it's already a full URL (starts with http), use it directly
  if (answerImages.startsWith('http')) {
    return answerImages
  }

  // Otherwise, generate the full URL using the store method
  return answerKeysStore.generateAnswerImageUrl(answerImages)
})

// Watchers
watch(model, (isOpen) => {
  if (isOpen && selectedAnswerKey.value) {
    loadAnswerKeyData()
  } else {
    resetForm()
  }
})

// Methods
const loadAnswerKeyData = () => {
  if (!selectedAnswerKey.value?.answer_keys) {
    answerKeyData.value = {
      questions: [],
      metadata: {
        total_questions: 0,
        subject: '',
        difficulty: '',
        instructions: ''
      }
    }
    individualAnswers.value = {}
    return
  }

  try {
    const parsedData = typeof selectedAnswerKey.value.answer_keys === 'string'
      ? JSON.parse(selectedAnswerKey.value.answer_keys)
      : selectedAnswerKey.value.answer_keys

    // Ensure we always have a metadata object
    answerKeyData.value = {
      questions: parsedData.questions || [],
      metadata: {
        total_questions: parsedData.metadata?.total_questions || parsedData.questions?.length || 0,
        subject: parsedData.metadata?.subject || '',
        difficulty: parsedData.metadata?.difficulty || '',
        instructions: parsedData.metadata?.instructions || ''
      }
    }

    // Convert questions to individual answers format
    const answers: { [key: number]: string } = {}
    answerKeyData.value.questions.forEach(q => {
      answers[q.question_number] = q.correct_answer
    })
    individualAnswers.value = answers
    numberOfQuestions.value = Math.max(answerKeyData.value.metadata.total_questions, 10)
  } catch (error) {
    console.error('Error parsing answer key data:', error)
    answerKeyData.value = {
      questions: [],
      metadata: {
        total_questions: 0,
        subject: '',
        difficulty: '',
        instructions: ''
      }
    }
    individualAnswers.value = {}
  }
}

const parseIndividualAnswers = () => {
  const questions = []

  for (let i = 1; i <= numberOfQuestions.value; i++) {
    const answer = individualAnswers.value[i]
    if (answer && answer.trim()) {
      questions.push({
        question_number: i,
        question_text: '',
        correct_answer: answer.trim(),
        answer_type: 'multiple_choice' as const,
        options: [],
        points: 1
      })
    }
  }

  answerKeyData.value.questions = questions
  answerKeyData.value.metadata.total_questions = questions.length
}

const hasValidAnswers = computed(() => {
  return Object.values(individualAnswers.value).some(answer => answer && answer.trim())
})

const saveAnswerKey = async () => {
  if (!selectedAnswerKey.value?.id) {
    return
  }

  if (!hasValidAnswers.value) {
    return
  }

  saving.value = true
  try {
    // Parse the individual answers first
    parseIndividualAnswers()

    // Update the answer key
    await answerKeysStore.updateAnswerKey(selectedAnswerKey.value.id, {
      answer_keys: answerKeyData.value
    })

    model.value = false
  } catch (error) {
    console.error('Error saving answer key:', error)
  } finally {
    saving.value = false
  }
}

const resetForm = () => {
  individualAnswers.value = {}
  numberOfQuestions.value = 10
  answerKeyData.value = {
    questions: [],
    metadata: {
      total_questions: 0,
      subject: '',
      difficulty: '',
      instructions: ''
    }
  }
}

const closeDialog = () => {
  model.value = false
}

const openFullImage = () => {
  if (imageUrl.value) {
    showFullImageDialog.value = true
  }
}

const updateNumberOfQuestions = (newCount: string | number) => {
  const count = typeof newCount === 'string' ? parseInt(newCount) || 1 : newCount
  numberOfQuestions.value = Math.max(1, Math.min(100, count))
}

const clearAllAnswers = () => {
  individualAnswers.value = {}
}

const removeAnswer = (questionNumber: number) => {
  delete individualAnswers.value[questionNumber]
  parseIndividualAnswers()
}

const toggleBulkMode = () => {
  bulkDeleteMode.value = !bulkDeleteMode.value
  if (!bulkDeleteMode.value) {
    selectedAnswers.value.clear()
  }
}

const toggleAnswerSelection = (questionNum: number) => {
  if (selectedAnswers.value.has(questionNum)) {
    selectedAnswers.value.delete(questionNum)
  } else {
    selectedAnswers.value.add(questionNum)
  }
}

const selectAllAnswers = () => {
  selectedAnswers.value.clear()
  Object.keys(individualAnswers.value).forEach(key => {
    if (individualAnswers.value[parseInt(key)]) {
      selectedAnswers.value.add(parseInt(key))
    }
  })
}

const removeSelectedAnswers = () => {
  selectedAnswers.value.forEach(questionNum => {
    delete individualAnswers.value[questionNum]
  })
  selectedAnswers.value.clear()
  parseIndividualAnswers()
}
</script>

<template>
  <v-dialog v-model="model" max-width="1200px" persistent scrollable>
    <v-card>
      <v-card-title class="text-h5 font-weight-bold d-flex align-center">
        <v-icon class="mr-2" color="primary">mdi-eye</v-icon>
        View & Edit Answer Key
        <v-spacer />
        <v-btn icon="mdi-close" variant="text" @click="closeDialog" />
      </v-card-title>

      <v-card-text class="pa-0">
        <v-container fluid>
          <!-- Answer Key Info -->
          <div v-if="selectedAnswerKey" class="mb-4">
            <v-alert type="info" variant="tonal" class="mb-4">
              <v-row no-gutters>
                <v-col cols="12" md="6">
                  <strong>Title:</strong> {{ selectedAnswerKey.title }}
                </v-col>
                <v-col cols="12" md="6">
                  <strong>Status:</strong>
                  <v-chip
                    :color="selectedAnswerKey.is_active ? 'success' : 'error'"
                    size="small"
                    class="ml-2"
                  >
                    {{ selectedAnswerKey.is_active ? 'Active' : 'Inactive' }}
                  </v-chip>
                </v-col>
                <v-col cols="12" v-if="selectedAnswerKey.description">
                  <strong>Description:</strong> {{ selectedAnswerKey.description }}
                </v-col>
              </v-row>
            </v-alert>
          </div>

          <!-- Answer Key Image Preview -->
          <div class="mb-6">
            <v-card variant="outlined">
              <v-card-title class="text-h6">
                <v-icon class="mr-2">mdi-image</v-icon>
                Answer Key Image
              </v-card-title>
              <v-card-text>
                <div v-if="hasImage && imageUrl" class="text-center">
                  <v-hover v-slot="{ isHovering, props: hoverProps }">
                    <v-img
                      v-bind="hoverProps"
                      :src="imageUrl"
                      :alt="selectedAnswerKey?.title"
                      max-height="400"
                      contain
                      class="mx-auto cursor-pointer clickable-image"
                      :class="{ 'image-hover': isHovering }"
                      @click="openFullImage"
                    >
                    <template v-slot:placeholder>
                      <v-row
                        class="fill-height ma-0"
                        align="center"
                        justify="center"
                      >
                        <v-progress-circular
                          indeterminate
                          color="primary"
                        />
                      </v-row>
                    </template>
                    <template v-slot:error>
                      <v-row
                        class="fill-height ma-0"
                        align="center"
                        justify="center"
                      >
                        <v-icon size="48" color="error">mdi-alert-circle</v-icon>
                        <div class="text-body-2 ml-2">Failed to load image</div>
                      </v-row>
                    </template>
                  </v-img>
                  </v-hover>

                  <div class="text-caption mt-2 text-medium-emphasis">
                    Click to view fullscreen
                  </div>
                </div>
                <div v-else class="text-center pa-8">
                  <v-icon size="64" color="grey-lighten-2" class="mb-2">
                    mdi-image-off
                  </v-icon>
                  <div class="text-h6 text-medium-emphasis mb-2">
                    No Image Available
                  </div>
                  <div class="text-body-2 text-medium-emphasis">
                    <div v-if="!selectedAnswerKey?.answer_images">No image path found</div>
                    <div v-else>Image path: {{ selectedAnswerKey.answer_images }}</div>
                    <div v-if="imageUrl">Full URL: {{ imageUrl }}</div>
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </div>

          <!-- Individual Answer Inputs -->
          <v-card variant="outlined">
            <v-card-title class="text-h6">
              <v-icon class="mr-2">mdi-pencil</v-icon>
              Edit Answers
            </v-card-title>
            <v-card-text>
              <!-- Controls -->
              <div class="mb-4">
                <v-row align="center">
                  <v-col cols="12" md="6">
                    <v-text-field
                      :model-value="numberOfQuestions"
                      @update:model-value="updateNumberOfQuestions"
                      label="Number of Questions"
                      type="number"
                      min="1"
                      max="100"
                      variant="outlined"
                      density="compact"
                      hint="Maximum 100 questions"
                      persistent-hint
                    />
                  </v-col>
                  <v-col cols="12" md="6" class="d-flex gap-2 flex-wrap">
                    <v-btn
                      color="primary"
                      variant="outlined"
                      :prepend-icon="bulkDeleteMode ? 'mdi-close' : 'mdi-checkbox-multiple-marked'"
                      @click="toggleBulkMode"
                      size="small"
                    >
                      {{ bulkDeleteMode ? 'Cancel' : 'Bulk Edit' }}
                    </v-btn>
                    
                    <template v-if="bulkDeleteMode">
                      <v-btn
                        color="info"
                        variant="outlined"
                        prepend-icon="mdi-select-all"
                        @click="selectAllAnswers"
                        size="small"
                      >
                        Select All
                      </v-btn>
                      <v-btn
                        color="error"
                        variant="outlined"
                        prepend-icon="mdi-delete"
                        @click="removeSelectedAnswers"
                        :disabled="selectedAnswers.size === 0"
                        size="small"
                      >
                        Remove ({{ selectedAnswers.size }})
                      </v-btn>
                    </template>
                    
                    <v-btn
                      v-if="!bulkDeleteMode"
                      color="warning"
                      variant="outlined"
                      prepend-icon="mdi-delete-sweep"
                      @click="clearAllAnswers"
                      size="small"
                    >
                      Clear All
                    </v-btn>
                  </v-col>
                </v-row>
              </div>

              <!-- Answer Grid -->
              <div class="answer-grid">
                <v-row>
                  <v-col
                    v-for="questionNum in numberOfQuestions"
                    :key="questionNum"
                    cols="12"
                    sm="6"
                    md="4"
                    lg="3"
                  >
                    <v-text-field
                      v-model="individualAnswers[questionNum]"
                      :label="`Question ${questionNum}`"
                      variant="outlined"
                      density="compact"
                      placeholder="Enter answer"
                      clearable
                      @input="parseIndividualAnswers"
                    >
                      <template v-slot:prepend-inner>
                        <span class="question-number">{{ questionNum }}.</span>
                      </template>
                      <template v-slot:append>
                        <v-btn
                          v-if="individualAnswers[questionNum]"
                          icon="mdi-delete"
                          variant="text"
                          color="error"
                          size="small"
                          @click="removeAnswer(questionNum)"
                          class="delete-btn"
                        />
                      </template>
                    </v-text-field>
                  </v-col>
                </v-row>
              </div>

              <!-- Summary -->
              <div v-if="hasValidAnswers" class="mt-4">
                <v-divider class="mb-3" />
                <div class="d-flex align-center justify-space-between mb-2">
                  <div class="text-subtitle-2">Summary:</div>
                  <v-chip color="primary" size="small">
                    {{ Object.values(individualAnswers).filter(a => a && a.trim()).length }} answers provided
                  </v-chip>
                </div>

                <!-- Quick preview of filled answers -->
                <div class="filled-answers-preview">
                  <v-chip-group>
                    <v-chip
                      v-for="(answer, questionNum) in individualAnswers"
                      :key="questionNum"
                      v-show="answer && answer.trim()"
                      color="success"
                      variant="outlined"
                      size="small"
                    >
                      {{ questionNum }}. {{ answer }}
                    </v-chip>
                  </v-chip-group>
                </div>
              </div>

              <!-- Helpful Tips -->
              <v-alert type="info" variant="tonal" class="mt-4">
                <div class="text-subtitle-2 mb-2">Tips:</div>
                <ul class="text-body-2">
                  <li>Enter answers for multiple choice as: A, B, C, D</li>
                  <li>For True/False questions use: TRUE, FALSE</li>
                  <li>For fill-in-the-blank: Enter the exact answer expected</li>
                  <li>Leave blank for questions you don't want to include</li>
                </ul>
              </v-alert>
            </v-card-text>
          </v-card>
        </v-container>
      </v-card-text>

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn
          variant="outlined"
          @click="closeDialog"
          :disabled="saving"
        >
          Cancel
        </v-btn>
        <v-btn
          color="primary"
          @click="saveAnswerKey"
          :loading="saving"
          :disabled="!hasValidAnswers"
        >
          Save Changes
        </v-btn>
      </v-card-actions>
    </v-card>

    <!-- Full Image Dialog -->
    <FullImageDialog
      v-model="showFullImageDialog"
      :image-url="imageUrl"
      :title="selectedAnswerKey?.title || 'Answer Key'"
    />
  </v-dialog>
</template>

<style scoped>
.font-mono {
  font-family: 'Courier New', monospace;
}

.v-chip-group {
  max-height: 200px;
  overflow-y: auto;
}

.v-table {
  border: 1px solid rgb(var(--v-theme-surface-variant));
  border-radius: 4px;
}

.text-truncate {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cursor-pointer {
  cursor: pointer;
}

.clickable-image {
  transition: transform 0.2s ease, opacity 0.2s ease;
  border-radius: 8px;
  overflow: hidden;
}

.image-hover {
  transform: scale(1.02);
  opacity: 0.9;
}

.answer-grid {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 4px;
  padding: 12px;
  background-color: rgba(var(--v-theme-surface), 0.5);
}

.question-number {
  font-weight: 600;
  color: rgb(var(--v-theme-primary));
  min-width: 20px;
}

.filled-answers-preview {
  max-height: 120px;
  overflow-y: auto;
  padding: 8px;
  background-color: rgba(var(--v-theme-surface-variant), 0.3);
  border-radius: 4px;
}

.gap-2 {
  gap: 8px;
}

.delete-btn {
  opacity: 0.7;
  transition: opacity 0.2s ease;
}

.delete-btn:hover {
  opacity: 1;
}
</style>
