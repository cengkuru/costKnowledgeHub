import { z } from 'zod';
import { DocumentChunk } from '../models/DocumentChunk';
import { ApiError } from '../middleware/errorHandler';
import { aiService } from './aiService';

/**
 * Claim structure for hallucination detection
 */
export interface Claim {
  statement: string;
  confidence: number;          // 0-1
  evidence?: string;           // Supporting text from sources
}

/**
 * Verified claim with source tracking
 */
export interface VerifiedClaim extends Claim {
  supported: boolean;
  sourceId?: string;
}

/**
 * Faithfulness result
 */
export interface FaithfulnessResult {
  score: number;                  // 0-1, percentage of claims supported by sources
  claims: VerifiedClaim[];
  unsupportedClaims: string[];
  confidence: 'high' | 'medium' | 'low' | 'hallucination';
  reasoning: string;
}

/**
 * Faithfulness Service - Detects hallucinations by verifying answers against sources
 */
export const faithfulnessService = {
  /**
   * Verify faithfulness of answer against source documents
   */
  async verifyFaithfulness(
    answer: string,
    sources: DocumentChunk[]
  ): Promise<FaithfulnessResult> {
    try {
      if (!answer || answer.trim().length === 0) {
        throw new ApiError(400, 'Answer text is required for faithfulness verification');
      }

      if (!sources || sources.length === 0) {
        return {
          score: 0,
          claims: [],
          unsupportedClaims: [answer],
          confidence: 'hallucination',
          reasoning: 'No source documents provided for verification'
        };
      }

      // Extract claims from the answer
      const claims = await faithfulnessService.extractClaims(answer);

      if (claims.length === 0) {
        return {
          score: 1,
          claims: [],
          unsupportedClaims: [],
          confidence: 'high',
          reasoning: 'No specific claims to verify'
        };
      }

      // Verify each claim against sources
      const verifiedClaims: VerifiedClaim[] = [];
      const unsupportedClaims: string[] = [];
      let supportedCount = 0;

      for (const claim of claims) {
        const isSupported = await faithfulnessService.verifyClaim(claim.statement, sources);

        if (isSupported) {
          verifiedClaims.push({
            ...claim,
            supported: true
          });
          supportedCount++;
        } else {
          verifiedClaims.push({
            ...claim,
            supported: false
          });
          unsupportedClaims.push(claim.statement);
        }
      }

      // Calculate faithfulness score
      const score = claims.length > 0 ? supportedCount / claims.length : 1;

      // Determine confidence level
      let confidence: 'high' | 'medium' | 'low' | 'hallucination';
      if (score >= 0.9) {
        confidence = 'high';
      } else if (score >= 0.7) {
        confidence = 'medium';
      } else if (score >= 0.4) {
        confidence = 'low';
      } else {
        confidence = 'hallucination';
      }

      const reasoning = `${(score * 100).toFixed(1)}% of claims (${supportedCount}/${claims.length}) are supported by provided sources`;

      return {
        score: Math.round(score * 100) / 100,
        claims: verifiedClaims,
        unsupportedClaims,
        confidence,
        reasoning
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      if (error instanceof Error) {
        throw new ApiError(400, `Faithfulness verification failed: ${error.message}`);
      }
      throw error;
    }
  },

  /**
   * Extract claims/factual statements from answer
   */
  async extractClaims(answer: string): Promise<Claim[]> {
    try {
      if (!answer || answer.trim().length === 0) {
        return [];
      }

      const prompt = `Extract factual claims from the following text. Return a JSON array of objects with "statement" and "confidence" (0-1) fields.
Only extract claims that are specific enough to be verifiable against source documents.
Return ONLY valid JSON, no markdown or explanation.

Text: "${answer}"`;

      let response;
      try {
        response = await aiService.generateContent(prompt);
      } catch (error) {
        console.error('AI extraction failed, using fallback:', error);
        return faithfulnessService.extractClaimsFallback(answer);
      }

      // Parse AI response
      try {
        const parsed = JSON.parse(response);
        if (!Array.isArray(parsed)) {
          return faithfulnessService.extractClaimsFallback(answer);
        }

        // Validate and filter claims
        return parsed
          .filter((item: any) => {
            return item.statement && typeof item.statement === 'string' && item.statement.trim().length > 0;
          })
          .map((item: any) => ({
            statement: item.statement.trim(),
            confidence: Math.max(0, Math.min(1, item.confidence || 0.5))
          }));
      } catch {
        return faithfulnessService.extractClaimsFallback(answer);
      }
    } catch (error) {
      console.error('Claim extraction error:', error);
      return [];
    }
  },

  /**
   * Fallback claim extraction using simple heuristics
   */
  extractClaimsFallback(answer: string): Claim[] {
    const claims: Claim[] = [];
    const sentences = answer.split(/[.!?]+/).filter((s) => s.trim().length > 20);

    // Take up to 5 significant sentences as claims
    sentences.slice(0, 5).forEach((sentence) => {
      const trimmed = sentence.trim();
      if (trimmed.length > 20 && !trimmed.startsWith('http')) {
        claims.push({
          statement: trimmed,
          confidence: 0.6
        });
      }
    });

    return claims;
  },

  /**
   * Verify single claim against sources
   */
  async verifyClaim(claim: string, sources: DocumentChunk[]): Promise<boolean> {
    try {
      if (!claim || claim.trim().length === 0 || sources.length === 0) {
        return false;
      }

      // Prepare source context
      const sourceContext = sources
        .slice(0, 5) // Use top 5 sources for efficiency
        .map((src, idx) => `Source ${idx + 1}: ${src.content}`)
        .join('\n---\n');

      const prompt = `Based on the following sources, is the claim TRUE, FALSE, or UNKNOWN?
Respond with ONLY one word: TRUE, FALSE, or UNKNOWN

Claim: "${claim}"

Sources:
${sourceContext}`;

      let response;
      try {
        response = await aiService.generateContent(prompt);
      } catch (error) {
        console.error('AI verification failed:', error);
        // Default to unverified if AI fails
        return false;
      }

      const answer = response.trim().toUpperCase();
      return answer === 'TRUE' || answer.startsWith('TRUE');
    } catch (error) {
      console.error('Claim verification error:', error);
      return false;
    }
  },

  /**
   * Batch verify multiple claims
   */
  async verifyClaimsBatch(
    claims: string[],
    sources: DocumentChunk[]
  ): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();

    for (const claim of claims) {
      const isSupported = await this.verifyClaim(claim, sources);
      results.set(claim, isSupported);
    }

    return results;
  },

  /**
   * Get faithfulness score without detailed breakdown
   */
  async getFaithfulnessScore(answer: string, sources: DocumentChunk[]): Promise<number> {
    const result = await this.verifyFaithfulness(answer, sources);
    return result.score;
  },

  /**
   * Detect obvious hallucinations
   */
  async detectHallucinations(answer: string, sources: DocumentChunk[]): Promise<string[]> {
    const result = await this.verifyFaithfulness(answer, sources);

    if (result.confidence === 'hallucination') {
      return result.unsupportedClaims;
    }

    // Also flag low-confidence claims
    return result.claims
      .filter((claim) => !claim.supported || claim.confidence < 0.5)
      .map((claim) => claim.statement);
  }
};
