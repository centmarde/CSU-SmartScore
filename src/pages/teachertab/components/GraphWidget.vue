<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAnswerKeysStore, type AnswerKey } from '@/stores/answerKeysData'
import { useStudentsStore, type Student } from '@/stores/studentsData'
import { getScoreColor } from '@/pages/student/utils/helpers'

const answerKeysStore = useAnswerKeysStore()
const studentsStore = useStudentsStore()

// Chart configuration
const chartType = ref<'bar' | 'line'>('bar')

// Computed properties
const loading = computed(() => answerKeysStore.loading || studentsStore.loading)

// Calculate score statistics for each quiz
const quizStatistics = computed(() => {
  const stats = answerKeysStore.answerKeys.map(quiz => {
    const studentsForQuiz = studentsStore.students.filter(
      student => student.answer_key_id === quiz.id
    )

    const gradedStudents = studentsForQuiz.filter(student => student.score !== null)

    if (gradedStudents.length === 0) {
      return {
        quiz,
        totalStudents: studentsForQuiz.length,
        gradedStudents: 0,
        averageScore: 0,
        scores: [],
        scoreRanges: {
          excellent: 0, // 90-100%
          good: 0,      // 80-89%
          satisfactory: 0, // 70-79%
          needsImprovement: 0 // Below 70%
        }
      }
    }

    const scores = gradedStudents.map(student => student.score!).filter(score => score >= 0)
    const averageScore = scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0

    // Calculate score ranges
    const scoreRanges = {
      excellent: scores.filter(score => score >= 90).length,
      good: scores.filter(score => score >= 80 && score < 90).length,
      satisfactory: scores.filter(score => score >= 70 && score < 80).length,
      needsImprovement: scores.filter(score => score < 70).length
    }

    return {
      quiz,
      totalStudents: studentsForQuiz.length,
      gradedStudents: gradedStudents.length,
      averageScore: Math.round(averageScore * 100) / 100,
      scores,
      scoreRanges
    }
  })

  return stats.filter(stat => stat.totalStudents > 0) // Only show quizzes with students
})

// Overall statistics
const overallStats = computed(() => {
  const allScores = quizStatistics.value.flatMap(stat => stat.scores)

  if (allScores.length === 0) {
    return {
      totalQuizzes: quizStatistics.value.length,
      totalStudents: 0,
      averageScore: 0,
      highestScore: 0,
      lowestScore: 0
    }
  }

  return {
    totalQuizzes: quizStatistics.value.length,
    totalStudents: allScores.length,
    averageScore: Math.round((allScores.reduce((sum, score) => sum + score, 0) / allScores.length) * 100) / 100,
    highestScore: Math.max(...allScores),
    lowestScore: Math.min(...allScores)
  }
})

// Chart data for average scores
const averageScoreChartData = computed(() => {
  return quizStatistics.value.map(stat => ({
    label: stat.quiz.title,
    value: stat.averageScore,
    students: stat.gradedStudents,
    color: getScoreColor(stat.averageScore)
  }))
})

// Chart data for score distribution
const scoreDistributionData = computed(() => {
  const totalExcellent = quizStatistics.value.reduce((sum, stat) => sum + stat.scoreRanges.excellent, 0)
  const totalGood = quizStatistics.value.reduce((sum, stat) => sum + stat.scoreRanges.good, 0)
  const totalSatisfactory = quizStatistics.value.reduce((sum, stat) => sum + stat.scoreRanges.satisfactory, 0)
  const totalNeedsImprovement = quizStatistics.value.reduce((sum, stat) => sum + stat.scoreRanges.needsImprovement, 0)

  return [
    { label: 'Excellent (90-100%)', value: totalExcellent, color: '#4CAF50' },
    { label: 'Good (80-89%)', value: totalGood, color: '#8BC34A' },
    { label: 'Satisfactory (70-79%)', value: totalSatisfactory, color: '#FF9800' },
    { label: 'Needs Improvement (<70%)', value: totalNeedsImprovement, color: '#F44336' }
  ]
})

// Helper functions

const getScoreGrade = (score: number) => {
  if (score >= 90) return 'Excellent'
  if (score >= 80) return 'Good'
  if (score >= 70) return 'Satisfactory'
  return 'Needs Improvement'
}

// Generate arc path for doughnut chart
const generateArcPath = (segment: any, index: number): string => {
  const total = scoreDistributionData.value.reduce((sum: number, item: any) => sum + item.value, 0)
  if (total === 0) return ''

  const percentage = segment.value / total
  const startAngle = scoreDistributionData.value.slice(0, index).reduce((sum: number, item: any) => sum + (item.value / total) * 2 * Math.PI, 0) - Math.PI / 2
  const endAngle = startAngle + percentage * 2 * Math.PI

  const innerRadius = 40
  const outerRadius = 80

  const x1 = Math.cos(startAngle) * outerRadius
  const y1 = Math.sin(startAngle) * outerRadius
  const x2 = Math.cos(endAngle) * outerRadius
  const y2 = Math.sin(endAngle) * outerRadius
  const x3 = Math.cos(endAngle) * innerRadius
  const y3 = Math.sin(endAngle) * innerRadius
  const x4 = Math.cos(startAngle) * innerRadius
  const y4 = Math.sin(startAngle) * innerRadius

  const largeArcFlag = percentage > 0.5 ? 1 : 0

  return `M ${x1} ${y1} A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x4} ${y4} Z`
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
        <v-icon class="mr-2" color="primary">mdi-chart-bar</v-icon>
        Score Analytics
      </div>
      <div class="d-flex align-center gap-2">
        <v-btn-toggle
          v-model="chartType"
          variant="outlined"
          density="compact"
        >
          <v-btn value="bar" size="small">
            <v-icon>mdi-chart-bar</v-icon>
          </v-btn>
          <v-btn value="line" size="small">
            <v-icon>mdi-chart-line</v-icon>
          </v-btn>
        </v-btn-toggle>
        <v-btn
          variant="outlined"
          @click="answerKeysStore.fetchAnswerKeys(); studentsStore.fetchStudents()"
          prepend-icon="mdi-refresh"
          :loading="loading"
          size="small"
        >
          Refresh
        </v-btn>
      </div>
    </v-card-title>

    <v-card-text>
      <!-- Overall Statistics Cards -->
      <v-row class="mb-6">
        <v-col cols="6" md="3">
          <v-card variant="tonal" color="primary" class="text-center pa-4">
            <div class="text-h4 font-weight-bold">{{ overallStats.totalQuizzes }}</div>
            <div class="text-caption">Total Quizzes</div>
          </v-card>
        </v-col>
        <v-col cols="6" md="3">
          <v-card variant="tonal" color="success" class="text-center pa-4">
            <div class="text-h4 font-weight-bold">{{ overallStats.totalStudents }}</div>
            <div class="text-caption">Graded Students</div>
          </v-card>
        </v-col>
        <v-col cols="6" md="3">
          <v-card variant="tonal" color="info" class="text-center pa-4">
            <div class="text-h4 font-weight-bold">{{ overallStats.averageScore }}%</div>
            <div class="text-caption">Overall Average</div>
          </v-card>
        </v-col>
        <v-col cols="6" md="3">
          <v-card variant="tonal" color="warning" class="text-center pa-4">
            <div class="text-h4 font-weight-bold">{{ overallStats.highestScore }}%</div>
            <div class="text-caption">Highest Score</div>
          </v-card>
        </v-col>
      </v-row>

      <!-- Loading State -->
      <v-row v-if="loading" class="mb-4">
        <v-col cols="12">
          <v-skeleton-loader type="card" />
        </v-col>
      </v-row>

      <!-- Empty State -->
      <v-row v-else-if="quizStatistics.length === 0" class="mb-4">
        <v-col cols="12">
          <v-card class="text-center pa-8">
            <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-chart-line</v-icon>
            <h3 class="text-h6 mb-2">No Data Available</h3>
            <p class="text-body-2 text-grey">No quiz data available for analysis</p>
          </v-card>
        </v-col>
      </v-row>

      <!-- Charts -->
      <v-row v-else>
        <!-- Average Scores Chart -->
        <v-col cols="12" lg="8">
          <v-card style="height: 100%;">
            <v-card-title>
              <v-icon class="mr-2" color="primary">mdi-chart-bar</v-icon>
              Average Scores by Quiz
            </v-card-title>
            <v-card-text >
              <!-- Bar Chart Display -->
              <div v-if="chartType === 'bar'">
                <v-container fluid class="pa-4">
                  <!-- Chart Header with Y-axis labels -->
                  <v-row no-gutters>
                    <v-col cols="1" class="d-flex flex-column justify-space-between align-end pr-2" style="height: 280px;">
                      <v-chip size="x-small" variant="text" class="text-caption">100%</v-chip>
                      <v-chip size="x-small" variant="text" class="text-caption">75%</v-chip>
                      <v-chip size="x-small" variant="text" class="text-caption">50%</v-chip>
                      <v-chip size="x-small" variant="text" class="text-caption">25%</v-chip>
                      <v-chip size="x-small" variant="text" class="text-caption">0%</v-chip>
                    </v-col>

                    <v-col cols="11">
                      <!-- Chart Area with Grid -->
                      <v-card
                        variant="outlined"
                        class="pa-4 d-flex align-end justify-space-around"
                        style="height: 280px; background: repeating-linear-gradient(to top, transparent, transparent 69px, #e0e0e0 69px, #e0e0e0 70px);"
                      >
                        <!-- Bar Items -->
                        <div
                          v-for="(data, index) in averageScoreChartData"
                          :key="index"
                          class="d-flex flex-column align-center"
                          style="flex: 1; max-width: 120px; min-width: 60px;"
                        >
                          <!-- Bar Container -->
                          <div class="d-flex align-end justify-center" style="height: 240px;">
                            <v-sheet
                              :color="data.color"
                              :height="Math.max((data.value / 100) * 240, 8)"
                              width="40"
                              class="rounded-t-lg d-flex align-start justify-center pa-1 elevation-2"
                            >
                              <v-chip
                                size="x-small"
                                :color="data.color"
                                variant="flat"
                                class="text-white font-weight-bold"
                                style="font-size: 10px;"
                              >
                                {{ data.value }}%
                              </v-chip>
                            </v-sheet>
                          </div>
                        </div>
                      </v-card>

                      <!-- Bar Labels (moved outside the chart) -->
                      <div class="d-flex justify-space-around mt-3">
                        <div
                          v-for="(data, index) in averageScoreChartData"
                          :key="index"
                          class="text-center"
                          style="flex: 1; max-width: 120px; min-width: 60px;"
                        >
                          <v-chip size="small" variant="text" class="text-caption font-weight-bold mb-1">
                            {{ data.label }}
                          </v-chip>
                          <br>
                          <v-chip size="x-small" variant="text" color="grey" class="text-caption">
                            {{ data.students }} students
                          </v-chip>
                        </div>
                      </div>
                    </v-col>
                  </v-row>
                </v-container>
              </div>              <!-- Line Chart Display -->
              <div v-else-if="chartType === 'line'">
                <v-container fluid class="pa-4">
                  <!-- SVG Line Chart -->
                  <div class="d-flex justify-center">
                    <svg width="100%" height="300" viewBox="0 0 800 300" style="max-width: 800px;">
                      <!-- Grid lines -->
                      <defs>
                        <pattern id="grid" width="80" height="30" patternUnits="userSpaceOnUse">
                          <path d="M 80 0 L 0 0 0 30" fill="none" stroke="#e0e0e0" stroke-width="1"/>
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#grid)" />

                      <!-- Y-axis labels -->
                      <text x="30" y="20" text-anchor="middle" class="chart-label">100%</text>
                      <text x="30" y="95" text-anchor="middle" class="chart-label">75%</text>
                      <text x="30" y="170" text-anchor="middle" class="chart-label">50%</text>
                      <text x="30" y="245" text-anchor="middle" class="chart-label">25%</text>
                      <text x="30" y="290" text-anchor="middle" class="chart-label">0%</text>

                      <!-- Line path -->
                      <polyline
                        :points="averageScoreChartData.map((data, index) =>
                          `${70 + (index * (700 / Math.max(averageScoreChartData.length - 1, 1)))},${280 - (data.value / 100) * 260}`
                        ).join(' ')"
                        fill="none"
                        stroke="#1976d2"
                        stroke-width="3"
                      />

                      <!-- Data points -->
                      <circle
                        v-for="(data, index) in averageScoreChartData"
                        :key="index"
                        :cx="70 + (index * (700 / Math.max(averageScoreChartData.length - 1, 1)))"
                        :cy="280 - (data.value / 100) * 260"
                        r="6"
                        :fill="data.color"
                        stroke="white"
                        stroke-width="2"
                      />
                    </svg>
                  </div>

                  <!-- X-axis labels -->
                  <v-row class="mt-2" justify="space-around">
                    <v-col
                      v-for="(data, index) in averageScoreChartData"
                      :key="index"
                      cols="auto"
                      class="text-center"
                      style="max-width: 80px;"
                    >
                      <v-chip size="small" variant="text" class="text-caption">
                        {{ data.label }}
                      </v-chip>
                    </v-col>
                  </v-row>
                </v-container>
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Score Distribution -->
        <v-col cols="12" lg="4">
          <v-card>
            <v-card-title>
              <v-icon class="mr-2" color="primary">mdi-chart-donut</v-icon>
              Score Distribution
            </v-card-title>
            <v-card-text class="text-center pa-4">
              <!-- Doughnut Chart Display -->
              <v-container fluid class="pa-0">
                <!-- SVG Doughnut Chart -->
                <div class="d-flex justify-center mb-4">
                  <svg width="200" height="200" viewBox="0 0 200 200">
                    <g transform="translate(100,100)">
                      <!-- Create doughnut segments -->
                      <path
                        v-for="(segment, index) in scoreDistributionData"
                        :key="index"
                        :d="generateArcPath(segment, index)"
                        :fill="segment.color"
                        stroke="white"
                        stroke-width="2"
                      />
                    </g>
                    <!-- Center text -->
                    <text x="100" y="95" text-anchor="middle" fill="#666" font-size="12">Total</text>
                    <text x="100" y="115" text-anchor="middle" fill="#333" font-size="16" font-weight="bold">
                      {{ scoreDistributionData.reduce((sum, item) => sum + item.value, 0) }}
                    </text>
                  </svg>
                </div>

                <!-- Legend using Vuetify components -->
                <v-list class="bg-transparent" density="compact">
                  <v-list-item
                    v-for="(item, index) in scoreDistributionData"
                    :key="index"
                    class="px-0 py-1"
                  >
                    <template v-slot:prepend>
                      <v-sheet
                        :color="item.color"
                        width="16"
                        height="16"
                        class="rounded mr-3 flex-shrink-0"
                      ></v-sheet>
                    </template>

                    <v-list-item-title class="text-caption font-weight-bold">
                      {{ item.label }}
                    </v-list-item-title>

                    <v-list-item-subtitle class="text-caption text-grey">
                      {{ item.value }} students
                    </v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-container>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Quiz Details Table -->
      <v-row v-if="!loading && quizStatistics.length > 0" class="mt-4">
        <v-col cols="12">
          <v-card>
            <v-card-title>
              <v-icon class="mr-2" color="primary">mdi-table</v-icon>
              Quiz Performance Details
            </v-card-title>
            <v-card-text>
              <v-table>
                <thead>
                  <tr>
                    <th>Quiz Title</th>
                    <th>Total Students</th>
                    <th>Graded</th>
                    <th>Average Score</th>
                    <th>Performance</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="stat in quizStatistics" :key="stat.quiz.id">
                    <td class="font-weight-medium">{{ stat.quiz.title }}</td>
                    <td>{{ stat.totalStudents }}</td>
                    <td>{{ stat.gradedStudents }}</td>
                    <td>
                      <v-chip
                        :color="getScoreColor(stat.averageScore)"
                        size="small"
                        variant="flat"
                      >
                        {{ stat.averageScore }}%
                      </v-chip>
                    </td>
                    <td>
                      <v-chip
                        :color="getScoreColor(stat.averageScore)"
                        size="small"
                        variant="outlined"
                      >
                        {{ getScoreGrade(stat.averageScore) }}
                      </v-chip>
                    </td>
                  </tr>
                </tbody>
              </v-table>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-card-text>
  </v-container>
</template>



<style scoped>
.chart-label {
  font-size: 10px;
  fill: #666;
}
</style>
