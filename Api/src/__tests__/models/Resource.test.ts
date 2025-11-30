import { ObjectId } from 'mongodb';
import {
  ResourceSchema,
  ResourceInputSchema,
  StatusChangeSchema,
  ContentStatus,
  ResourceType,
  COUNTRY_PROGRAMS,
  THEMES,
  OC4IDS_SECTIONS,
  WORKSTREAMS,
  AUDIENCE_LEVELS,
  LANGUAGE_CODES,
  isValidCountryProgram,
  isValidTheme,
  isValidOC4IDSSection,
  isValidWorkstream,
  isValidAudienceLevel,
  getCountryProgramLabel,
  getThemeLabel,
  getOC4IDSSectionLabel,
  getWorkstreamLabel,
  getAudienceLevelLabel
} from '../../models/Resource';

describe('Resource Model Validation', () => {
  const validCategoryId = new ObjectId();
  const validUserId = new ObjectId();

  describe('ResourceSchema', () => {
    it('should validate a complete valid resource', () => {
      const validResource = {
        _id: new ObjectId(),
        title: 'Sample Resource',
        description: 'A detailed description of the resource',
        url: 'https://example.com/resource',
        slug: 'sample-resource',
        category: validCategoryId,
        tags: ['tag1', 'tag2'],
        resourceType: ResourceType.GUIDANCE,
        topics: ['climate', 'procurement'],
        regions: ['africa', 'asia'],
        countryPrograms: [],
        themes: [],
        oc4idsAlignment: [],
        workstreams: [],
        audience: [],
        accessLevel: 'public' as const,
        isTranslation: false,
        translations: [],
        publicationDate: new Date(),
        lastVerified: new Date(),
        status: ContentStatus.PUBLISHED,
        statusHistory: [],
        source: 'manual' as const,
        language: 'en',
        clicks: 0,
        aiCitations: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: validUserId,
        updatedBy: validUserId
      };

      const result = ResourceSchema.safeParse(validResource);
      expect(result.success).toBe(true);
    });

    it('should apply defaults for optional fields', () => {
      const minimalResource = {
        title: 'Minimal Resource',
        description: 'Description',
        url: 'https://example.com/minimal',
        slug: 'minimal-resource',
        category: validCategoryId,
        resourceType: ResourceType.TOOL,
        publicationDate: new Date(),
        lastVerified: new Date(),
        createdBy: validUserId,
        updatedBy: validUserId
      };

      const result = ResourceSchema.parse(minimalResource);
      expect(result.tags).toEqual([]);
      expect(result.topics).toEqual([]);
      expect(result.regions).toEqual([]);
      expect(result.countryPrograms).toEqual([]);
      expect(result.themes).toEqual([]);
      expect(result.oc4idsAlignment).toEqual([]);
      expect(result.workstreams).toEqual([]);
      expect(result.audience).toEqual([]);
      expect(result.status).toBe(ContentStatus.DISCOVERED);
      expect(result.statusHistory).toEqual([]);
      expect(result.source).toBe('manual');
      expect(result.language).toBe('en');
      expect(result.accessLevel).toBe('public');
      expect(result.isTranslation).toBe(false);
      expect(result.translations).toEqual([]);
      expect(result.clicks).toBe(0);
      expect(result.aiCitations).toBe(0);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should reject invalid title (empty)', () => {
      const invalidResource = {
        title: '',
        description: 'Description',
        url: 'https://example.com',
        category: validCategoryId,
        resourceType: ResourceType.GUIDANCE,
        createdBy: validUserId,
        updatedBy: validUserId
      };

      const result = ResourceSchema.safeParse(invalidResource);
      expect(result.success).toBe(false);
    });

    it('should reject invalid title (too long)', () => {
      const invalidResource = {
        title: 'a'.repeat(501),
        description: 'Description',
        url: 'https://example.com',
        category: validCategoryId,
        resourceType: ResourceType.GUIDANCE,
        createdBy: validUserId,
        updatedBy: validUserId
      };

      const result = ResourceSchema.safeParse(invalidResource);
      expect(result.success).toBe(false);
    });

    it('should reject invalid URL format', () => {
      const invalidResource = {
        title: 'Valid Title',
        description: 'Description',
        url: 'not-a-valid-url',
        category: validCategoryId,
        resourceType: ResourceType.GUIDANCE,
        createdBy: validUserId,
        updatedBy: validUserId
      };

      const result = ResourceSchema.safeParse(invalidResource);
      expect(result.success).toBe(false);
    });

    it('should reject invalid resource type', () => {
      const invalidResource = {
        title: 'Valid Title',
        description: 'Description',
        url: 'https://example.com',
        category: validCategoryId,
        resourceType: 'invalid_type',
        createdBy: validUserId,
        updatedBy: validUserId
      };

      const result = ResourceSchema.safeParse(invalidResource);
      expect(result.success).toBe(false);
    });

    it('should reject invalid status', () => {
      const invalidResource = {
        title: 'Valid Title',
        description: 'Description',
        url: 'https://example.com',
        category: validCategoryId,
        resourceType: ResourceType.GUIDANCE,
        status: 'invalid_status',
        createdBy: validUserId,
        updatedBy: validUserId
      };

      const result = ResourceSchema.safeParse(invalidResource);
      expect(result.success).toBe(false);
    });

    it('should reject invalid language code (not 2 characters)', () => {
      const invalidResource = {
        title: 'Valid Title',
        description: 'Description',
        url: 'https://example.com',
        category: validCategoryId,
        resourceType: ResourceType.GUIDANCE,
        language: 'eng',
        createdBy: validUserId,
        updatedBy: validUserId
      };

      const result = ResourceSchema.safeParse(invalidResource);
      expect(result.success).toBe(false);
    });

    it('should accept valid lifecycle fields', () => {
      const resourceWithLifecycle = {
        title: 'Resource',
        description: 'Description',
        url: 'https://example.com',
        slug: 'resource',
        category: validCategoryId,
        resourceType: ResourceType.CASE_STUDY,
        status: ContentStatus.PUBLISHED,
        publishedAt: new Date(),
        publicationDate: new Date(),
        lastVerified: new Date(),
        createdBy: validUserId,
        updatedBy: validUserId
      };

      const result = ResourceSchema.safeParse(resourceWithLifecycle);
      expect(result.success).toBe(true);
    });

    it('should accept archived resource with reason', () => {
      const archivedResource = {
        title: 'Archived Resource',
        description: 'Description',
        url: 'https://example.com',
        slug: 'archived-resource',
        category: validCategoryId,
        resourceType: ResourceType.GUIDANCE,
        status: ContentStatus.ARCHIVED,
        archivedAt: new Date(),
        archivedReason: 'Outdated information',
        supersededBy: new ObjectId(),
        publicationDate: new Date(),
        lastVerified: new Date(),
        createdBy: validUserId,
        updatedBy: validUserId
      };

      const result = ResourceSchema.safeParse(archivedResource);
      expect(result.success).toBe(true);
    });

    it('should accept discovered resource with source URL', () => {
      const discoveredResource = {
        title: 'Discovered Resource',
        description: 'Description',
        url: 'https://example.com/resource',
        slug: 'discovered-resource',
        category: validCategoryId,
        resourceType: ResourceType.NEWS,
        source: 'discovered' as const,
        discoveredFrom: 'https://source.com',
        publicationDate: new Date(),
        lastVerified: new Date(),
        createdBy: validUserId,
        updatedBy: validUserId
      };

      const result = ResourceSchema.safeParse(discoveredResource);
      expect(result.success).toBe(true);
    });

    it('should accept resource with AI-generated fields', () => {
      const resourceWithAI = {
        title: 'AI Enhanced Resource',
        description: 'Description',
        url: 'https://example.com',
        slug: 'ai-enhanced-resource',
        category: validCategoryId,
        resourceType: ResourceType.RESEARCH,
        summary: 'This is an AI-generated summary of the resource content',
        embedding: [0.1, 0.2, 0.3, 0.4],
        publicationDate: new Date(),
        lastVerified: new Date(),
        createdBy: validUserId,
        updatedBy: validUserId
      };

      const result = ResourceSchema.safeParse(resourceWithAI);
      expect(result.success).toBe(true);
    });

    it('should reject negative clicks', () => {
      const invalidResource = {
        title: 'Resource',
        description: 'Description',
        url: 'https://example.com',
        category: validCategoryId,
        resourceType: ResourceType.TOOL,
        clicks: -1,
        createdBy: validUserId,
        updatedBy: validUserId
      };

      const result = ResourceSchema.safeParse(invalidResource);
      expect(result.success).toBe(false);
    });
  });

  describe('StatusChangeSchema', () => {
    it('should validate a valid status change', () => {
      const validStatusChange = {
        status: ContentStatus.APPROVED,
        changedAt: new Date(),
        changedBy: validUserId,
        reason: 'Approved after review'
      };

      const result = StatusChangeSchema.safeParse(validStatusChange);
      expect(result.success).toBe(true);
    });

    it('should validate status change without reason', () => {
      const statusChange = {
        status: ContentStatus.PUBLISHED,
        changedAt: new Date(),
        changedBy: validUserId
      };

      const result = StatusChangeSchema.safeParse(statusChange);
      expect(result.success).toBe(true);
    });

    it('should reject invalid status in status change', () => {
      const invalidStatusChange = {
        status: 'invalid_status',
        changedAt: new Date(),
        changedBy: validUserId
      };

      const result = StatusChangeSchema.safeParse(invalidStatusChange);
      expect(result.success).toBe(false);
    });
  });

  describe('ResourceInputSchema', () => {
    it('should allow partial resource for input', () => {
      const minimalInput = {
        title: 'New Resource',
        description: 'A new resource',
        url: 'https://example.com/new',
        slug: 'new-resource',
        category: validCategoryId,
        resourceType: ResourceType.TEMPLATE
      };

      const result = ResourceInputSchema.safeParse(minimalInput);
      expect(result.success).toBe(true);
    });

    it('should not require timestamp fields', () => {
      const input = {
        title: 'Resource',
        description: 'Description',
        url: 'https://example.com',
        slug: 'resource',
        category: validCategoryId,
        resourceType: ResourceType.GUIDANCE
      };

      const result = ResourceInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe('CoST Taxonomy Fields', () => {
    describe('Country Programs', () => {
      it('should validate resource with valid country programs', () => {
        const resource = {
          title: 'CoST Uganda Report',
          description: 'Transparency report from Uganda',
          url: 'https://example.com/uganda',
          slug: 'cost-uganda-report',
          category: validCategoryId,
          resourceType: ResourceType.ASSURANCE_REPORT,
          countryPrograms: ['uganda', 'zambia'],
          themes: [],
          oc4idsAlignment: [],
          workstreams: [],
          audience: [],
          accessLevel: 'public' as const,
          language: 'en',
          isTranslation: false,
          translations: [],
          publicationDate: new Date(),
          lastVerified: new Date(),
          status: ContentStatus.PUBLISHED,
          statusHistory: [],
          source: 'manual' as const,
          clicks: 0,
          aiCitations: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: validUserId,
          updatedBy: validUserId
        };

        const result = ResourceSchema.safeParse(resource);
        expect(result.success).toBe(true);
      });

      it('should reject invalid country program', () => {
        const resource = {
          title: 'Invalid Country',
          description: 'Description',
          url: 'https://example.com',
          slug: 'invalid-country',
          category: validCategoryId,
          resourceType: ResourceType.GUIDANCE,
          countryPrograms: ['invalid_country'],
          themes: [],
          oc4idsAlignment: [],
          workstreams: [],
          audience: [],
          accessLevel: 'public' as const,
          language: 'en',
          isTranslation: false,
          translations: [],
          publicationDate: new Date(),
          lastVerified: new Date(),
          createdBy: validUserId,
          updatedBy: validUserId
        };

        const result = ResourceSchema.safeParse(resource);
        expect(result.success).toBe(false);
      });

      it('should allow global country program', () => {
        const resource = {
          title: 'Global Guidelines',
          description: 'Global transparency guidelines',
          url: 'https://example.com/global',
          slug: 'global-guidelines',
          category: validCategoryId,
          resourceType: ResourceType.GUIDANCE,
          countryPrograms: ['global'],
          themes: [],
          oc4idsAlignment: [],
          workstreams: [],
          audience: [],
          accessLevel: 'public' as const,
          language: 'en',
          isTranslation: false,
          translations: [],
          publicationDate: new Date(),
          lastVerified: new Date(),
          createdBy: validUserId,
          updatedBy: validUserId
        };

        const result = ResourceSchema.safeParse(resource);
        expect(result.success).toBe(true);
      });
    });

    describe('Themes', () => {
      it('should validate resource with valid themes', () => {
        const resource = {
          title: 'Climate Finance Guide',
          description: 'Guide on climate finance',
          url: 'https://example.com/climate',
          slug: 'climate-finance-guide',
          category: validCategoryId,
          resourceType: ResourceType.GUIDANCE,
          countryPrograms: [],
          themes: ['climate', 'procurement'],
          oc4idsAlignment: [],
          workstreams: [],
          audience: [],
          accessLevel: 'public' as const,
          language: 'en',
          isTranslation: false,
          translations: [],
          publicationDate: new Date(),
          lastVerified: new Date(),
          createdBy: validUserId,
          updatedBy: validUserId
        };

        const result = ResourceSchema.safeParse(resource);
        expect(result.success).toBe(true);
      });

      it('should reject invalid theme', () => {
        const resource = {
          title: 'Resource',
          description: 'Description',
          url: 'https://example.com',
          slug: 'resource',
          category: validCategoryId,
          resourceType: ResourceType.GUIDANCE,
          countryPrograms: [],
          themes: ['invalid_theme'],
          oc4idsAlignment: [],
          workstreams: [],
          audience: [],
          accessLevel: 'public' as const,
          language: 'en',
          isTranslation: false,
          translations: [],
          publicationDate: new Date(),
          lastVerified: new Date(),
          createdBy: validUserId,
          updatedBy: validUserId
        };

        const result = ResourceSchema.safeParse(resource);
        expect(result.success).toBe(false);
      });
    });

    describe('OC4IDS Alignment', () => {
      it('should validate resource with OC4IDS sections', () => {
        const resource = {
          title: 'OC4IDS Implementation Guide',
          description: 'Guide for implementing OC4IDS',
          url: 'https://example.com/oc4ids',
          slug: 'oc4ids-guide',
          category: validCategoryId,
          resourceType: ResourceType.GUIDANCE,
          countryPrograms: [],
          themes: ['data_standards'],
          oc4idsAlignment: ['project_identification', 'contracting_process'],
          workstreams: [],
          audience: [],
          accessLevel: 'public' as const,
          language: 'en',
          isTranslation: false,
          translations: [],
          publicationDate: new Date(),
          lastVerified: new Date(),
          createdBy: validUserId,
          updatedBy: validUserId
        };

        const result = ResourceSchema.safeParse(resource);
        expect(result.success).toBe(true);
      });

      it('should reject invalid OC4IDS section', () => {
        const resource = {
          title: 'Resource',
          description: 'Description',
          url: 'https://example.com',
          slug: 'resource',
          category: validCategoryId,
          resourceType: ResourceType.GUIDANCE,
          countryPrograms: [],
          themes: [],
          oc4idsAlignment: ['invalid_section'],
          workstreams: [],
          audience: [],
          accessLevel: 'public' as const,
          language: 'en',
          isTranslation: false,
          translations: [],
          publicationDate: new Date(),
          lastVerified: new Date(),
          createdBy: validUserId,
          updatedBy: validUserId
        };

        const result = ResourceSchema.safeParse(resource);
        expect(result.success).toBe(false);
      });
    });

    describe('Workstreams', () => {
      it('should validate resource with workstreams', () => {
        const resource = {
          title: 'Disclosure Guide',
          description: 'Guide on disclosure practices',
          url: 'https://example.com/disclosure',
          slug: 'disclosure-guide',
          category: validCategoryId,
          resourceType: ResourceType.GUIDANCE,
          countryPrograms: [],
          themes: [],
          oc4idsAlignment: [],
          workstreams: ['disclosure', 'assurance'],
          audience: [],
          accessLevel: 'public' as const,
          language: 'en',
          isTranslation: false,
          translations: [],
          publicationDate: new Date(),
          lastVerified: new Date(),
          createdBy: validUserId,
          updatedBy: validUserId
        };

        const result = ResourceSchema.safeParse(resource);
        expect(result.success).toBe(true);
      });

      it('should reject invalid workstream', () => {
        const resource = {
          title: 'Resource',
          description: 'Description',
          url: 'https://example.com',
          slug: 'resource',
          category: validCategoryId,
          resourceType: ResourceType.GUIDANCE,
          countryPrograms: [],
          themes: [],
          oc4idsAlignment: [],
          workstreams: ['invalid_workstream'],
          audience: [],
          accessLevel: 'public' as const,
          language: 'en',
          isTranslation: false,
          translations: [],
          publicationDate: new Date(),
          lastVerified: new Date(),
          createdBy: validUserId,
          updatedBy: validUserId
        };

        const result = ResourceSchema.safeParse(resource);
        expect(result.success).toBe(false);
      });
    });

    describe('Audience Levels', () => {
      it('should validate resource with audience levels', () => {
        const resource = {
          title: 'Technical Documentation',
          description: 'Technical docs for developers',
          url: 'https://example.com/tech',
          slug: 'technical-docs',
          category: validCategoryId,
          resourceType: ResourceType.GUIDANCE,
          countryPrograms: [],
          themes: [],
          oc4idsAlignment: [],
          workstreams: [],
          audience: ['technical', 'academic'],
          accessLevel: 'public' as const,
          language: 'en',
          isTranslation: false,
          translations: [],
          publicationDate: new Date(),
          lastVerified: new Date(),
          createdBy: validUserId,
          updatedBy: validUserId
        };

        const result = ResourceSchema.safeParse(resource);
        expect(result.success).toBe(true);
      });

      it('should reject invalid audience level', () => {
        const resource = {
          title: 'Resource',
          description: 'Description',
          url: 'https://example.com',
          slug: 'resource',
          category: validCategoryId,
          resourceType: ResourceType.GUIDANCE,
          countryPrograms: [],
          themes: [],
          oc4idsAlignment: [],
          workstreams: [],
          audience: ['invalid_audience'],
          accessLevel: 'public' as const,
          language: 'en',
          isTranslation: false,
          translations: [],
          publicationDate: new Date(),
          lastVerified: new Date(),
          createdBy: validUserId,
          updatedBy: validUserId
        };

        const result = ResourceSchema.safeParse(resource);
        expect(result.success).toBe(false);
      });
    });

    describe('Access Levels', () => {
      it('should validate public access level', () => {
        const resource = {
          title: 'Public Resource',
          description: 'Publicly available resource',
          url: 'https://example.com/public',
          slug: 'public-resource',
          category: validCategoryId,
          resourceType: ResourceType.GUIDANCE,
          countryPrograms: [],
          themes: [],
          oc4idsAlignment: [],
          workstreams: [],
          audience: [],
          accessLevel: 'public' as const,
          language: 'en',
          isTranslation: false,
          translations: [],
          publicationDate: new Date(),
          lastVerified: new Date(),
          createdBy: validUserId,
          updatedBy: validUserId
        };

        const result = ResourceSchema.safeParse(resource);
        expect(result.success).toBe(true);
      });

      it('should validate members access level', () => {
        const resource = {
          title: 'Members Only',
          description: 'Members only resource',
          url: 'https://example.com/members',
          slug: 'members-resource',
          category: validCategoryId,
          resourceType: ResourceType.GUIDANCE,
          countryPrograms: [],
          themes: [],
          oc4idsAlignment: [],
          workstreams: [],
          audience: [],
          accessLevel: 'members' as const,
          language: 'en',
          isTranslation: false,
          translations: [],
          publicationDate: new Date(),
          lastVerified: new Date(),
          createdBy: validUserId,
          updatedBy: validUserId
        };

        const result = ResourceSchema.safeParse(resource);
        expect(result.success).toBe(true);
      });

      it('should reject invalid access level', () => {
        const resource = {
          title: 'Resource',
          description: 'Description',
          url: 'https://example.com',
          slug: 'resource',
          category: validCategoryId,
          resourceType: ResourceType.GUIDANCE,
          countryPrograms: [],
          themes: [],
          oc4idsAlignment: [],
          workstreams: [],
          audience: [],
          accessLevel: 'invalid' as any,
          language: 'en',
          isTranslation: false,
          translations: [],
          publicationDate: new Date(),
          lastVerified: new Date(),
          createdBy: validUserId,
          updatedBy: validUserId
        };

        const result = ResourceSchema.safeParse(resource);
        expect(result.success).toBe(false);
      });
    });

    describe('Language Support', () => {
      it('should validate supported language codes', () => {
        const languages = ['en', 'es', 'fr', 'pt', 'uk', 'id', 'vi', 'th'];

        languages.forEach(lang => {
          const resource = {
            title: 'Multi-language Resource',
            description: 'Resource in multiple languages',
            url: 'https://example.com/resource',
            slug: `resource-${lang}`,
            category: validCategoryId,
            resourceType: ResourceType.GUIDANCE,
            countryPrograms: [],
            themes: [],
            oc4idsAlignment: [],
            workstreams: [],
            audience: [],
            accessLevel: 'public' as const,
            language: lang,
            isTranslation: false,
            translations: [],
            publicationDate: new Date(),
            lastVerified: new Date(),
            createdBy: validUserId,
            updatedBy: validUserId
          };

          const result = ResourceSchema.safeParse(resource);
          expect(result.success).toBe(true);
        });
      });

      it('should reject unsupported language code', () => {
        const resource = {
          title: 'Resource',
          description: 'Description',
          url: 'https://example.com',
          slug: 'resource',
          category: validCategoryId,
          resourceType: ResourceType.GUIDANCE,
          countryPrograms: [],
          themes: [],
          oc4idsAlignment: [],
          workstreams: [],
          audience: [],
          accessLevel: 'public' as const,
          language: 'de',
          isTranslation: false,
          translations: [],
          publicationDate: new Date(),
          lastVerified: new Date(),
          createdBy: validUserId,
          updatedBy: validUserId
        };

        const result = ResourceSchema.safeParse(resource);
        expect(result.success).toBe(false);
      });
    });

    describe('Translation Support', () => {
      it('should validate translated resource', () => {
        const canonicalId = new ObjectId();
        const resource = {
          title: 'Guía de Transparencia',
          description: 'Guía en español',
          url: 'https://example.com/guia',
          slug: 'guia-transparencia',
          category: validCategoryId,
          resourceType: ResourceType.GUIDANCE,
          countryPrograms: ['colombia'],
          themes: [],
          oc4idsAlignment: [],
          workstreams: [],
          audience: [],
          accessLevel: 'public' as const,
          language: 'es',
          canonicalId: canonicalId,
          isTranslation: true,
          translations: [
            { language: 'en', resourceId: canonicalId }
          ],
          publicationDate: new Date(),
          lastVerified: new Date(),
          createdBy: validUserId,
          updatedBy: validUserId
        };

        const result = ResourceSchema.safeParse(resource);
        expect(result.success).toBe(true);
      });
    });

    describe('Temporal Metadata', () => {
      it('should validate resource with temporal metadata', () => {
        const resource = {
          title: 'Time-bound Resource',
          description: 'Resource with expiration',
          url: 'https://example.com/temporal',
          slug: 'temporal-resource',
          category: validCategoryId,
          resourceType: ResourceType.GUIDANCE,
          countryPrograms: [],
          themes: [],
          oc4idsAlignment: [],
          workstreams: [],
          audience: [],
          accessLevel: 'public' as const,
          language: 'en',
          isTranslation: false,
          translations: [],
          publicationDate: new Date('2024-01-01'),
          lastVerified: new Date('2024-06-01'),
          validUntil: new Date('2025-12-31'),
          createdBy: validUserId,
          updatedBy: validUserId
        };

        const result = ResourceSchema.safeParse(resource);
        expect(result.success).toBe(true);
      });
    });

    describe('AI & Search Fields', () => {
      it('should validate resource with AI fields', () => {
        const chunkId = new ObjectId();
        const resource = {
          title: 'AI Enhanced Resource',
          description: 'Resource with AI features',
          url: 'https://example.com/ai',
          slug: 'ai-resource',
          category: validCategoryId,
          resourceType: ResourceType.RESEARCH,
          countryPrograms: [],
          themes: [],
          oc4idsAlignment: [],
          workstreams: [],
          audience: [],
          accessLevel: 'public' as const,
          language: 'en',
          isTranslation: false,
          translations: [],
          publicationDate: new Date(),
          lastVerified: new Date(),
          summary: 'AI-generated summary of the resource',
          embedding: [0.1, 0.2, 0.3],
          chunks: [chunkId],
          aiCitations: 5,
          createdBy: validUserId,
          updatedBy: validUserId
        };

        const result = ResourceSchema.safeParse(resource);
        expect(result.success).toBe(true);
      });
    });

    describe('Relationships', () => {
      it('should validate resource with relationships', () => {
        const relatedId1 = new ObjectId();
        const relatedId2 = new ObjectId();
        const parentId = new ObjectId();

        const resource = {
          title: 'Related Resource',
          description: 'Resource with relationships',
          url: 'https://example.com/related',
          slug: 'related-resource',
          category: validCategoryId,
          resourceType: ResourceType.GUIDANCE,
          countryPrograms: [],
          themes: [],
          oc4idsAlignment: [],
          workstreams: [],
          audience: [],
          accessLevel: 'public' as const,
          language: 'en',
          isTranslation: false,
          translations: [],
          publicationDate: new Date(),
          lastVerified: new Date(),
          relatedResources: [relatedId1, relatedId2],
          partOf: parentId,
          createdBy: validUserId,
          updatedBy: validUserId
        };

        const result = ResourceSchema.safeParse(resource);
        expect(result.success).toBe(true);
      });
    });

    describe('Complete CoST Resource', () => {
      it('should validate fully populated CoST resource', () => {
        const resource = {
          _id: new ObjectId(),
          title: 'Uganda Climate Procurement Assessment',
          description: 'Comprehensive assessment of climate-related procurement in Uganda',
          url: 'https://example.com/uganda-climate',
          slug: 'uganda-climate-procurement-assessment',
          resourceType: ResourceType.ASSURANCE_REPORT,
          countryPrograms: ['uganda'],
          themes: ['climate', 'procurement', 'environmental'],
          oc4idsAlignment: ['project_identification', 'contracting_process', 'implementation'],
          workstreams: ['disclosure', 'assurance'],
          audience: ['technical', 'policy', 'msg'],
          accessLevel: 'public' as const,
          language: 'en',
          canonicalId: undefined,
          isTranslation: false,
          translations: [],
          publicationDate: new Date('2024-01-15'),
          lastVerified: new Date('2024-11-01'),
          validUntil: new Date('2025-12-31'),
          status: ContentStatus.PUBLISHED,
          statusHistory: [
            {
              status: ContentStatus.DISCOVERED,
              changedAt: new Date('2024-01-01'),
              changedBy: validUserId
            },
            {
              status: ContentStatus.PUBLISHED,
              changedAt: new Date('2024-01-15'),
              changedBy: validUserId,
              reason: 'Approved after review'
            }
          ],
          publishedAt: new Date('2024-01-15'),
          source: 'manual' as const,
          summary: 'This report examines climate-related procurement practices in Uganda',
          embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
          chunks: [new ObjectId()],
          relatedResources: [new ObjectId(), new ObjectId()],
          clicks: 42,
          lastClickedAt: new Date('2024-11-28'),
          aiCitations: 7,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-11-01'),
          createdBy: validUserId,
          updatedBy: validUserId,
          category: validCategoryId,
          tags: [],
          topics: [],
          regions: []
        };

        const result = ResourceSchema.safeParse(resource);
        if (!result.success) {
          console.error('Validation errors:', JSON.stringify(result.error, null, 2));
        }
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Taxonomy Helper Functions', () => {
    describe('isValidCountryProgram', () => {
      it('should return true for valid country programs', () => {
        expect(isValidCountryProgram('uganda')).toBe(true);
        expect(isValidCountryProgram('colombia')).toBe(true);
        expect(isValidCountryProgram('global')).toBe(true);
      });

      it('should return false for invalid country programs', () => {
        expect(isValidCountryProgram('invalid')).toBe(false);
        expect(isValidCountryProgram('france')).toBe(false);
      });
    });

    describe('isValidTheme', () => {
      it('should return true for valid themes', () => {
        expect(isValidTheme('climate')).toBe(true);
        expect(isValidTheme('procurement')).toBe(true);
        expect(isValidTheme('gender')).toBe(true);
      });

      it('should return false for invalid themes', () => {
        expect(isValidTheme('invalid')).toBe(false);
      });
    });

    describe('isValidOC4IDSSection', () => {
      it('should return true for valid OC4IDS sections', () => {
        expect(isValidOC4IDSSection('project_identification')).toBe(true);
        expect(isValidOC4IDSSection('contracting_process')).toBe(true);
      });

      it('should return false for invalid sections', () => {
        expect(isValidOC4IDSSection('invalid')).toBe(false);
      });
    });

    describe('isValidWorkstream', () => {
      it('should return true for valid workstreams', () => {
        expect(isValidWorkstream('disclosure')).toBe(true);
        expect(isValidWorkstream('assurance')).toBe(true);
      });

      it('should return false for invalid workstreams', () => {
        expect(isValidWorkstream('invalid')).toBe(false);
      });
    });

    describe('isValidAudienceLevel', () => {
      it('should return true for valid audience levels', () => {
        expect(isValidAudienceLevel('technical')).toBe(true);
        expect(isValidAudienceLevel('policy')).toBe(true);
      });

      it('should return false for invalid audience levels', () => {
        expect(isValidAudienceLevel('invalid')).toBe(false);
      });
    });

    describe('Label Generation', () => {
      it('should generate human-readable country program labels', () => {
        expect(getCountryProgramLabel('uganda')).toBe('Uganda');
        expect(getCountryProgramLabel('costa_rica')).toBe('Costa Rica');
        expect(getCountryProgramLabel('timor_leste')).toBe('Timor-Leste');
      });

      it('should generate human-readable theme labels', () => {
        expect(getThemeLabel('climate')).toBe('Climate');
        expect(getThemeLabel('beneficial_ownership')).toBe('Beneficial Ownership');
        expect(getThemeLabel('msg_governance')).toBe('MSG Governance');
      });

      it('should generate human-readable OC4IDS section labels', () => {
        expect(getOC4IDSSectionLabel('project_identification')).toBe('Project Identification');
        expect(getOC4IDSSectionLabel('contracting_process')).toBe('Contracting Process');
      });

      it('should generate human-readable workstream labels', () => {
        expect(getWorkstreamLabel('disclosure')).toBe('Disclosure');
        expect(getWorkstreamLabel('social_accountability')).toBe('Social Accountability');
      });

      it('should generate human-readable audience level labels', () => {
        expect(getAudienceLevelLabel('technical')).toBe('Technical');
        expect(getAudienceLevelLabel('civil_society')).toBe('Civil Society');
        expect(getAudienceLevelLabel('msg')).toBe('MSG');
      });
    });
  });
});
