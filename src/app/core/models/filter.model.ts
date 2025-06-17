import { ResourceType, Language, TopicCategory, Region } from './resource.model';

export interface FilterOption {
  value: string;
  label: string;
  count: number;
  icon?: string; // For visual filters
  color?: string; // For topic filters
}

export interface FilterGroup {
  type: FilterOption[];
  topic: FilterOption[];
  region: FilterOption[];
  language: FilterOption[];
  country: FilterOption[];
  difficulty?: FilterOption[];
  format?: FilterOption[];
}

export interface ActiveFilters {
  type: ResourceType[];
  topic: TopicCategory[];
  region: Region[];
  language: Language[];
  country: string[];
  difficulty?: string[];
  format?: string[];
  featured?: boolean;
  searchQuery: string;
  dateRange?: {
    start?: Date;
    end?: Date;
  };
}

export interface SearchQuery {
  query: string;
  filters: ActiveFilters;
  page: number;
  limit: number;
  sortBy: 'datePublished' | 'title' | 'relevance' | 'downloads' | 'views';
  sortOrder: 'asc' | 'desc';
}

export interface SearchSuggestion {
  type: 'resource' | 'topic' | 'country' | 'tag';
  text: string;
  count?: number;
  icon?: string;
}

export interface SearchFilters {
  type: FilterOption[];
  topic: FilterOption[];
  region: FilterOption[];
  language: FilterOption[];
  difficulty: FilterOption[];
  format: FilterOption[];
}

// C40-style predefined filter sets
export const DEFAULT_FILTERS: SearchFilters = {
  type: [
    { value: 'guide', label: 'Implementation Guides', count: 24 },
    { value: 'case-study', label: 'Case Studies', count: 31 },
    { value: 'tool', label: 'Tools & Templates', count: 18 },
    { value: 'report', label: 'Research Reports', count: 42 },
    { value: 'policy', label: 'Policy Briefs', count: 15 }
  ],
  topic: [
    { value: 'disclosure', label: 'Data Disclosure', count: 45, color: '#355E69' },
    { value: 'assurance', label: 'Independent Assurance', count: 32, color: '#0AAEA0' },
    { value: 'procurement', label: 'Public Procurement', count: 68, color: '#F0AD4E' },
    { value: 'monitoring', label: 'Project Monitoring', count: 41, color: '#ED1C24' },
    { value: 'stakeholder', label: 'Multi-stakeholder Working', count: 29, color: '#662D91' },
    { value: 'accountability', label: 'Social Accountability', count: 37, color: '#00AEEF' }
  ],
  region: [
    { value: 'africa', label: 'Africa', count: 48 },
    { value: 'asia', label: 'Asia Pacific', count: 37 },
    { value: 'latam', label: 'Latin America', count: 29 },
    { value: 'europe', label: 'Europe', count: 21 }
  ],
  language: [
    { value: 'en', label: 'English', count: 98 },
    { value: 'es', label: 'Español', count: 45 },
    { value: 'fr', label: 'Français', count: 32 },
    { value: 'ar', label: 'العربية', count: 18 }
  ],
  difficulty: [
    { value: 'beginner', label: 'Beginner', count: 45 },
    { value: 'intermediate', label: 'Intermediate', count: 67 },
    { value: 'advanced', label: 'Advanced', count: 23 }
  ],
  format: [
    { value: 'PDF', label: 'PDF Document', count: 89 },
    { value: 'CSV', label: 'Data (CSV)', count: 23 },
    { value: 'XLSX', label: 'Spreadsheet', count: 34 },
    { value: 'PPT', label: 'Presentation', count: 12 }
  ]
};
