import { z } from 'zod';
import { ObjectId } from 'mongodb';

// TypeScript interface for Category
export interface Category {
  _id?: ObjectId;
  name: string;
  slug: string;
  description?: string;
  parentCategory?: ObjectId;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

// Zod schema for Category validation
export const CategorySchema = z.object({
  _id: z.instanceof(ObjectId).optional(),
  name: z.string().min(1).max(100),
  slug: z.string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  description: z.string().max(500).optional(),
  parentCategory: z.instanceof(ObjectId).optional(),
  order: z.number().int().min(0).default(0),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date())
});

// Input schema for creating/updating categories
export const CategoryInputSchema = CategorySchema.partial({
  _id: true,
  createdAt: true,
  updatedAt: true
});

// Type for category input
export type CategoryInput = z.infer<typeof CategoryInputSchema>;

export const CATEGORIES_COLLECTION_NAME = 'categories';
