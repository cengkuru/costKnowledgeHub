import { z } from 'zod';
import { ApiError } from '../middleware/errorHandler';
import { aiService } from './aiService';

/**
 * Query intent types for classification
 */
export type QueryIntent =
  | 'cost_methodology'           // About cost definitions, standards
  | 'oc4ids_technical'           // OC4IDS technical implementation
  | 'country_specific'           // Country program specific
  | 'implementation'             // How-to, implementation guides
  | 'general_transparency'       // General transparency/accountability
  | 'off_topic'                  // Not related to domain
  | 'harmful';                   // Harmful or inappropriate

/**
 * Intent classification result
 */
export interface IntentClassification {
  intent: QueryIntent;
  confidence: number;            // 0-1
  secondaryIntent?: QueryIntent;
  reasoning: string;
}

/**
 * Intent handler configuration
 */
export interface IntentHandler {
  shouldProcess: boolean;
  requiresFiltering: boolean;
  allowedFilters?: string[];
  systemPromptOverride?: string;
  warnings?: string[];
  reasoning?: string;
}

/**
 * Intent Service - Classifies queries for appropriate handling
 */
export const intentService = {
  /**
   * Classify query intent
   */
  async classifyIntent(query: string): Promise<IntentClassification> {
    try {
      if (!query || query.trim().length === 0) {
        throw new ApiError(400, 'Query is required for intent classification');
      }

      // Check for obviously harmful queries first
      if (intentService.containsHarmfulContent(query)) {
        return {
          intent: 'harmful',
          confidence: 0.99,
          reasoning: 'Query contains potentially harmful content'
        };
      }

      const classificationPrompt = `Classify the following query intent. Return ONLY valid JSON with "intent" and "confidence" fields.
intent must be one of: "cost_methodology", "oc4ids_technical", "country_specific", "implementation", "general_transparency", "off_topic", "harmful"
confidence must be 0-1

Query: "${query}"

Return only JSON, no explanation:`;

      let response;
      try {
        response = await aiService.generateContent(classificationPrompt);
      } catch (error) {
        console.error('AI classification failed, using fallback:', error);
        return intentService.classifyIntentFallback(query);
      }

      // Parse response
      try {
        const parsed = JSON.parse(response);

        // Validate intent value
        const validIntents: QueryIntent[] = [
          'cost_methodology',
          'oc4ids_technical',
          'country_specific',
          'implementation',
          'general_transparency',
          'off_topic',
          'harmful'
        ];

        const intent = validIntents.includes(parsed.intent) ? parsed.intent : 'off_topic';
        const confidence = Math.max(0, Math.min(1, parsed.confidence || 0.5));

        return {
          intent,
          confidence,
          reasoning: `Classified as ${intent} with ${(confidence * 100).toFixed(1)}% confidence`
        };
      } catch {
        return intentService.classifyIntentFallback(query);
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error('Intent classification error:', error);
      return {
        intent: 'off_topic',
        confidence: 0.5,
        reasoning: 'Classification failed, defaulting to off_topic'
      };
    }
  },

  /**
   * Fallback intent classification using keyword matching
   */
  classifyIntentFallback(query: string): IntentClassification {
    const lowerQuery = query.toLowerCase();

    // Cost methodology keywords
    if (intentService.matchesKeywords(lowerQuery, ['cost', 'expenditure', 'budget', 'spending', 'methodology'])) {
      return {
        intent: 'cost_methodology',
        confidence: 0.7,
        reasoning: 'Query matches cost methodology keywords'
      };
    }

    // OC4IDS technical keywords
    if (intentService.matchesKeywords(lowerQuery, ['oc4ids', 'standard', 'schema', 'technical', 'implementation', 'field'])) {
      return {
        intent: 'oc4ids_technical',
        confidence: 0.8,
        reasoning: 'Query matches OC4IDS technical keywords'
      };
    }

    // Country-specific keywords
    if (intentService.matchesKeywords(lowerQuery, ['country', 'program', 'region', 'africa', 'asia', 'latin', 'pacific'])) {
      return {
        intent: 'country_specific',
        confidence: 0.75,
        reasoning: 'Query matches country-specific keywords'
      };
    }

    // Implementation keywords
    if (intentService.matchesKeywords(lowerQuery, ['how', 'implement', 'guide', 'step', 'process', 'tool', 'template'])) {
      return {
        intent: 'implementation',
        confidence: 0.75,
        reasoning: 'Query matches implementation keywords'
      };
    }

    // General transparency
    if (intentService.matchesKeywords(lowerQuery, ['transparency', 'disclosure', 'accountability', 'open'])) {
      return {
        intent: 'general_transparency',
        confidence: 0.75,
        reasoning: 'Query matches transparency keywords'
      };
    }

    // Default to off-topic
    return {
      intent: 'off_topic',
      confidence: 0.5,
      reasoning: 'Query does not match known domain keywords'
    };
  },

  /**
   * Simple keyword matching helper
   */
  matchesKeywords(text: string, keywords: string[]): boolean {
    return keywords.some((keyword) => text.includes(keyword));
  },

  /**
   * Check for obviously harmful content
   */
  containsHarmfulContent(query: string): boolean {
    const harmfulPatterns = [
      /\b(kill|hurt|attack|bomb|weapon|drug|illegal)\b/i,
      /\b(hate|discriminate|racist|sexist)\b/i,
      /\b(abuse|exploit|assault)\b/i
    ];

    return harmfulPatterns.some((pattern) => pattern.test(query));
  },

  /**
   * Get handler configuration for intent
   */
  getHandler(intent: QueryIntent): IntentHandler {
    const handlers: Record<QueryIntent, IntentHandler> = {
      cost_methodology: {
        shouldProcess: true,
        requiresFiltering: false,
        reasoning: 'Cost methodology queries are welcome'
      },
      oc4ids_technical: {
        shouldProcess: true,
        requiresFiltering: false,
        reasoning: 'OC4IDS technical queries are welcome'
      },
      country_specific: {
        shouldProcess: true,
        requiresFiltering: true,
        allowedFilters: ['countryPrograms'],
        reasoning: 'Country-specific queries benefit from geographic filtering'
      },
      implementation: {
        shouldProcess: true,
        requiresFiltering: false,
        reasoning: 'Implementation queries are welcome'
      },
      general_transparency: {
        shouldProcess: true,
        requiresFiltering: false,
        reasoning: 'General transparency questions are welcome'
      },
      off_topic: {
        shouldProcess: true,
        requiresFiltering: false,
        warnings: ['This query appears to be off-topic. Results may be limited.'],
        reasoning: 'Off-topic query detected'
      },
      harmful: {
        shouldProcess: false,
        requiresFiltering: true,
        warnings: ['Query contains potentially harmful content and will not be processed'],
        reasoning: 'Harmful query blocked'
      }
    };

    return handlers[intent] || handlers.off_topic;
  },

  /**
   * Validate query against intent
   */
  validateQueryForIntent(
    query: string,
    intent: QueryIntent
  ): { valid: boolean; reason?: string } {
    const handler = intentService.getHandler(intent);

    if (!handler.shouldProcess) {
      return {
        valid: false,
        reason: `Queries of type "${intent}" cannot be processed`
      };
    }

    if (query.length < 5) {
      return {
        valid: false,
        reason: 'Query is too short'
      };
    }

    if (query.length > 1000) {
      return {
        valid: false,
        reason: 'Query is too long'
      };
    }

    return { valid: true };
  },

  /**
   * Get intent statistics summary
   */
  getIntentSummary(): Record<QueryIntent, string> {
    return {
      cost_methodology: 'Questions about cost definitions, standards, and methodologies',
      oc4ids_technical: 'Technical implementation questions about the OC4IDS standard',
      country_specific: 'Questions specific to a particular country or program',
      implementation: 'How-to guides and implementation instructions',
      general_transparency: 'General questions about transparency and accountability',
      off_topic: 'Queries outside the domain scope',
      harmful: 'Potentially harmful or inappropriate queries'
    };
  }
};
