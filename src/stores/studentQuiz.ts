import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useAnswerKeysStore } from './answerKeysData';
import type { AnswerKey } from './answerKeysData';

/**
 * Interface for student answer
 */
interface StudentAnswer {
    questionNumber: number;
    selectedAnswer: string;
    confidence: number;
    alternatives?: string[];
    isManuallyEdited?: boolean;
}

/**
 * Interface for answer comparison result
 */
interface AnswerComparison {
    questionNumber: number;
    studentAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    points: number;
}

/**
 * Pinia Store for student quiz functionality
 * This store manages the student's interaction with quizzes
 */
export const useStudentQuizStore = defineStore('studentQuiz', () => {
    // Store references
    const answerKeysStore = useAnswerKeysStore();

    // State
    const currentQuiz = ref<AnswerKey | null>(null);
    const scannedAnswers = ref<any[]>([]);
    const isSubmitting = ref(false);
    const submissionResult = ref<{ success: boolean; message: string } | null>(null);

    // Computed
    const isQuizLoaded = computed(() => currentQuiz.value !== null);
    const isQuizActive = computed(() => currentQuiz.value?.is_active || false);
    const canSubmitAnswers = computed(() =>
        isQuizLoaded.value &&
        isQuizActive.value &&
        !isSubmitting.value &&
        scannedAnswers.value.length > 0
    );

    /**
     * Load a quiz by ID for student view
     */
    const loadQuiz = async (quizId: string) => {
        const { data, error } = await answerKeysStore.fetchAnswerKeyById(quizId);

        if (data && !error) {
            currentQuiz.value = data;
            // Clear previous state when loading new quiz
            scannedAnswers.value = [];
            submissionResult.value = null;
        }

        return { data, error };
    };

    /**
     * Clear current quiz state
     */
    const clearQuiz = () => {
        currentQuiz.value = null;
        scannedAnswers.value = [];
        submissionResult.value = null;
        isSubmitting.value = false;
    };

    /**
     * Add scanned answer data
     */
    const addScannedAnswers = (answers: any[]) => {
        scannedAnswers.value = [...answers];
    };

    /**
     * Submit scanned answers
     * TODO: Implement submission logic
     */
    const submitAnswers = async () => {
        if (!canSubmitAnswers.value) {
            return { success: false, message: 'Cannot submit answers at this time' };
        }

        isSubmitting.value = true;

        try {
            // TODO: Implement actual submission to backend
            // This would involve processing scanned answers, grading, etc.

            // Simulated submission for now
            await new Promise(resolve => setTimeout(resolve, 2000));

            submissionResult.value = {
                success: true,
                message: 'Answers submitted successfully!'
            };

            return submissionResult.value;
        } catch (error) {
            submissionResult.value = {
                success: false,
                message: 'Failed to submit answers. Please try again.'
            };

            return submissionResult.value;
        } finally {
            isSubmitting.value = false;
        }
    };

    /**
     * Compare student answers with the correct answer key
     */
    const compareAnswers = (studentAnswers: StudentAnswer[], answerKeyId: number) => {
        if (!currentQuiz.value || currentQuiz.value.id !== answerKeyId) {
            throw new Error('Quiz not loaded or ID mismatch');
        }

        const answerKey = currentQuiz.value.answer_keys;
        if (!answerKey || !answerKey.questions) {
            throw new Error('Answer key questions not found');
        }

        const comparisons: AnswerComparison[] = [];
        let totalScore = 0;
        const totalQuestions = answerKey.questions.length;

        // Create a map of answer key questions for easy lookup
        const answerKeyMap = new Map();
        answerKey.questions.forEach((question: any) => {
            answerKeyMap.set(question.question_number || question.questionNumber, question.correct_answer);
        });

        // Compare each student answer
        studentAnswers.forEach((studentAnswer) => {
            const correctAnswer = answerKeyMap.get(studentAnswer.questionNumber);

            if (correctAnswer !== undefined) {
                const isCorrect = studentAnswer.selectedAnswer.toUpperCase() === correctAnswer.toUpperCase();
                const points = isCorrect ? 1 : 0;

                comparisons.push({
                    questionNumber: studentAnswer.questionNumber,
                    studentAnswer: studentAnswer.selectedAnswer,
                    correctAnswer: correctAnswer,
                    isCorrect: isCorrect,
                    points: points
                });

                totalScore += points;
            }
        });

        // Calculate percentage score
        const percentageScore = totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 0;

        return {
            comparisons,
            totalScore,
            totalQuestions,
            percentageScore,
            correctAnswers: totalScore,
            incorrectAnswers: totalQuestions - totalScore
        };
    };

    /**
     * Grade student submission
     */
    const gradeStudentSubmission = (studentAnswers: StudentAnswer[], answerKeyId: number) => {
        try {
            const result = compareAnswers(studentAnswers, answerKeyId);

            // Generate remarks based on score
            let remarks = '';
            if (result.percentageScore >= 90) {
                remarks = 'Excellent performance!';
            } else if (result.percentageScore >= 80) {
                remarks = 'Very good work!';
            } else if (result.percentageScore >= 70) {
                remarks = 'Good job!';
            } else if (result.percentageScore >= 60) {
                remarks = 'Satisfactory performance.';
            } else {
                remarks = 'Needs improvement.';
            }

            return {
                score: result.percentageScore,
                remarks,
                totalCorrect: result.correctAnswers,
                totalIncorrect: result.incorrectAnswers,
                totalQuestions: result.totalQuestions,
                comparisons: result.comparisons
            };
        } catch (error) {
            console.error('Error grading submission:', error);
            throw error;
        }
    };

    /**
     * Get quiz info for display
     */
    const getQuizDisplayInfo = () => {
        if (!currentQuiz.value) return null;

        return {
            id: currentQuiz.value.id,
            title: currentQuiz.value.title,
            description: currentQuiz.value.description,
            isActive: currentQuiz.value.is_active,
            qrLink: currentQuiz.value.qr_link,
            answerImageUrl: currentQuiz.value.answer_images
        };
    };

    return {
        // State
        currentQuiz,
        scannedAnswers,
        isSubmitting,
        submissionResult,

        // Computed
        isQuizLoaded,
        isQuizActive,
        canSubmitAnswers,

        // Actions
        loadQuiz,
        clearQuiz,
        addScannedAnswers,
        submitAnswers,
        getQuizDisplayInfo,
        compareAnswers,
        gradeStudentSubmission,
    };
});
