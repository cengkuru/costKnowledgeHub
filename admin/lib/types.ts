// Resource Types
export type ContentStatus = 'discovered' | 'pending_review' | 'approved' | 'published' | 'archived' | 'rejected';
export type ResourceType = 'assurance_report' | 'guidance' | 'case_study' | 'tool' | 'template' | 'research' | 'news' | 'training' | 'policy';
export type CountryProgram = 'ethiopia' | 'malawi' | 'mozambique' | 'seychelles' | 'uganda' | 'zambia' | 'colombia' | 'costa_rica' | 'ecuador' | 'el_salvador' | 'guatemala' | 'honduras' | 'panama' | 'mexico' | 'afghanistan' | 'indonesia' | 'thailand' | 'timor_leste' | 'vietnam' | 'ukraine' | 'global';
export type Theme = 'climate' | 'gender' | 'local_government' | 'beneficial_ownership' | 'social_safeguards' | 'environmental' | 'procurement' | 'project_monitoring' | 'data_standards' | 'msg_governance' | 'digital_tools' | 'impact_measurement';
export type OC4IDSSection = 'project_identification' | 'project_preparation' | 'project_completion' | 'contracting_process' | 'implementation' | 'project_scope' | 'project_parties' | 'cost_schedule' | 'documents' | 'full_schema';
export type Workstream = 'disclosure' | 'assurance' | 'social_accountability' | 'reforms' | 'capacity_building';
export type AudienceLevel = 'technical' | 'policy' | 'msg' | 'civil_society' | 'academic' | 'general';
export type LanguageCode = 'en' | 'es' | 'fr' | 'pt' | 'uk' | 'id' | 'vi' | 'th';
export type AccessLevel = 'public' | 'members' | 'internal';

export interface StatusChange {
  status: ContentStatus;
  changedAt: string;
  changedBy: string;
  reason?: string;
}

export interface TranslationLink {
  language: LanguageCode;
  resourceId: string;
}

export interface Resource {
  _id: string;
  title: string;
  description: string;
  url: string;
  slug: string;
  resourceType: ResourceType;
  countryPrograms: CountryProgram[];
  themes: Theme[];
  oc4idsAlignment: OC4IDSSection[];
  workstreams: Workstream[];
  audience: AudienceLevel[];
  accessLevel: AccessLevel;
  language: LanguageCode;
  canonicalId?: string;
  isTranslation: boolean;
  translations: TranslationLink[];
  publicationDate: string;
  lastVerified: string;
  validUntil?: string;
  status: ContentStatus;
  statusHistory: StatusChange[];
  publishedAt?: string;
  archivedAt?: string;
  archivedReason?: string;
  supersededBy?: string;
  source: 'manual' | 'discovered';
  discoveredFrom?: string;
  summary?: string;
  relatedResources?: string[];
  partOf?: string;
  clicks: number;
  lastClickedAt?: string;
  aiCitations: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface Category {
  _id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'editor' | 'viewer';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
