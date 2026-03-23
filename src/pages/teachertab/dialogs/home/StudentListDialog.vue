<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useStudentsStore, type Student } from '@/stores/studentsData'
import { type AnswerKey } from '@/stores/answerKeysData'
import { getScoreColor, formatDate } from '@/pages/student/utils/helpers'

// Props
interface Props {
  modelValue: boolean
  quiz: AnswerKey | null
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const studentsStore = useStudentsStore()

// Local state
const search = ref('')
const sortBy = ref<'score' | 'name'>('score')
const sortOrder = ref<'asc' | 'desc'>('desc')

// Computed properties
const dialogValue = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
})

const loading = computed(() => studentsStore.loading)

const studentsForQuiz = computed(() => {
  const quizId = props.quiz?.id
  if (!quizId) return []
  return studentsStore.students.filter(student => student.answer_key_id === quizId)
})

const sortedStudents = computed(() => {
  let students = [...studentsForQuiz.value]

  // Apply search filter
  if (search.value) {
    const searchTerm = search.value.toLowerCase()
    students = students.filter(student =>
      student.fullname.toLowerCase().includes(searchTerm) ||
      student.student_id.toLowerCase().includes(searchTerm)
    )
  }

  // Apply sorting
  students.sort((a, b) => {
    if (sortBy.value === 'score') {
      const scoreA = a.score ?? -1
      const scoreB = b.score ?? -1
      return sortOrder.value === 'desc' ? scoreB - scoreA : scoreA - scoreB
    } else {
      const nameA = a.fullname.toLowerCase()
      const nameB = b.fullname.toLowerCase()
      const comparison = nameA.localeCompare(nameB)
      return sortOrder.value === 'desc' ? -comparison : comparison
    }
  })

  return students
})

const quizStatistics = computed(() => {
  const students = studentsForQuiz.value
  const gradedStudents = students.filter(s => s.score !== null)
  const scores = gradedStudents.map(s => s.score!).filter(s => s >= 0)

  if (scores.length === 0) {
    return {
      totalStudents: students.length,
      gradedStudents: 0,
      averageScore: 0,
      highestScore: 0,
      lowestScore: 0,
      passRate: 0
    }
  }

  const average = scores.reduce((sum, score) => sum + score, 0) / scores.length
  const highest = Math.max(...scores)
  const lowest = Math.min(...scores)
  const passCount = scores.filter(score => score >= 75).length
  const passRate = (passCount / scores.length) * 100

  return {
    totalStudents: students.length,
    gradedStudents: scores.length,
    averageScore: Math.round(average * 100) / 100,
    highestScore: highest,
    lowestScore: lowest,
    passRate: Math.round(passRate * 100) / 100
  }
})

// Methods - using imported utility functions

const getScoreText = (score: number | null) => {
  if (score === null || score === undefined) return 'Not Graded'
  return `${score}%`
}

const getRankSuffix = (rank: number) => {
  if (rank === 1) return 'st'
  if (rank === 2) return 'nd'
  if (rank === 3) return 'rd'
  return 'th'
}

const getStudentRank = (student: Student) => {
  if (student.score === null || student.score === undefined) return null
  const rankedStudents = studentsForQuiz.value
    .filter(s => s.score !== null && s.score !== undefined)
    .sort((a, b) => (b.score || 0) - (a.score || 0))

  return rankedStudents.findIndex(s => s.id === student.id) + 1
}

const isTopPerformer = (student: Student) => {
  const rank = getStudentRank(student)
  return rank !== null && rank <= 3
}

const toggleSort = (field: 'score' | 'name') => {
  if (sortBy.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = field
    sortOrder.value = field === 'score' ? 'desc' : 'asc'
  }
}

const closeDialog = () => {
  dialogValue.value = false
  search.value = ''
  sortBy.value = 'score'
  sortOrder.value = 'desc'
}

// Watch for dialog close
watch(() => props.modelValue, (newValue) => {
  if (!newValue) {
    search.value = ''
  }
})
</script>

<template>
  <v-dialog
    v-model="dialogValue"
    max-width="900px"
    scrollable
    @click:outside="closeDialog"
  >
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <div>
          <v-icon class="mr-2" color="primary">mdi-account-group</v-icon>
          Student Results
          <div class="text-subtitle-2 text-grey mt-1">
            {{ quiz?.title || 'Quiz' }}
          </div>
        </div>
        <v-btn
          icon="mdi-close"
          variant="text"
          @click="closeDialog"
        />
      </v-card-title>

      <v-divider />

      <!-- Statistics Cards -->
      <v-card-text class="pb-0">
        <v-row class="mb-4">
          <v-col cols="6" md="3">
            <v-card variant="tonal" color="primary">
              <v-card-text class="text-center">
                <div class="text-h4 font-weight-bold">{{ quizStatistics.totalStudents }}</div>
                <div class="text-caption">Total Students</div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="6" md="3">
            <v-card variant="tonal" color="success">
              <v-card-text class="text-center">
                <div class="text-h4 font-weight-bold">{{ quizStatistics.gradedStudents }}</div>
                <div class="text-caption">Graded</div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="6" md="3">
            <v-card variant="tonal" color="info">
              <v-card-text class="text-center">
                <div class="text-h4 font-weight-bold">{{ quizStatistics.averageScore }}%</div>
                <div class="text-caption">Average Score</div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="6" md="3">
            <v-card variant="tonal" color="warning">
              <v-card-text class="text-center">
                <div class="text-h4 font-weight-bold">{{ quizStatistics.passRate }}%</div>
                <div class="text-caption">Pass Rate (≥75%)</div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-card-text>

      <!-- Search and Sort Controls -->
      <v-card-text>
        <v-row class="mb-4">
          <v-col cols="12" md="6">
            <v-text-field
              v-model="search"
              label="Search students..."
              prepend-inner-icon="mdi-magnify"
              variant="outlined"
              density="compact"
              clearable
              hide-details
            />
          </v-col>
          <v-col cols="12" md="6">
            <div class="d-flex align-center justify-end gap-2">
              <v-chip
                label
                :color="sortBy === 'score' ? 'primary' : 'default'"
                @click="toggleSort('score')"
                clickable
              >
                Sort by Score
                <v-icon
                  v-if="sortBy === 'score'"
                  :icon="sortOrder === 'desc' ? 'mdi-arrow-down' : 'mdi-arrow-up'"
                  end
                />
              </v-chip>
              <v-chip
                label
                :color="sortBy === 'name' ? 'primary' : 'default'"
                @click="toggleSort('name')"
                clickable
              >
                Sort by Name
                <v-icon
                  v-if="sortBy === 'name'"
                  :icon="sortOrder === 'desc' ? 'mdi-arrow-down' : 'mdi-arrow-up'"
                  end
                />
              </v-chip>
            </div>
          </v-col>
        </v-row>
      </v-card-text>

      <!-- Students List -->
      <v-card-text style="max-height: 500px;" class="overflow-y-auto">
        <div v-if="loading" class="text-center py-4">
          <v-progress-circular indeterminate color="primary" />
          <div class="mt-2 text-body-2">Loading students...</div>
        </div>

        <div v-else-if="sortedStudents.length === 0" class="text-center py-8">
          <v-icon size="64" color="grey-lighten-1" class="mb-4">
            mdi-account-off
          </v-icon>
          <h3 class="text-h6 mb-2">No Students Found</h3>
          <p class="text-body-2 text-grey">
            {{ search ? 'No students match your search criteria' : 'No students have taken this quiz yet' }}
          </p>
        </div>

        <v-list v-else class="pa-0">
          <v-list-item
            v-for="(student, index) in sortedStudents"
            :key="student.id"
            class="student-item"
            :class="{ 'top-performer': isTopPerformer(student) }"
          >
            <template v-slot:prepend>
              <v-avatar
                :color="getScoreColor(student.score)"
                class="mr-3"
              >
                <span v-if="getStudentRank(student)" class="text-white font-weight-bold">
                  {{ getStudentRank(student) }}
                </span>
                <v-icon v-else color="white">mdi-account</v-icon>
              </v-avatar>
            </template>

            <v-list-item-title class="font-weight-medium">
              {{ student.fullname }}
              <v-chip
                v-if="isTopPerformer(student)"
                size="x-small"
                :color="getStudentRank(student) === 1 ? 'gold' : getStudentRank(student) === 2 ? 'grey' : '#CD7F32'"
                class="ml-2"
              >
                {{ getStudentRank(student) }}{{ getRankSuffix(getStudentRank(student) || 0) }}
              </v-chip>
            </v-list-item-title>

            <v-list-item-subtitle>
              ID: {{ student.student_id }}
              <span v-if="student.remarks" class="ml-2">• {{ student.remarks }}</span>
            </v-list-item-subtitle>

            <template v-slot:append>
              <v-chip
                :color="getScoreColor(student.score)"
                variant="flat"
                size="large"
                class="font-weight-bold"
              >
                {{ getScoreText(student.score) }}
              </v-chip>
            </template>
          </v-list-item>
        </v-list>
      </v-card-text>

      <v-divider />

      <v-card-actions class="justify-end">
        <v-btn
          variant="outlined"
          @click="closeDialog"
        >
          Close
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.student-item {
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  transition: background-color 0.2s ease;
}

.student-item:hover {
  background-color: rgba(0, 0, 0, 0.04);
}

.top-performer {
  background-color: rgba(255, 193, 7, 0.1);
}

.top-performer:hover {
  background-color: rgba(255, 193, 7, 0.2);
}
</style>
