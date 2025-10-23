// Firebase Timestamp type - will be properly imported when Firebase is configured
export interface Timestamp {
  seconds: number;
  nanoseconds: number;
}

export interface MultiLanguageText {
  en: string;
  es: string;
  pt: string;
  fr?: string;
  ar?: string;
}

export type ResourceType = 'guide' | 'case-study' | 'tool' | 'report' | 'policy' | 'template' | 'dataset' | 'infographic' | 'other';
export type Language = 'en' | 'es' | 'pt' | 'fr' | 'ar';
export type TopicCategory = 'disclosure' | 'assurance' | 'procurement' | 'monitoring' | 'stakeholder' | 'accountability';
export type Region = 'africa' | 'asia' | 'latam' | 'europe' | 'global';

export interface Resource {
  id: string;
  title: MultiLanguageText;
  description: MultiLanguageText;
  type: ResourceType;
  category: string; // e.g., "Data Standards", "Impact Stories"
  topics: TopicCategory[]; // Main CoST topic areas
  tags: string[]; // Free-form tags
  country: string; // ISO 3166 alpha-2 or 'global'
  countries?: string[]; // Multiple countries for regional resources
  region?: Region; // Geographic region
  language: Language; // Primary language
  datePublished: Timestamp;
  fileLinks?: Partial<Record<Language, string>>; // Storage URLs
  externalLink?: string; // External URL if not hosted
  downloadUrl?: string; // Direct download link
  thumbnailUrl?: string; // Preview image URL
  imageUrl?: string; // Hero/banner image
  featured: boolean; // Show in featured section
  relatedLangIds?: string[]; // Cross-references to other language versions
  fileSize?: string; // e.g., "3.2 MB"
  format?: string; // e.g., "PDF", "CSV", "XLSX"
  readingTime?: number; // Estimated reading time in minutes
  views?: number; // View count
  downloads?: number; // Download count
  lastUpdated?: Timestamp;
  // Publishing status
  status: 'draft' | 'published' | 'unpublished';
  publishedBy?: string; // User ID who published
  publishedAt?: Timestamp;
  // Content management
  createdBy: string; // User ID who created
  createdAt: Timestamp;
  updatedBy?: string; // User ID who last updated
  updatedAt?: Timestamp;
  // AI-powered content validation
  confidence?: {
    score: number; // 0-100 confidence score
    level: 'high' | 'medium' | 'low'; // Confidence level category
    feedback: string[]; // Specific feedback messages
    recommendations?: string[]; // Actionable improvement suggestions
    validatedAt?: Timestamp; // When validation was performed
    validationDetails?: {
      completeness: number; // 0-100 content completeness score
      clarity: number; // 0-100 clarity and coherence score
      relevance: number; // 0-100 topic relevance score
      consistency: number; // 0-100 cross-field consistency score
    };
  };
  // CoST-specific impact metrics
  impact?: {
    savings?: string; // e.g., "$360 million"
    projects?: number; // Number of projects affected
    transparency?: string; // e.g., "85% disclosure rate"
    description?: string; // Impact description
  };
  // Assurance report specific fields
  assuranceData?: {
    projectsReviewed: number;
    totalInvestment: string; // e.g., "$3.27 billion"
    sectors: string[]; // ["building", "road", "water"]
    disclosureRate: number; // percentage
    averageTimeOverrun?: number; // percentage
    averageCostOverrun?: number; // percentage
    keyFindings?: string[];
    recommendations?: string[];
  };
  // Metadata for C40-style categorization
  metadata?: {
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    implementationTime?: string; // e.g., "3-6 months"
    targetAudience?: string[]; // e.g., ["Government", "Civil Society"]
    prerequisites?: string[];
    sourceOrganization?: string; // e.g., "CoST Ethiopia"
  };
  // Analytics tracking
  analytics?: {
    pageViews: number;
    uniqueViews: number;
    downloads: number;
    averageTimeOnPage?: number; // seconds
    bounceRate?: number; // percentage
    lastViewedAt?: Timestamp;
  };
}

export interface ResourceFilter {
  type?: ResourceType[];
  topics?: TopicCategory[];
  tags?: string[];
  country?: string[];
  region?: Region[];
  language?: Language[];
  featured?: boolean;
  difficulty?: string[];
  format?: string[];
  searchQuery?: string;
  dateRange?: {
    start?: Date;
    end?: Date;
  };
}

export interface ResourceSearchResult {
  resources: Resource[];
  total: number;
  hasMore: boolean;
}
