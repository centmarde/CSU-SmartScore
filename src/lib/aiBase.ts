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

    try {
      const chatCompletion = await this.groq.chat.completions.create({
        messages: [
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
                  url: `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        model: 'meta-llama/llama-4-scout-17b-16e-instruct', // Use vision model for image processing
        temperature: 0.1, // Lower temperature for more consistent results
        max_completion_tokens: 2048,
        top_p: 1,
        stream: false,
        stop: null
      });

      const content = chatCompletion.choices[0]?.message?.content || '';
      return this.parseResponse(content);
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

    try {
      const chatCompletion = await this.groq.chat.completions.create({
        messages: [
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
                  url: `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        model: 'meta-llama/llama-4-scout-17b-16e-instruct', // Updated vision model for OCR
        temperature: 0.3,
        max_completion_tokens: 2048,
        top_p: 1,
        stream: false,
        stop: null
      });

      const content = chatCompletion.choices[0]?.message?.content || '';
      return this.parseResponse(content);
    } catch (error) {
      console.error('Error with vision model:', error);
      throw new Error(`Vision processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
- For multiple choice, extract all visible options
- Provide accurate question count based on what you can see
- Look for patterns that indicate answer keys (circles, letters, checkmarks)
- Pay attention to headers, titles, or labels that might indicate this is an answer key
- Return valid JSON only, no additional text or explanations`;
  }



  /**
   * Parse AI response into structured data
   */
  private parseResponse(content: string): AnswerKeyData {
    try {
      // Clean the response to extract JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsedData = JSON.parse(jsonMatch[0]);

      // Validate and sanitize the response
      return this.validateAndSanitizeData(parsedData);
    } catch (error) {
      console.error('Error parsing AI response:', error);
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
