import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface SmartCollectionEntry {
  id: string;
  title: string;
  type: string;
  url: string;
  highlight: string;
  country?: string;
  year?: number;
}

export interface SmartCollection {
  id: string;
  name: string;
  description: string;
  timeframe?: string;
  actionable?: string;
  novelty: number;
  items: SmartCollectionEntry[];
}

@Injectable({
  providedIn: 'root'
})
export class SmartCollectionsService {
  private readonly apiUrl = environment.apiUrl;

  readonly collections = signal<SmartCollection[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  private lastKey: string | null = null;

  constructor(private http: HttpClient) {}

  load(query: string, filters: { topic?: string; country?: string; year?: number }): void {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      this.collections.set([]);
      this.lastKey = null;
      return;
    }

    const key = JSON.stringify({ q: trimmed, ...filters });
    if (key === this.lastKey && this.collections().length > 0) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    let params = new HttpParams().set('q', trimmed);
    if (filters.topic) params = params.set('topic', filters.topic);
    if (filters.country) params = params.set('country', filters.country);
    if (filters.year) params = params.set('year', filters.year.toString());

    this.http
      .get<{ collections: SmartCollection[] }>(`${this.apiUrl}/collections/smart`, { params })
      .subscribe({
        next: ({ collections }) => {
          this.collections.set(collections);
          this.loading.set(false);
          this.lastKey = key;
        },
        error: (error) => {
          console.error('[SmartCollectionsService] Load failed', error);
          this.error.set('Unable to shape collections at the moment.');
          this.loading.set(false);
        }
      });
  }
}
