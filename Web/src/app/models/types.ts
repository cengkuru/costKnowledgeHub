export type Language = 'en' | 'es' | 'pt';

export enum ResourceCategory {
  ALL = 'All Topics',
  OC4IDS = 'OC4IDS',
  ASSURANCE = 'Independent Review',
  INDEX = 'Infrastructure Transparency Index',
  GUIDANCE = 'Guidance Notes',
}

export enum ResourceType {
  ALL = 'All Types',
  DOCUMENTATION = 'Documentation',
  TOOL = 'Tool',
  GUIDE = 'Guide',
  VISUALIZATION = 'Visualization',
  DATASET = 'Dataset',
  LIBRARY = 'Library/Code',
}

export interface ResourceItem {
  id: string;
  title: string;
  description: string;
  url: string;
  category: ResourceCategory;
  type: ResourceType;
  date: string; // ISO Date string YYYY-MM-DD
  coverImage?: string;
  tags?: string[];
}

export interface SearchResultGroup {
  title: string;
  description: string;
  resourceIds: string[];
}

export interface AIState {
  isTranslating: boolean;
  isSearching: boolean;
  error: string | null;
}

export type SortOption = 'newest' | 'oldest' | 'az' | 'popular';
