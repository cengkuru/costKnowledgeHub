/**
 * AI-Powered Document Summarizer
 *
 * Generates helpful, contextual descriptions of documents to guide researchers.
 * Uses Gemini to create concise, actionable summaries instead of raw text dumps.
 *
 * Jony Ive Philosophy: Simple. Clear. Helpful.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config.js';

const genAI = new GoogleGenerativeAI(config.geminiApiKey);
const model = genAI.getGenerativeModel({
  model: config.geminiModel,  // Use gemini-flash-latest from .env
  generationConfig: {
    temperature: 0.3,  // Low temperature for consistent, factual summaries
    maxOutputTokens: 100  // Keep it concise
  }
});

export interface DocumentSummary {
  summary: string;  // One clear sentence about what's in the document
  error?: string;
}

/**
 * Generate a helpful, contextual summary for a single document
 *
 * Takes raw document text and generates a clear, guiding description
 * that helps researchers understand what's inside without opening it.
 *
 * Examples of good summaries:
 * - "Explains procurement transparency best practices for Asian infrastructure projects"
 * - "Framework for project disclosure requirements in developing countries"
 * - "Case study of monitoring implementation in Kenya's road projects"
 *
 * @param title Document title
 * @param text Full document text (will be truncated if too long)
 * @param type Document type (Manual, Guide, Template, etc.)
 * @returns Promise<DocumentSummary>
 */
export async function generateSummary(
  title: string,
  text: string,
  type: string
): Promise<DocumentSummary> {
  try {
    // If text is too short or empty, fall back to title-based summary
    if (!text || text.trim().length < 50) {
      return {
        summary: `${type}: ${title.slice(0, 120)}${title.length > 120 ? '…' : ''}`
      };
    }

    // Clean the text to remove navigation, metadata, and irrelevant content
    const cleanedText = cleanDocumentText(text);

    // If cleaning left us with nothing useful, fall back
    if (!cleanedText || cleanedText.length < 50) {
      return {
        summary: generateFallbackSummary(title, type)
      };
    }

    // Use cleaned text, truncated to 2500 chars for better context
    const truncatedText = cleanedText.slice(0, 2500);

    const prompt = `You are a research assistant helping infrastructure transparency researchers.

Write ONE complete sentence (20-30 words) that captures what this document offers.

RULES:
- Start with action verb: Explains/Provides/Outlines/Details/Describes
- Focus on practical value and key content
- Complete sentence - NO TRUNCATIONS or "..."
- No metadata, navigation text, or emails
- Be specific and helpful

Document Title: ${title}
Type: ${type}
Content: ${truncatedText}

Write ONE complete sentence (20-30 words):`;

    const result = await model.generateContent(prompt);
    const generatedText = result.response.text().trim();

    // If Gemini returns empty, fall back
    if (!generatedText || generatedText.length < 10) {
      console.warn('Gemini returned empty/short response, using fallback');
      return {
        summary: extractFirstSentence(text).slice(0, 177) + '…',
        error: 'AI summary unavailable'
      };
    }

    // Clean up the response - remove quotes, extra punctuation
    let cleanSummary = generatedText
      .replace(/^["']|["']$/g, '')  // Remove surrounding quotes
      .replace(/^-\s*/, '')          // Remove leading dash
      .replace(/\.{2,}$/g, '')       // Remove trailing ellipsis
      .replace(/…$/g, '')            // Remove trailing ellipsis character
      .replace(/\s+/g, ' ')          // Normalize whitespace
      .trim();

    // Ensure it ends with proper punctuation
    if (!cleanSummary.match(/[.!?]$/)) {
      cleanSummary += '.';
    }

    // Validate: should be 20-200 characters
    if (cleanSummary.length < 20) {
      console.warn('AI summary too short, using fallback');
      return {
        summary: generateFallbackSummary(title, type),
        error: 'AI summary too short'
      };
    }

    // If somehow too long, intelligently truncate at sentence boundary
    if (cleanSummary.length > 250) {
      const sentences = cleanSummary.split(/([.!?]+\s+)/);
      let result = '';
      for (let i = 0; i < sentences.length; i += 2) {
        const withNext = result + sentences[i] + (sentences[i + 1] || '');
        if (withNext.length > 200) break;
        result = withNext;
      }
      cleanSummary = result.trim() || cleanSummary.slice(0, 197) + '...';
    }

    return { summary: cleanSummary };
  } catch (error) {
    console.error('Summary generation failed:', error);

    // Graceful fallback: extract first meaningful sentence from text
    const firstSentence = extractFirstSentence(text);
    if (firstSentence && firstSentence.length > 20) {
      // Ensure complete sentence, no truncations
      const completeSentence = firstSentence.length > 200
        ? firstSentence.slice(0, 197).replace(/\s+\w+$/, '') + '.'
        : firstSentence;

      return {
        summary: completeSentence,
        error: 'AI summary unavailable, showing excerpt'
      };
    }

    // Final fallback: use smart title-based summary
    return {
      summary: generateFallbackSummary(title, type),
      error: 'AI summary unavailable'
    };
  }
}

/**
 * Batch generate summaries for multiple documents
 *
 * Processes documents in parallel with graceful error handling.
 * Failed summaries fall back to text excerpts.
 *
 * @param documents Array of {title, text, type}
 * @returns Promise<DocumentSummary[]>
 */
export async function generateSummaries(
  documents: Array<{ title: string; text: string; type: string }>
): Promise<DocumentSummary[]> {
  // Generate all summaries in parallel for speed
  const summaryPromises = documents.map(doc =>
    generateSummary(doc.title, doc.text, doc.type)
  );

  return await Promise.all(summaryPromises);
}

/**
 * Clean document text to remove navigation, metadata, and irrelevant content
 * Jony Ive principle: Remove everything that isn't essential
 */
function cleanDocumentText(text: string): string {
  if (!text) return '';

  let cleaned = text;

  // Remove common navigation patterns
  cleaned = cleaned
    .replace(/Skip to (content|main|navigation)/gi, '')
    .replace(/Search\s+(About|Home|Menu|Tools)/gi, '')
    .replace(/Email:\s*[^\n]*/gi, '')  // Remove email headers
    .replace(/From:\s*[^\n]*/gi, '')
    .replace(/To:\s*[^\n]*/gi, '')
    .replace(/Subject:\s*[^\n]*/gi, '')
    .replace(/Date:\s*[^\n]*/gi, '')
    .replace(/Reply-To:\s*[^\n]*/gi, '')
    .replace(/\b[A-Z][a-z]+\s*\|\s*CoST\b/g, '')  // Remove "Name | CoST" patterns
    .replace(/– Infrastructure Transparency Initiative\s*/g, '')
    .replace(/Home\s+About\s+Blog\s+Contact/gi, '')
    .replace(/Menu\s+(Home|About|Contact|Blog)/gi, '')
    .replace(/Copyright\s*©.*$/gim, '')
    .replace(/All rights reserved.*$/gim, '')
    .replace(/Privacy Policy.*$/gim, '')
    .replace(/Terms of Service.*$/gim, '');

  // Remove repeated organization names
  cleaned = cleaned.replace(/(CoST\s*–?\s*Infrastructure Transparency Initiative\s*){2,}/gi, '');

  // Remove excessive whitespace
  cleaned = cleaned
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s{3,}/g, ' ')
    .trim();

  return cleaned;
}

/**
 * Generate fallback summary from title and type
 * Used when AI is unavailable or returns poor results
 */
function generateFallbackSummary(title: string, type: string): string {
  // Extract key information from title
  const cleanTitle = title
    .replace(/\s*–\s*CoST.*$/i, '')  // Remove org suffix
    .replace(/\s*\|\s*CoST.*$/i, '')
    .replace(/\s*\(Part \d+\/\d+\).*$/i, '')  // Remove part numbers
    .trim();

  // Generate action-based summary based on document type
  const actionVerbs: Record<string, string> = {
    'Guide': 'Provides guidance on',
    'Manual': 'Details procedures for',
    'Template': 'Offers template for',
    'Report': 'Presents findings on',
    'News': 'Discusses recent developments in',
    'Blog': 'Explores topics related to',
    'Case Study': 'Examines case study of',
    'Framework': 'Outlines framework for',
    'Policy': 'Describes policy on',
    'Standard': 'Defines standards for'
  };

  const verb = actionVerbs[type] || 'Covers';

  // Intelligently shorten title if needed (complete words only, no truncations)
  const maxLength = 150 - verb.length;
  let finalTitle = cleanTitle;

  if (cleanTitle.length > maxLength) {
    // Truncate at word boundary, no ellipsis
    finalTitle = cleanTitle.slice(0, maxLength).replace(/\s+\w+$/, '').trim();
  }

  return `${verb} ${finalTitle}.`;
}

/**
 * Extract first meaningful sentence from text
 * Helper for fallback when AI is unavailable
 */
function extractFirstSentence(text: string): string {
  if (!text) return '';

  // Clean up common metadata patterns
  const cleaned = cleanDocumentText(text);

  // Find first sentence (period, question mark, or exclamation)
  const match = cleaned.match(/^[^.!?]+[.!?]/);
  if (match) {
    return match[0].trim();
  }

  // If no sentence found, take first 180 chars intelligently
  const words = cleaned.split(/\s+/);
  let result = '';
  for (const word of words) {
    if ((result + word).length > 180) break;
    result += (result ? ' ' : '') + word;
  }

  return result;
}

/**
 * Quick, synchronous text excerpt generator
 * Used when AI summaries are disabled or for immediate fallback
 */
export function generateQuickExcerpt(text: string, maxLength: number = 180): string {
  if (!text) return '';

  const cleaned = extractFirstSentence(text);
  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  return cleaned.slice(0, maxLength - 1) + '…';
}
