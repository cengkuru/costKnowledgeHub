/**
 * Adaptive Text Chunking Utility
 *
 * Intelligently adjusts chunk sizes based on content type and density
 * for optimal semantic quality and retrieval performance
 */

export interface AdaptiveChunkOptions {
  contentType?: 'technical' | 'narrative' | 'mixed' | 'auto'; // Auto-detect if not specified
  minTokens?: number; // Minimum chunk size (default: 256)
  maxTokens?: number; // Maximum chunk size (default: 768)
  overlap?: number; // Token overlap between chunks (default: 50)
  preserveContext?: boolean; // Keep section headers (default: true)
}

export interface AdaptiveChunk {
  text: string;
  index: number;
  totalChunks: number;
  startChar: number;
  endChar: number;
  contentType: string;
  tokenCount: number;
}

/**
 * Approximate token count (1 token ≈ 4 characters)
 */
const estimateTokens = (text: string): number => {
  return Math.ceil(text.length / 4);
};

/**
 * Detect content type based on text characteristics
 */
const detectContentType = (text: string): 'technical' | 'narrative' | 'mixed' => {
  const sample = text.slice(0, 2000); // Analyze first 2000 chars

  // Technical indicators
  const technicalIndicators = [
    /\b(schema|field|type|value|object|array|property|parameter)\b/gi,
    /\b(function|method|class|interface|API|endpoint)\b/gi,
    /```|`[^`]+`/g, // Code blocks
    /\{|\}|\[|\]/g, // JSON-like structures
    /\b(MUST|SHOULD|MAY|SHALL)\b/g // RFC-style keywords
  ];

  const technicalScore = technicalIndicators.reduce((score, pattern) => {
    const matches = sample.match(pattern);
    return score + (matches ? matches.length : 0);
  }, 0);

  // Narrative indicators
  const narrativeIndicators = [
    /\b(story|example|case|impact|community|people|project)\b/gi,
    /[.!?]\s+[A-Z]/g, // Sentence boundaries
    /\b(improved|achieved|resulted|demonstrated|benefited)\b/gi
  ];

  const narrativeScore = narrativeIndicators.reduce((score, pattern) => {
    const matches = sample.match(pattern);
    return score + (matches ? matches.length : 0);
  }, 0);

  // Determine type based on scores
  const ratio = technicalScore / (narrativeScore + 1);

  if (ratio > 2) return 'technical';
  if (ratio < 0.5) return 'narrative';
  return 'mixed';
};

/**
 * Get optimal chunk size based on content type
 */
const getOptimalChunkSize = (
  contentType: 'technical' | 'narrative' | 'mixed',
  options: AdaptiveChunkOptions
): number => {
  const { minTokens = 256, maxTokens = 768 } = options;

  switch (contentType) {
    case 'technical':
      // Smaller chunks for dense technical content
      return Math.max(minTokens, Math.floor(maxTokens * 0.4)); // ~307 tokens
    case 'narrative':
      // Larger chunks for flowing narrative content
      return maxTokens; // 768 tokens
    case 'mixed':
      // Medium chunks for mixed content
      return Math.floor((minTokens + maxTokens) / 2); // ~512 tokens
  }
};

/**
 * Split text by paragraphs
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
 * Extract section header
 */
const extractSectionHeader = (text: string): string | null => {
  const headerMatch = text.match(/^(#{1,6}\s+.+|[A-Z][A-Za-z\s]+:)/m);
  return headerMatch ? headerMatch[0].trim() : null;
};

/**
 * Adaptive text chunking with content-aware sizing
 *
 * Strategy:
 * 1. Auto-detect or use specified content type
 * 2. Determine optimal chunk size for content type
 * 3. Split intelligently by paragraphs/sentences
 * 4. Add overlap for context preservation
 * 5. Include section headers if enabled
 *
 * @param text Full document text
 * @param options Adaptive chunking configuration
 * @returns Array of adaptively-sized chunks with metadata
 */
export const chunkTextAdaptive = (
  text: string,
  options: AdaptiveChunkOptions = {}
): AdaptiveChunk[] => {
  const {
    contentType: specifiedType = 'auto',
    overlap = 50,
    preserveContext = true
  } = options;

  // Detect or use specified content type
  const contentType = specifiedType === 'auto'
    ? detectContentType(text)
    : specifiedType;

  const optimalChunkSize = getOptimalChunkSize(contentType, options);

  const chunks: AdaptiveChunk[] = [];
  const paragraphs = splitIntoParagraphs(text);

  let currentChunk: string[] = [];
  let currentTokens = 0;
  let charPosition = 0;
  const sectionHeader = preserveContext ? extractSectionHeader(text) : null;

  console.log(`  - Content type: ${contentType}`);
  console.log(`  - Optimal chunk size: ${optimalChunkSize} tokens`);

  for (const paragraph of paragraphs) {
    const paraTokens = estimateTokens(paragraph);

    // If paragraph exceeds optimal size, split by sentences
    if (paraTokens > optimalChunkSize) {
      // Save current chunk if exists
      if (currentChunk.length > 0) {
        const chunkText = currentChunk.join('\n\n');
        const finalText = sectionHeader ? `${sectionHeader}\n\n${chunkText}` : chunkText;
        chunks.push({
          text: finalText,
          index: chunks.length,
          totalChunks: 0,
          startChar: charPosition,
          endChar: charPosition + chunkText.length,
          contentType,
          tokenCount: estimateTokens(finalText)
        });
        charPosition += chunkText.length + 2;
        currentChunk = [];
        currentTokens = 0;
      }

      // Split large paragraph by sentences
      const sentences = splitIntoSentences(paragraph);
      let sentenceChunk: string[] = [];
      let sentenceTokens = 0;

      for (const sentence of sentences) {
        const sentenceTokenCount = estimateTokens(sentence);

        if (sentenceTokens + sentenceTokenCount > optimalChunkSize && sentenceChunk.length > 0) {
          const chunkText = sentenceChunk.join(' ');
          const finalText = sectionHeader ? `${sectionHeader}\n\n${chunkText}` : chunkText;
          chunks.push({
            text: finalText,
            index: chunks.length,
            totalChunks: 0,
            startChar: charPosition,
            endChar: charPosition + chunkText.length,
            contentType,
            tokenCount: estimateTokens(finalText)
          });
          charPosition += chunkText.length + 2;

          // Add overlap
          sentenceChunk = sentenceChunk.slice(-1);
          sentenceTokens = estimateTokens(sentenceChunk[0] || '');
        }

        sentenceChunk.push(sentence);
        sentenceTokens += sentenceTokenCount;
      }

      // Save remaining sentences
      if (sentenceChunk.length > 0) {
        const chunkText = sentenceChunk.join(' ');
        const finalText = sectionHeader ? `${sectionHeader}\n\n${chunkText}` : chunkText;
        chunks.push({
          text: finalText,
          index: chunks.length,
          totalChunks: 0,
          startChar: charPosition,
          endChar: charPosition + chunkText.length,
          contentType,
          tokenCount: estimateTokens(finalText)
        });
        charPosition += chunkText.length + 2;
      }
    } else if (currentTokens + paraTokens > optimalChunkSize) {
      // Paragraph would exceed limit, save current chunk
      const chunkText = currentChunk.join('\n\n');
      const finalText = sectionHeader ? `${sectionHeader}\n\n${chunkText}` : chunkText;
      chunks.push({
        text: finalText,
        index: chunks.length,
        totalChunks: 0,
        startChar: charPosition,
        endChar: charPosition + chunkText.length,
        contentType,
        tokenCount: estimateTokens(finalText)
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
    const finalText = sectionHeader ? `${sectionHeader}\n\n${chunkText}` : chunkText;
    chunks.push({
      text: finalText,
      index: chunks.length,
      totalChunks: 0,
      startChar: charPosition,
      endChar: charPosition + chunkText.length,
      contentType,
      tokenCount: estimateTokens(finalText)
    });
  }

  // Update totalChunks for all chunks
  const totalChunks = chunks.length;
  chunks.forEach(chunk => {
    chunk.totalChunks = totalChunks;
  });

  // Calculate and log statistics
  const avgTokens = Math.round(
    chunks.reduce((sum, c) => sum + c.tokenCount, 0) / chunks.length
  );
  console.log(`  - Chunks created: ${chunks.length}`);
  console.log(`  - Average chunk size: ${avgTokens} tokens`);

  return chunks;
};

/**
 * Batch adaptive chunking for multiple documents
 */
export const chunkDocumentsAdaptive = (
  documents: Array<{ id: string; text: string; contentType?: 'technical' | 'narrative' | 'mixed' }>,
  options?: AdaptiveChunkOptions
): Array<{ docId: string; chunks: AdaptiveChunk[] }> => {
  return documents.map(doc => ({
    docId: doc.id,
    chunks: chunkTextAdaptive(doc.text, {
      ...options,
      contentType: doc.contentType || options?.contentType
    })
  }));
};
