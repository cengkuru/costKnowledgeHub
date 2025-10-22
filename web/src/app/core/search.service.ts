import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

type FilterState = {
  topic?: string;
  country?: string;
  year?: number;
};

/**
 * Citation reference linking to a source document
 */
export interface Citation {
  title: string;
  url: string;
}

/**
 * Single answer bullet with supporting citations
 */
export interface AnswerBullet {
  text: string;
  cites: Citation[];
}

/**
 * Result item for display
 */
export interface ResultItem {
  id: string;
  title: string;
  type: string;
  summary: string;
  country?: string;
  year?: number;
  url: string;
}

/**
 * Search response from API
 */
export interface SearchResponse {
  answer: AnswerBullet[];
  items: ResultItem[];
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * Search filters
 */
export interface SearchFilters {
  q: string;
  topic?: string;
  country?: string;
  year?: number;
  page?: number;
}

/**
 * Search service for ALFRED
 *
 * Provides two search modes:
 * 1. search() - Fast cached RAG over indexed corpus
 * 2. refresh() - Live Exa search from source websites
 */
@Injectable({
  providedIn: 'root'
})
export class SearchService {
  private readonly apiUrl = environment.apiUrl;
  private lastFilters: SearchFilters | null = null;

  // Reactive state
  readonly query = signal('');
  readonly answer = signal<AnswerBullet[]>([]);
  readonly items = signal<ResultItem[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly isRefreshed = signal(false);
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly hasMore = signal(false);
  readonly activeFilters = signal<FilterState>({});

  constructor(private http: HttpClient) {}

  /**
   * Performs RAG search over indexed corpus
   * Results are cached for 60 seconds on backend
   *
   * @param filters Search query and optional filters
   */
  search(filters: SearchFilters): Observable<SearchResponse> {
    this.loading.set(true);
    this.error.set(null);
    this.isRefreshed.set(false);

    const page = filters.page ?? 1;
    const normalizedFilters: SearchFilters = { ...filters, page };
    this.lastFilters = normalizedFilters;
    this.page.set(page);
    this.query.set(normalizedFilters.q.trim());
    this.activeFilters.set({
      topic: normalizedFilters.topic,
      country: normalizedFilters.country,
      year: normalizedFilters.year
    });

    let params = new HttpParams()
      .set('q', normalizedFilters.q)
      .set('page', page);

    if (normalizedFilters.topic) params = params.set('topic', normalizedFilters.topic);
    if (normalizedFilters.country) params = params.set('country', normalizedFilters.country);
    if (normalizedFilters.year) params = params.set('year', normalizedFilters.year.toString());

    return this.http.get<SearchResponse>(`${this.apiUrl}/search`, { params })
      .pipe(
        tap({
          next: (response) => {
            this.answer.set(response.answer);
            this.items.set(response.items);
            this.page.set(response.page ?? page);
            this.pageSize.set(response.pageSize ?? this.pageSize());
            this.hasMore.set(response.hasMore ?? false);
            this.loading.set(false);
          },
          error: (err) => {
            this.error.set(err.error?.error || 'Search failed');
            this.loading.set(false);
          }
        })
      );
  }

  /**
   * Performs live Exa search (no cache, fresh results)
   * Use when user clicks "Refresh from Source"
   *
   * @param query Search query text
   */
  refresh(query: string): Observable<SearchResponse> {
    this.loading.set(true);
    this.error.set(null);
    this.isRefreshed.set(true);
    const trimmed = query.trim();
    this.lastFilters = { q: trimmed, page: 1 };
    this.page.set(1);
    this.query.set(trimmed);
    this.activeFilters.set({});

    const params = new HttpParams().set('q', trimmed);

    return this.http.get<SearchResponse>(`${this.apiUrl}/refresh`, { params })
      .pipe(
        tap({
          next: (response) => {
            this.answer.set(response.answer);
            this.items.set(response.items);
            this.page.set(response.page ?? 1);
            this.pageSize.set(response.pageSize ?? response.items.length ?? 0);
            this.hasMore.set(response.hasMore ?? false);
            this.loading.set(false);
          },
          error: (err) => {
            this.error.set(err.error?.error || 'Refresh failed');
            this.loading.set(false);
          }
        })
      );
  }

  /**
   * Navigate to the next results page if available.
   */
  nextPage(): Observable<SearchResponse> | null {
    if (!this.hasMore()) return null;
    return this.goToPage(this.page() + 1);
  }

  /**
   * Navigate to the previous results page if available.
   */
  previousPage(): Observable<SearchResponse> | null {
    if (this.page() <= 1) return null;
    return this.goToPage(this.page() - 1);
  }

  /**
   * Returns true when a previous page is available.
   */
  canGoPrevious(): boolean {
    return this.page() > 1;
  }

  /**
   * Returns true when a next page is available.
   */
  canGoNext(): boolean {
    return this.hasMore();
  }

  /**
   * Clears current search results
   */
  clear(): void {
    this.answer.set([]);
    this.items.set([]);
    this.error.set(null);
    this.isRefreshed.set(false);
    this.page.set(1);
    this.pageSize.set(10);
    this.hasMore.set(false);
    this.lastFilters = null;
    this.query.set('');
    this.activeFilters.set({});
  }

  /**
   * Returns the most recent query string
   */
  getQuery(): string {
    return this.query();
  }

  /**
   * Returns a snapshot of the currently active filters
   */
  getActiveFilters(): FilterState {
    return this.activeFilters();
  }

  /**
   * Apply filters and re-run the current query when available
   */
  applyFilters(filters: FilterState): Observable<SearchResponse> | null {
    const sanitized: FilterState = {
      topic: filters.topic || undefined,
      country: filters.country || undefined,
      year: filters.year || undefined
    };

    this.activeFilters.set(sanitized);

    const currentQuery = this.query().trim();
    if (!currentQuery || currentQuery.length < 2) {
      return null;
    }

    return this.search({
      q: currentQuery,
      topic: sanitized.topic,
      country: sanitized.country,
      year: sanitized.year,
      page: 1
    });
  }

  /**
   * Clear all filters and refresh the results for the current query
   */
  clearFilters(): Observable<SearchResponse> | null {
    this.activeFilters.set({});

    const currentQuery = this.query().trim();
    if (!currentQuery || currentQuery.length < 2) {
      return null;
    }

    return this.search({
      q: currentQuery,
      page: 1
    });
  }

  private goToPage(page: number): Observable<SearchResponse> | null {
    if (!this.lastFilters || page < 1) {
      return null;
    }

    return this.search({ ...this.lastFilters, page });
  }
}
