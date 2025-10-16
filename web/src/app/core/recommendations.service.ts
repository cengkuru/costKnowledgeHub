import { Injectable, signal, computed, effect } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { debounceTime, Subject } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { environment } from '../../environments/environment';
import { SearchService } from './search.service';
import { SelectionService } from './selection.service';

/**
 * Recommendation from API
 */
export interface Recommendation {
  id: string;
  title: string;
  type: string;
  url: string;
  relevanceScore: number;
  reason: string;
}

/**
 * AI-Native Recommendations Service
 *
 * Provides intelligent, context-aware resource recommendations using:
 * - Current search query
 * - Selected documents
 * - AI-generated answer text
 * - Vector similarity matching
 *
 * Features:
 * - Reactive: Auto-updates when context changes
 * - Debounced: Avoids API spam
 * - Cached: Remembers recent recommendations
 * - Fallback: Shows curated resources when offline
 */
@Injectable({
  providedIn: 'root'
})
export class RecommendationsService {
  private readonly apiUrl = environment.apiUrl;

  // Reactive state
  readonly recommendations = signal<Recommendation[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  // Computed: Has recommendations to show
  readonly hasRecommendations = computed(() => this.recommendations().length > 0);

  // Simple cache
  private cache = new Map<string, Recommendation[]>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  // Debounced refresh trigger
  private refreshTrigger$ = new Subject<void>();

  constructor(
    private http: HttpClient,
    private searchService: SearchService,
    private selectionService: SelectionService
  ) {
    // Auto-refresh recommendations when context changes
    this.setupAutoRefresh();

    // Debounced API calls
    this.refreshTrigger$
      .pipe(
        debounceTime(600), // Wait 600ms after last change
        takeUntilDestroyed()
      )
      .subscribe(() => {
        this.fetchRecommendations();
      });
  }

  /**
   * Setup reactive effects to auto-refresh recommendations
   * when search context changes
   */
  private setupAutoRefresh(): void {
    // Effect 1: Refresh when search query changes
    effect(() => {
      const query = this.searchService.items();
      if (query.length > 0) {
        this.refreshTrigger$.next();
      }
    });

    // Effect 2: Refresh when selections change
    effect(() => {
      const selections = this.selectionService.selectedCount();
      if (selections > 0) {
        this.refreshTrigger$.next();
      }
    });
  }

  /**
   * Manually trigger recommendations refresh
   */
  refresh(): void {
    this.refreshTrigger$.next();
  }

  /**
   * Fetch recommendations from API based on current context
   */
  private async fetchRecommendations(): Promise<void> {
    // Build context
    const query = this.buildQueryContext();
    const selectedIds = this.selectionService.getSelectedIds();
    const answerText = this.buildAnswerContext();
    const activeFilters = this.searchService.getActiveFilters();

    // Check cache
    const cacheKey = this.buildCacheKey(query, selectedIds, activeFilters, answerText);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.recommendations.set(cached);
      return;
    }

    // Fetch from API
    this.loading.set(true);
    this.error.set(null);

    try {
      let params = new HttpParams().set('limit', '5');

      if (query) params = params.set('query', query);
      if (selectedIds.length > 0) params = params.set('selectedIds', selectedIds.join(','));
      if (answerText) params = params.set('answerText', answerText);
      if (activeFilters.topic) params = params.set('topic', activeFilters.topic);
      if (activeFilters.country) params = params.set('country', activeFilters.country);
      if (activeFilters.year) params = params.set('year', activeFilters.year.toString());

      const response = await this.http
        .get<{ recommendations: Recommendation[] }>(
          `${this.apiUrl}/recommendations`,
          { params }
        )
        .toPromise();

      if (response && response.recommendations) {
        this.recommendations.set(response.recommendations);
        this.cache.set(cacheKey, response.recommendations);

        // Clear old cache entries
        if (this.cache.size > 20) {
          const firstKey = this.cache.keys().next().value;
          if (firstKey) {
            this.cache.delete(firstKey);
          }
        }
      }
    } catch (err) {
      console.error('[RecommendationsService] Fetch failed:', err);
      this.error.set('Failed to load recommendations');
      // Keep existing recommendations on error
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Get complementary recommendations for selected items
   * "Users who selected X also selected Y"
   */
  async getComplementary(): Promise<Recommendation[]> {
    const selectedIds = this.selectionService.getSelectedIds();
    if (selectedIds.length === 0) return [];

    try {
      const params = new HttpParams()
        .set('selectedIds', selectedIds.join(','))
        .set('limit', '3');

      const response = await this.http
        .get<{ complementary: Recommendation[] }>(
          `${this.apiUrl}/recommendations/complementary`,
          { params }
        )
        .toPromise();

      return response?.complementary || [];
    } catch (err) {
      console.error('[RecommendationsService] Complementary fetch failed:', err);
      return [];
    }
  }

  /**
   * Build query context from search service
   */
  private buildQueryContext(): string {
    const query = this.searchService.getQuery().trim();
    if (query.length >= 2) {
      return query;
    }

    const items = this.searchService.items();
    if (items.length === 0) return '';
    return items[0]?.title || '';
  }

  /**
   * Build answer context from current AI answer
   */
  private buildAnswerContext(): string {
    const answer = this.searchService.answer();
    if (answer.length === 0) return '';

    // Concatenate first 2 bullet texts
    return answer
      .slice(0, 2)
      .map(bullet => bullet.text)
      .join(' ');
  }

  /**
   * Build cache key from context
   */
  private buildCacheKey(
    query: string,
    selectedIds: string[],
    filters: ReturnType<SearchService['getActiveFilters']>,
    answerText: string
  ): string {
    const filterKey = JSON.stringify(filters ?? {});
    const answerKey = answerText ? answerText.slice(0, 120) : '';
    return `${query}|${selectedIds.sort().join(',')}|${filterKey}|${answerKey}`;
  }

  /**
   * Clear all cached recommendations
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Execute a recommendation (run search with that doc's topic)
   */
  executeRecommendation(recommendation: Recommendation): void {
    // Trigger new search based on recommendation
    this.searchService.search({
      q: recommendation.title,
      page: 1
    }).subscribe();
  }
}
