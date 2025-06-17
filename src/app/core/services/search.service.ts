import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { ResourceService } from './resource.service';
import { SearchSuggestion, SearchQuery, ActiveFilters } from '../models/filter.model';
import { Resource } from '../models/resource.model';
import { COST_TOPICS } from '../models/topic.model';
import { COST_COUNTRIES } from '../models/country.model';

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  private searchQuerySubject = new BehaviorSubject<string>('');
  private recentSearchesSubject = new BehaviorSubject<string[]>([]);
  private suggestionsSubject = new BehaviorSubject<SearchSuggestion[]>([]);

  public searchQuery$ = this.searchQuerySubject.asObservable();
  public recentSearches$ = this.recentSearchesSubject.asObservable();
  public suggestions$ = this.suggestionsSubject.asObservable();

  // Popular searches based on C40 Knowledge Hub patterns
  private readonly POPULAR_SEARCHES = [
    'data disclosure',
    'procurement transparency',
    'community monitoring',
    'infrastructure standards',
    'assurance framework',
    'Thailand case study',
    'Guatemala success',
    'digital tools',
    'policy reform'
  ];

  constructor(private resourceService: ResourceService) {
    // Load recent searches from localStorage
    this.loadRecentSearches();
    
    // Set up search suggestions
    this.setupSearchSuggestions();
  }

  // Update search query with debouncing
  updateSearchQuery(query: string): void {
    this.searchQuerySubject.next(query);
    
    // Add to recent searches if query is substantial
    if (query.trim().length >= 3) {
      this.addToRecentSearches(query.trim());
    }
  }

  // Get search suggestions based on input
  private setupSearchSuggestions(): void {
    this.searchQuery$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(query => this.generateSuggestions(query))
    ).subscribe(suggestions => {
      this.suggestionsSubject.next(suggestions);
    });
  }

  private generateSuggestions(query: string): Observable<SearchSuggestion[]> {
    if (!query || query.length < 2) {
      // Return popular searches when no query
      return new Observable(observer => {
        const popularSuggestions = this.POPULAR_SEARCHES.map(search => ({
          type: 'resource' as const,
          text: search,
          icon: 'search'
        }));
        observer.next(popularSuggestions.slice(0, 5));
        observer.complete();
      });
    }

    return this.resourceService.resources$.pipe(
      map(resources => {
        const suggestions: SearchSuggestion[] = [];
        const queryLower = query.toLowerCase();

        // Resource title suggestions
        const resourceMatches = resources
          .filter(resource => 
            Object.values(resource.title).some(title => 
              title.toLowerCase().includes(queryLower)
            )
          )
          .slice(0, 3)
          .map(resource => ({
            type: 'resource' as const,
            text: resource.title.en,
            icon: this.getResourceTypeIcon(resource.type)
          }));

        // Topic suggestions
        const topicMatches = COST_TOPICS
          .filter(topic => 
            topic.name.toLowerCase().includes(queryLower) ||
            topic.description.toLowerCase().includes(queryLower)
          )
          .slice(0, 2)
          .map(topic => ({
            type: 'topic' as const,
            text: topic.name,
            count: topic.resourceCount,
            icon: topic.icon
          }));

        // Country suggestions
        const countryMatches = COST_COUNTRIES
          .filter(country => 
            country.name.toLowerCase().includes(queryLower)
          )
          .slice(0, 2)
          .map(country => ({
            type: 'country' as const,
            text: country.name,
            count: country.projects,
            icon: 'flag'
          }));

        // Tag suggestions from resources
        const allTags = resources.flatMap(r => r.tags);
        const tagMatches = [...new Set(allTags)]
          .filter(tag => tag.toLowerCase().includes(queryLower))
          .slice(0, 2)
          .map(tag => ({
            type: 'tag' as const,
            text: tag,
            icon: 'tag'
          }));

        return [
          ...resourceMatches,
          ...topicMatches,
          ...countryMatches,
          ...tagMatches
        ].slice(0, 8);
      })
    );
  }

  private getResourceTypeIcon(type: string): string {
    const iconMap: Record<string, string> = {
      'guide': 'book-open',
      'case-study': 'chart-bar',
      'tool': 'wrench',
      'report': 'document-text',
      'policy': 'clipboard-list',
      'template': 'template',
      'dataset': 'database',
      'infographic': 'photograph'
    };
    return iconMap[type] || 'document';
  }

  // Manage recent searches
  private addToRecentSearches(query: string): void {
    const recent = this.recentSearchesSubject.value;
    const updated = [query, ...recent.filter(q => q !== query)].slice(0, 5);
    this.recentSearchesSubject.next(updated);
    this.saveRecentSearches(updated);
  }

  private loadRecentSearches(): void {
    try {
      const saved = localStorage.getItem('cost-hub-recent-searches');
      if (saved) {
        const searches = JSON.parse(saved);
        this.recentSearchesSubject.next(searches);
      }
    } catch (error) {
      console.warn('Failed to load recent searches:', error);
    }
  }

  private saveRecentSearches(searches: string[]): void {
    try {
      localStorage.setItem('cost-hub-recent-searches', JSON.stringify(searches));
    } catch (error) {
      console.warn('Failed to save recent searches:', error);
    }
  }

  // Clear recent searches
  clearRecentSearches(): void {
    this.recentSearchesSubject.next([]);
    localStorage.removeItem('cost-hub-recent-searches');
  }

  // Search with filters (delegated to ResourceService)
  search(query: string, filters?: Partial<ActiveFilters>): Observable<Resource[]> {
    const searchFilters: ActiveFilters = {
      type: [],
      topic: [],
      region: [],
      language: [],
      country: [],
      difficulty: [],
      format: [],
      searchQuery: query,
      ...filters
    };

    this.resourceService.updateFilters(searchFilters);
    return this.resourceService.getResources().pipe(
      map(result => result.resources)
    );
  }

  // Quick search for autocomplete
  quickSearch(query: string): Observable<SearchSuggestion[]> {
    this.updateSearchQuery(query);
    return this.suggestions$;
  }

  // Get trending searches (could be enhanced with analytics)
  getTrendingSearches(): string[] {
    return [
      'infrastructure transparency',
      'procurement reform',
      'data disclosure standards',
      'community monitoring',
      'assurance reports'
    ];
  }

  // Search analytics (placeholder for future implementation)
  trackSearch(query: string, resultCount: number): void {
    console.log(`Search tracked: "${query}" (${resultCount} results)`);
    // Future: Send to analytics service
  }
}