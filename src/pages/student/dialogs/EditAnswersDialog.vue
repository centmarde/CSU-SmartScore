<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { initializeAnswersFromExtractedData } from '../utils/getHelpers';
import { getConfidenceColor, getConfidenceText } from '../utils/helpers';

// Props
interface Props {
  modelValue: boolean;
  extractedAnswers?: any;
  quizTitle?: string;
  answerKeyData?: any;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  quizTitle: 'Quiz',
});

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'submit': [answers: any];
}>();

// State
const editableAnswers = ref<any[]>([]);
const studentName = ref('');
const studentId = ref('');
const isSubmitting = ref(false);

// Computed
const totalQuestions = computed(() => editableAnswers.value.length);
const answeredQuestions = computed(() =>
  editableAnswers.value.filter(answer => hasValidAnswer(answer.selectedAnswer)).length
);

/**
 * Initialize editable answers from extracted data
 */
const initializeAnswers = () => {
  if (!props.extractedAnswers) return;

  // Extract metadata if available
  if (props.extractedAnswers.metadata) {
    studentName.value = props.extractedAnswers.metadata.studentName || '';
    studentId.value = props.extractedAnswers.metadata.studentId || '';
  }

  editableAnswers.value = initializeAnswersFromExtractedData(props.extractedAnswers);
};

/**
 * Update answer for a specific question
 */
const updateAnswer = (index: number, newAnswer: string) => {
  if (editableAnswers.value[index]) {
    // Trim whitespace and store the answer
    editableAnswers.value[index].selectedAnswer = newAnswer.trim();
    editableAnswers.value[index].isManuallyEdited = true;
    editableAnswers.value[index].confidence = 1.0; // High confidence for manual edits
  }
};

/**
 * Add new question/answer
 */
const addNewAnswer = () => {
  const newQuestionNumber = Math.max(...editableAnswers.value.map(a => a.questionNumber), 0) + 1;
  editableAnswers.value.push({
    questionNumber: newQuestionNumber,
    selectedAnswer: '',
    confidence: 1.0,
    alternatives: [],
    isManuallyEdited: true
  });
};

/**
 * Remove answer
 */
const removeAnswer = (index: number) => {
  editableAnswers.value.splice(index, 1);
};

/**
 * Validate if answer has content
 */
const hasValidAnswer = (answer: string): boolean => {
  return typeof answer === 'string' && answer.trim().length > 0;
};

/**
 * Submit edited answers
 */
const handleSubmit = async () => {
  try {
    isSubmitting.value = true;

    // Validate required fields
    if (!studentName.value || studentName.value.trim() === '') {
      console.error('Student Name is required');
      isSubmitting.value = false;
      return;
    }

    if (!studentId.value || studentId.value.trim() === '') {
      console.error('Student ID is required');
      isSubmitting.value = false;
      return;
    }

    // Validate that we have answers
    if (editableAnswers.value.length === 0) {
      console.error('No answers to submit');
      isSubmitting.value = false;
      return;
    }

    // Validate answers
    const unansweredQuestions = editableAnswers.value.filter(answer =>
      !hasValidAnswer(answer.selectedAnswer)
    );

    if (unansweredQuestions.length > 0) {
      const proceed = confirm(
        `${unansweredQuestions.length} questions are unanswered. Do you want to proceed?`
      );
      if (!proceed) {
        isSubmitting.value = false;
        return;
      }
    }

    // Prepare submission data
    const submissionData = {
      studentName: studentName.value.trim(),
      studentId: studentId.value.trim(),
      answers: editableAnswers.value,
      metadata: {
        totalQuestions: totalQuestions.value,
        answeredQuestions: answeredQuestions.value,
        submissionTime: new Date().toISOString(),
        hasManualEdits: editableAnswers.value.some(a => a.isManuallyEdited)
      }
    };

    console.log('📤 Submitting student answers:', submissionData);

    emit('submit', submissionData);
    handleClose();

  } catch (error) {
    console.error('Error submitting answers:', error);
  } finally {
    isSubmitting.value = false;
  }
};

/**
 * Handle dialog close
 */
const handleClose = () => {
  emit('update:modelValue', false);
};

// Helper functions are imported from utils

/**
 * Watch for prop changes
 */
watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    initializeAnswers();
  }
});

watch(() => props.extractedAnswers, () => {
  if (props.modelValue) {
    initializeAnswers();
  }
});
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    max-width="900"
    persistent
    scrollable
  >
    <v-card>
      <v-card-title class="d-flex align-center pa-4 bg-primary">
        <v-icon left color="white">mdi-pencil-box-multiple</v-icon>
        <span class="text-white">Edit Extracted Text Answers - {{ quizTitle }}</span>
        <v-spacer />
        <v-btn
          icon
          variant="text"
          size="small"
          color="white"
          @click="handleClose"
        >
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <v-divider />

      <!-- Student Information -->
      <v-card-text class="pa-4">
        <v-row class="mb-4">
          <v-col cols="12" md="6">
            <v-text-field
              v-model="studentName"
              label="Student Name *"
              prepend-icon="mdi-account"
              variant="outlined"
              density="comfortable"
              required
              :rules="[v => !!v || 'Student name is required']"
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="studentId"
              label="Student ID *"
              prepend-icon="mdi-card-account-details"
              variant="outlined"
              density="comfortable"
              required
              :rules="[v => !!v || 'Student ID is required']"
            />
          </v-col>
        </v-row>

        <!-- Summary Stats -->
        <v-card variant="tonal" class="mb-4">
          <v-card-text class="pa-3">
            <v-row>
              <v-col cols="4" class="text-center">
                <div class="text-h4 text-primary">{{ totalQuestions }}</div>
                <div class="text-caption text-medium-emphasis">Total Questions</div>
              </v-col>
              <v-col cols="4" class="text-center">
                <div class="text-h4 text-success">{{ answeredQuestions }}</div>
                <div class="text-caption text-medium-emphasis">Answered</div>
              </v-col>
              <v-col cols="4" class="text-center">
                <div class="text-h4 text-warning">{{ totalQuestions - answeredQuestions }}</div>
                <div class="text-caption text-medium-emphasis">Remaining</div>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <!-- Answers Grid -->
        <v-card variant="outlined" v-if="editableAnswers.length > 0">
          <v-card-title class="pa-3">
            <span>Extracted Text Answers</span>
            <v-spacer />
            <v-btn
              color="primary"
              variant="outlined"
              size="small"
              @click="addNewAnswer"
              prepend-icon="mdi-plus"
            >
              Add Question
            </v-btn>
          </v-card-title>

          <v-divider />

          <div class="answers-container" style="max-height: 400px; overflow-y: auto;">
            <v-list>
              <v-list-item
                v-for="(answer, index) in editableAnswers"
                :key="`question-${answer.questionNumber}`"
                class="answer-item"
              >
                <template #prepend>
                  <v-avatar
                    :color="hasValidAnswer(answer.selectedAnswer) ? 'primary' : 'grey-lighten-2'"
                    size="32"
                  >
                    <span class="text-body-2">{{ answer.questionNumber }}</span>
                  </v-avatar>
                </template>

                <v-list-item-title>
                  <v-row no-gutters class="align-center">
                    <v-col cols="2">
                      <!-- Question Number Input -->
                      <v-text-field
                        v-model.number="answer.questionNumber"
                        label="Q#"
                        type="number"
                        variant="outlined"
                        density="compact"
                        hide-details
                      />
                    </v-col>
                    <v-col cols="7" class="px-2">
                      <!-- Answer Input -->
                      <v-text-field
                        :model-value="answer.selectedAnswer"
                        @update:model-value="updateAnswer(index, $event)"
                        label="Answer"
                        variant="outlined"
                        density="compact"
                        hide-details
                        placeholder="Enter full word answer..."
                      />
                    </v-col>
                    <v-col cols="3" class="d-flex align-center gap-2">
                      <!-- Manual Edit Indicator -->
                      <v-icon
                        v-if="answer.isManuallyEdited"
                        color="primary"
                        size="small"
                      >
                        mdi-pencil
                      </v-icon>

                      <!-- Alternative Answers -->
                      <v-tooltip v-if="answer.alternatives && answer.alternatives.length > 0">
                        <template #activator="{ props: tooltipProps }">
                          <v-chip
                            v-bind="tooltipProps"
                            color="info"
                            size="small"
                            variant="outlined"
                          >
                            Alt: {{ answer.alternatives.join(', ') }}
                          </v-chip>
                        </template>
                        <span>Alternative answers detected</span>
                      </v-tooltip>
                    </v-col>
                  </v-row>
                </v-list-item-title>

                <template #append>
                  <v-btn
                    icon
                    variant="text"
                    size="small"
                    color="error"
                    @click="removeAnswer(index)"
                  >
                    <v-icon>mdi-delete</v-icon>
                  </v-btn>
                </template>
              </v-list-item>
            </v-list>
          </div>
        </v-card>

        <!-- No Answers Message -->
        <v-card v-else variant="outlined" class="text-center pa-8">
          <v-icon size="64" color="grey">mdi-help-circle-outline</v-icon>
          <div class="text-h6 mt-4 mb-2">No text answers detected</div>
          <div class="text-body-2 text-medium-emphasis mb-4">
            The system couldn't extract any written answers from the image.
          </div>
          <v-btn
            color="primary"
            variant="flat"
            @click="addNewAnswer"
            prepend-icon="mdi-plus"
          >
            Add Answer Manually
          </v-btn>
        </v-card>


      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-btn
          variant="outlined"
          @click="handleClose"
          :disabled="isSubmitting"
        >
          Cancel
        </v-btn>
        <v-spacer />
        <v-btn
          color="primary"
          variant="flat"
          @click="handleSubmit"
          :loading="isSubmitting"
          prepend-icon="mdi-check"
        >
          Submit Answers
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.answers-container {
  border-radius: 0;
}

.answer-item {
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
}

.answer-item:last-child {
  border-bottom: none;
}

.gap-3 {
  gap: 12px;
}
</style>
