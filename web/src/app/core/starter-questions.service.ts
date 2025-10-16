import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface StarterQuestion {
  icon: string;
  question: string;
  category: string;
}

interface StarterQuestionsResponse {
  success: boolean;
  questions: StarterQuestion[];
  cached?: boolean;
}

/**
 * Service for fetching AI-generated starter questions
 * Questions are generated dynamically based on recent content
 */
@Injectable({
  providedIn: 'root'
})
export class StarterQuestionsService {
  private readonly apiUrl = `${environment.apiUrl}/starter-questions`;

  // Reactive state
  public readonly questions = signal<StarterQuestion[]>([]);
  public readonly loading = signal(false);
  public readonly error = signal<string | null>(null);

  constructor(private http: HttpClient) {}

  /**
   * Fetch AI-generated starter questions
   * Questions are cached on the server for 6 hours
   */
  loadQuestions(): void {
    this.loading.set(true);
    this.error.set(null);

    this.http.get<StarterQuestionsResponse>(this.apiUrl)
      .subscribe({
        next: (response) => {
          if (response.success && response.questions) {
            this.questions.set(response.questions);
          }
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Failed to load starter questions:', err);
          this.error.set('Failed to load starter questions');
          this.loading.set(false);

          // Fallback to static questions if API fails
          this.questions.set([
            {
              icon: '🏗️',
              question: 'OC4IDS standard',
              category: 'Standards'
            },
            {
              icon: '📊',
              question: 'Latest impact stories',
              category: 'Impact'
            },
            {
              icon: '🔍',
              question: 'Infrastructure transparency',
              category: 'Transparency'
            },
            {
              icon: '✅',
              question: 'Assurance processes',
              category: 'Assurance'
            },
            {
              icon: '🌍',
              question: 'Country programmes',
              category: 'Countries'
            },
            {
              icon: '📈',
              question: 'Project disclosure',
              category: 'Implementation'
            }
          ]);
        }
      });
  }

  /**
   * Force refresh questions (bypasses cache)
   */
  refreshQuestions(): void {
    this.loading.set(true);
    this.error.set(null);

    this.http.post<StarterQuestionsResponse>(`${this.apiUrl}/refresh`, {})
      .subscribe({
        next: (response) => {
          if (response.success && response.questions) {
            this.questions.set(response.questions);
          }
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Failed to refresh starter questions:', err);
          this.error.set('Failed to refresh questions');
          this.loading.set(false);
        }
      });
  }
}
