// Confidence and score helper functions

/**
 * Get confidence color based on confidence level
 */
export const getConfidenceColor = (confidence: number): string => {
  if (confidence >= 0.8) return 'success';
  if (confidence >= 0.5) return 'warning';
  return 'error';
};

/**
 * Get confidence text based on confidence level
 */
export const getConfidenceText = (confidence: number): string => {
  if (confidence >= 0.8) return 'High';
  if (confidence >= 0.5) return 'Medium';
  return 'Low';
};

/**
 * Get score color based on percentage
 */
export const getScoreColor = (score: number | null): string => {
  if (!score) return 'grey';
  if (score >= 90) return 'success';
  if (score >= 80) return 'info';
  if (score >= 70) return 'warning';
  return 'error';
};

/**
 * Get grade letter based on score
 */
export const getGradeLetter = (score: number | null): string => {
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
 * Get answer result color based on correctness
 */
export const getAnswerResultColor = (isCorrect: boolean): string => {
  return isCorrect ? 'success' : 'error';
};

/**
 * Get answer result icon based on correctness
 */
export const getAnswerResultIcon = (isCorrect: boolean): string => {
  return isCorrect ? 'mdi-check-circle' : 'mdi-close-circle';
};

// Utility functions

/**
 * Format date string to locale string
 */
export const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString();
};

/**
 * Validate file type and size for image uploads
 */
export const validateImageFile = (file: File, maxSizeMB: number = 10): { valid: boolean; error?: string } => {
  // Validate file type
  if (!file.type.startsWith('image/')) {
    return { valid: false, error: 'Please select an image file' };
  }

  // Validate file size
  const maxSize = maxSizeMB * 1024 * 1024; // Convert MB to bytes
  if (file.size > maxSize) {
    return { valid: false, error: `File size must be less than ${maxSizeMB}MB` };
  }

  return { valid: true };
};

/**
 * Create object URL and revoke previous one if exists
 */
export const createPreviewUrl = (file: File | Blob, previousUrl?: string | null): string => {
  if (previousUrl) {
    URL.revokeObjectURL(previousUrl);
  }
  return URL.createObjectURL(file);
};

/**
 * Cleanup object URL
 */
export const revokePreviewUrl = (url: string | null): void => {
  if (url) {
    URL.revokeObjectURL(url);
  }
};

/**
 * Check pass status based on score and threshold
 */
export const getPassStatus = (score: number, threshold: number = 75): boolean => {
  return score >= threshold;
};

/**
 * Convert question key to 1-based question number
 */
export const getQuestionNumber = (questionKey: string | number): number => {
  if (typeof questionKey === 'number') {
    return questionKey;
  }
  return parseInt(String(questionKey)) + 1;
};
