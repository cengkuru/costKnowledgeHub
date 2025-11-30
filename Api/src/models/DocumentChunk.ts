import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { ResourceType, RESOURCE_TYPES, Theme, THEMES, LanguageCode, LANGUAGE_CODES } from './Resource';

// Document chunk interface for RAG pipeline
export interface DocumentChunk {
  _id?: ObjectId;
  resourceId: ObjectId;           // Parent document
  content: string;                // Chunk text
  embedding?: number[];           // Vector (1536 dimensions for Gemini)

  // Source tracking
  sourceSection: string;          // "Section 3.2: Data Quality"
  pageNumber?: number;
  charStart: number;
  charEnd: number;

  // Metadata (inherited from parent resource)
  resourceType: ResourceType;
  language: LanguageCode;
  themes: Theme[];

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// Zod schema for validation
export const DocumentChunkSchema = z.object({
  _id: z.instanceof(ObjectId).optional(),
  resourceId: z.instanceof(ObjectId),
  content: z.string().min(50).max(5000), // Reasonable chunk size
  embedding: z.array(z.number()).length(1536).optional(),

  // Source tracking
  sourceSection: z.string().min(1).max(500),
  pageNumber: z.number().int().positive().optional(),
  charStart: z.number().int().min(0),
  charEnd: z.number().int().positive(),

  // Metadata
  resourceType: z.enum(RESOURCE_TYPES as unknown as [string, ...string[]]),
  language: z.enum(LANGUAGE_CODES as unknown as [string, ...string[]]),
  themes: z.array(z.enum(THEMES as unknown as [string, ...string[]])),

  // Timestamps
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date())
});

// Input schema for creating chunks
export const CreateChunkSchema = DocumentChunkSchema.partial({
  _id: true,
  embedding: true,
  createdAt: true,
  updatedAt: true
}).extend({
  // Validate char positions
  charEnd: z.number().int().positive()
}).refine((data) => data.charEnd > data.charStart, {
  message: 'charEnd must be greater than charStart',
  path: ['charEnd']
});

export type ChunkInput = z.infer<typeof CreateChunkSchema>;

// Collection name
export const CHUNKS_COLLECTION = 'document_chunks';

// Helper to validate chunk size
export function isValidChunkSize(content: string, minTokens = 50, maxTokens = 1000): boolean {
  // Rough approximation: 1 token ≈ 4 characters
  const estimatedTokens = content.length / 4;
  return estimatedTokens >= minTokens && estimatedTokens <= maxTokens;
}

// Chunking strategies by resource type
export const CHUNK_STRATEGIES = {
  guidance: {
    minTokens: 500,
    maxTokens: 1000,
    strategy: 'heading' as const // Chunk by H1-H3
  },
  assurance_report: {
    minTokens: 300,
    maxTokens: 600,
    strategy: 'finding' as const // By finding/recommendation
  },
  case_study: {
    minTokens: 400,
    maxTokens: 800,
    strategy: 'narrative' as const // By narrative section
  },
  tool: {
    minTokens: 200,
    maxTokens: 400,
    strategy: 'step' as const // By step
  },
  template: {
    minTokens: 200,
    maxTokens: 400,
    strategy: 'step' as const
  },
  research: {
    minTokens: 400,
    maxTokens: 800,
    strategy: 'narrative' as const
  },
  news: {
    minTokens: 300,
    maxTokens: 600,
    strategy: 'narrative' as const
  },
  training: {
    minTokens: 300,
    maxTokens: 600,
    strategy: 'step' as const
  },
  policy: {
    minTokens: 400,
    maxTokens: 800,
    strategy: 'narrative' as const
  }
} as const;
