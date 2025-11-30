import { ObjectId } from 'mongodb';
import { getDatabase } from '../db';
import { Resource, TranslationLink, LanguageCode, LANGUAGE_CODES, COLLECTION_NAME } from '../models/Resource';
import { ApiError } from '../middleware/errorHandler';

/**
 * Interface for the Translation Service
 * Handles linking, managing, and detecting translations of resources
 */
export interface ITranslationService {
  // Link an existing resource as translation of another
  linkTranslation(
    canonicalId: ObjectId,
    translationId: ObjectId,
    targetLanguage: LanguageCode,
    translationType: 'human' | 'machine' | 'hybrid'
  ): Promise<void>;

  // Get all translations of a resource
  getTranslations(resourceId: ObjectId): Promise<TranslationLink[]>;

  // Get canonical (original) resource for a translation
  getCanonical(translationId: ObjectId): Promise<Resource | null>;

  // Create a machine translation of a resource
  createMachineTranslation(
    resourceId: ObjectId,
    targetLanguage: LanguageCode,
    createdBy: ObjectId
  ): Promise<Resource>;

  // Detect language of text
  detectLanguage(text: string): Promise<LanguageCode>;

  // Unlink a translation
  unlinkTranslation(canonicalId: ObjectId, translationId: ObjectId): Promise<void>;

  // Get all resources that are translations
  getTranslationsByLanguage(language: LanguageCode): Promise<Resource[]>;
}

class TranslationService implements ITranslationService {
  /**
   * Link an existing resource as a translation of another
   * Updates both canonical and translation resources with bidirectional references
   */
  async linkTranslation(
    canonicalId: ObjectId,
    translationId: ObjectId,
    targetLanguage: LanguageCode,
    translationType: 'human' | 'machine' | 'hybrid'
  ): Promise<void> {
    const db = await getDatabase();
    const collection = db.collection<Resource>(COLLECTION_NAME);

    // Validate canonical resource exists
    const canonical = await collection.findOne({ _id: canonicalId });
    if (!canonical) {
      throw new ApiError(404, `Canonical resource with ID ${canonicalId} not found`);
    }

    // Validate translation resource exists
    const translation = await collection.findOne({ _id: translationId });
    if (!translation) {
      throw new ApiError(404, `Translation resource with ID ${translationId} not found`);
    }

    // Prevent self-linking
    if (canonicalId.equals(translationId)) {
      throw new ApiError(400, 'A resource cannot be a translation of itself');
    }

    // Prevent linking if translation is already linked to a different canonical
    if (translation.canonicalId && !translation.canonicalId.equals(canonicalId)) {
      throw new ApiError(
        400,
        `Resource ${translationId} is already linked as a translation of ${translation.canonicalId}`
      );
    }

    // Check if language is valid
    if (!LANGUAGE_CODES.includes(targetLanguage)) {
      throw new ApiError(400, `Invalid language code: ${targetLanguage}`);
    }

    // Check if translation resource has conflicting language
    if (translation.language === canonical.language) {
      throw new ApiError(
        400,
        'Translation resource must have a different language than the canonical resource'
      );
    }

    // Create translation link
    const translationLink: TranslationLink = {
      language: targetLanguage,
      resourceId: translationId
    };

    // Update canonical resource - add translation link if not already present
    const existingLink = canonical.translations.find(t => t.resourceId.equals(translationId));
    if (!existingLink) {
      await collection.updateOne(
        { _id: canonicalId },
        {
          $push: { translations: translationLink },
          $set: { updatedAt: new Date() }
        }
      );
    }

    // Update translation resource - set canonical reference
    await collection.updateOne(
      { _id: translationId },
      {
        $set: {
          canonicalId,
          isTranslation: true,
          updatedAt: new Date()
        }
      }
    );
  }

  /**
   * Get all translations of a resource
   * Can be called on either canonical or translation resource
   */
  async getTranslations(resourceId: ObjectId): Promise<TranslationLink[]> {
    const db = await getDatabase();
    const collection = db.collection<Resource>(COLLECTION_NAME);

    const resource = await collection.findOne({ _id: resourceId });
    if (!resource) {
      throw new ApiError(404, `Resource with ID ${resourceId} not found`);
    }

    // If this is a translation, get parent's translations
    if (resource.canonicalId) {
      const canonical = await collection.findOne({ _id: resource.canonicalId });
      return canonical?.translations || [];
    }

    // If this is canonical, return its translations
    return resource.translations;
  }

  /**
   * Get canonical (original) resource for a translation
   */
  async getCanonical(translationId: ObjectId): Promise<Resource | null> {
    const db = await getDatabase();
    const collection = db.collection<Resource>(COLLECTION_NAME);

    const translation = await collection.findOne({ _id: translationId });
    if (!translation) {
      throw new ApiError(404, `Resource with ID ${translationId} not found`);
    }

    // If not a translation, return null
    if (!translation.canonicalId) {
      return null;
    }

    // Get canonical resource
    const canonical = await collection.findOne({ _id: translation.canonicalId });
    return canonical || null;
  }

  /**
   * Create a machine translation of a resource
   * Creates a new resource document with translated content (mocked implementation)
   */
  async createMachineTranslation(
    resourceId: ObjectId,
    targetLanguage: LanguageCode,
    createdBy: ObjectId
  ): Promise<Resource> {
    const db = await getDatabase();
    const collection = db.collection<Resource>(COLLECTION_NAME);

    // Validate source resource exists
    const source = await collection.findOne({ _id: resourceId });
    if (!source) {
      throw new ApiError(404, `Source resource with ID ${resourceId} not found`);
    }

    // Check if translation already exists
    const existing = await collection.findOne({
      canonicalId: resourceId,
      language: targetLanguage
    });

    if (existing) {
      throw new ApiError(
        409,
        `Translation to ${targetLanguage} already exists for this resource`
      );
    }

    // Check if language is valid
    if (!LANGUAGE_CODES.includes(targetLanguage)) {
      throw new ApiError(400, `Invalid language code: ${targetLanguage}`);
    }

    // Get canonical ID (if source is translation, use its canonical)
    const canonicalId = source.canonicalId || resourceId;

    // Create new translated resource (mock translation)
    const translatedResource: Resource = {
      ...source,
      _id: new ObjectId(),
      language: targetLanguage,
      canonicalId,
      isTranslation: true,
      // Mock translation: prefix content to indicate it's translated
      title: `[${targetLanguage.toUpperCase()}] ${source.title}`,
      description: `[Machine Translation] ${source.description}`,
      translations: [], // New document has no translations
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy,
      updatedBy: createdBy,
      statusHistory: [
        {
          status: source.status,
          changedAt: new Date(),
          changedBy: createdBy,
          reason: `Machine translation created to ${targetLanguage}`
        }
      ]
    };

    // Insert translated resource
    const result = await collection.insertOne(translatedResource);
    translatedResource._id = result.insertedId;

    // Link translation to canonical
    await this.linkTranslation(canonicalId, translatedResource._id, targetLanguage, 'machine');

    return translatedResource;
  }

  /**
   * Detect language of text using simple heuristics
   * In production, would use Gemini API or similar
   */
  async detectLanguage(text: string): Promise<LanguageCode> {
    // Simple heuristic-based detection
    const lowerText = text.toLowerCase();

    // Map of language patterns to language codes
    const patterns: Record<string, RegExp> = {
      es: /\b(el|la|un|una|de|que|y|o|en)\b/g, // Spanish
      fr: /\b(le|la|un|une|de|que|et|ou|en)\b/g, // French
      pt: /\b(o|a|um|uma|de|que|e|ou|em)\b/g, // Portuguese
      uk: /[а-яґєії]/g, // Ukrainian Cyrillic
      id: /\b(yang|di|ke|ini|itu|untuk)\b/g, // Indonesian
      vi: /[àáảãạăằắẳẵặâầấẩẫậ]/g, // Vietnamese diacritics
      th: /[ก-๙]/g, // Thai script
      en: /\b(the|is|and|a|to|of|in|for)\b/g // English
    };

    const scores: Record<string, number> = {};

    for (const [lang, pattern] of Object.entries(patterns)) {
      const matches = (lowerText.match(pattern) || []).length;
      scores[lang] = matches;
    }

    // Find language with highest score
    let detectedLanguage: LanguageCode = 'en'; // default to English
    let maxScore = 0;

    for (const [lang, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        detectedLanguage = lang as LanguageCode;
      }
    }

    return detectedLanguage;
  }

  /**
   * Unlink a translation from its canonical resource
   */
  async unlinkTranslation(canonicalId: ObjectId, translationId: ObjectId): Promise<void> {
    const db = await getDatabase();
    const collection = db.collection<Resource>(COLLECTION_NAME);

    // Validate both resources exist
    const canonical = await collection.findOne({ _id: canonicalId });
    if (!canonical) {
      throw new ApiError(404, `Canonical resource with ID ${canonicalId} not found`);
    }

    const translation = await collection.findOne({ _id: translationId });
    if (!translation) {
      throw new ApiError(404, `Translation resource with ID ${translationId} not found`);
    }

    // Validate translation is linked to canonical
    if (!translation.canonicalId || !translation.canonicalId.equals(canonicalId)) {
      throw new ApiError(
        400,
        `Resource ${translationId} is not linked as a translation of ${canonicalId}`
      );
    }

    // Remove translation link from canonical
    await collection.updateOne(
      { _id: canonicalId },
      {
        $pull: { translations: { resourceId: translationId } },
        $set: { updatedAt: new Date() }
      }
    );

    // Clear canonical reference from translation
    await collection.updateOne(
      { _id: translationId },
      {
        $unset: { canonicalId: 1 },
        $set: { isTranslation: false, updatedAt: new Date() }
      }
    );
  }

  /**
   * Get all resources that are translations in a specific language
   */
  async getTranslationsByLanguage(language: LanguageCode): Promise<Resource[]> {
    const db = await getDatabase();
    const collection = db.collection<Resource>(COLLECTION_NAME);

    if (!LANGUAGE_CODES.includes(language)) {
      throw new ApiError(400, `Invalid language code: ${language}`);
    }

    const translations = await collection
      .find({
        language,
        isTranslation: true
      })
      .toArray();

    return translations;
  }
}

// Export singleton instance
export const translationService = new TranslationService();
