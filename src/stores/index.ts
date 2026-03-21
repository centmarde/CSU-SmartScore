// Utilities
import { createPinia } from 'pinia'

// Re-export stores for easier imports
export { useStudentQuizStore } from './studentQuiz'
export { useAnswerKeysStore } from './answerKeysData'
export { useAuthUserStore } from './authUser'

export default createPinia()
