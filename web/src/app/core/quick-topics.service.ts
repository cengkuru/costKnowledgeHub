import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface QuickTopic {
  icon: string;
  topic: string;  // Changed from 'question' to 'topic' - short label
  category: string;
}

interface QuickTopicsResponse {
  success: boolean;
  topics: QuickTopic[];  // Changed from 'questions' to 'topics'
  cached?: boolean;
}

/**
 * Service for fetching AI-generated quick topic shortcuts
 * Topics are generated dynamically based on recent content
 * These are short labels for quick navigation, not questions
 */
@Injectable({
  providedIn: 'root'
})
export class QuickTopicsService {
  private readonly apiUrl = `${environment.apiUrl}/quick-topics`;  // Changed endpoint

  // Reactive state with signals
  public readonly topics = signal<QuickTopic[]>([]);
  public readonly loading = signal(false);
  public readonly error = signal<string | null>(null);

  constructor(private http: HttpClient) {}

  /**
   * Fetch AI-generated quick topic shortcuts
   * Topics are cached on the server for 6 hours
   */
  loadTopics(): void {
    this.loading.set(true);
    this.error.set(null);

    this.http.get<QuickTopicsResponse>(this.apiUrl)
      .subscribe({
        next: (response) => {
          if (response.success && response.topics) {
            this.topics.set(response.topics);
          }
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Failed to load quick topics:', err);
          this.error.set('Failed to load quick topics');
          this.loading.set(false);

          // Fallback to static topics if API fails
          // These are SHORT TOPIC LABELS, not questions
          this.topics.set([
            {
              icon: '🏗️',
              topic: 'OC4IDS standard',
              category: 'Standards'
            },
            {
              icon: '📊',
              topic: 'Impact stories',
              category: 'Impact'
            },
            {
              icon: '🔍',
              topic: 'Infrastructure transparency',
              category: 'Transparency'
            },
            {
              icon: '✅',
              topic: 'Assurance processes',
              category: 'Assurance'
            },
            {
              icon: '🌍',
              topic: 'Country programmes',
              category: 'Countries'
            },
            {
              icon: '📈',
              topic: 'Project disclosure',
              category: 'Implementation'
            }
          ]);
        }
      });
  }

  /**
   * Force refresh topics (bypasses cache)
   */
  refreshTopics(): void {
    this.loading.set(true);
    this.error.set(null);

    this.http.post<QuickTopicsResponse>(`${this.apiUrl}/refresh`, {})
      .subscribe({
        next: (response) => {
          if (response.success && response.topics) {
            this.topics.set(response.topics);
          }
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Failed to refresh quick topics:', err);
          this.error.set('Failed to refresh topics');
          this.loading.set(false);
        }
      });
  }
}