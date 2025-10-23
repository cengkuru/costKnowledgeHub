import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { GeminiClient } from './geminiClient';

/**
 * Confidence level categories
 */
export enum ConfidenceLevel {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

/**
 * Confidence scoring result interface
 */
export interface ConfidenceResult {
  score: number;              // 0-100 confidence score
  level: ConfidenceLevel;     // high, medium, or low
  feedback: string[];         // Array of specific feedback messages
  recommendations: string[];  // Actionable recommendations for improvement
  validationDetails: {
    completeness: number;     // 0-100 score for content completeness
    clarity: number;          // 0-100 score for clarity and coherence
    relevance: number;        // 0-100 score for topic relevance
    consistency: number;      // 0-100 score for cross-field consistency
  };
}

/**
 * Resource data interface for validation
 */
interface ResourceData {
  title: { en?: string; es?: string; pt?: string };
  description: { en?: string; es?: string; pt?: string };
  type: string;
  tags: string[];
  country: string;
  language: string;
  externalLink?: string;
  fileLinks?: { en?: string; es?: string; pt?: string };
}

/**
 * Validation options interface
 */
interface ValidationOptions {
  minConfidenceScore?: number;  // Minimum acceptable confidence score (default: 50)
  strictMode?: boolean;          // Enable strict validation (default: false)
}

/**
 * Cloud Function to validate resource content and return confidence score
 *
 * This function uses Gemini AI to analyze resource content quality and completeness,
 * providing a confidence score and actionable feedback.
 *
 * @param data - Object containing resource and validation options
 * @returns ConfidenceResult with score, level, feedback, and recommendations
 */
export const validateResourceContent = onCall(
  {
    cors: true,
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 60
  },
  async (request) => {
    try {
      // Validate request
      if (!request.auth) {
        throw new HttpsError(
          'unauthenticated',
          'User must be authenticated to validate resources'
        );
      }

      // Extract data
      const { resource, options } = request.data as {
        resource: ResourceData;
        options?: ValidationOptions;
      };

      // Validate input
      if (!resource) {
        throw new HttpsError(
          'invalid-argument',
          'Resource data is required'
        );
      }

      // Set defaults
      const minConfidenceScore = options?.minConfidenceScore ?? 50;
      const strictMode = options?.strictMode ?? false;

      // Perform validation
      const result = await validateResource(resource, {
        minConfidenceScore,
        strictMode
      });

      return result;

    } catch (error) {
      console.error('Error in validateResourceContent:', error);

      if (error instanceof HttpsError) {
        throw error;
      }

      // Return safe default on error instead of throwing
      console.warn('Returning safe default confidence score due to error');
      return {
        score: 50,
        level: ConfidenceLevel.MEDIUM,
        feedback: ['Unable to complete validation due to technical error'],
        recommendations: ['Please try again or contact support if the issue persists'],
        validationDetails: {
          completeness: 50,
          clarity: 50,
          relevance: 50,
          consistency: 50
        }
      } as ConfidenceResult;
    }
  }
);

/**
 * Main validation logic using Gemini AI
 */
async function validateResource(
  resource: ResourceData,
  options: ValidationOptions
): Promise<ConfidenceResult> {
  try {
    // Initialize Gemini client with flash model for fast validation
    const geminiClient = new GeminiClient('gemini-2.0-flash');

    // Build validation prompt
    const prompt = buildValidationPrompt(resource, options);

    // Call Gemini with JSON response
    const validationResult = await geminiClient.generateJsonContent(
      prompt,
      {
        temperature: 0.3, // Lower temperature for consistent validation
        maxOutputTokens: 1024,
      },
      {
        fallbackData: getDefaultConfidenceResult(),
        throwOnFailure: false,
        maxRetries: 3
      }
    );

    // Process and normalize the result
    const normalizedResult = normalizeValidationResult(validationResult);

    // Apply strict mode adjustments if enabled
    if (options.strictMode) {
      normalizedResult.score = Math.floor(normalizedResult.score * 0.9);
      normalizedResult.level = determineConfidenceLevel(normalizedResult.score);
    }

    return normalizedResult;

  } catch (error) {
    console.error('Error validating resource with AI:', error);
    return getDefaultConfidenceResult();
  }
}

/**
 * Build comprehensive validation prompt for Gemini
 */
function buildValidationPrompt(
  resource: ResourceData,
  options: ValidationOptions
): string {
  const { title, description, type, tags, country, language } = resource;

  return `You are an expert content validator for the CoST (Construction Sector Transparency) Knowledge Hub, a professional infrastructure transparency platform.

Analyze the following resource submission and provide a comprehensive confidence score assessment:

**RESOURCE DATA:**
- Title (EN): ${title.en || 'Not provided'}
- Title (ES): ${title.es || 'Not provided'}
- Title (PT): ${title.pt || 'Not provided'}
- Description (EN): ${description.en || 'Not provided'}
- Description (ES): ${description.es || 'Not provided'}
- Description (PT): ${description.pt || 'Not provided'}
- Resource Type: ${type}
- Tags: ${tags.join(', ') || 'None'}
- Country: ${country}
- Primary Language: ${language}
- External Link: ${resource.externalLink || 'None'}
- File Links: ${JSON.stringify(resource.fileLinks || {})}

**VALIDATION CRITERIA:**

1. **Completeness (0-100):** Are all required fields filled? Are multi-language translations provided? Is there sufficient detail?

2. **Clarity (0-100):** Are titles and descriptions clear, professional, and easy to understand? Do they use appropriate infrastructure/transparency terminology?

3. **Relevance (0-100):** Is the content relevant to CoST topics (infrastructure transparency, procurement, disclosure, assurance)? Do tags match the content?

4. **Consistency (0-100):** Do translations align in meaning? Does the resource type match the content? Are tags and descriptions consistent?

**SCORING GUIDELINES:**
- High confidence (80-100): Complete, clear, highly relevant, consistent across all fields
- Medium confidence (50-79): Mostly complete, generally clear, relevant with minor issues
- Low confidence (0-49): Incomplete, unclear, poor relevance, or significant inconsistencies

**OUTPUT FORMAT:**
Respond with ONLY a valid JSON object in this exact format:

{
  "score": <number 0-100>,
  "completeness": <number 0-100>,
  "clarity": <number 0-100>,
  "relevance": <number 0-100>,
  "consistency": <number 0-100>,
  "feedback": [
    "<specific issue or strength>",
    "<another specific observation>"
  ],
  "recommendations": [
    "<actionable suggestion for improvement>",
    "<another improvement suggestion>"
  ]
}

Provide honest, constructive feedback focused on helping improve resource quality.`;
}

/**
 * Normalize and validate the AI response
 */
function normalizeValidationResult(aiResult: any): ConfidenceResult {
  // Ensure all scores are within valid range
  const clamp = (value: number, min: number = 0, max: number = 100): number => {
    return Math.max(min, Math.min(max, value || 0));
  };

  const score = clamp(aiResult.score);
  const completeness = clamp(aiResult.completeness);
  const clarity = clamp(aiResult.clarity);
  const relevance = clamp(aiResult.relevance);
  const consistency = clamp(aiResult.consistency);

  // Ensure arrays are valid
  const feedback = Array.isArray(aiResult.feedback)
    ? aiResult.feedback.filter((f: any) => typeof f === 'string')
    : ['Validation completed'];

  const recommendations = Array.isArray(aiResult.recommendations)
    ? aiResult.recommendations.filter((r: any) => typeof r === 'string')
    : ['Continue improving content quality'];

  return {
    score,
    level: determineConfidenceLevel(score),
    feedback,
    recommendations,
    validationDetails: {
      completeness,
      clarity,
      relevance,
      consistency
    }
  };
}

/**
 * Determine confidence level based on score
 */
function determineConfidenceLevel(score: number): ConfidenceLevel {
  if (score >= 80) return ConfidenceLevel.HIGH;
  if (score >= 50) return ConfidenceLevel.MEDIUM;
  return ConfidenceLevel.LOW;
}

/**
 * Get default/fallback confidence result
 */
function getDefaultConfidenceResult(): ConfidenceResult {
  return {
    score: 50,
    level: ConfidenceLevel.MEDIUM,
    feedback: ['Unable to complete full validation analysis'],
    recommendations: [
      'Ensure all required fields are filled',
      'Provide clear, professional descriptions',
      'Add relevant tags for better discoverability',
      'Include multi-language translations where possible'
    ],
    validationDetails: {
      completeness: 50,
      clarity: 50,
      relevance: 50,
      consistency: 50
    }
  };
}
