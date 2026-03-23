<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    max-width="900"
    scrollable
  >
    <v-card v-if="student">
      <v-card-title class="d-flex align-center pa-4">
        <v-avatar class="me-3">
          <v-img
            v-if="student.image_url"
            :src="student.image_url"
            alt="Student"
          ></v-img>
          <v-icon v-else>mdi-account</v-icon>
        </v-avatar>
        <div>
          <div class="text-h6">{{ student.fullname }}</div>
          <div class="text-subtitle-2 text-medium-emphasis">Student ID: {{ student.student_id }}</div>
        </div>
        <v-spacer></v-spacer>
        <v-btn icon="mdi-close" variant="text" @click="closeDialog"></v-btn>
      </v-card-title>

      <v-divider></v-divider>

      <!-- Student Info Section -->
      <v-card-text class="pa-4">
        <v-row class="mb-4">
          <v-col cols="12" md="6">
            <v-card variant="outlined" class="pa-3">
              <div class="text-subtitle-2 text-medium-emphasis mb-2">Quiz Information</div>
              <div><strong>Quiz:</strong> {{ quizTitle }}</div>
              <div><strong>Submitted:</strong> {{ formatFullDate(student.created_at) }}</div>
            </v-card>
          </v-col>
          <v-col cols="12" md="6">
            <v-card variant="outlined" class="pa-3">
              <div class="text-subtitle-2 text-medium-emphasis mb-2">Score Information</div>
              <div class="d-flex align-center mb-1">
                <strong class="me-2">Score:</strong>
                <v-chip
                  v-if="student.score !== null"
                  :color="getScoreColor(student.score)"
                  size="small"
                >
                  {{ student.score }}%
                </v-chip>
                <v-chip v-else color="grey" size="small" variant="outlined">
                  Not graded
                </v-chip>
              </div>
              <div v-if="student.remarks">
                <strong>Remarks:</strong> {{ student.remarks }}
              </div>
              <div v-else class="text-medium-emphasis">No remarks</div>
            </v-card>
          </v-col>
        </v-row>

        <!-- Answers Section -->
        <div v-if="parsedAnswers && parsedAnswers.length > 0">
          <div class="d-flex align-center justify-space-between mb-4">
            <h3 class="text-h6">Student Answers</h3>
            <v-chip size="small" color="primary" variant="outlined">
              {{ parsedAnswers.length }} Questions
            </v-chip>
          </div>

          <!-- Answer Cards -->
          <v-row>
            <v-col
              v-for="(answer, index) in parsedAnswers"
              :key="`question-${answer.questionNumber || index}`"
              cols="12"
              md="6"
              lg="4"
            >
              <v-card
                variant="outlined"
                class="answer-card"
                :class="getAnswerCardClass(answer)"
              >
                <v-card-title class="d-flex align-center justify-space-between pa-3">
                  <span class="text-subtitle-1">Question {{ answer.questionNumber || (Number(index) + 1) }}</span>
                  <div class="d-flex align-center">
                    <!-- Confidence indicator -->
                    <v-tooltip v-if="answer.confidence" :text="`Confidence: ${(answer.confidence * 100).toFixed(1)}%`">
                      <template #activator="{ props }">
                        <v-progress-circular
                          v-bind="props"
                          :model-value="answer.confidence * 100"
                          :color="getConfidenceColor(answer.confidence)"
                          size="24"
                          width="3"
                          class="me-2"
                        ></v-progress-circular>
                      </template>
                    </v-tooltip>

                    <!-- Manual edit indicator -->
                    <v-tooltip v-if="answer.isManuallyEdited" text="Manually edited">
                      <template #activator="{ props }">
                        <v-icon v-bind="props" color="warning" size="18">mdi-pencil</v-icon>
                      </template>
                    </v-tooltip>
                  </div>
                </v-card-title>

                <v-divider></v-divider>

                <v-card-text class="pa-3">
                  <!-- Selected Answer -->
                  <div class="mb-2">
                    <div class="text-caption text-medium-emphasis mb-1">Selected Answer:</div>
                    <v-chip
                      :color="answer.selectedAnswer ? 'primary' : 'grey'"
                      size="small"
                      variant="elevated"
                    >
                      {{ answer.selectedAnswer || 'No answer' }}
                    </v-chip>
                  </div>

                  <!-- Alternative Options (if available) -->
                  <div v-if="answer.alternatives && answer.alternatives.length > 0" class="mt-3">
                    <div class="text-caption text-medium-emphasis mb-2">Alternative Options:</div>
                    <div class="d-flex flex-wrap gap-1">
                      <v-chip
                        v-for="(alt, altIndex) in answer.alternatives"
                        :key="`alt-${altIndex}`"
                        size="x-small"
                        color="grey"
                        variant="outlined"
                      >
                        {{ alt }}
                      </v-chip>
                    </div>
                  </div>

                  <!-- Confidence Details -->
                  <div v-if="answer.confidence" class="mt-3">
                    <div class="text-caption text-medium-emphasis">
                      Confidence: {{ (answer.confidence * 100).toFixed(1) }}%
                    </div>
                    <v-progress-linear
                      :model-value="answer.confidence * 100"
                      :color="getConfidenceColor(answer.confidence)"
                      height="4"
                      rounded
                    ></v-progress-linear>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </div>

        <!-- No Answers State -->
        <div v-else class="text-center py-8">
          <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-help-circle-outline</v-icon>
          <div class="text-h6 text-medium-emphasis mb-2">No Answers Available</div>
          <div class="text-body-2 text-medium-emphasis">
            This student hasn't submitted any answers yet.
          </div>
        </div>

        <!-- Raw Data Toggle (for debugging) -->
        <v-divider class="my-6"></v-divider>
        <v-expansion-panels v-if="student.answers" variant="accordion">
          <v-expansion-panel>
            <v-expansion-panel-title>
              <div class="d-flex align-center">
                <v-icon class="me-2" size="20">mdi-code-json</v-icon>
                Raw Data (Developer View)
              </div>
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <pre class="text-caption bg-grey-lighten-4 pa-3 rounded overflow-auto">{{ JSON.stringify(student.answers, null, 2) }}</pre>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-card-text>

      <v-card-actions class="pa-4">
        <v-spacer></v-spacer>
        <v-btn color="grey" variant="text" @click="closeDialog">
          Close
        </v-btn>
        <v-btn
          color="primary"
          variant="elevated"
          @click="editScore"
        >
          Edit Score
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Student } from '@/stores/studentsData'
import { getScoreColor, getConfidenceColor, formatFullDate } from '@/pages/student/utils/helpers'
import { getAnswerCardClass } from '@/pages/student/utils/getHelpers'

// Props
interface Props {
  modelValue: boolean
  student: Student | null
  quizTitle?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  student: null,
  quizTitle: 'Unknown Quiz'
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'edit-score': [student: Student]
}>()

// Computed properties
const parsedAnswers = computed(() => {
  if (!props.student?.answers) return []

  try {
    // Handle different answer formats
    if (Array.isArray(props.student.answers)) {
      return props.student.answers
    }

    if (typeof props.student.answers === 'object') {
      // If it's an object, try to convert it to array or extract answers
      if ('answers' in props.student.answers) {
        return props.student.answers.answers
      }

      // If it's a flat object with question keys, convert to array
      return Object.entries(props.student.answers).map(([key, value]: [string, any]) => ({
        questionNumber: parseInt(key.replace(/\D/g, '')) || key,
        ...value
      }))
    }

    return []
  } catch (error) {
    console.error('Error parsing answers:', error)
    return []
  }
})

// Methods
const closeDialog = () => {
  emit('update:modelValue', false)
}

const editScore = () => {
  if (props.student) {
    emit('edit-score', props.student)
    closeDialog()
  }
}

// Helper functions are imported from utility files
</script>

<style scoped>
.answer-card {
  transition: all 0.2s ease-in-out;
  min-height: 200px;
}

.answer-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.border-warning {
  border-left: 4px solid rgb(var(--v-theme-warning)) !important;
}

.border-error {
  border-left: 4px solid rgb(var(--v-theme-error)) !important;
}

pre {
  font-size: 12px;
  max-height: 300px;
  overflow-y: auto;
}
</style>
