import { ResourceType, Language } from './resource.model';

export interface FilterOption {
  value: string;
  label: string;
  count: number;
}

export interface FilterGroup {
  type: FilterOption[];
  topic: FilterOption[];
  region: FilterOption[];
  language: FilterOption[];
  country: FilterOption[];
}

export interface ActiveFilters {
  type: string[];
  topic: string[];
  region: string[];
  language: Language[];
  country: string[];
  searchQuery: string;
}

export interface SearchQuery {
  query: string;
  filters: ActiveFilters;
  page: number;
  limit: number;
  sortBy: 'datePublished' | 'title' | 'relevance';
  sortOrder: 'asc' | 'desc';
}

export interface TopicCategory {
  id: string;
  name: {en: string, es: string, pt: string};
  icon: string;
  color: string;
  description: {en: string, es: string, pt: string};
  resourceCount: number;
}
