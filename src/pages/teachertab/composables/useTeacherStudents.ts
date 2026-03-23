import { ref, computed } from 'vue'
import { useStudentsStore, type Student } from '@/stores/studentsData'
import { useAnswerKeysStore, type AnswerKey } from '@/stores/answerKeysData'
import { useAuthUserStore } from '@/stores/authUser'

export interface StudentWithQuizInfo extends Student {
  quiz_title?: string
  quiz_description?: string
}

export interface TeacherStudentsFilters {
  answerKeyId?: number | null
  scoreRange?: 'excellent' | 'good' | 'fair' | 'needs-improvement' | 'below-average' | 'not-graded' | null
  searchQuery?: string
}

export interface TeacherStudentsStats {
  totalStudents: number
  totalAnswerKeys: number
  gradedStudents: number
  averageScore: number
  highestScore: number
  lowestScore: number
  passRate: number
}

export const useTeacherStudents = () => {
  // Stores
  const studentsStore = useStudentsStore()
  const answerKeysStore = useAnswerKeysStore()
  const authStore = useAuthUserStore()

  // State
  const filters = ref<TeacherStudentsFilters>({
    answerKeyId: null,
    scoreRange: null,
    searchQuery: ''
  })

  // Computed - Get answer keys created by current user
  const userAnswerKeys = computed<AnswerKey[]>(() => {
    if (!authStore.userData?.id) return []

    return answerKeysStore.answerKeys.filter(key =>
      key.created_by === authStore.userData?.id
    )
  })

  // Computed - Get students from user's answer keys
  const userStudents = computed<StudentWithQuizInfo[]>(() => {
    const userAnswerKeyIds = userAnswerKeys.value.map(key => key.id).filter(Boolean) as number[]

    return studentsStore.students
      .filter(student =>
        student.answer_key_id && userAnswerKeyIds.includes(student.answer_key_id)
      )
      .map(student => {
        const answerKey = userAnswerKeys.value.find(key => key.id === student.answer_key_id)
        return {
          ...student,
          quiz_title: answerKey?.title,
          quiz_description: answerKey?.description
        }
      })
  })

  // Computed - Filtered students based on current filters
  const filteredStudents = computed<StudentWithQuizInfo[]>(() => {
    let filtered = userStudents.value

    // Filter by answer key
    if (filters.value.answerKeyId) {
      filtered = filtered.filter(student =>
        student.answer_key_id === filters.value.answerKeyId
      )
    }

    // Filter by score range
    if (filters.value.scoreRange) {
      filtered = filtered.filter(student => {
        const score = student.score
        switch (filters.value.scoreRange) {
          case 'excellent':
            return score !== null && score >= 90
          case 'good':
            return score !== null && score >= 80 && score < 90
          case 'fair':
            return score !== null && score >= 70 && score < 80
          case 'needs-improvement':
            return score !== null && score >= 60 && score < 70
          case 'below-average':
            return score !== null && score < 60
          case 'not-graded':
            return score === null
          default:
            return true
        }
      })
    }

    // Filter by search query
    if (filters.value.searchQuery) {
      const query = filters.value.searchQuery.toLowerCase()
      filtered = filtered.filter(student =>
        student.fullname.toLowerCase().includes(query) ||
        student.student_id.toLowerCase().includes(query) ||
        student.quiz_title?.toLowerCase().includes(query)
      )
    }

    return filtered
  })

  // Computed - Statistics
  const stats = computed<TeacherStudentsStats>(() => {
    const students = userStudents.value
    const validScores = students
      .map(s => s.score)
      .filter((score): score is number => score !== null && score !== undefined)

    return {
      totalStudents: students.length,
      totalAnswerKeys: userAnswerKeys.value.length,
      gradedStudents: validScores.length,
      averageScore: validScores.length > 0
        ? validScores.reduce((sum, score) => sum + score, 0) / validScores.length
        : 0,
      highestScore: validScores.length > 0 ? Math.max(...validScores) : 0,
      lowestScore: validScores.length > 0 ? Math.min(...validScores) : 0,
      passRate: validScores.length > 0
        ? (validScores.filter(score => score >= 75).length / validScores.length) * 100
        : 0
    }
  })

  // Computed - Recent students (last 10 submissions)
  const recentStudents = computed<StudentWithQuizInfo[]>(() => {
    return userStudents.value
      .sort((a, b) => {
        const dateA = new Date(a.created_at || 0).getTime()
        const dateB = new Date(b.created_at || 0).getTime()
        return dateB - dateA
      })
      .slice(0, 10)
  })

  // Computed - Top performers (highest scores)
  const topPerformers = computed<StudentWithQuizInfo[]>(() => {
    return userStudents.value
      .filter(student => student.score !== null)
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 10)
  })

  // Computed - Students needing attention (low scores or not graded)
  const studentsNeedingAttention = computed<StudentWithQuizInfo[]>(() => {
    return userStudents.value
      .filter(student =>
        student.score === null || (student.score !== null && student.score < 60)
      )
      .sort((a, b) => {
        // Prioritize ungraded, then lowest scores
        if (a.score === null && b.score !== null) return -1
        if (a.score !== null && b.score === null) return 1
        if (a.score === null && b.score === null) return 0
        return (a.score || 0) - (b.score || 0)
      })
  })

  // Methods
  const fetchAllData = async () => {
    await Promise.all([
      studentsStore.fetchStudents(),
      answerKeysStore.fetchAnswerKeys()
    ])
  }

  const updateStudentScore = async (studentId: number, score: number, remarks?: string) => {
    return await studentsStore.updateStudentScore(studentId, score, remarks)
  }

  const getStudentsByAnswerKey = (answerKeyId: number) => {
    return userStudents.value.filter(student => student.answer_key_id === answerKeyId)
  }

  const getAnswerKeyStats = (answerKeyId: number) => {
    const students = getStudentsByAnswerKey(answerKeyId)
    const validScores = students
      .map(s => s.score)
      .filter((score): score is number => score !== null && score !== undefined)

    return {
      totalStudents: students.length,
      gradedStudents: validScores.length,
      averageScore: validScores.length > 0
        ? validScores.reduce((sum, score) => sum + score, 0) / validScores.length
        : 0,
      highestScore: validScores.length > 0 ? Math.max(...validScores) : 0,
      lowestScore: validScores.length > 0 ? Math.min(...validScores) : 0,
      passRate: validScores.length > 0
        ? (validScores.filter(score => score >= 75).length / validScores.length) * 100
        : 0
    }
  }

  const setFilters = (newFilters: Partial<TeacherStudentsFilters>) => {
    filters.value = { ...filters.value, ...newFilters }
  }

  const clearFilters = () => {
    filters.value = {
      answerKeyId: null,
      scoreRange: null,
      searchQuery: ''
    }
  }

  // Helper functions
  const getScoreColor = (score: number | null): string => {
    if (score === null) return 'grey'
    if (score >= 90) return 'green'
    if (score >= 80) return 'light-green'
    if (score >= 70) return 'orange'
    if (score >= 60) return 'deep-orange'
    return 'red'
  }

  const getScoreLabel = (score: number | null): string => {
    if (score === null) return 'Not Graded'
    if (score >= 90) return 'Excellent'
    if (score >= 80) return 'Good'
    if (score >= 70) return 'Fair'
    if (score >= 60) return 'Needs Improvement'
    return 'Below Average'
  }

  const formatStudentName = (student: StudentWithQuizInfo): string => {
    return `${student.fullname} (${student.student_id})`
  }

  return {
    // State
    filters,

    // Computed
    userAnswerKeys,
    userStudents,
    filteredStudents,
    stats,
    recentStudents,
    topPerformers,
    studentsNeedingAttention,

    // Methods
    fetchAllData,
    updateStudentScore,
    getStudentsByAnswerKey,
    getAnswerKeyStats,
    setFilters,
    clearFilters,

    // Helper functions
    getScoreColor,
    getScoreLabel,
    formatStudentName
  }
}
