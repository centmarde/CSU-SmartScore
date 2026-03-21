<script setup lang="ts">
import { ref, computed } from 'vue';
import { useStudentsStore } from '@/stores/studentsData';
import { useAnswerKeysStore } from '@/stores/answerKeysData';
import type { Student } from '@/stores/studentsData';

// Props
interface Props {
  modelValue: boolean;
  quizTitle?: string;
  answerKeyId?: number;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  quizTitle: 'Quiz',
});

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

// Store
const studentsStore = useStudentsStore();
const answerKeysStore = useAnswerKeysStore();

// State
const searchQuery = ref('');
const isSearching = ref(false);
const searchResults = ref<Student[]>([]);
const hasSearched = ref(false);
const selectedStudent = ref<Student | null>(null);

// Computed
const filteredResults = computed(() => {
  if (!searchQuery.value.trim()) return [];

  return searchResults.value.filter(student =>
    student.student_id.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    student.fullname.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});

const noResultsFound = computed(() =>
  hasSearched.value && filteredResults.value.length === 0
);

/**
 * Search for student records
 */
const searchStudents = async () => {
  if (!searchQuery.value.trim() || !props.answerKeyId) {
    return;
  }

  try {
    isSearching.value = true;
    hasSearched.value = true;

    // Fetch students for this quiz/answer key
    const { data, error } = await studentsStore.fetchStudentsByAnswerKey(props.answerKeyId);

    if (error) {
      console.error('Error fetching students:', error);
      searchResults.value = [];
      return;
    }

    searchResults.value = data || [];
  } catch (error) {
    console.error('Error searching students:', error);
    searchResults.value = [];
  } finally {
    isSearching.value = false;
  }
};

/**
 * View student details
 */
const viewStudent = async (student: Student) => {
  selectedStudent.value = student;
  await fetchAnswerKeyData();
};

/**
 * Close student details
 */
const closeStudentDetails = () => {
  selectedStudent.value = null;
  answerKeyData.value = null;
};

/**
 * Handle dialog close
 */
const handleClose = () => {
  // Reset state
  searchQuery.value = '';
  searchResults.value = [];
  hasSearched.value = false;
  selectedStudent.value = null;
  answerKeyData.value = null;

  emit('update:modelValue', false);
};

/**
 * Get score color based on percentage
 */
const getScoreColor = (score: number | null) => {
  if (!score) return 'grey';
  if (score >= 90) return 'success';
  if (score >= 80) return 'info';
  if (score >= 70) return 'warning';
  return 'error';
};

/**
 * Get grade letter
 */
const getGradeLetter = (score: number | null) => {
  if (!score) return 'N/A';
  if (score >= 97) return 'A+';
  if (score >= 93) return 'A';
  if (score >= 90) return 'A-';
  if (score >= 87) return 'B+';
  if (score >= 83) return 'B';
  if (score >= 80) return 'B-';
  if (score >= 77) return 'C+';
  if (score >= 73) return 'C';
  if (score >= 70) return 'C-';
  if (score >= 67) return 'D+';
  if (score >= 65) return 'D';
  return 'F';
};

/**
 * Format date
 */
const formatDate = (dateString: string | undefined) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString();
};

/**
 * Handle search on enter
 */
const handleSearchEnter = () => {
  searchStudents();
};

/**
 * Get answer result color
 */
const getAnswerResultColor = (isCorrect: boolean) => {
  return isCorrect ? 'success' : 'error';
};

/**
 * Get answer result icon
 */
const getAnswerResultIcon = (isCorrect: boolean) => {
  return isCorrect ? 'mdi-check-circle' : 'mdi-close-circle';
};

/**
 * Get correct answer from answer key data
 */
const getCorrectAnswer = (questionNumber: string | number) => {
  if (!selectedStudent.value?.answer_key_id) return 'N/A';

  try {
    // First fetch the answer key data if we don't have it
    const answerKeyId = selectedStudent.value.answer_key_id;

    // For now, return a placeholder - we'll need to fetch the answer key data
    // This should be the correct answer from the answer_keys table
    return '?'; // Placeholder until we fetch the actual answer key
  } catch (error) {
    console.error('Error getting correct answer:', error);
    return 'N/A';
  }
};

/**
 * Extract the actual answer value from complex answer object
 */
const getAnswerValue = (answer: any) => {
  if (!answer) return 'No Answer';

  // If it's a simple string/number, return it
  if (typeof answer === 'string' || typeof answer === 'number') {
    return answer.toString();
  }

  // If it's an object, try to extract the actual answer
  if (typeof answer === 'object') {
    // Console log to debug the structure
    console.log('Processing answer object:', answer);

    // Try to find selectedAnswer first (most likely property)
    if (answer.selectedAnswer !== undefined && answer.selectedAnswer !== null && answer.selectedAnswer !== '') {
      const val = answer.selectedAnswer;
      console.log('Found selectedAnswer:', val);
      return val.toString(); // Return any selected answer, regardless of length
    }

    // Try other common properties that might contain the selected answer
    const possibleAnswerProps = [
      'selected', 'answer', 'value', 'choice', 'option', 'text', 'letter', 'response'
    ];

    for (const prop of possibleAnswerProps) {
      if (answer[prop] !== undefined && answer[prop] !== null && answer[prop] !== '') {
        const val = answer[prop];

        // Skip confidence values (typically 0.0-1.0)
        if (typeof val === 'number' && val >= 0 && val <= 1) {
          continue;
        }

        // Return any non-confidence value
        if (typeof val === 'string' || (typeof val === 'number' && (val < 0 || val > 1))) {
          console.log(`Found answer in ${prop}:`, val);
          return val.toString();
        }
      }
    }

    // If it's an array, try to get first element
    if (Array.isArray(answer) && answer.length > 0) {
      return getAnswerValue(answer[0]);
    }

    // Look for any string property that could be an answer (not just A, B, C)
    for (const [key, value] of Object.entries(answer)) {
      if (typeof value === 'string' && value.trim() !== '') {
        // Skip known metadata properties
        if (!['confidence', 'alternatives', 'questionNumber', 'isManuallyEdited'].includes(key)) {
          console.log(`Found potential answer in property ${key}:`, value);
          return value;
        }
      }
    }

    // If we can't find anything meaningful, return a fallback
    console.warn('Could not extract answer from:', answer);
    return 'Unable to extract';
  }

  return 'No Answer';
};/**
 * Get answer key data for comparison
 */
const answerKeyData = ref<any>(null);

/**
 * Fetch answer key data when student is selected
 */
const fetchAnswerKeyData = async () => {
  if (!selectedStudent.value?.answer_key_id) return;

  try {
    console.log('Fetching answer key data for ID:', selectedStudent.value.answer_key_id);
    const { data, error } = await answerKeysStore.fetchAnswerKeyById(selectedStudent.value.answer_key_id);

    if (error) {
      console.error('Error fetching answer key:', error);
      return;
    }

    if (data) {
      answerKeyData.value = data;
      console.log('Answer key data loaded successfully:', data);
      console.log('Answer keys structure:', data.answer_keys);
    } else {
      console.warn('No answer key data returned');
    }
  } catch (error) {
    console.error('Error fetching answer key data:', error);
  }
};

/**
 * Get correct answer for a specific question
 */
const getCorrectAnswerForQuestion = (questionNumber: string | number) => {
  if (!answerKeyData.value?.answer_keys) return 'N/A';

  try {
    console.log('Getting correct answer for question:', questionNumber);
    console.log('Answer key data:', answerKeyData.value.answer_keys);

    const answerKeys = answerKeyData.value.answer_keys;

    // Based on the console output, the structure is: answer_keys.questions[index].correct_answer
    if (answerKeys.questions && Array.isArray(answerKeys.questions)) {
      const questionIndex = typeof questionNumber === 'string' ? parseInt(questionNumber) - 1 : questionNumber - 1;

      if (questionIndex >= 0 && questionIndex < answerKeys.questions.length) {
        const question = answerKeys.questions[questionIndex];
        const correctAnswer = question.correct_answer;
        console.log(`Question ${questionNumber} correct answer:`, correctAnswer);
        return correctAnswer || 'N/A';
      }
    }

    // Fallback: check if answers is a simple object with question keys
    if (typeof answerKeys === 'object' && answerKeys[questionNumber]) {
      return answerKeys[questionNumber] || 'N/A';
    }

    // Fallback: check if answers is a simple array
    if (Array.isArray(answerKeys)) {
      const index = typeof questionNumber === 'string' ? parseInt(questionNumber) - 1 : questionNumber - 1;
      return answerKeys[index] || 'N/A';
    }

    console.warn('Could not find answer structure for question:', questionNumber);
    return 'N/A';
  } catch (error) {
    console.error('Error getting correct answer:', error);
    return 'N/A';
  }
};

/**
 * Check if student answer is correct
 */
const isAnswerCorrect = (studentAnswer: string, questionNumber: string | number) => {
  const correctAnswer = getCorrectAnswerForQuestion(questionNumber);
  if (correctAnswer === 'N/A') return false;

  return studentAnswer.toLowerCase().trim() === correctAnswer.toLowerCase().trim();
};

/**
 * Convert question key to 1-based question number
 */
const getQuestionNumber = (questionKey: string | number): number => {
  if (typeof questionKey === 'number') {
    return questionKey + 1;
  }
  return parseInt(String(questionKey)) + 1;
};
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
      <!-- Header -->
      <v-card-title class="d-flex align-center pa-4 bg-primary">
        <v-icon left color="white">mdi-account-search</v-icon>
        <span class="text-white">Search Student Records - {{ quizTitle }}</span>
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

      <v-card-text class="pa-4">
        <!-- Search Section -->
        <v-card variant="outlined" class="mb-4">
          <v-card-text class="pa-4">
            <div class="text-h6 mb-3">
              <v-icon left>mdi-magnify</v-icon>
              Search Student
            </div>

            <v-row>
              <v-col cols="12" md="8">
                <v-text-field
                  v-model="searchQuery"
                  label="Enter Student ID or Name"
                  prepend-inner-icon="mdi-account-search"
                  variant="outlined"
                  density="comfortable"
                  clearable
                  @keyup.enter="handleSearchEnter"
                  :disabled="isSearching"
                />
              </v-col>
              <v-col cols="12" md="4" class="d-flex align-center">
                <v-btn
                  color="primary"
                  variant="flat"
                  @click="searchStudents"
                  :loading="isSearching"
                  :disabled="!searchQuery.trim()"
                  block
                  prepend-icon="mdi-magnify"
                >
                  Search
                </v-btn>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <!-- Search Results -->
        <v-card variant="outlined" v-if="hasSearched">
          <v-card-title class="pa-3">
            <v-icon left>mdi-format-list-bulleted</v-icon>
            Search Results
            <v-spacer />
            <v-chip
              :color="filteredResults.length > 0 ? 'success' : 'error'"
              size="small"
            >
              {{ filteredResults.length }} found
            </v-chip>
          </v-card-title>

          <v-divider />

          <!-- No Results -->
          <div v-if="noResultsFound" class="text-center pa-8">
            <v-icon size="64" color="grey">mdi-account-question</v-icon>
            <div class="text-h6 mt-4 mb-2">No Records Found</div>
            <div class="text-body-2 text-medium-emphasis">
              No student records found for "{{ searchQuery }}" in this quiz.
            </div>
          </div>

          <!-- Results List -->
          <div v-else-if="filteredResults.length > 0" class="results-container" style="max-height: 400px; overflow-y: auto;">
            <v-list>
              <v-list-item
                v-for="student in filteredResults"
                :key="`student-${student.id}`"
                class="result-item"
                @click="viewStudent(student)"
              >
                <template #prepend>
                  <v-avatar :color="getScoreColor(student.score)" size="40">
                    <span class="text-white font-weight-bold">
                      {{ getGradeLetter(student.score) }}
                    </span>
                  </v-avatar>
                </template>

                <v-list-item-title>
                  <div class="d-flex align-center justify-space-between">
                    <div>
                      <div class="text-body-1 font-weight-medium">{{ student.fullname }}</div>
                      <div class="text-body-2 text-medium-emphasis">ID: {{ student.student_id }}</div>
                    </div>
                    <div class="text-right">
                      <v-chip
                        :color="getScoreColor(student.score)"
                        size="small"
                        variant="flat"
                      >
                        {{ student.score ?? 'N/A' }}%
                      </v-chip>
                    </div>
                  </div>
                </v-list-item-title>

                <v-list-item-subtitle>
                  <div class="d-flex align-center justify-space-between mt-1">
                    <span>{{ formatDate(student.created_at) }}</span>
                    <span class="text-caption">{{ student.remarks || 'No remarks' }}</span>
                  </div>
                </v-list-item-subtitle>

                <template #append>
                  <v-btn
                    icon
                    variant="text"
                    size="small"
                    color="primary"
                  >
                    <v-icon>mdi-eye</v-icon>
                  </v-btn>
                </template>
              </v-list-item>
            </v-list>
          </div>
        </v-card>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn
          variant="outlined"
          @click="handleClose"
        >
          Close
        </v-btn>
      </v-card-actions>
    </v-card>

    <!-- Student Details Dialog -->
    <v-dialog
      :model-value="!!selectedStudent"
      @update:model-value="closeStudentDetails"
      max-width="700"
      scrollable
    >
      <v-card v-if="selectedStudent">
        <!-- Header -->
        <v-card-title class="d-flex align-center pa-4" :class="`bg-${getScoreColor(selectedStudent.score)}`">
          <v-icon left color="white">mdi-account-details</v-icon>
          <span class="text-white">Student Record Details</span>
          <v-spacer />
          <v-btn
            icon
            variant="text"
            size="small"
            color="white"
            @click="closeStudentDetails"
          >
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>

        <v-divider />

        <v-card-text class="pa-4">
          <!-- Student Information -->
          <v-card variant="outlined" class="mb-4">
            <v-card-text class="pa-4">
              <div class="text-h6 mb-3">Student Information</div>
              <v-row>
                <v-col cols="12" md="6">
                  <div class="text-subtitle-2 text-medium-emphasis">Full Name</div>
                  <div class="text-h6">{{ selectedStudent.fullname }}</div>
                </v-col>
                <v-col cols="12" md="6">
                  <div class="text-subtitle-2 text-medium-emphasis">Student ID</div>
                  <div class="text-h6">{{ selectedStudent.student_id }}</div>
                </v-col>
                <v-col cols="12" md="6">
                  <div class="text-subtitle-2 text-medium-emphasis">Submission Date</div>
                  <div class="text-body-1">{{ formatDate(selectedStudent.created_at) }}</div>
                </v-col>
                <v-col cols="12" md="6">
                  <div class="text-subtitle-2 text-medium-emphasis">Quiz ID</div>
                  <div class="text-body-1">{{ selectedStudent.answer_key_id }}</div>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>

          <!-- Score Summary -->
          <v-card variant="tonal" :color="getScoreColor(selectedStudent.score)" class="mb-4">
            <v-card-text class="text-center pa-6">
              <div class="d-flex justify-center align-center mb-4">
                <v-avatar :color="getScoreColor(selectedStudent.score)" size="80" class="text-white">
                  <span class="text-h4">{{ getGradeLetter(selectedStudent.score) }}</span>
                </v-avatar>
              </div>

              <div class="text-h3 mb-2" :class="`text-${getScoreColor(selectedStudent.score)}`">
                {{ selectedStudent.score ?? 'N/A' }}%
              </div>

              <div class="text-h6 mb-3">
                {{ selectedStudent.remarks || 'No remarks available' }}
              </div>

              <v-chip
                :color="(selectedStudent.score ?? 0) >= 75 ? 'success' : 'error'"
                variant="flat"
                size="large"
                class="text-white"
              >
                <v-icon left>{{ (selectedStudent.score ?? 0) >= 75 ? 'mdi-check-circle' : 'mdi-close-circle' }}</v-icon>
                {{ (selectedStudent.score ?? 0) >= 75 ? 'PASSED' : 'FAILED' }}
              </v-chip>
            </v-card-text>
          </v-card>

          <!-- Answer Details with Comparison -->
          <v-card variant="outlined" v-if="selectedStudent.answers">
            <v-card-title class="pa-3">
              <v-icon left>mdi-clipboard-text</v-icon>
              Student Answers & Comparison
            </v-card-title>

            <v-divider />

            <div class="results-container" style="max-height: 300px; overflow-y: auto;">
              <v-list density="comfortable">
                <template v-if="typeof selectedStudent.answers === 'object' && selectedStudent.answers !== null">
                  <v-list-item
                    v-for="(answer, questionKey) in selectedStudent.answers"
                    :key="`answer-${questionKey}`"
                    class="result-item"
                  >
                    <template #prepend>
                      <v-avatar
                        color="info"
                        size="32"
                      >
                        <span class="text-white text-caption font-weight-bold">{{ getQuestionNumber(questionKey) }}</span>
                      </v-avatar>
                    </template>

                    <v-list-item-title>
                      <div class="d-flex align-center justify-space-between">
                        <span class="text-body-1">Question {{ getQuestionNumber(questionKey) }}</span>
                        <div class="d-flex gap-2">
                          <v-chip
                            :color="isAnswerCorrect(getAnswerValue(answer), getQuestionNumber(questionKey)) ? 'success' : 'error'"
                            size="small"
                            variant="outlined"
                          >
                            Your Answer: {{ getAnswerValue(answer) }}
                          </v-chip>
                          <v-chip
                            color="primary"
                            size="small"
                            variant="tonal"
                          >
                            Correct: {{ getCorrectAnswerForQuestion(getQuestionNumber(questionKey)) }}
                          </v-chip>
                        </div>
                      </div>
                    </v-list-item-title>

                    <template #append>
                      <v-icon
                        :color="isAnswerCorrect(getAnswerValue(answer), getQuestionNumber(questionKey)) ? 'success' : 'error'"
                        :icon="isAnswerCorrect(getAnswerValue(answer), getQuestionNumber(questionKey)) ? 'mdi-check-circle' : 'mdi-close-circle'"
                      />
                    </template>
                  </v-list-item>
                </template>

                <!-- Fallback for array format -->
                <template v-else-if="Array.isArray(selectedStudent.answers)">
                  <v-list-item
                    v-for="(answer, index) in selectedStudent.answers"
                    :key="`answer-${index}`"
                    class="result-item"
                  >
                    <template #prepend>
                      <v-avatar
                        color="info"
                        size="32"
                      >
                        <span class="text-white text-caption font-weight-bold">{{ index + 1 }}</span>
                      </v-avatar>
                    </template>

                    <v-list-item-title>
                      <div class="d-flex align-center justify-space-between">
                        <span class="text-body-1">Question {{ index + 1 }}</span>
                        <div class="d-flex gap-2">
                          <v-chip
                            :color="isAnswerCorrect(getAnswerValue(answer), index + 1) ? 'success' : 'error'"
                            size="small"
                            variant="outlined"
                          >
                            Your Answer: {{ getAnswerValue(answer) }}
                          </v-chip>
                          <v-chip
                            color="primary"
                            size="small"
                            variant="tonal"
                          >
                            Correct: {{ getCorrectAnswerForQuestion(index + 1) }}
                          </v-chip>
                        </div>
                      </div>
                    </v-list-item-title>

                    <template #append>
                      <v-icon
                        :color="isAnswerCorrect(getAnswerValue(answer), index + 1) ? 'success' : 'error'"
                        :icon="isAnswerCorrect(getAnswerValue(answer), index + 1) ? 'mdi-check-circle' : 'mdi-close-circle'"
                      />
                    </template>
                  </v-list-item>
                </template>

                <!-- Fallback for other formats -->
                <template v-else>
                  <v-list-item class="result-item">
                    <template #prepend>
                      <v-avatar
                        color="info"
                        size="32"
                      >
                        <v-icon color="white" size="small">mdi-text</v-icon>
                      </v-avatar>
                    </template>

                    <v-list-item-title>
                      <div class="d-flex align-center justify-space-between">
                        <span class="text-body-1">Student Response</span>
                        <div class="d-flex gap-2">
                          <v-chip
                            color="primary"
                            size="small"
                            variant="outlined"
                          >
                            {{ getAnswerValue(selectedStudent.answers) }}
                          </v-chip>
                        </div>
                      </div>
                    </v-list-item-title>
                  </v-list-item>
                </template>
              </v-list>

              <!-- If no answers at all -->
              <div v-if="!selectedStudent.answers" class="text-center pa-4">
                <v-icon size="48" color="grey">mdi-alert-circle-outline</v-icon>
                <div class="text-body-1 mt-2">No answers recorded for this submission.</div>
              </div>
            </div>
          </v-card>

          <!-- Image -->
          <v-card variant="outlined" v-if="selectedStudent.image_url" class="mt-4">
            <v-card-title class="pa-3">
              <v-icon left>mdi-image</v-icon>
              Submitted Answer Sheet
            </v-card-title>

            <v-divider />

            <v-card-text class="pa-4 text-center">
              <v-img
                :src="selectedStudent.image_url"
                max-height="400"
                class="rounded"
              />
            </v-card-text>
          </v-card>
        </v-card-text>
      </v-card>
    </v-dialog>
  </v-dialog>
</template>

<style scoped>
.results-container {
  border-radius: 0;
}

.result-item {
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
  cursor: pointer;
  transition: background-color 0.2s;
}

.result-item:hover {
  background-color: rgba(0, 0, 0, 0.04);
}

.result-item:last-child {
  border-bottom: none;
}

.gap-2 {
  gap: 0.5rem;
}
</style>
