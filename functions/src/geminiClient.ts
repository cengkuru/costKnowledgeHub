const { GoogleGenerativeAI } = require('@google/generative-ai');
const functions = require('firebase-functions');
require('dotenv').config();

// Default model
const DEFAULT_MODEL = 'gemini-2.0-flash';

/**
 * Generic Gemini client for interacting with Google"s generative AI
 */
export class GeminiClient {
  private genAI: any;
  private model: any;
  private apiKey: string;
  private modelName: string;

  /**
   * Create a new GeminiClient instance
   * @param modelName - Optional model name to use (defaults to gemini-2.0-flash)
   */
  constructor(modelName?: string) {
    this.apiKey = this.getApiKey();
    this.modelName = modelName || DEFAULT_MODEL;
    this.initialize();
  }

  /**
   * Get API key from environment variables or Firebase config
   */
  private getApiKey(): string {
    try {
      // First try environment variable (for local development)
      let apiKey = process.env.GEMINI_API_KEY;

      // If not found in process.env, try Firebase config
      if (!apiKey) {
        const config = functions.config && functions.config();
        apiKey = config?.gemini?.api_key;
      }

      // Debug: Log API key status without revealing the key
      console.log("API Key status:", apiKey ? "Found" : "Not found");

      if (!apiKey) {
        throw new Error("Gemini API key not found in environment or config");
      }

      return apiKey;
    } catch (error) {
      console.error("Error accessing API key:", error);
      throw new Error("Failed to access Gemini API key. Please set it using: firebase functions:config:set gemini.api_key=YOUR_KEY");
    }
  }

  /**
   * Initialize the Gemini client
   */
  private initialize() {
    this.genAI = new GoogleGenerativeAI(this.apiKey);
    this.model = this.genAI.getGenerativeModel({ model: this.modelName });
    console.log(`Initialized Gemini client with model: ${this.modelName}`);
  }

  /**
   * Generate content using the Gemini model
   * @param prompt - The prompt text to send to Gemini
   * @param options - Optional generation config options
   * @returns The raw response from Gemini
   */
  async generateContent(
    prompt: string,
    options?: {
      temperature?: number;
      topK?: number;
      topP?: number;
      maxOutputTokens?: number;
      safetySettings?: Array<{
        category: string;
        threshold: string;
      }>;
      maxRetries?: number;
    },
  ) {
    console.log('Making request to Gemini API using SDK');
    console.log('Prompt length:', prompt.length);

    // Default generation config
    const generationConfig = {
      temperature: options?.temperature ?? 0.2,
      topK: options?.topK ?? 40,
      topP: options?.topP ?? 0.95,
      maxOutputTokens: options?.maxOutputTokens ?? 1024,
    };

    // Default safety settings to filter inappropriate content
    const safetySettings = options?.safetySettings || [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_ONLY_HIGH',
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_ONLY_HIGH',
      },
    ];

    // Retries - increase max retries from 2 to 3
    const maxRetries = options?.maxRetries ?? 3;
    let retryCount = 0;
    let lastError: Error | null = null;

    while (retryCount <= maxRetries) {
      try {
        if (retryCount > 0) {
          console.log(`Retry attempt ${retryCount}/${maxRetries} for Gemini request`);

          // On retry, adjust the temperature slightly to get a different response
          generationConfig.temperature = Math.min(0.9, generationConfig.temperature + 0.1);
        }

        const result = await this.model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig,
          safetySettings,
        });

        const response = result.response;

        // Validate the response isn't empty before returning
        const responseText = response.text();
        if (!responseText || responseText.trim().length === 0) {
          console.warn(`Gemini returned empty response on attempt ${retryCount + 1}/${maxRetries + 1}`);

          // If we have retries left, continue to the next attempt
          if (retryCount < maxRetries) {
            retryCount++;
            // Add a small delay between retries (increase with each retry)
            const delayMs = 500 * Math.pow(2, retryCount - 1); // Exponential backoff: 500ms, 1000ms, 2000ms
            console.log(`Waiting ${delayMs}ms before retry ${retryCount}`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
            continue;
          }

          throw new Error("Empty response from Gemini API after all retry attempts");
        }

        // More aggressive check for extremely short or unhelpful responses
        if (responseText.trim().length < 10) {
          console.warn(`Gemini returned suspiciously short response (${responseText.length} chars) on attempt ${retryCount + 1}/${maxRetries + 1}`);

          if (retryCount < maxRetries) {
            retryCount++;
            const delayMs = 500 * Math.pow(2, retryCount - 1);
            console.log(`Waiting ${delayMs}ms before retry ${retryCount}`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
            continue;
          }
        }

        // Success - valid non-empty response
        if (retryCount > 0) {
          console.log(`Successfully got valid response on retry ${retryCount}`);
        }

        return response;
      } catch (err) {
        lastError = err as Error;
        console.error(`Error generating content with Gemini (attempt ${retryCount + 1}/${maxRetries + 1}):`, err);

        if (retryCount < maxRetries) {
          retryCount++;
          // Add a delay between retries with exponential backoff
          const delayMs = 500 * Math.pow(2, retryCount - 1);
          console.log(`Waiting ${delayMs}ms before retry ${retryCount}`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          continue;
        }

        // Maximum retries reached or critical error - pass the last error up
        console.error('Max retries reached or critical error encountered');
        throw err;
      }
    }

    // This shouldn't be reached due to the throw in the loop, but TypeScript needs it
    throw lastError || new Error('Unknown error in Gemini API request');
  }

  /**
   * Generate content and extract JSON from the response
   * @param prompt - The prompt text to send to Gemini
   * @param options - Optional generation config options
   * @param jsonOptions - Options for JSON parsing
   * @returns Parsed JSON from the response
   */
  async generateJsonContent(
    prompt: string,
    options?: any,
    jsonOptions?: {
      fallbackData?: any;
      throwOnFailure?: boolean;
      promptSuffix?: string;
      maxRetries?: number;
    },
  ): Promise<any> {
    // Default JSON options
    const {
      fallbackData = null,
      throwOnFailure = false,
      promptSuffix = 'IMPORTANT: Respond with ONLY a valid JSON object. Do not include any explanations, markdown formatting, or code blocks around the JSON.',
      maxRetries = 2,
    } = jsonOptions || {};

    // Add explicit instructions for JSON formatting
    const jsonPrompt = `${prompt}\n\n${promptSuffix}`;

    try {
      console.log('Generating JSON content with retries if needed');

      // Pass the maxRetries option to generateContent
      const response = await this.generateContent(jsonPrompt, {
        ...options,
        maxRetries,
      });

      const textResponse = response.text();

      if (!textResponse || textResponse.trim().length === 0) {
        console.error("Gemini returned an empty response despite retry attempts");
        if (throwOnFailure) {
          throw new Error("Gemini returned an empty response despite retry attempts");
        }
        console.log("Using fallback data due to empty response");
        return fallbackData;
      }

      console.log("Raw response from Gemini:", textResponse.substring(0, 200) + "...");

      // Extract JSON from the text response
      const jsonData = this.extractJsonFromText(textResponse);

      if (!jsonData) {
        console.error("Could not extract JSON from response:", textResponse);
        if (throwOnFailure) {
          throw new Error("Could not extract valid JSON from Gemini response");
        }
        console.log("Using fallback data due to JSON extraction failure");
        return fallbackData;
      }

      // Validate the required fields in the JSON data
      if (this.isInvalidJSON(jsonData)) {
        console.error("Incomplete or invalid JSON structure:", jsonData);
        if (throwOnFailure) {
          throw new Error("Incomplete or invalid JSON structure from Gemini");
        }
        console.log("Using fallback data due to invalid JSON structure");
        return fallbackData;
      }

      return jsonData;
    } catch (error) {
      console.error("Error in generateJsonContent:", error instanceof Error ? error.message : String(error));
      if (throwOnFailure) {
        throw error;
      }
      console.log("Using fallback data due to error");
      return fallbackData;
    }
  }

  /**
   * Extracts a JSON object from text that may contain markdown or additional text
   * @param text - Text that may contain a JSON object
   * @returns The extracted JSON object or null if not found
   */
  private extractJsonFromText(text: string): any {
    // Remove potential unicode characters and normalize whitespace
    const cleanText = text.replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ').trim();

    try {
      // Try to parse the text directly first
      return JSON.parse(cleanText);
    } catch (error) {
      console.log('Direct JSON parsing failed, trying to extract JSON...');

      try {
        // Try to extract json from code blocks (```json {...} ```)
        const codeBlockMatch = cleanText.match(
          /```(?:json)?\s*([\s\S]*?)\s*```/,
        );
        if (codeBlockMatch && codeBlockMatch[1]) {
          const jsonContent = codeBlockMatch[1].trim();
          console.log(
            'Extracted JSON from code block:',
            jsonContent.substring(0, 50) + '...',
          );
          return JSON.parse(jsonContent);
        }
      } catch (e) {
        console.error('Failed to parse code block JSON:', e);
      }

      try {
        // Try to find any JSON-like structure with opening and closing braces
        const jsonRegex = /(\{[\s\S]*\})/g;
        const matches = cleanText.match(jsonRegex);

        if (matches) {
          // Try each potential JSON match
          for (const match of matches) {
            try {
              // Cleanup the match - replace smart quotes and other common issues
              const cleaned = match
                .replace(/["]/g, '"') // Replace curly quotes
                .replace(/["]/g, '"')
                .replace(/["]/g, '"')
                .replace(/["]/g, '"')
                .replace(/…/g, '...'); // Replace ellipsis

              return JSON.parse(cleaned);
            } catch (e) {
              console.log(
                'Failed to parse potential JSON match:',
                e instanceof Error ? e.message : String(e),
              );
            }
          }
        }
      } catch (e) {
        console.error('Failed to find JSON-like structures:', e);
      }

      // If all else fails, try a more aggressive approach to fix common JSON errors
      try {
        // Find text that looks like it might be JSON (starts with { and ends with })
        const jsonCandidate = cleanText.match(/\{[\s\S]*\}/);
        if (jsonCandidate) {
          // Fix common JSON errors
          let fixedJson = jsonCandidate[0]
            .replace(/,\s*}/g, '}') // Remove trailing commas
            .replace(/,\s*]/g, ']')
            .replace(/([""])?([a-zA-Z0-9_]+)([""])?\s*:/g, '"$2":') // Ensure property names are quoted
            .replace(/:\s*"([^"]*)"/g, ':"$1"') // Replace single quotes with double quotes for values
            .replace(/\\/g, '\\\\'); // Escape backslashes

          return JSON.parse(fixedJson);
        }
      } catch (e) {
        console.error(
          'Failed aggressive JSON fixing:',
          e instanceof Error ? e.message : String(e),
        );
      }

      // No JSON found or parsed successfully
      console.error('Could not extract valid JSON from text.');
      return null;
    }
  }

  /**
   * Check if the JSON is valid for our needs
   * This is a simplified validation - adjust based on your specific JSON structure requirements
   */
  private isInvalidJSON(json: any): boolean {
    // Check if it's an object
    if (!json || typeof json !== 'object' || Array.isArray(json)) {
      return true;
    }

    // You can add more specific validation here for required fields
    // For example, if you know your JSON should have specific properties

    return false;
  }
}
