import { ObjectId } from 'mongodb';
import { CategorySchema, CategoryInputSchema } from '../../models/Category';

describe('Category Model Validation', () => {
  describe('CategorySchema', () => {
    it('should validate a complete valid category', () => {
      const validCategory = {
        _id: new ObjectId(),
        name: 'Infrastructure',
        slug: 'infrastructure',
        description: 'Resources related to infrastructure projects',
        parentCategory: new ObjectId(),
        order: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = CategorySchema.safeParse(validCategory);
      expect(result.success).toBe(true);
    });

    it('should apply defaults for order and timestamps', () => {
      const minimalCategory = {
        name: 'Climate',
        slug: 'climate'
      };

      const result = CategorySchema.parse(minimalCategory);
      expect(result.order).toBe(0);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should validate category without parent (top-level)', () => {
      const topLevelCategory = {
        name: 'Main Category',
        slug: 'main-category',
        order: 0
      };

      const result = CategorySchema.safeParse(topLevelCategory);
      expect(result.success).toBe(true);
    });

    it('should reject empty name', () => {
      const invalidCategory = {
        name: '',
        slug: 'valid-slug'
      };

      const result = CategorySchema.safeParse(invalidCategory);
      expect(result.success).toBe(false);
    });

    it('should reject name that is too long', () => {
      const invalidCategory = {
        name: 'a'.repeat(101),
        slug: 'valid-slug'
      };

      const result = CategorySchema.safeParse(invalidCategory);
      expect(result.success).toBe(false);
    });

    it('should reject invalid slug format (uppercase)', () => {
      const invalidCategory = {
        name: 'Valid Name',
        slug: 'Invalid-Slug'
      };

      const result = CategorySchema.safeParse(invalidCategory);
      expect(result.success).toBe(false);
    });

    it('should reject invalid slug format (spaces)', () => {
      const invalidCategory = {
        name: 'Valid Name',
        slug: 'invalid slug'
      };

      const result = CategorySchema.safeParse(invalidCategory);
      expect(result.success).toBe(false);
    });

    it('should reject invalid slug format (special characters)', () => {
      const invalidCategory = {
        name: 'Valid Name',
        slug: 'invalid_slug!'
      };

      const result = CategorySchema.safeParse(invalidCategory);
      expect(result.success).toBe(false);
    });

    it('should accept valid slug formats', () => {
      const validSlugs = [
        'simple',
        'with-dashes',
        'with-numbers-123',
        'climate-finance',
        '2024-guidelines'
      ];

      validSlugs.forEach(slug => {
        const category = {
          name: 'Test Category',
          slug
        };
        const result = CategorySchema.safeParse(category);
        expect(result.success).toBe(true);
      });
    });

    it('should reject description that is too long', () => {
      const invalidCategory = {
        name: 'Valid Name',
        slug: 'valid-slug',
        description: 'a'.repeat(501)
      };

      const result = CategorySchema.safeParse(invalidCategory);
      expect(result.success).toBe(false);
    });

    it('should reject negative order', () => {
      const invalidCategory = {
        name: 'Valid Name',
        slug: 'valid-slug',
        order: -1
      };

      const result = CategorySchema.safeParse(invalidCategory);
      expect(result.success).toBe(false);
    });

    it('should accept valid hierarchical category', () => {
      const parentId = new ObjectId();
      const childCategory = {
        name: 'Sub Category',
        slug: 'sub-category',
        parentCategory: parentId,
        order: 2
      };

      const result = CategorySchema.safeParse(childCategory);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.parentCategory).toEqual(parentId);
      }
    });
  });

  describe('CategoryInputSchema', () => {
    it('should allow minimal input for category creation', () => {
      const minimalInput = {
        name: 'New Category',
        slug: 'new-category'
      };

      const result = CategoryInputSchema.safeParse(minimalInput);
      expect(result.success).toBe(true);
    });

    it('should not require _id for input', () => {
      const input = {
        name: 'Category',
        slug: 'category'
      };

      const result = CategoryInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should not require timestamp fields', () => {
      const input = {
        name: 'Category',
        slug: 'category',
        order: 5
      };

      const result = CategoryInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should still validate slug format in input', () => {
      const invalidInput = {
        name: 'Category',
        slug: 'Invalid Slug'
      };

      const result = CategoryInputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });
});
