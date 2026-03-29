import type { Ref } from 'vue';
import { createGroqSynonymService } from '@/lib/aiSynonym';

// Camera and media helper functions

/**
 * Start camera stream
 */
export const startCamera = async (
  videoRef: Ref<HTMLVideoElement | null>,
  stream: Ref<MediaStream | null>,
  isCapturing: Ref<boolean>
): Promise<void> => {
  try {
    isCapturing.value = true;
    stream.value = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }, // Use back camera on mobile
      audio: false,
    });

    if (videoRef.value) {
      videoRef.value.srcObject = stream.value;
      await videoRef.value.play();
    }
    console.log('📹 Camera started successfully');
  } catch (error) {
    console.error('Error accessing camera:', error);
    isCapturing.value = false;
  }
};

/**
 * Stop camera stream
 */
export const stopCamera = (
  videoRef: Ref<HTMLVideoElement | null>,
  stream: Ref<MediaStream | null>,
  isCapturing: Ref<boolean>
): void => {
  if (stream.value) {
    stream.value.getTracks().forEach(track => track.stop());
    stream.value = null;
  }
  if (videoRef.value) {
    videoRef.value.srcObject = null;
  }
  isCapturing.value = false;
};

/**
 * Capture photo from camera
 */
export const capturePhoto = (
  videoRef: Ref<HTMLVideoElement | null>,
  canvasRef: Ref<HTMLCanvasElement | null>,
  capturedImage: Ref<Blob | null>,
  previewUrl: Ref<string | null>,
  onStopCamera: () => void
): void => {
  if (!videoRef.value || !canvasRef.value) return;

  const video = videoRef.value;
  const canvas = canvasRef.value;

  // Set canvas dimensions to match video
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  // Draw video frame to canvas
  const context = canvas.getContext('2d');
  if (context) {
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to blob
    canvas.toBlob((blob) => {
      if (blob) {
        capturedImage.value = blob;

        // Create preview URL
        if (previewUrl.value) {
          URL.revokeObjectURL(previewUrl.value);
        }
        previewUrl.value = URL.createObjectURL(blob);

        // Stop camera after capture
        onStopCamera();
        console.log('📸 Photo captured successfully');
      }
    }, 'image/jpeg', 0.95);
  }
};

// Answer processing helper functions

/**
 * Extract the actual answer value from complex answer object
 */
export const getAnswerValue = (answer: any): string => {
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
      return answer.selectedAnswer.toString();
    }

    // Try other common properties that might contain the selected answer
    const possibleAnswerProps = [
      'answer', 'value', 'choice', 'selection', 'response', 'option'
    ];

    for (const prop of possibleAnswerProps) {
      if (answer[prop] !== undefined && answer[prop] !== null && answer[prop] !== '') {
        return answer[prop].toString();
      }
    }

    // If it's an array, try to get first element
    if (Array.isArray(answer) && answer.length > 0) {
      return getAnswerValue(answer[0]);
    }

    // Look for any string property that could be an answer (not just A, B, C)
    for (const [key, value] of Object.entries(answer)) {
      if (typeof value === 'string' && value.trim() !== '' && key !== 'confidence' && key !== 'questionNumber') {
        return value.toString();
      }
    }

    // If we can't find anything meaningful, return a fallback
    console.warn('Could not extract answer from:', answer);
    return 'Unable to extract';
  }

  return 'No Answer';
};

/**
 * Initialize editable answers from extracted data
 */
export const initializeAnswersFromExtractedData = (extractedAnswers: any): any[] => {
  if (!extractedAnswers) return [];

  console.log('🔍 Initializing answers with data:', extractedAnswers);

  // Handle different response formats
  let answersData = extractedAnswers;
  let parsedAnswers = [];

  // Check for different possible structures
  if (answersData.answers && Array.isArray(answersData.answers)) {
    parsedAnswers = answersData.answers;
  } else if (answersData.questions && Array.isArray(answersData.questions)) {
    parsedAnswers = answersData.questions;
  } else if (Array.isArray(answersData)) {
    parsedAnswers = answersData;
  } else {
    // Try to parse if it's a string
    try {
      const parsed = typeof answersData === 'string' ? JSON.parse(answersData) : answersData;
      if (parsed.answers && Array.isArray(parsed.answers)) {
        parsedAnswers = parsed.answers;
      } else if (parsed.questions && Array.isArray(parsed.questions)) {
        parsedAnswers = parsed.questions;
      } else if (Array.isArray(parsed)) {
        parsedAnswers = parsed;
      }
    } catch (e) {
      console.error('Failed to parse extracted answers:', e);
      parsedAnswers = [];
    }
  }

  console.log('📋 Parsed answers array:', parsedAnswers);

  // Convert parsed data to editable format
  const editableAnswers = parsedAnswers.map((answer: any, index: number) => ({
    questionNumber: answer.question_number || answer.questionNumber || index + 1,
    selectedAnswer: (answer.correct_answer || answer.selectedAnswer || '').toString().trim(),
    confidence: answer.confidence || 0.5,
    alternatives: answer.alternatives || [],
    isManuallyEdited: false
  }));

  // Sort by question number
  editableAnswers.sort((a: any, b: any) => a.questionNumber - b.questionNumber);

  console.log('✅ Final editable answers:', editableAnswers);
  return editableAnswers;
};

/**
 * Get answer choices based on quiz format
 */
export const getAnswerChoices = (answerKeyData?: any): string[] => {
  // Try to determine from answer key if available
  if (answerKeyData?.questions && answerKeyData.questions.length > 0) {
    const firstQuestion = answerKeyData.questions[0];
    if (firstQuestion.choices && Array.isArray(firstQuestion.choices)) {
      return firstQuestion.choices.map((choice: any, index: number) =>
        String.fromCharCode(65 + index) // A, B, C, D...
      );
    }
  }

  // Default choices
  return ['A', 'B', 'C', 'D'];
};

/**
 * Get correct answer for a specific question from answer key data
 */
export const getCorrectAnswerForQuestion = (
  questionNumber: string | number,
  answerKeyData: any
): string => {
  if (!answerKeyData?.answer_keys?.questions) return 'N/A';

  try {
    const qNum = typeof questionNumber === 'string' ? parseInt(questionNumber) : questionNumber;
    const questions = answerKeyData.answer_keys.questions;

    // Find the question by question_number
    const question = questions.find((q: any) => q.question_number === qNum);

    if (question && question.correct_answer) {
      return question.correct_answer.toString();
    }

    return 'N/A';
  } catch (error) {
    console.error('Error getting correct answer:', error);
    return 'N/A';
  }
};

/**
 * Get CSS class for answer card based on answer properties
 */
export const getAnswerCardClass = (answer: any): string => {
  if (answer?.isManuallyEdited) return 'border-warning';
  if (answer?.confidence && answer.confidence < 0.5) return 'border-error';
  return '';
};

/**
 * Get score text class for Vuetify text colors
 */
export const getScoreTextClass = (score: number | null): string => {
  if (score === null) return 'text-medium-emphasis';
  if (score >= 90) return 'text-green';
  if (score >= 80) return 'text-light-green';
  if (score >= 70) return 'text-orange';
  if (score >= 60) return 'text-deep-orange';
  return 'text-red';
};

/**
 * Get quiz title from answer key ID (helper for teacher components)
 */
export const getQuizTitle = (answerKeyId: number | null, answerKeys: any[]): string => {
  if (!answerKeyId) return 'Unknown Quiz';
  const answerKey = answerKeys.find(key => key.id === answerKeyId);
  return answerKey?.title || `Quiz #${answerKeyId}`;
};

/**
 * Check if student answer is correct (exact match only)
 * For synonym checking, use isAnswerCorrectWithAI instead
 */
export const isAnswerCorrect = (
  studentAnswer: string,
  questionNumber: string | number,
  answerKeyData: any
): boolean => {
  const correctAnswer = getCorrectAnswerForQuestion(questionNumber, answerKeyData);
  if (correctAnswer === 'N/A') return false;

  return studentAnswer.toLowerCase().trim() === correctAnswer.toLowerCase().trim();
};

/**
 * Check if student answer is correct using AI synonym checking
 * This will recognize related answers like 'cleaning', 'sanitizing', 'scrubbing' as correct
 */
export const isAnswerCorrectWithAI = async (
  studentAnswer: string,
  questionNumber: string | number,
  answerKeyData: any
): Promise<{ isCorrect: boolean; confidence: number; explanation: string }> => {
  const correctAnswer = getCorrectAnswerForQuestion(questionNumber, answerKeyData);

  if (correctAnswer === 'N/A') {
    return { isCorrect: false, confidence: 0, explanation: 'No correct answer available' };
  }

  // First check for exact match
  if (studentAnswer.toLowerCase().trim() === correctAnswer.toLowerCase().trim()) {
    return { isCorrect: true, confidence: 1.0, explanation: 'Exact match' };
  }

  // Check if both are single letters (multiple choice A, B, C, D)
  const isMultipleChoice = /^[A-D]$/i.test(studentAnswer.trim()) && /^[A-D]$/i.test(correctAnswer.trim());
  if (isMultipleChoice) {
    // For multiple choice, require exact match
    return { isCorrect: false, confidence: 1.0, explanation: 'Different multiple choice option' };
  }

  // Use AI synonym checking for text-based answers
  try {
    const synonymService = createGroqSynonymService();
    const result = await synonymService.checkSynonym(studentAnswer, correctAnswer);

    return {
      isCorrect: result.areEquivalent,
      confidence: result.confidence,
      explanation: result.explanation
    };
  } catch (error) {
    console.error('Error checking answer with AI:', error);
    // Fallback to exact match on error
    return { isCorrect: false, confidence: 0, explanation: 'AI checking failed, answers do not match exactly' };
  }
};

/**
 * Batch check multiple answers using AI synonym checking
 * More efficient than calling isAnswerCorrectWithAI multiple times
 */
export const batchCheckAnswersWithAI = async (
  answerPairs: Array<{
    questionNumber: number;
    studentAnswer: string;
    correctAnswer: string;
  }>
): Promise<Map<number, { isCorrect: boolean; confidence: number; explanation: string }>> => {
  const results = new Map<number, { isCorrect: boolean; confidence: number; explanation: string }>();

  // Separate multiple choice from text answers
  const textAnswerPairs: typeof answerPairs = [];

  answerPairs.forEach(pair => {
    // Check for exact match first
    if (pair.studentAnswer.toLowerCase().trim() === pair.correctAnswer.toLowerCase().trim()) {
      results.set(pair.questionNumber, {
        isCorrect: true,
        confidence: 1.0,
        explanation: 'Exact match'
      });
      return;
    }

    // Check if it's multiple choice
    const isMultipleChoice = /^[A-D]$/i.test(pair.studentAnswer.trim()) &&
                            /^[A-D]$/i.test(pair.correctAnswer.trim());

    if (isMultipleChoice) {
      results.set(pair.questionNumber, {
        isCorrect: false,
        confidence: 1.0,
        explanation: 'Different multiple choice option'
      });
      return;
    }

    // Add to text answers for AI checking
    textAnswerPairs.push(pair);
  });

  // If there are text answers, use AI batch checking
  if (textAnswerPairs.length > 0) {
    try {
      const synonymService = createGroqSynonymService();
      const aiResults = await synonymService.checkBatchSynonyms(textAnswerPairs);

      aiResults.comparisons.forEach(comparison => {
        results.set(comparison.questionNumber, {
          isCorrect: comparison.areEquivalent,
          confidence: comparison.confidence,
          explanation: comparison.explanation
        });
      });
    } catch (error) {
      console.error('Error in batch AI checking:', error);
      // Add failed results for remaining questions
      textAnswerPairs.forEach(pair => {
        if (!results.has(pair.questionNumber)) {
          results.set(pair.questionNumber, {
            isCorrect: false,
            confidence: 0,
            explanation: 'AI checking failed, answers do not match exactly'
          });
        }
      });
    }
  }

  return results;
};

// File handling helper functions

/**
 * Handle file selection and validation
 */
export const handleFileSelection = (
  file: File,
  onSuccess: (file: File) => void,
  onError: (error: string) => void
): void => {
  // Validate file type
  if (!file.type.startsWith('image/')) {
    onError('Please select an image file');
    return;
  }

  // Validate file size (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    onError('File size must be less than 10MB');
    return;
  }

  onSuccess(file);
  console.log('🖼️ Image selected successfully');
};

/**
 * Handle drag and drop events
 */
export const createDragHandlers = (
  isDragging: Ref<boolean>,
  onFileDrop: (file: File) => void
) => {
  const handleDragOver = (event: DragEvent) => {
    event.preventDefault();
    isDragging.value = true;
  };

  const handleDragLeave = () => {
    isDragging.value = false;
  };

  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    isDragging.value = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      onFileDrop(files[0]);
    }
  };

  return {
    handleDragOver,
    handleDragLeave,
    handleDrop
  };
};
