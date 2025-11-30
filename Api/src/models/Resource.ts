import { ObjectId } from 'mongodb';
import { z } from 'zod';

// ============================================================================
// COST TAXONOMY CONSTANTS
// ============================================================================

// Country Programs (CoST member countries)
export const COUNTRY_PROGRAMS = [
  // Africa
  'ethiopia', 'malawi', 'mozambique', 'seychelles', 'uganda', 'zambia',
  // Americas
  'colombia', 'costa_rica', 'ecuador', 'el_salvador', 'guatemala', 'honduras', 'panama', 'mexico',
  // Asia-Pacific
  'afghanistan', 'indonesia', 'thailand', 'timor_leste', 'vietnam',
  // Europe
  'ukraine',
  // Global
  'global'
] as const;

// Themes (CoST strategic areas)
export const THEMES = [
  'climate', 'gender', 'local_government', 'beneficial_ownership',
  'social_safeguards', 'environmental', 'procurement', 'project_monitoring',
  'data_standards', 'msg_governance', 'digital_tools', 'impact_measurement'
] as const;

// OC4IDS Sections
export const OC4IDS_SECTIONS = [
  'project_identification', 'project_preparation', 'project_completion',
  'contracting_process', 'implementation', 'project_scope',
  'project_parties', 'cost_schedule', 'documents', 'full_schema'
] as const;

// CoST Workstreams
export const WORKSTREAMS = [
  'disclosure', 'assurance', 'social_accountability', 'reforms', 'capacity_building'
] as const;

// Audience Levels
export const AUDIENCE_LEVELS = [
  'technical', 'policy', 'msg', 'civil_society', 'academic', 'general'
] as const;

// Resource Types (DEPRECATED - kept for migration only)
// Use tags instead of resourceType for new resources
export const RESOURCE_TYPES = [
  'assurance_report', 'guidance', 'case_study', 'tool', 'template',
  'research', 'news', 'training', 'policy'
] as const;

// Language Codes
export const LANGUAGE_CODES = [
  'en', 'es', 'fr', 'pt', 'uk', 'id', 'vi', 'th'
] as const;

// Access Levels
export const ACCESS_LEVELS = ['public', 'members', 'internal'] as const;

// Description Sources (for AI-generated descriptions)
export const DESCRIPTION_SOURCES = ['manual', 'ai', 'discovery'] as const;

// ============================================================================
// LEGACY ENUMS (for backward compatibility)
// ============================================================================

export const ContentStatus = {
  DISCOVERED: 'discovered',
  PENDING_REVIEW: 'pending_review',
  APPROVED: 'approved',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
  REJECTED: 'rejected'
} as const;

export const ResourceType = {
  GUIDANCE: 'guidance',
  CASE_STUDY: 'case_study',
  ASSURANCE_REPORT: 'assurance_report',
  TOOL: 'tool',
  TEMPLATE: 'template',
  RESEARCH: 'research',
  NEWS: 'news',
  TRAINING: 'training',
  POLICY: 'policy'
} as const;

export type ContentStatus = typeof ContentStatus[keyof typeof ContentStatus];
export type ResourceType = typeof ResourceType[keyof typeof ResourceType];
export type CountryProgram = typeof COUNTRY_PROGRAMS[number];
export type Theme = typeof THEMES[number];
export type OC4IDSSection = typeof OC4IDS_SECTIONS[number];
export type Workstream = typeof WORKSTREAMS[number];
export type AudienceLevel = typeof AUDIENCE_LEVELS[number];
export type LanguageCode = typeof LANGUAGE_CODES[number];
export type AccessLevel = typeof ACCESS_LEVELS[number];
export type DescriptionSource = typeof DESCRIPTION_SOURCES[number];

// ============================================================================
// SUPPORTING TYPES
// ============================================================================

// Status history entry
export interface StatusChange {
  status: ContentStatus;
  changedAt: Date;
  changedBy: ObjectId;
  reason?: string;
}

// Translation link
export interface TranslationLink {
  language: LanguageCode;
  resourceId: ObjectId;
}

// ============================================================================
// MAIN RESOURCE INTERFACE
// ============================================================================

export interface Resource {
  _id?: ObjectId;

  // Core Identity
  title: string;
  description: string;
  descriptionLocked: boolean;  // If true, AI will not overwrite this description
  descriptionSource: DescriptionSource;  // How the description was generated
  url: string;
  slug: string;
  tags: string[];  // AI-suggested and user-defined tags
  resourceType?: ResourceType;  // DEPRECATED - kept for migration only

  // CoST Domain Taxonomy
  countryPrograms: CountryProgram[];
  themes: Theme[];
  oc4idsAlignment: OC4IDSSection[];
  workstreams: Workstream[];

  // Audience & Access
  audience: AudienceLevel[];
  accessLevel: AccessLevel;
  language: LanguageCode;

  // Multi-language Support
  canonicalId?: ObjectId;
  isTranslation: boolean;
  translations: TranslationLink[];

  // Temporal Metadata
  publicationDate: Date;
  lastVerified: Date;
  validUntil?: Date;

  // Lifecycle - CRITICAL
  status: ContentStatus;
  statusHistory: StatusChange[];
  publishedAt?: Date;
  archivedAt?: Date;
  archivedReason?: string;
  supersededBy?: ObjectId;

  // Metadata
  source: 'manual' | 'discovered';
  discoveredFrom?: string;

  // AI-generated (optional)
  summary?: string;
  embedding?: number[];
  chunks?: ObjectId[];

  // Relationships
  relatedResources?: ObjectId[];
  partOf?: ObjectId;

  // Engagement
  clicks: number;
  lastClickedAt?: Date;
  aiCitations: number;

  // Cover Image
  coverImage?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  createdBy: ObjectId;
  updatedBy: ObjectId;

  // Legacy fields (deprecated, for backward compatibility)
  category?: ObjectId;
  topics?: string[];
  regions?: string[];
}

// ============================================================================
// ZOD VALIDATION SCHEMAS
// ============================================================================

// Translation link schema
export const TranslationLinkSchema = z.object({
  language: z.enum(LANGUAGE_CODES),
  resourceId: z.instanceof(ObjectId)
});

// Status change schema
export const StatusChangeSchema = z.object({
  status: z.enum([
    ContentStatus.DISCOVERED,
    ContentStatus.PENDING_REVIEW,
    ContentStatus.APPROVED,
    ContentStatus.PUBLISHED,
    ContentStatus.ARCHIVED,
    ContentStatus.REJECTED
  ]),
  changedAt: z.date(),
  changedBy: z.instanceof(ObjectId),
  reason: z.string().optional()
});

// Main Resource schema
export const ResourceSchema = z.object({
  _id: z.instanceof(ObjectId).optional(),

  // Core Identity
  title: z.string().min(1).max(500),
  description: z.string().min(1).max(5000),
  descriptionLocked: z.boolean().default(false),
  descriptionSource: z.enum(DESCRIPTION_SOURCES).default('manual'),
  url: z.string().url(),
  slug: z.string().min(1).max(200),
  tags: z.array(z.string()).default([]),  // AI-suggested and user-defined tags
  // DEPRECATED - kept for migration only
  resourceType: z.enum([
    ResourceType.GUIDANCE,
    ResourceType.CASE_STUDY,
    ResourceType.ASSURANCE_REPORT,
    ResourceType.TOOL,
    ResourceType.TEMPLATE,
    ResourceType.RESEARCH,
    ResourceType.NEWS,
    ResourceType.TRAINING,
    ResourceType.POLICY
  ]).optional(),

  // CoST Domain Taxonomy
  countryPrograms: z.array(z.enum(COUNTRY_PROGRAMS)).default([]),
  themes: z.array(z.enum(THEMES)).default([]),
  oc4idsAlignment: z.array(z.enum(OC4IDS_SECTIONS)).default([]),
  workstreams: z.array(z.enum(WORKSTREAMS)).default([]),

  // Audience & Access
  audience: z.array(z.enum(AUDIENCE_LEVELS)).default([]),
  accessLevel: z.enum(ACCESS_LEVELS).default('public'),
  language: z.enum(LANGUAGE_CODES).default('en'),

  // Multi-language Support
  canonicalId: z.instanceof(ObjectId).optional(),
  isTranslation: z.boolean().default(false),
  translations: z.array(TranslationLinkSchema).default([]),

  // Temporal Metadata
  publicationDate: z.date(),
  lastVerified: z.date(),
  validUntil: z.date().optional(),

  // Lifecycle
  status: z.enum([
    ContentStatus.DISCOVERED,
    ContentStatus.PENDING_REVIEW,
    ContentStatus.APPROVED,
    ContentStatus.PUBLISHED,
    ContentStatus.ARCHIVED,
    ContentStatus.REJECTED
  ]).default(ContentStatus.DISCOVERED),
  statusHistory: z.array(StatusChangeSchema).default([]),
  publishedAt: z.date().optional(),
  archivedAt: z.date().optional(),
  archivedReason: z.string().optional(),
  supersededBy: z.instanceof(ObjectId).optional(),

  // Metadata
  source: z.enum(['manual', 'discovered']).default('manual'),
  discoveredFrom: z.string().url().optional(),

  // AI-generated
  summary: z.string().max(1000).optional(),
  embedding: z.array(z.number()).optional(),
  chunks: z.array(z.instanceof(ObjectId)).optional(),

  // Relationships
  relatedResources: z.array(z.instanceof(ObjectId)).default([]),
  partOf: z.instanceof(ObjectId).optional(),

  // Engagement
  clicks: z.number().int().min(0).default(0),
  lastClickedAt: z.date().optional(),
  aiCitations: z.number().int().min(0).default(0),

  // Cover Image
  coverImage: z.string().url().optional(),

  // Timestamps
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
  createdBy: z.instanceof(ObjectId),
  updatedBy: z.instanceof(ObjectId),

  // Legacy fields (optional for backward compatibility)
  // category is now stored as string (topic name) not ObjectId
  category: z.string().optional(),
  topics: z.array(z.string()).default([]),
  regions: z.array(z.string()).default([])
});

// Input schema for creating/updating resources (relaxed validation)
export const ResourceInputSchema = ResourceSchema.partial({
  _id: true,
  statusHistory: true,
  publishedAt: true,
  archivedAt: true,
  clicks: true,
  aiCitations: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  publicationDate: true,
  lastVerified: true
});

export type ResourceInput = z.infer<typeof ResourceInputSchema>;

// Schema for status updates
export const UpdateStatusSchema = z.object({
  status: z.enum([
    ContentStatus.DISCOVERED,
    ContentStatus.PENDING_REVIEW,
    ContentStatus.APPROVED,
    ContentStatus.PUBLISHED,
    ContentStatus.ARCHIVED,
    ContentStatus.REJECTED
  ]),
  reason: z.string().optional()
});

// Schema for creating resources
export const CreateResourceSchema = ResourceInputSchema.pick({
  title: true,
  description: true,
  descriptionLocked: true,
  descriptionSource: true,
  url: true,
  slug: true,
  tags: true,
  countryPrograms: true,
  themes: true,
  oc4idsAlignment: true,
  workstreams: true,
  audience: true,
  accessLevel: true,
  language: true,
  isTranslation: true,
  translations: true,
  category: true,
  topics: true,
  regions: true
}).extend({
  title: z.string().min(1).max(500),
  description: z.string().min(1).max(5000),
  descriptionLocked: z.boolean().default(false),
  descriptionSource: z.enum(DESCRIPTION_SOURCES).default('manual'),
  url: z.string().url(),
  slug: z.string().min(1).max(200),
  tags: z.array(z.string()).default([]),  // AI-suggested and user-defined tags
  countryPrograms: z.array(z.string()).default([]),
  themes: z.array(z.string()).default([]),
  oc4idsAlignment: z.array(z.string()).default([]),
  workstreams: z.array(z.string()).default([]),
  audience: z.array(z.string()).default([]),
  accessLevel: z.enum(ACCESS_LEVELS).default('public'),
  language: z.enum(LANGUAGE_CODES).default('en'),
  isTranslation: z.boolean().default(false),
  // Translations with string resourceId (converted to ObjectId in service layer)
  translations: z.array(z.object({
    language: z.enum(LANGUAGE_CODES),
    resourceId: z.string()
  })).default([]),
  // Legacy fields - category is now a string (topic name)
  category: z.string().optional(),
  topics: z.array(z.string()).default([]),
  regions: z.array(z.string()).default([]),
  // Cover image - allow empty string or valid URL
  coverImage: z.string().optional()
});

// Schema for updating resources
export const UpdateResourceSchema = CreateResourceSchema.partial();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Validation helpers
export function isValidCountryProgram(value: string): value is CountryProgram {
  return COUNTRY_PROGRAMS.includes(value as CountryProgram);
}

export function isValidTheme(value: string): value is Theme {
  return THEMES.includes(value as Theme);
}

export function isValidOC4IDSSection(value: string): value is OC4IDSSection {
  return OC4IDS_SECTIONS.includes(value as OC4IDSSection);
}

export function isValidWorkstream(value: string): value is Workstream {
  return WORKSTREAMS.includes(value as Workstream);
}

export function isValidAudienceLevel(value: string): value is AudienceLevel {
  return AUDIENCE_LEVELS.includes(value as AudienceLevel);
}

// Label generation helpers
function toTitleCase(str: string): string {
  return str
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function toTitleCaseWithHyphen(str: string): string {
  return str
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('-');
}

export function getCountryProgramLabel(program: CountryProgram): string {
  const specialCases: Record<string, string> = {
    'costa_rica': 'Costa Rica',
    'el_salvador': 'El Salvador',
    'timor_leste': 'Timor-Leste',
    'global': 'Global'
  };

  if (program in specialCases) {
    return specialCases[program];
  }

  return toTitleCase(program);
}

export function getThemeLabel(theme: Theme): string {
  const specialCases: Record<string, string> = {
    'msg_governance': 'MSG Governance'
  };

  if (theme in specialCases) {
    return specialCases[theme];
  }

  return toTitleCase(theme);
}

export function getOC4IDSSectionLabel(section: OC4IDSSection): string {
  return toTitleCase(section);
}

export function getWorkstreamLabel(workstream: Workstream): string {
  return toTitleCase(workstream);
}

export function getAudienceLevelLabel(level: AudienceLevel): string {
  const specialCases: Record<string, string> = {
    'msg': 'MSG',
    'civil_society': 'Civil Society'
  };

  if (level in specialCases) {
    return specialCases[level];
  }

  return toTitleCase(level);
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const COLLECTION_NAME = 'resources';
