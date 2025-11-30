import { ObjectId } from 'mongodb';
import { z } from 'zod';

export const TOPICS_COLLECTION_NAME = 'topics';

export interface Topic {
  _id?: ObjectId;
  name: string;
  slug: string;
  description: string;
  imageUrl?: string;
  aiGeneratedImage?: string; // AI-generated image URL
  displayOrder: number;
  isActive: boolean;
  isDefault?: boolean; // Protected default topic - cannot be deleted
  resourceCount: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: ObjectId;
  updatedBy: ObjectId;
}

export const DEFAULT_TOPIC_SLUG = 'uncategorized';

// Zod validation schemas
export const CreateTopicSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  displayOrder: z.number().int().min(0).optional().default(0),
  isActive: z.boolean().optional().default(true),
});

export const UpdateTopicSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().min(1).max(500).optional(),
  imageUrl: z.string().url().optional().nullable(),
  displayOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export type CreateTopicInput = z.infer<typeof CreateTopicSchema>;
export type UpdateTopicInput = z.infer<typeof UpdateTopicSchema>;
