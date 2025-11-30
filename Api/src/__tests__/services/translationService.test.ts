import { ObjectId } from 'mongodb';
import { translationService } from '../../services/translationService';
import { getDatabase } from '../../db';
import { Resource, ContentStatus, COLLECTION_NAME } from '../../models/Resource';
import { ApiError } from '../../middleware/errorHandler';

// Mock the database
jest.mock('../../db');

describe('TranslationService', () => {
  let mockDb: any;
  let mockCollection: any;
  const canonicalId = new ObjectId();
  const translationId = new ObjectId();
  const userId = new ObjectId();

  const mockCanonical: Resource = {
    _id: canonicalId,
    title: 'English Resource',
    description: 'This is an English resource',
    url: 'https://example.com/resource',
    slug: 'english-resource',
    resourceType: 'guidance',
    countryPrograms: ['global'],
    themes: ['data_standards'],
    oc4idsAlignment: [],
    workstreams: [],
    audience: ['technical'],
    accessLevel: 'public',
    language: 'en',
    isTranslation: false,
    translations: [],
    publicationDate: new Date(),
    lastVerified: new Date(),
    status: ContentStatus.PUBLISHED,
    statusHistory: [],
    source: 'manual',
    clicks: 0,
    aiCitations: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: userId,
    updatedBy: userId,
    tags: [],
    topics: [],
    regions: []
  };

  const mockTranslation: Resource = {
    _id: translationId,
    title: '[ES] English Resource',
    description: '[Machine Translation] This is an English resource',
    url: 'https://example.com/resource-es',
    slug: 'english-resource-es',
    resourceType: 'guidance',
    countryPrograms: ['global'],
    themes: ['data_standards'],
    oc4idsAlignment: [],
    workstreams: [],
    audience: ['technical'],
    accessLevel: 'public',
    language: 'es',
    canonicalId,
    isTranslation: true,
    translations: [],
    publicationDate: new Date(),
    lastVerified: new Date(),
    status: ContentStatus.PUBLISHED,
    statusHistory: [],
    source: 'manual',
    clicks: 0,
    aiCitations: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: userId,
    updatedBy: userId,
    tags: [],
    topics: [],
    regions: []
  };

  beforeEach(() => {
    mockCollection = {
      findOne: jest.fn(),
      updateOne: jest.fn(),
      insertOne: jest.fn(),
      find: jest.fn()
    };

    mockDb = {
      collection: jest.fn().mockReturnValue(mockCollection)
    };

    (getDatabase as jest.Mock).mockResolvedValue(mockDb);
  });

  describe('linkTranslation', () => {
    it('should link a translation to a canonical resource', async () => {
      mockCollection.findOne
        .mockResolvedValueOnce(mockCanonical) // canonical lookup
        .mockResolvedValueOnce(mockTranslation); // translation lookup

      mockCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });

      await translationService.linkTranslation(
        canonicalId,
        translationId,
        'es',
        'machine'
      );

      // Should update canonical with translation link
      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { _id: canonicalId },
        expect.objectContaining({
          $push: expect.objectContaining({
            translations: expect.objectContaining({
              language: 'es',
              resourceId: translationId
            })
          })
        })
      );

      // Should update translation with canonical reference
      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { _id: translationId },
        expect.objectContaining({
          $set: expect.objectContaining({
            canonicalId,
            isTranslation: true
          })
        })
      );
    });

    it('should throw error if canonical resource not found', async () => {
      mockCollection.findOne.mockResolvedValueOnce(null); // canonical not found

      await expect(
        translationService.linkTranslation(canonicalId, translationId, 'es', 'machine')
      ).rejects.toThrow('Canonical resource with ID');
    });

    it('should throw error if translation resource not found', async () => {
      mockCollection.findOne
        .mockResolvedValueOnce(mockCanonical) // canonical found
        .mockResolvedValueOnce(null); // translation not found

      await expect(
        translationService.linkTranslation(canonicalId, translationId, 'es', 'machine')
      ).rejects.toThrow('Translation resource with ID');
    });

    it('should throw error if trying to link resource to itself', async () => {
      mockCollection.findOne.mockResolvedValue(mockCanonical);

      await expect(
        translationService.linkTranslation(canonicalId, canonicalId, 'es', 'machine')
      ).rejects.toThrow('cannot be a translation of itself');
    });

    it('should throw error if translation already linked to different canonical', async () => {
      const otherCanonicalId = new ObjectId();
      const translationWithCanonical = {
        ...mockTranslation,
        canonicalId: otherCanonicalId
      };

      mockCollection.findOne
        .mockResolvedValueOnce(mockCanonical)
        .mockResolvedValueOnce(translationWithCanonical);

      await expect(
        translationService.linkTranslation(canonicalId, translationId, 'es', 'machine')
      ).rejects.toThrow('already linked as a translation');
    });

    it('should throw error if translation has same language as canonical', async () => {
      const translationSameLanguage = { ...mockTranslation, language: 'en' };
      mockCollection.findOne
        .mockResolvedValueOnce(mockCanonical)
        .mockResolvedValueOnce(translationSameLanguage);

      await expect(
        translationService.linkTranslation(canonicalId, translationId, 'en', 'machine')
      ).rejects.toThrow('must have a different language');
    });

    it('should throw error for invalid language code', async () => {
      mockCollection.findOne
        .mockResolvedValueOnce(mockCanonical)
        .mockResolvedValueOnce(mockTranslation);

      await expect(
        translationService.linkTranslation(
          canonicalId,
          translationId,
          'xx' as any,
          'machine'
        )
      ).rejects.toThrow('Invalid language code');
    });
  });

  describe('getTranslations', () => {
    it('should return translations from canonical resource', async () => {
      const translationLink = { language: 'es' as const, resourceId: translationId };
      const canonicalWithTranslations = {
        ...mockCanonical,
        translations: [translationLink]
      };

      mockCollection.findOne.mockResolvedValueOnce(canonicalWithTranslations);

      const result = await translationService.getTranslations(canonicalId);

      expect(result).toEqual([translationLink]);
      expect(mockCollection.findOne).toHaveBeenCalledWith({ _id: canonicalId });
    });

    it('should return canonical translations when called on translation resource', async () => {
      const translationLink = { language: 'es' as const, resourceId: translationId };
      const canonicalWithTranslations = {
        ...mockCanonical,
        translations: [translationLink]
      };

      mockCollection.findOne
        .mockResolvedValueOnce(mockTranslation) // first call - get translation resource
        .mockResolvedValueOnce(canonicalWithTranslations); // second call - get canonical

      const result = await translationService.getTranslations(translationId);

      expect(result).toEqual([translationLink]);
    });

    it('should throw error if resource not found', async () => {
      mockCollection.findOne.mockResolvedValueOnce(null);

      await expect(
        translationService.getTranslations(canonicalId)
      ).rejects.toThrow('Resource with ID');
    });
  });

  describe('getCanonical', () => {
    it('should return canonical resource for a translation', async () => {
      mockCollection.findOne
        .mockResolvedValueOnce(mockTranslation) // get translation
        .mockResolvedValueOnce(mockCanonical); // get canonical

      const result = await translationService.getCanonical(translationId);

      expect(result).toEqual(mockCanonical);
    });

    it('should return null if resource is not a translation', async () => {
      mockCollection.findOne.mockResolvedValueOnce(mockCanonical);

      const result = await translationService.getCanonical(canonicalId);

      expect(result).toBeNull();
    });

    it('should throw error if resource not found', async () => {
      mockCollection.findOne.mockResolvedValueOnce(null);

      await expect(
        translationService.getCanonical(translationId)
      ).rejects.toThrow('Resource with ID');
    });
  });

  describe('createMachineTranslation', () => {
    it('should create a machine translation of a resource', async () => {
      // Mock returns in order of calls:
      // 1. getDatabase findOne for source
      // 2. check if translation exists
      // 3-5. linkTranslation: findOne(canonicalId), findOne(translationId), first update doesn't use findOne

      mockCollection.findOne
        .mockResolvedValueOnce(mockCanonical) // source resource lookup
        .mockResolvedValueOnce(null) // check if translation already exists
        .mockResolvedValueOnce(mockCanonical) // canonical lookup in linkTranslation
        .mockResolvedValueOnce(mockTranslation); // translation lookup in linkTranslation (has es language)

      mockCollection.insertOne.mockResolvedValueOnce({
        insertedId: translationId
      });

      mockCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });

      const result = await translationService.createMachineTranslation(
        canonicalId,
        'es',
        userId
      );

      expect(result.language).toBe('es');
      expect(result.isTranslation).toBe(true);
      expect(result.canonicalId).toEqual(canonicalId);
      expect(result.title).toContain('[ES]');
    });

    it('should use resource canonicalId if source is a translation', async () => {
      const otherCanonicalId = new ObjectId();
      const translationAsSource = {
        ...mockTranslation,
        canonicalId: otherCanonicalId,
        language: 'es'
      };
      const canonicalResource = { ...mockCanonical, _id: otherCanonicalId };
      // The newly created French translation with the correct language and NO pre-existing canonicalId
      const frenchTranslation = {
        ...mockCanonical, // base on canonical, not mockTranslation which has canonicalId
        _id: translationId,
        language: 'fr',
        canonicalId: otherCanonicalId,
        isTranslation: true
      };

      mockCollection.findOne
        .mockResolvedValueOnce(translationAsSource) // source is translation
        .mockResolvedValueOnce(null) // no existing translation
        .mockResolvedValueOnce(canonicalResource) // canonical for linking
        .mockResolvedValueOnce(frenchTranslation); // translation lookup in linkTranslation (french)

      mockCollection.insertOne.mockResolvedValueOnce({
        insertedId: translationId
      });

      mockCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });

      const result = await translationService.createMachineTranslation(
        translationId,
        'fr',
        userId
      );

      expect(result.canonicalId).toEqual(otherCanonicalId);
    });

    it('should throw error if source resource not found', async () => {
      mockCollection.findOne.mockResolvedValueOnce(null);

      await expect(
        translationService.createMachineTranslation(canonicalId, 'es', userId)
      ).rejects.toThrow('Source resource with ID');
    });

    it('should throw error if translation already exists', async () => {
      mockCollection.findOne
        .mockResolvedValueOnce(mockCanonical) // source found
        .mockResolvedValueOnce(mockTranslation); // translation already exists

      await expect(
        translationService.createMachineTranslation(canonicalId, 'es', userId)
      ).rejects.toThrow('already exists');
    });

    it('should throw error for invalid language code', async () => {
      mockCollection.findOne
        .mockResolvedValueOnce(mockCanonical)
        .mockResolvedValueOnce(null);

      await expect(
        translationService.createMachineTranslation(canonicalId, 'xx' as any, userId)
      ).rejects.toThrow('Invalid language code');
    });
  });

  describe('detectLanguage', () => {
    it('should detect Spanish', async () => {
      const result = await translationService.detectLanguage(
        'el gato está en la casa'
      );
      expect(result).toBe('es');
    });

    it('should detect French', async () => {
      const result = await translationService.detectLanguage(
        'le chat est dans la maison'
      );
      expect(result).toBe('fr');
    });

    it('should detect Portuguese', async () => {
      const result = await translationService.detectLanguage(
        'o gato está em casa'
      );
      expect(result).toBe('pt');
    });

    it('should default to English for unknown text', async () => {
      const result = await translationService.detectLanguage('xyz abc def');
      expect(result).toBe('en');
    });

    it('should detect English', async () => {
      const result = await translationService.detectLanguage(
        'the cat is in the house and the dog is in the garden'
      );
      expect(result).toBe('en');
    });

    it('should handle empty string', async () => {
      const result = await translationService.detectLanguage('');
      expect(result).toBe('en');
    });
  });

  describe('unlinkTranslation', () => {
    it('should unlink a translation from canonical', async () => {
      mockCollection.findOne
        .mockResolvedValueOnce(mockCanonical) // canonical lookup
        .mockResolvedValueOnce(mockTranslation); // translation lookup

      mockCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });

      await translationService.unlinkTranslation(canonicalId, translationId);

      // Should remove translation link from canonical
      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { _id: canonicalId },
        expect.objectContaining({
          $pull: { translations: { resourceId: translationId } }
        })
      );

      // Should clear canonical reference from translation
      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { _id: translationId },
        expect.objectContaining({
          $unset: expect.objectContaining({ canonicalId: 1 })
        })
      );
    });

    it('should throw error if canonical not found', async () => {
      mockCollection.findOne.mockResolvedValueOnce(null);

      await expect(
        translationService.unlinkTranslation(canonicalId, translationId)
      ).rejects.toThrow('Canonical resource with ID');
    });

    it('should throw error if translation not found', async () => {
      mockCollection.findOne
        .mockResolvedValueOnce(mockCanonical)
        .mockResolvedValueOnce(null);

      await expect(
        translationService.unlinkTranslation(canonicalId, translationId)
      ).rejects.toThrow('Translation resource with ID');
    });

    it('should throw error if translation not linked to canonical', async () => {
      const otherCanonicalId = new ObjectId();
      const translationWithOtherCanonical = {
        ...mockTranslation,
        canonicalId: otherCanonicalId
      };

      mockCollection.findOne
        .mockResolvedValueOnce(mockCanonical)
        .mockResolvedValueOnce(translationWithOtherCanonical);

      await expect(
        translationService.unlinkTranslation(canonicalId, translationId)
      ).rejects.toThrow('not linked as a translation');
    });
  });

  describe('getTranslationsByLanguage', () => {
    it('should return all translations in a specific language', async () => {
      const translationsList = [mockTranslation];
      mockCollection.find.mockReturnValueOnce({
        toArray: jest.fn().mockResolvedValueOnce(translationsList)
      });

      const result = await translationService.getTranslationsByLanguage('es');

      expect(result).toEqual(translationsList);
      expect(mockCollection.find).toHaveBeenCalledWith({
        language: 'es',
        isTranslation: true
      });
    });

    it('should throw error for invalid language code', async () => {
      await expect(
        translationService.getTranslationsByLanguage('xx' as any)
      ).rejects.toThrow('Invalid language code');
    });

    it('should return empty array if no translations found', async () => {
      mockCollection.find.mockReturnValueOnce({
        toArray: jest.fn().mockResolvedValueOnce([])
      });

      const result = await translationService.getTranslationsByLanguage('fr');

      expect(result).toEqual([]);
    });
  });
});
