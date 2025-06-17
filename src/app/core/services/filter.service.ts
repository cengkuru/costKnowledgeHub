import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { ActiveFilters, FilterOption, SearchFilters, DEFAULT_FILTERS } from '../models/filter.model';
import { ResourceType, TopicCategory, Region, Language } from '../models/resource.model';
import { ResourceService } from './resource.service';

@Injectable({
  providedIn: 'root'
})
export class FilterService {
  private activeFiltersSubject = new BehaviorSubject<ActiveFilters>({
    type: [],
    topic: [],
    region: [],
    language: [],
    country: [],
    difficulty: [],
    format: [],
    searchQuery: ''
  });

  private filterPresetsSubject = new BehaviorSubject<SearchFilters>(DEFAULT_FILTERS);

  public activeFilters$ = this.activeFiltersSubject.asObservable();
  public filterPresets$ = this.filterPresetsSubject.asObservable();

  constructor(private resourceService: ResourceService) {
    // Sync with ResourceService filters
    this.activeFilters$.subscribe(filters => {
      this.resourceService.updateFilters(filters);
    });
  }

  // Update specific filter category
  updateFilter<K extends keyof ActiveFilters>(
    category: K, 
    value: ActiveFilters[K]
  ): void {
    const current = this.activeFiltersSubject.value;
    this.activeFiltersSubject.next({
      ...current,
      [category]: value
    });
  }

  // Toggle a filter value (for multi-select filters)
  toggleFilter(
    category: keyof Pick<ActiveFilters, 'type' | 'topic' | 'region' | 'language' | 'country' | 'difficulty' | 'format'>,
    value: string
  ): void {
    const current = this.activeFiltersSubject.value;
    const currentValues = current[category] as string[];
    
    const updated = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value];
    
    this.updateFilter(category, updated);
  }

  // Add filter value (if not already present)
  addFilter(
    category: keyof Pick<ActiveFilters, 'type' | 'topic' | 'region' | 'language' | 'country' | 'difficulty' | 'format'>,
    value: string
  ): void {
    const current = this.activeFiltersSubject.value;
    const currentValues = current[category] as string[];
    
    if (!currentValues.includes(value)) {
      this.updateFilter(category, [...currentValues, value]);
    }
  }

  // Remove filter value
  removeFilter(
    category: keyof Pick<ActiveFilters, 'type' | 'topic' | 'region' | 'language' | 'country' | 'difficulty' | 'format'>,
    value: string
  ): void {
    const current = this.activeFiltersSubject.value;
    const currentValues = current[category] as string[];
    this.updateFilter(category, currentValues.filter(v => v !== value));
  }

  // Clear specific filter category
  clearFilterCategory(category: keyof ActiveFilters): void {
    const current = this.activeFiltersSubject.value;
    
    if (category === 'searchQuery') {
      this.updateFilter('searchQuery', '');
    } else if (category === 'featured') {
      this.updateFilter('featured', undefined);
    } else if (category === 'dateRange') {
      this.updateFilter('dateRange', undefined);
    } else {
      this.updateFilter(category, []);
    }
  }

  // Clear all filters
  clearAllFilters(): void {
    this.activeFiltersSubject.next({
      type: [],
      topic: [],
      region: [],
      language: [],
      country: [],
      difficulty: [],
      format: [],
      searchQuery: ''
    });
  }

  // Get active filter count
  getActiveFilterCount(): Observable<number> {
    return this.activeFilters$.pipe(
      map(filters => {
        let count = 0;
        
        count += filters.type.length;
        count += filters.topic.length;
        count += filters.region.length;
        count += filters.language.length;
        count += filters.country.length;
        count += filters.difficulty?.length || 0;
        count += filters.format?.length || 0;
        
        if (filters.searchQuery) count++;
        if (filters.featured !== undefined) count++;
        if (filters.dateRange) count++;
        
        return count;
      })
    );
  }

  // Get filter summary for display
  getFilterSummary(): Observable<string[]> {
    return this.activeFilters$.pipe(
      map(filters => {
        const summary: string[] = [];
        
        // Add search query
        if (filters.searchQuery) {
          summary.push(`Search: "${filters.searchQuery}"`);
        }
        
        // Add filter categories
        if (filters.type.length > 0) {
          summary.push(`Type: ${filters.type.join(', ')}`);
        }
        
        if (filters.topic.length > 0) {
          summary.push(`Topic: ${filters.topic.join(', ')}`);
        }
        
        if (filters.region.length > 0) {
          summary.push(`Region: ${filters.region.join(', ')}`);
        }
        
        if (filters.language.length > 0) {
          summary.push(`Language: ${filters.language.join(', ')}`);
        }
        
        if (filters.country.length > 0) {
          summary.push(`Country: ${filters.country.join(', ')}`);
        }
        
        if (filters.difficulty && filters.difficulty.length > 0) {
          summary.push(`Difficulty: ${filters.difficulty.join(', ')}`);
        }
        
        if (filters.format && filters.format.length > 0) {
          summary.push(`Format: ${filters.format.join(', ')}`);
        }
        
        if (filters.featured) {
          summary.push('Featured only');
        }
        
        return summary;
      })
    );
  }

  // Predefined filter combinations (like C40's quick filters)
  applyQuickFilter(filterName: string): void {
    const quickFilters: Record<string, Partial<ActiveFilters>> = {
      'featured': {
        featured: true
      },
      'guides': {
        type: ['guide']
      },
      'case-studies': {
        type: ['case-study']
      },
      'tools': {
        type: ['tool']
      },
      'recent': {
        // Filter by resources from last 6 months (would need date logic)
      },
      'popular': {
        // Could be based on downloads/views when available
      },
      'disclosure': {
        topic: ['disclosure']
      },
      'procurement': {
        topic: ['procurement']
      },
      'assurance': {
        topic: ['assurance']
      }
    };
    
    const filterConfig = quickFilters[filterName];
    if (filterConfig) {
      const current = this.activeFiltersSubject.value;
      this.activeFiltersSubject.next({
        ...current,
        ...filterConfig
      });
    }
  }

  // Get available filter options with counts (dynamic)
  getDynamicFilterOptions(): Observable<SearchFilters> {
    return combineLatest([
      this.resourceService.resources$,
      this.activeFilters$
    ]).pipe(
      map(([resources, activeFilters]) => {
        // Filter resources based on current filters (excluding the category being counted)
        // This gives accurate counts for remaining options
        
        const typeCount: Record<string, number> = {};
        const topicCount: Record<string, number> = {};
        const regionCount: Record<string, number> = {};
        const languageCount: Record<string, number> = {};
        const difficultyCount: Record<string, number> = {};
        const formatCount: Record<string, number> = {};
        
        resources.forEach(resource => {
          // Apply all filters except the one we're counting
          let includeResource = true;
          
          // Type counts (apply all other filters)
          if (activeFilters.topic.length > 0 && !resource.topics.some(t => activeFilters.topic.includes(t))) {
            includeResource = false;
          }
          if (includeResource) {
            typeCount[resource.type] = (typeCount[resource.type] || 0) + 1;
          }
          
          // Reset for topic counting
          includeResource = true;
          if (activeFilters.type.length > 0 && !activeFilters.type.includes(resource.type)) {
            includeResource = false;
          }
          if (includeResource) {
            resource.topics.forEach(topic => {
              topicCount[topic] = (topicCount[topic] || 0) + 1;
            });
          }
          
          // Continue for other categories...
          languageCount[resource.language] = (languageCount[resource.language] || 0) + 1;
          if (resource.region) {
            regionCount[resource.region] = (regionCount[resource.region] || 0) + 1;
          }
          if (resource.metadata?.difficulty) {
            difficultyCount[resource.metadata.difficulty] = (difficultyCount[resource.metadata.difficulty] || 0) + 1;
          }
          if (resource.format) {
            formatCount[resource.format] = (formatCount[resource.format] || 0) + 1;
          }
        });
        
        return {
          type: Object.entries(typeCount).map(([value, count]) => ({
            value,
            label: this.formatTypeLabel(value),
            count
          })).sort((a, b) => b.count - a.count),
          
          topic: Object.entries(topicCount).map(([value, count]) => ({
            value,
            label: this.formatTopicLabel(value),
            count,
            color: this.getTopicColor(value)
          })).sort((a, b) => b.count - a.count),
          
          region: Object.entries(regionCount).map(([value, count]) => ({
            value,
            label: this.formatRegionLabel(value),
            count
          })).sort((a, b) => b.count - a.count),
          
          language: Object.entries(languageCount).map(([value, count]) => ({
            value,
            label: this.formatLanguageLabel(value),
            count
          })).sort((a, b) => b.count - a.count),
          
          difficulty: Object.entries(difficultyCount).map(([value, count]) => ({
            value,
            label: this.formatDifficultyLabel(value),
            count
          })).sort((a, b) => b.count - a.count),
          
          format: Object.entries(formatCount).map(([value, count]) => ({
            value,
            label: value,
            count
          })).sort((a, b) => b.count - a.count)
        };
      })
    );
  }

  // Label formatting methods
  private formatTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'guide': 'Implementation Guides',
      'case-study': 'Case Studies', 
      'tool': 'Tools & Templates',
      'report': 'Research Reports',
      'policy': 'Policy Briefs',
      'template': 'Templates',
      'dataset': 'Datasets',
      'infographic': 'Infographics'
    };
    return labels[type] || type;
  }

  private formatTopicLabel(topic: string): string {
    const labels: Record<string, string> = {
      'disclosure': 'Data Disclosure',
      'assurance': 'Independent Assurance',
      'procurement': 'Public Procurement',
      'monitoring': 'Project Monitoring',
      'stakeholder': 'Multi-stakeholder Working',
      'accountability': 'Social Accountability'
    };
    return labels[topic] || topic;
  }

  private formatRegionLabel(region: string): string {
    const labels: Record<string, string> = {
      'africa': 'Africa',
      'asia': 'Asia Pacific',
      'latam': 'Latin America',
      'europe': 'Europe',
      'global': 'Global'
    };
    return labels[region] || region;
  }

  private formatLanguageLabel(lang: string): string {
    const labels: Record<string, string> = {
      'en': 'English',
      'es': 'Español',
      'pt': 'Português',
      'fr': 'Français',
      'ar': 'العربية'
    };
    return labels[lang] || lang;
  }

  private formatDifficultyLabel(difficulty: string): string {
    const labels: Record<string, string> = {
      'beginner': 'Beginner',
      'intermediate': 'Intermediate',
      'advanced': 'Advanced'
    };
    return labels[difficulty] || difficulty;
  }

  private getTopicColor(topic: string): string {
    const colors: Record<string, string> = {
      'disclosure': '#355E69',
      'assurance': '#0AAEA0', 
      'procurement': '#F0AD4E',
      'monitoring': '#ED1C24',
      'stakeholder': '#662D91',
      'accountability': '#00AEEF'
    };
    return colors[topic] || '#355E69';
  }

  // URL state management (for shareable filter URLs)
  getFilterUrlParams(): Observable<Record<string, string>> {
    return this.activeFilters$.pipe(
      map(filters => {
        const params: Record<string, string> = {};
        
        if (filters.searchQuery) params['q'] = filters.searchQuery;
        if (filters.type.length > 0) params['type'] = filters.type.join(',');
        if (filters.topic.length > 0) params['topic'] = filters.topic.join(',');
        if (filters.region.length > 0) params['region'] = filters.region.join(',');
        if (filters.language.length > 0) params['lang'] = filters.language.join(',');
        if (filters.country.length > 0) params['country'] = filters.country.join(',');
        if (filters.difficulty && filters.difficulty.length > 0) params['difficulty'] = filters.difficulty.join(',');
        if (filters.format && filters.format.length > 0) params['format'] = filters.format.join(',');
        if (filters.featured) params['featured'] = 'true';
        
        return params;
      })
    );
  }

  // Apply filters from URL parameters
  applyFromUrlParams(params: Record<string, string>): void {
    const filters: Partial<ActiveFilters> = {};
    
    if (params['q']) filters.searchQuery = params['q'];
    if (params['type']) filters.type = params['type'].split(',') as ResourceType[];
    if (params['topic']) filters.topic = params['topic'].split(',') as TopicCategory[];
    if (params['region']) filters.region = params['region'].split(',') as Region[];
    if (params['lang']) filters.language = params['lang'].split(',') as Language[];
    if (params['country']) filters.country = params['country'].split(',');
    if (params['difficulty']) filters.difficulty = params['difficulty'].split(',');
    if (params['format']) filters.format = params['format'].split(',');
    if (params['featured']) filters.featured = params['featured'] === 'true';
    
    const current = this.activeFiltersSubject.value;
    this.activeFiltersSubject.next({
      ...current,
      ...filters
    });
  }
}