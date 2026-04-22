import { Groq } from 'groq-sdk';

interface AnswerKeyData {
  questions: Array<{
    question_number: number;
    question_text?: string;
    correct_answer: string;
    answer_type: 'multiple_choice' | 'true_false' | 'fill_blank' | 'essay' | 'matching';
    options?: string[];
    points?: number;
  }>;
  metadata?: {
    total_questions: number;
    subject?: string;
    difficulty?: string;
    instructions?: string;
  };
}

/**
 * Groq AI service for processing images and extracting structured answer keys using vision models
 */
export class GroqAIService {
  private groq: Groq;

  // Keep responses deterministic and easier to parse.
  private static readonly DEFAULT_TEMPERATURE = 0.1;

  constructor(apiKey: string) {
    this.groq = new Groq({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true // Required for browser usage
    });
  }

  /**
   * Process image with vision model only (no OCR)
   * @param imageBase64 - Base64 encoded image
   * @returns Structured answer key data
   */
  async processImageOnly(imageBase64: string): Promise<AnswerKeyData> {
    const prompt = this.createVisionOnlyPrompt();

  // The UI allows multiple formats; don't hardcode JPEG.
  const mimeType = this.detectMimeTypeFromBase64(imageBase64) ?? 'image/jpeg';

    console.log('🚀 Starting AI Vision Analysis:', {
      imageBase64Length: imageBase64.length,
      imageSize: `~${(imageBase64.length * 0.75 / 1024).toFixed(2)} KB`,
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      promptLength: prompt.length,
      promptContent: prompt
    });

    try {
      const chatCompletion = await this.groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: this.createJsonOnlySystemPrompt()
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        model: 'meta-llama/llama-4-scout-17b-16e-instruct', // Use vision model for image processing
        temperature: GroqAIService.DEFAULT_TEMPERATURE, // Lower temperature for more consistent results
        max_completion_tokens: 2048,
        top_p: 1,
        stream: false,
        stop: null,

        // If supported by the provider/model, this nudges the model into valid JSON.
        // It's safe to include—unknown fields are typically ignored.
        response_format: {
          type: 'json_object'
        } as any
      });

      const content = chatCompletion.choices[0]?.message?.content || '';

      // Log the raw AI response for comprehensive content analysis
      console.log('🤖 Complete AI Vision Response:', {
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        contentLength: content.length,
        rawContent: content,
        usage: chatCompletion.usage,
        finishReason: chatCompletion.choices[0]?.finish_reason,
        timestamp: new Date().toISOString()
      });

      const parsed = this.parseResponse(content);

      // If the vision-only extraction returns 0 questions on handwritten sheets,
      // try an OCR-assisted pass. This is common with faint pencil/pen strokes.
      if (!parsed.questions?.length) {
        console.warn('⚠️ Vision-only returned no questions; attempting OCR-assisted fallback...');
        const ocrText = await this.extractOcrTextFromBase64(imageBase64);
        if (ocrText.trim().length) {
          return await this.processWithVision(ocrText, imageBase64);
        }
      }

      return parsed;
    } catch (error) {
      console.error('Error with vision-only processing:', error);
      throw new Error(`Vision processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process OCR text with vision model (meta-llama/llama-4-scout-17b-16e-instruct)
   * @param ocrText - Raw text extracted from OCR
   * @param imageBase64 - Base64 encoded image for context
   * @returns Structured answer key data
   */
  async processWithVision(ocrText: string, imageBase64: string): Promise<AnswerKeyData> {
    const prompt = this.createVisionPrompt(ocrText);

  const mimeType = this.detectMimeTypeFromBase64(imageBase64) ?? 'image/jpeg';

    try {
      const chatCompletion = await this.groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: this.createJsonOnlySystemPrompt()
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        model: 'meta-llama/llama-4-scout-17b-16e-instruct', // Updated vision model for OCR
        temperature: GroqAIService.DEFAULT_TEMPERATURE,
        max_completion_tokens: 2048,
        top_p: 1,
        stream: false,
        stop: null,
        response_format: {
          type: 'json_object'
        } as any
      });

      const content = chatCompletion.choices[0]?.message?.content || '';
      return this.parseResponse(content);
    } catch (error) {
      console.error('Error with vision model:', error);
      throw new Error(`Vision processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process OCR text only (without image) using text model
   * @param ocrText - OCR extracted text from PDF/image
   * @returns Structured answer key data
   */
  async processTextOnly(ocrText: string): Promise<AnswerKeyData> {
    const prompt = this.createTextOnlyPrompt(ocrText);

    console.log('🔤 Starting OCR Text Analysis:', {
      textLength: ocrText.length,
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      promptLength: prompt.length,
      textPreview: ocrText.substring(0, 300) + (ocrText.length > 300 ? '...' : '')
    });

    try {
      const chatCompletion = await this.groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: this.createJsonOnlySystemPrompt()
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        temperature: GroqAIService.DEFAULT_TEMPERATURE,
        max_tokens: 4000,
        top_p: 0.95,
        response_format: {
          type: 'json_object'
        } as any
      });

      const response = chatCompletion.choices[0]?.message?.content;
      console.log('🤖 Raw OCR Text Analysis Response:', {
        responseLength: response?.length || 0,
        rawResponse: response
      });

      return this.parseResponse(response || '');
    } catch (error) {
      console.error('Error with text-only processing:', error);
      throw new Error(`Text processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create prompt for vision model processing with OCR text
   */
  private createVisionPrompt(ocrText: string): string {
    return `You are an expert educational assessment analyzer. I have an answer key image and OCR text extracted from it.

OCR Text:
${ocrText}

Please analyze both the image and OCR text to extract and structure the answer key information. Return a JSON object with the following structure:

{
  "questions": [
    {
      "question_number": 1,
      "question_text": "Optional question text if visible",
      "correct_answer": "A",
      "answer_type": "multiple_choice",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "points": 1
    }
  ],
  "metadata": {
    "total_questions": 10,
    "subject": "Optional subject if identifiable",
    "difficulty": "Optional difficulty level",
    "instructions": "Any special instructions found"
  }
}

Guidelines:
- Extract all visible answer information
- Identify question numbers and their corresponding correct answers
- Determine answer types: multiple_choice, true_false, fill_blank, essay, matching
- Include question text if clearly visible
- For multiple choice, extract all options if visible
- Provide accurate question count
- Use the image to clarify any ambiguous OCR text
- Return valid JSON only, no additional text`;
  }

  /**
   * Create prompt for vision-only model processing (without OCR text)
   */
  private createVisionOnlyPrompt(): string {
  return `You are an expert educational assessment analyzer. I have an answer key image that needs to be analyzed.

This image may contain HANDWRITTEN short answers (words, numbers, units). The layout may be a simple numbered list (e.g., "1. Photosynthesis").

Please carefully examine this image and extract all answer key information. Return a JSON object with the following structure:

{
  "questions": [
    {
      "question_number": 1,
      "question_text": "Optional question text if clearly visible",
      "correct_answer": "A",
      "answer_type": "multiple_choice",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "points": 1
    }
  ],
  "metadata": {
    "total_questions": 10,
    "subject": "Optional subject if identifiable",
    "difficulty": "Optional difficulty level",
    "instructions": "Any special instructions found"
  }
}

Guidelines:
- Carefully read all text in the image
- Extract question numbers and their corresponding correct answers
- Determine answer types: multiple_choice, true_false, fill_blank, essay, matching
- Include question text if clearly readable
- For handwritten short-answer keys (most common), use answer_type "fill_blank" and put the written response in correct_answer
- For numbers/units (e.g., "300m", "0°C"), preserve symbols and units exactly
- For crossed-out text, use the final written value if a replacement is clearly written
- Provide accurate question count based on what you can see
- Look for patterns that indicate answer keys (circles, letters, checkmarks)
- Pay attention to headers, titles, or labels that might indicate this is an answer key
- Return valid JSON only, no additional text or explanations`;
  }

  /**
   * Create prompt for text-only processing using OCR extracted text
   */
  private createTextOnlyPrompt(ocrText: string): string {
    return `You are an expert educational assessment analyzer. I have extracted text from an answer key document using OCR.

OCR Extracted Text:
${ocrText}

Please analyze this text and extract the answer key information. Return a JSON object with the following structure:

{
  "questions": [
    {
      "question_number": 1,
      "question_text": "Optional question text if clearly visible",
      "correct_answer": "A",
      "answer_type": "multiple_choice",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "points": 1
    }
  ],
  "metadata": {
    "total_questions": 10,
    "subject": "Optional subject if identifiable",
    "difficulty": "Optional difficulty level",
    "instructions": "Any special instructions found"
  }
}

Guidelines:
- Parse all text carefully to identify answer patterns
- Extract question numbers and their corresponding correct answers
- Determine answer types: multiple_choice, true_false, fill_blank, essay, matching
- Look for patterns like "1. A", "Question 1: B", "1) True", etc.
- Include question text if present in the OCR text
- For multiple choice, extract all available options if listed
- Handle OCR errors and inconsistencies gracefully
- Look for headers, titles, or labels that indicate this is an answer key
- Count total questions based on parsed content
- Return valid JSON only, no additional text or explanations`;
  }

  /**
   * Parse AI response into structured data
   */
  private parseResponse(content: string): AnswerKeyData {
    console.log('🔍 Parsing AI Response:', {
      contentLength: content.length,
      rawContent: content
    });

    try {
      // 1) Try to parse as-is.
      const direct = this.tryParseJson(content);
      if (direct) {
        const sanitizedData = this.validateAndSanitizeData(direct);
        return sanitizedData;
      }

      // 2) Extract first JSON object.
      const jsonMatch = this.extractFirstJsonObject(content);
      if (!jsonMatch) {
        console.error('❌ No JSON found in AI response:', {
          content,
          contentPreview: content.substring(0, 500) + '...'
        });
        throw new Error('No JSON found in response');
      }

      console.log('📝 JSON extracted from AI response:', {
        jsonString: jsonMatch[0],
        jsonLength: jsonMatch[0].length
      });

  const repaired = this.repairCommonJsonIssues(jsonMatch);
  const parsedData = JSON.parse(repaired);

      console.log('✅ Successfully parsed JSON from AI:', {
        parsedData,
        questionsFound: parsedData.questions?.length || 0,
        metadata: parsedData.metadata
      });

      // Validate and sanitize the response
      const sanitizedData = this.validateAndSanitizeData(parsedData);

      console.log('🔧 Data validation and sanitization complete:', {
        originalQuestions: parsedData.questions?.length || 0,
        sanitizedQuestions: sanitizedData.questions.length,
        sanitizedData
      });

      return sanitizedData;
    } catch (error) {
      console.error('❌ Error parsing AI response:', {
        error,
        content,
        contentType: typeof content,
        contentPreview: content.substring(0, 1000)
      });
      // Return basic structure if parsing fails
      return {
        questions: [],
        metadata: {
          total_questions: 0,
          subject: 'Unknown',
          difficulty: 'Unknown'
        }
      };
    }
  }

  /**
   * Validate and sanitize parsed data
   */
  private validateAndSanitizeData(data: any): AnswerKeyData {
    const sanitized: AnswerKeyData = {
      questions: [],
      metadata: {
        total_questions: 0,
        subject: data.metadata?.subject || 'Unknown',
        difficulty: data.metadata?.difficulty || 'Unknown',
        instructions: data.metadata?.instructions || ''
      }
    };

    if (Array.isArray(data.questions)) {
      sanitized.questions = data.questions.map((q: any, index: number) => ({
        question_number: q.question_number || (index + 1),
        question_text: q.question_text || '',
        correct_answer: q.correct_answer || '',
        answer_type: this.validateAnswerType(q.answer_type),
        options: Array.isArray(q.options) ? q.options : [],
        points: typeof q.points === 'number' ? q.points : 1
      }));
    }

    if (sanitized.metadata) {
      sanitized.metadata.total_questions = sanitized.questions.length;
    }
    return sanitized;
  }

  /**
   * Validate answer type
   */
  private validateAnswerType(type: string): 'multiple_choice' | 'true_false' | 'fill_blank' | 'essay' | 'matching' {
    const validTypes: Array<'multiple_choice' | 'true_false' | 'fill_blank' | 'essay' | 'matching'> = [
      'multiple_choice', 'true_false', 'fill_blank', 'essay', 'matching'
    ];

    return validTypes.includes(type as any) ? type as any : 'multiple_choice';
  }

  /**
   * Some responses include markdown fences, trailing commas, or other minor issues.
   * These helpers make parsing more resilient.
   */
  private tryParseJson(text: string): any | null {
    const cleaned = text
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```\s*$/i, '');

    try {
      return JSON.parse(cleaned);
    } catch {
      return null;
    }
  }

  private extractFirstJsonObject(text: string): string | null {
    const match = text.match(/\{[\s\S]*\}/);
    return match?.[0] ?? null;
  }

  private repairCommonJsonIssues(jsonLike: string): string {
    // Remove trailing commas before } or ]
    return jsonLike
      .replace(/,\s*([}\]])/g, '$1')
      .replace(/\u0000/g, '')
      .trim();
  }

  private createJsonOnlySystemPrompt(): string {
    return [
      'You are a careful extraction engine.',
      'Return ONLY a single valid JSON object and nothing else.',
      'Do not wrap it in markdown fences.',
      'Use double quotes for all keys and string values.',
      'If a field is unknown, use an empty string or omit optional fields.',
    ].join(' ');
  }

  /**
   * Detect common image MIME types from base64 payload.
   */
  private detectMimeTypeFromBase64(base64: string): string | null {
    const head = base64.slice(0, 16);
    // JPEG: /9j/
    if (head.startsWith('/9j/')) return 'image/jpeg';
    // PNG: iVBORw0KGgo
    if (head.startsWith('iVBORw0KGgo')) return 'image/png';
    // GIF: R0lGOD
    if (head.startsWith('R0lGOD')) return 'image/gif';
    // WEBP: UklGR
    if (head.startsWith('UklGR')) return 'image/webp';
    return null;
  }

  /**
   * Lightweight OCR fallback using Tesseract.js already in the project.
   */
  private async extractOcrTextFromBase64(imageBase64: string): Promise<string> {
    try {
      const { createWorker } = await import('tesseract.js');
      const mimeType = this.detectMimeTypeFromBase64(imageBase64) ?? 'image/jpeg';
      const worker = await createWorker('eng');
      const {
        data: { text }
      } = await worker.recognize(`data:${mimeType};base64,${imageBase64}`);
      await worker.terminate();
      return (text ?? '').toString();
    } catch (e) {
      console.warn('OCR fallback failed:', e);
      return '';
    }
  }


}

/**
 * Initialize Groq AI service with API key from environment
 */
export function createGroqAIService(): GroqAIService {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY environment variable is not set');
  }
  return new GroqAIService(apiKey);
}
