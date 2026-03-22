<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useDisplay } from 'vuetify'
import { useAnswerKeysStore, type AnswerKey } from '@/stores/answerKeysData'
import { useStudentsStore } from '@/stores/studentsData'
import StudentListDialog from '../dialogs/home/StudentListDialog.vue'
import QrDialog from '../dialogs/home/QrDialog.vue'

const answerKeysStore = useAnswerKeysStore()
const studentsStore = useStudentsStore()
const { mobile } = useDisplay()

// Dialog state
const showStudentListDialog = ref(false)
const showQrDialog = ref(false)
const selectedQuiz = ref<AnswerKey | null>(null)

// View mode state
const viewMode = ref<'table' | 'card'>('card')

// Search and pagination
const search = ref('')
const itemsPerPage = ref(10)

// Computed properties
const loading = computed(() => answerKeysStore.loading || studentsStore.loading)
const quizzes = computed(() => answerKeysStore.answerKeys)

// Get student count for each quiz
const getStudentCount = (quizId: number | undefined) => {
  if (!quizId) return 0
  return studentsStore.students.filter(student => student.answer_key_id === quizId).length
}

// Handle student list dialog
const handleViewStudents = async (quiz: AnswerKey) => {
  if (!quiz.id) return
  selectedQuiz.value = quiz
  // Fetch students for this specific quiz
  await studentsStore.fetchStudentsByAnswerKey(quiz.id)
  showStudentListDialog.value = true
}

// Handle QR dialog
const handleViewQr = (quiz: AnswerKey) => {
  selectedQuiz.value = quiz
  showQrDialog.value = true
}

const formatDate = (dateString: string | undefined) => {
  if (!dateString) return 'Unknown'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const getStatusColor = (isActive: boolean) => {
  return isActive ? 'success' : 'error'
}

const getStatusText = (isActive: boolean) => {
  return isActive ? 'Active' : 'Inactive'
}

// Lifecycle
onMounted(async () => {
  await answerKeysStore.fetchAnswerKeys()
  await studentsStore.fetchStudents()
})
</script>

<template>
  <v-container fluid class="pa-6">
    <v-card-title class="text-h5 font-weight-bold d-flex align-center justify-space-between my-5">
      <div>
        <v-icon class="mr-2" color="primary">mdi-quiz</v-icon>
        Quiz Overview
      </div>
      <v-btn
        variant="outlined"
        @click="answerKeysStore.fetchAnswerKeys(); studentsStore.fetchStudents()"
        prepend-icon="mdi-refresh"
        :loading="loading"
      >
        Refresh
      </v-btn>
    </v-card-title>

    <v-card-text>
      <div class="text-subtitle-1 mb-4">
        Overview of all your quizzes and student participation
      </div>

      <!-- Search -->
      <v-row class="mb-4">
        <v-col cols="12" md="6">
          <v-text-field
            v-model="search"
            label="Search quizzes..."
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            density="compact"
            clearable
            hide-details
          />
        </v-col>
      </v-row>

      <!-- Loading state -->
      <v-row v-if="loading" class="mb-4">
        <v-col cols="12">
          <v-skeleton-loader type="card" />
        </v-col>
      </v-row>

      <!-- Empty state -->
      <v-row v-else-if="quizzes.length === 0" class="mb-4">
        <v-col cols="12">
          <v-card class="text-center pa-8">
            <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-quiz</v-icon>
            <h3 class="text-h6 mb-2">No Quizzes Found</h3>
            <p class="text-body-2 text-grey">Create your first quiz to get started</p>
          </v-card>
        </v-col>
      </v-row>

      <!-- Quiz Cards -->
      <v-row v-else>
        <v-col
          v-for="quiz in quizzes.filter(q =>
            !search || q.title.toLowerCase().includes(search.toLowerCase()) ||
            (q.description && q.description.toLowerCase().includes(search.toLowerCase()))
          )"
          :key="quiz.id"
          cols="12"
          md="6"
          lg="4"
        >
          <v-card class="quiz-card" elevation="2" hover>
            <v-card-title class="d-flex align-center justify-space-between">
              <div class="text-truncate">{{ quiz.title }}</div>
              <v-chip
                :color="getStatusColor(quiz.is_active)"
                size="small"
                variant="flat"
              >
                {{ getStatusText(quiz.is_active) }}
              </v-chip>
            </v-card-title>

            <v-card-subtitle v-if="quiz.description" class="text-wrap">
              {{ quiz.description }}
            </v-card-subtitle>

            <v-card-text>
              <div class="d-flex align-center justify-space-between mb-3">
                <div class="text-caption text-grey">
                  Created: {{ formatDate(quiz.created_at) }}
                </div>
              </div>

              <!-- Student Count with Click Action -->
              <div class="d-flex align-center justify-center">
                <v-btn
                  :color="getStudentCount(quiz.id) > 0 ? 'primary' : 'grey'"
                  variant="tonal"
                  size="large"
                  class="student-count-btn"
                  @click="handleViewStudents(quiz)"
                  :disabled="getStudentCount(quiz.id) === 0"
                >
                  <v-icon start>mdi-account-group</v-icon>
                  <span class="text-h6 font-weight-bold">{{ getStudentCount(quiz.id) }}</span>
                  <span class="ml-1">{{ getStudentCount(quiz.id) === 1 ? 'Student' : 'Students' }}</span>
                </v-btn>
              </div>
            </v-card-text>

            <v-card-actions class="pt-0">
              <v-btn
                variant="text"
                size="small"
                prepend-icon="mdi-qrcode"
                @click="handleViewQr(quiz)"
              >
                View QR
              </v-btn>
              <v-spacer />
              <v-btn
                variant="text"
                size="small"
                color="primary"
                @click="handleViewStudents(quiz)"
                :disabled="getStudentCount(quiz.id) === 0"
              >
                View Results
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-col>
      </v-row>
    </v-card-text>

    <!-- Student List Dialog -->
    <StudentListDialog
      v-model="showStudentListDialog"
      :quiz="selectedQuiz"
    />

    <!-- QR Dialog -->
    <QrDialog
      v-model="showQrDialog"
      :quiz="selectedQuiz"
    />
  </v-container>
</template>

<style scoped>
.quiz-card {
  transition: transform 0.2s ease-in-out;
}

.quiz-card:hover {
  transform: translateY(-2px);
}

.student-count-btn {
  width: 100%;
  min-height: 60px;
  border-radius: 12px;
}

.student-count-btn:disabled {
  opacity: 0.6;
}
</style>
