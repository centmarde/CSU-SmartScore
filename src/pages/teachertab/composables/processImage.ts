import { ref } from 'vue'
import { createWorker, type Worker } from 'tesseract.js'
import { createGroqAIService, type GroqAIService } from '@/lib/aiBase'
import { useToast } from 'vue-toastification'

interface ProcessedImageResult {
  ocrText: string
  answerKeyData: any
  confidence: number
  processingTime: number
}

interface OCRProgress {
  status: string
  progress: number
  userJobId?: string
}

/**
 * Composable for processing images with OCR and AI refinement
 */
export function useImageProcessor() {
  const toast = useToast()

  // State
  const isProcessing = ref(false)
  const progress = ref(0)
  const currentStatus = ref('')
  const streamingContent = ref('')

  // Services
  let tesseractWorker: Worker | null = null
  let groqService: GroqAIService | null = null

  /**
   * Initialize OCR worker and AI service
   */
  const initializeServices = async (): Promise<void> => {
    try {
      if (!tesseractWorker) {
        currentStatus.value = 'Initializing OCR engine...'
        progress.value = 10

        tesseractWorker = await createWorker('eng', 1, {
          logger: (m: OCRProgress) => {
            currentStatus.value = m.status
            progress.value = Math.max(progress.value, m.progress * 100)
          }
        })

        // Configure OCR for better text recognition
        await tesseractWorker.setParameters({
          tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz().,;:!?-+=[]{}|\\/"\'`~@#$%^&*_<> \n\t',
          preserve_interword_spaces: '1'
        })
      }

      if (!groqService) {
        groqService = createGroqAIService()
      }
    } catch (error) {
      console.error('Error initializing services:', error)
      toast.error('Failed to initialize image processing services')
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
   * Perform OCR on the image
   */
  const performOCR = async (file: File): Promise<{ text: string; confidence: number }> => {
    if (!tesseractWorker) {
      throw new Error('OCR worker not initialized')
    }

    try {
      currentStatus.value = 'Performing OCR on image...'
      progress.value = 30

      const { data } = await tesseractWorker.recognize(file)

      progress.value = 60
      currentStatus.value = 'OCR completed, processing text...'

      return {
        text: data.text,
        confidence: data.confidence
      }
    } catch (error) {
      console.error('OCR Error:', error)
      throw new Error('Failed to perform OCR on image')
    }
  }

  /**
   * Process image with OCR and AI refinement
   */
  const processImage = async (file: File, useStreaming = false): Promise<ProcessedImageResult> => {
    const startTime = Date.now()

    try {
      isProcessing.value = true
      progress.value = 0
      streamingContent.value = ''

      // Initialize services
      await initializeServices()

      // Perform OCR
      const ocrResult = await performOCR(file)

      if (!ocrResult.text.trim()) {
        throw new Error('No text was detected in the image')
      }

      // Convert image to base64 for AI processing
      currentStatus.value = 'Preparing image for AI processing...'
      progress.value = 70

      const imageBase64 = await fileToBase64(file)

      // Process with AI
      currentStatus.value = 'Refining answer key with AI...'
      progress.value = 80

      let answerKeyData
      try {
        // Try vision model first (with OCR text and image)
        answerKeyData = await groqService!.processWithVision(ocrResult.text, imageBase64)
      } catch (visionError) {
        console.warn('Vision model failed, using text-only fallback:', visionError)

        if (useStreaming) {
          // Use streaming text-only model with progress callback
          answerKeyData = await groqService!.processTextOnlyStreaming(
            ocrResult.text,
            (chunk: string) => {
              streamingContent.value += chunk
            }
          )
        } else {
          // Use regular text-only model
          answerKeyData = await groqService!.processTextOnly(ocrResult.text)
        }
      }

      progress.value = 100
      currentStatus.value = 'Processing completed successfully!'

      const processingTime = Date.now() - startTime

      toast.success(`Image processed successfully! Found ${answerKeyData.questions?.length || 0} questions`)

      return {
        ocrText: ocrResult.text,
        answerKeyData,
        confidence: ocrResult.confidence,
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
   * Validate OCR text quality
   */
  const validateOCRText = (text: string, confidence: number): { isValid: boolean; issues: string[] } => {
    const issues: string[] = []
    let isValid = true

    // Check confidence level
    if (confidence < 70) {
      issues.push('Low OCR confidence. Image quality may be poor.')
      isValid = false
    }

    // Check if text contains meaningful content
    if (text.trim().length < 10) {
      issues.push('Very little text detected in image.')
      isValid = false
    }

    // Check for common OCR issues
    const specialCharRatio = (text.match(/[^a-zA-Z0-9\s]/g) || []).length / text.length
    if (specialCharRatio > 0.3) {
      issues.push('High number of special characters detected. OCR may have issues.')
    }

    // Check for question patterns
    const hasQuestionNumbers = /\d+[\.\)]\s*/.test(text)
    if (!hasQuestionNumbers) {
      issues.push('No question numbering pattern detected.')
    }

    return { isValid, issues }
  }

  /**
   * Cleanup resources
   */
  const cleanup = async (): Promise<void> => {
    try {
      if (tesseractWorker) {
        await tesseractWorker.terminate()
        tesseractWorker = null
      }
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
    validateOCRText,
    preprocessImage,
    cleanup,

    // For manual initialization if needed
    initializeServices
  }
}
