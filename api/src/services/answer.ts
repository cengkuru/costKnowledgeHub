import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config.js';
import { AnswerBullet, Snippet } from '../types.js';

const genAI = new GoogleGenerativeAI(config.geminiApiKey);
const model = genAI.getGenerativeModel({ model: config.geminiModel });

/**
 * Synthesizes answer from snippets using Gemini Flash
 *
 * Key features:
 * - 3-6 short, cited bullets
 * - Every bullet MUST cite at least one source using [#N] notation
 * - Bullets without citations are filtered out
 * - Only uses provided excerpts (no hallucination)
 *
 * @param query User's question
 * @param snippets Array of document excerpts with metadata
 * @returns Answer with cited bullets
 */
export const synthesizeAnswer = async (
  query: string,
  snippets: Snippet[]
): Promise<{ answer: AnswerBullet[] }> => {
  // Build context from snippets with numbered references
  const context = snippets
    .filter(s => s.text && s.text.length > 0) // Filter out snippets without text
    .map(
      (s, i) =>
        `[#${i + 1}] ${s.title}\nURL: ${s.url}\nEXCERPT:\n${s.text.slice(0, 1200)}\n`
    )
    .join('\n');

  const prompt = `
You answer in 3–6 short bullets. Every bullet MUST cite one or more sources using [#N] where N is from the bracketed list.
Only use the provided excerpts. If unsure, say you don't have evidence.

Question: ${query}

Sources:
${context}
`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  // Parse bullets and extract citations
  const bullets = text
    .split('\n')
    .map(s => s.trim())
    .filter(s => s.startsWith('-') || s.startsWith('•') || s.startsWith('*'))
    .map(line => {
      // Extract citation numbers: [#1], [#2], etc.
      const citationMatches = [...line.matchAll(/\[#(\d+)\]/g)];
      const citationIndices = citationMatches
        .map(m => Number(m[1]) - 1)
        .filter(i => i >= 0 && i < snippets.length);

      const cites = citationIndices.map(i => ({
        title: snippets[i].title,
        url: snippets[i].url
      }));

      // Remove citation markers from display text
      const cleanText = line
        .replace(/\s*\[#\d+\]/g, '')
        .replace(/^[-•*]\s*/, '')
        .trim();

      return { text: cleanText, cites };
    })
    .filter(bullet => bullet.cites.length >= 1); // Drop bullets without citations

  return { answer: bullets };
};
