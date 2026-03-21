import { ref } from 'vue'
import { createGroqAIService, type GroqAIService } from '@/lib/aiBase'
import { useToast } from 'vue-toastification'

interface ProcessedImageResult {
  answerKeyData: any
  processingTime: number
}

/**
 * Composable for processing images with AI vision analysis
 */
export function useImageProcessor() {
  const toast = useToast()

  // State
  const isProcessing = ref(false)
  const progress = ref(0)
  const currentStatus = ref('')
  const streamingContent = ref('')

  // Services
  let groqService: GroqAIService | null = null

  /**
   * Initialize AI service
   */
  const initializeServices = async (): Promise<void> => {
    try {
      if (!groqService) {
        currentStatus.value = 'Initializing AI service...'
        progress.value = 10
        groqService = createGroqAIService()
      }
    } catch (error) {
      console.error('Error initializing AI service:', error)
      toast.error('Failed to initialize AI service')
      throw error
    }
  }

  /**
   * Convert file to base64 string
   */
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        // Remove data:image/...;base64, prefix
        const base64 = result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = () => reject(new Error('Failed to convert file to base64'))
      reader.readAsDataURL(file)
    })
  }



  /**
   * Process image with Groq AI vision model
   */
  const processImage = async (file: File, useStreaming = false): Promise<ProcessedImageResult> => {
    const startTime = Date.now()

    try {
      isProcessing.value = true
      progress.value = 0
      streamingContent.value = ''

      // Initialize services
      await initializeServices()

      // Convert image to base64 for AI processing
      currentStatus.value = 'Converting image to base64...'
      progress.value = 30

      const imageBase64 = await fileToBase64(file)

      // Process with Groq AI vision model
      currentStatus.value = 'Processing image with AI...'
      progress.value = 50

      let answerKeyData
      try {
        // Use vision model to directly process the image
        answerKeyData = await groqService!.processImageOnly(imageBase64)
      } catch (visionError) {
        console.error('Vision model failed:', visionError)
        throw new Error('Failed to process image with AI vision model')
      }

      progress.value = 100
      currentStatus.value = 'Processing completed successfully!'

      const processingTime = Date.now() - startTime

      toast.success(`Image processed successfully! Found ${answerKeyData.questions?.length || 0} questions`)

      return {
        answerKeyData,
        processingTime
      }

    } catch (error: any) {
      console.error('Image processing error:', error)
      toast.error(`Failed to process image: ${error.message}`)
      throw error
    } finally {
      isProcessing.value = false
      progress.value = 0
      currentStatus.value = ''
      streamingContent.value = ''
    }
  }

  /**
   * Process multiple images sequentially
   */
  const processMultipleImages = async (files: File[]): Promise<ProcessedImageResult[]> => {
    const results: ProcessedImageResult[] = []

    for (let i = 0; i < files.length; i++) {
      try {
        currentStatus.value = `Processing image ${i + 1} of ${files.length}...`
        const result = await processImage(files[i])
        results.push(result)
      } catch (error) {
        console.error(`Error processing image ${i + 1}:`, error)
        // Continue with next image even if one fails
      }
    }

    return results
  }

  /**
   * Validate image processing result
   */
  const validateProcessingResult = (answerKeyData: any): { isValid: boolean; issues: string[] } => {
    const issues: string[] = []
    let isValid = true

    // Check if we have answer key data
    if (!answerKeyData) {
      issues.push('No answer key data was extracted from the image.')
      isValid = false
      return { isValid, issues }
    }

    // Check if we have questions
    if (!answerKeyData.questions || !Array.isArray(answerKeyData.questions)) {
      issues.push('No questions were detected in the image.')
      isValid = false
    } else if (answerKeyData.questions.length === 0) {
      issues.push('No questions were found in the image.')
      isValid = false
    }

    // Check question structure
    if (answerKeyData.questions?.length > 0) {
      const invalidQuestions = answerKeyData.questions.filter((q: any) =>
        !q.question_number || !q.correct_answer
      )

      if (invalidQuestions.length > 0) {
        issues.push(`${invalidQuestions.length} questions are missing required information.`)
      }
    }

    return { isValid, issues }
  }

  /**
   * Cleanup resources
   */
  const cleanup = async (): Promise<void> => {
    try {
      // Reset service reference
      groqService = null
    } catch (error) {
      console.warn('Error during cleanup:', error)
    }
  }

  /**
   * Pre-process image for better OCR results
   */
  const preprocessImage = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = () => {
        try {
          // Set canvas size
          canvas.width = img.width
          canvas.height = img.height

          if (!ctx) {
            reject(new Error('Failed to get canvas context'))
            return
          }

          // Draw image
          ctx.drawImage(img, 0, 0)

          // Get image data
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const data = imageData.data

          // Apply basic contrast enhancement
          for (let i = 0; i < data.length; i += 4) {
            // Increase contrast
            const factor = 1.5
            data[i] = Math.min(255, Math.max(0, (data[i] - 128) * factor + 128))     // Red
            data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * factor + 128)) // Green
            data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * factor + 128)) // Blue
          }

          // Put processed image data back
          ctx.putImageData(imageData, 0, 0)

          // Convert to blob
          canvas.toBlob((blob) => {
            if (blob) {
              const processedFile = new File([blob], file.name, { type: 'image/jpeg' })
              resolve(processedFile)
            } else {
              reject(new Error('Failed to process image'))
            }
          }, 'image/jpeg', 0.9)
        } catch (error) {
          reject(error)
        }
      }

      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = URL.createObjectURL(file)
    })
  }

  return {
    // State
    isProcessing,
    progress,
    currentStatus,
    streamingContent,

    // Methods
    processImage,
    processMultipleImages,
    validateProcessingResult,
    preprocessImage,
    cleanup,

    // For manual initialization if needed
    initializeServices
  }
}
