import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface ContextualFilter {
  id: string;
  label: string;
  description: string;
  filters: {
    topic?: string;
    country?: string;
    year?: number;
    yearFrom?: number;
    yearTo?: number;
  };
  tone: 'spotlight' | 'focus' | 'expand' | 'challenge';
  confidence: number;
}

export interface FilterMetadataInsights {
  topTopics: { value: string; count: number }[];
  topCountries: { value: string; count: number }[];
  timeline: {
    newestYear?: number;
    oldestYear?: number;
    summary: string;
  };
}

export interface ContextualFiltersPayload {
  spotlight?: ContextualFilter;
  supporting: ContextualFilter[];
  metadataInsights: FilterMetadataInsights;
}

@Injectable({
  providedIn: 'root'
})
export class ContextualFiltersService {
  private readonly apiUrl = environment.apiUrl;

  readonly suggestions = signal<ContextualFiltersPayload | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  private lastKey: string | null = null;

  constructor(private http: HttpClient) {}

  load(query: string, filters: { topic?: string; country?: string; year?: number }): void {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      this.suggestions.set(null);
      this.lastKey = null;
      return;
    }

    const key = JSON.stringify({ q: trimmed, ...filters });
    if (key === this.lastKey && this.suggestions()) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    let params = new HttpParams().set('q', trimmed);
    if (filters.topic) params = params.set('topic', filters.topic);
    if (filters.country) params = params.set('country', filters.country);
    if (filters.year) params = params.set('year', filters.year.toString());

    this.http
      .get<{ suggestions: ContextualFiltersPayload }>(`${this.apiUrl}/filters/contextual`, { params })
      .subscribe({
        next: ({ suggestions }) => {
          this.suggestions.set(suggestions);
          this.loading.set(false);
          this.lastKey = key;
        },
        error: (error) => {
          console.error('[ContextualFiltersService] Load failed', error);
          this.error.set('Unable to load contextual filters right now.');
          this.loading.set(false);
        }
      });
  }
}
