/**
 * Text Chunking Utility
 *
 * Intelligently splits large documents into smaller chunks for embedding
 * while preserving semantic boundaries and context
 */

export interface ChunkOptions {
  maxTokens?: number; // Approximate max tokens per chunk (default: 512)
  overlap?: number; // Token overlap between chunks (default: 50)
  preserveContext?: boolean; // Keep section headers in each chunk (default: true)
}

export interface Chunk {
  text: string;
  index: number;
  totalChunks: number;
  startChar: number;
  endChar: number;
}

/**
 * Approximate token count (rough estimate: 1 token ≈ 4 characters)
 */
const estimateTokens = (text: string): number => {
  return Math.ceil(text.length / 4);
};

/**
 * Split text by paragraphs while preserving structure
 */
const splitIntoParagraphs = (text: string): string[] => {
  return text
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0);
};

/**
 * Split text by sentences
 */
const splitIntoSentences = (text: string): string[] => {
  return text
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
};

/**
 * Extract section header from text (if present)
 */
const extractSectionHeader = (text: string): string | null => {
  const headerMatch = text.match(/^(#{1,6}\s+.+|[A-Z][A-Za-z\s]+:)/m);
  return headerMatch ? headerMatch[0].trim() : null;
};

/**
 * Chunk text intelligently while preserving semantic boundaries
 *
 * Strategy:
 * 1. Split by paragraphs first
 * 2. If paragraph too large, split by sentences
 * 3. Add overlap between chunks for context
 * 4. Preserve section headers if enabled
 *
 * @param text Full document text
 * @param options Chunking configuration
 * @returns Array of text chunks with metadata
 */
export const chunkText = (
  text: string,
  options: ChunkOptions = {}
): Chunk[] => {
  const {
    maxTokens = 512,
    overlap = 50,
    preserveContext = true
  } = options;

  const chunks: Chunk[] = [];
  const paragraphs = splitIntoParagraphs(text);

  let currentChunk: string[] = [];
  let currentTokens = 0;
  let charPosition = 0;
  const sectionHeader = preserveContext ? extractSectionHeader(text) : null;

  for (const paragraph of paragraphs) {
    const paraTokens = estimateTokens(paragraph);

    // If single paragraph exceeds max, split by sentences
    if (paraTokens > maxTokens) {
      // Save current chunk if exists
      if (currentChunk.length > 0) {
        const chunkText = currentChunk.join('\n\n');
        chunks.push({
          text: sectionHeader ? `${sectionHeader}\n\n${chunkText}` : chunkText,
          index: chunks.length,
          totalChunks: 0, // Updated later
          startChar: charPosition,
          endChar: charPosition + chunkText.length
        });
        charPosition += chunkText.length + 2; // +2 for \n\n
        currentChunk = [];
        currentTokens = 0;
      }

      // Split large paragraph by sentences
      const sentences = splitIntoSentences(paragraph);
      let sentenceChunk: string[] = [];
      let sentenceTokens = 0;

      for (const sentence of sentences) {
        const sentenceTokenCount = estimateTokens(sentence);

        if (sentenceTokens + sentenceTokenCount > maxTokens && sentenceChunk.length > 0) {
          // Save sentence chunk
          const chunkText = sentenceChunk.join(' ');
          chunks.push({
            text: sectionHeader ? `${sectionHeader}\n\n${chunkText}` : chunkText,
            index: chunks.length,
            totalChunks: 0,
            startChar: charPosition,
            endChar: charPosition + chunkText.length
          });
          charPosition += chunkText.length + 2;

          // Add overlap
          sentenceChunk = sentenceChunk.slice(-1); // Keep last sentence for overlap
          sentenceTokens = estimateTokens(sentenceChunk[0] || '');
        }

        sentenceChunk.push(sentence);
        sentenceTokens += sentenceTokenCount;
      }

      // Save remaining sentences
      if (sentenceChunk.length > 0) {
        const chunkText = sentenceChunk.join(' ');
        chunks.push({
          text: sectionHeader ? `${sectionHeader}\n\n${chunkText}` : chunkText,
          index: chunks.length,
          totalChunks: 0,
          startChar: charPosition,
          endChar: charPosition + chunkText.length
        });
        charPosition += chunkText.length + 2;
      }
    } else if (currentTokens + paraTokens > maxTokens) {
      // Current paragraph would exceed limit, save current chunk
      const chunkText = currentChunk.join('\n\n');
      chunks.push({
        text: sectionHeader ? `${sectionHeader}\n\n${chunkText}` : chunkText,
        index: chunks.length,
        totalChunks: 0,
        startChar: charPosition,
        endChar: charPosition + chunkText.length
      });
      charPosition += chunkText.length + 2;

      // Start new chunk with overlap
      if (overlap > 0 && currentChunk.length > 0) {
        const overlapText = currentChunk[currentChunk.length - 1];
        currentChunk = [overlapText, paragraph];
        currentTokens = estimateTokens(overlapText) + paraTokens;
      } else {
        currentChunk = [paragraph];
        currentTokens = paraTokens;
      }
    } else {
      // Add to current chunk
      currentChunk.push(paragraph);
      currentTokens += paraTokens;
    }
  }

  // Save final chunk
  if (currentChunk.length > 0) {
    const chunkText = currentChunk.join('\n\n');
    chunks.push({
      text: sectionHeader ? `${sectionHeader}\n\n${chunkText}` : chunkText,
      index: chunks.length,
      totalChunks: 0,
      startChar: charPosition,
      endChar: charPosition + chunkText.length
    });
  }

  // Update totalChunks for all chunks
  const totalChunks = chunks.length;
  chunks.forEach(chunk => {
    chunk.totalChunks = totalChunks;
  });

  return chunks;
};

/**
 * Chunk multiple documents in batch
 */
export const chunkDocuments = (
  documents: Array<{ id: string; text: string }>,
  options?: ChunkOptions
): Array<{ docId: string; chunks: Chunk[] }> => {
  return documents.map(doc => ({
    docId: doc.id,
    chunks: chunkText(doc.text, options)
  }));
};
