// Firebase Timestamp type - will be properly imported when Firebase is configured
export interface Timestamp {
  seconds: number;
  nanoseconds: number;
}

export interface MultiLanguageText {
  en: string;
  es: string;
  pt: string;
}

export type ResourceType = 'guidance' | 'caseStudy' | 'report' | 'dataset' | 'tool' | 'infographic' | 'other';
export type Language = 'en' | 'es' | 'pt';

export interface Resource {
  id: string;
  title: MultiLanguageText;
  description: MultiLanguageText;
  type: ResourceType;
  tags: string[];
  country: string; // ISO 3166 alpha-2 or 'global'
  language: Language; // Primary language
  datePublished: Timestamp;
  fileLinks?: Partial<Record<Language, string>>; // Storage URLs
  externalLink?: string; // External URL if not hosted
  thumbnailUrl?: string; // Preview image URL
  featured: boolean; // Show in featured section
  relatedLangIds?: string[]; // Cross-references to other language versions
  fileSize?: string; // e.g., "3.2 MB"
  format?: string; // e.g., "PDF", "CSV", "XLSX"
  impact?: {
    savings?: string;
    projects?: number;
    transparency?: string;
  };
}

export interface ResourceFilter {
  type?: ResourceType[];
  tags?: string[];
  country?: string[];
  language?: Language[];
  featured?: boolean;
  searchQuery?: string;
}

export interface ResourceSearchResult {
  resources: Resource[];
  total: number;
  hasMore: boolean;
}
