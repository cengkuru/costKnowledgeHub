import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError, retry, timeout } from 'rxjs/operators';
import { MultiLanguageText } from '../models/resource.model';
import { environment } from '../../../environments/environment';

export interface SummaryGenerationRequest {
  content: string;
  title?: string;
  resourceType?: string;
}

export interface SummaryGenerationResponse {
  success: boolean;
  summaries?: MultiLanguageText;
  error?: string;
}

export interface TagSuggestionRequest {
  title: MultiLanguageText;
  description?: MultiLanguageText;
  content?: string;
  resourceType?: string;
  existingTags?: string[];
}

export interface TagSuggestion {
  tag: string;
  confidence: number;
  reason?: string;
}

export interface TagSuggestionResponse {
  success: boolean;
  suggestions?: TagSuggestion[];
  error?: string;
}

export interface UrlMetadataRequest {
  url: string;
  resourceType?: string;
}

export interface UrlMetadata {
  title?: MultiLanguageText | string;
  description?: MultiLanguageText | string;
  thumbnailUrl?: string;
  publishedDate?: string;
  suggestedTopics?: string[];
  suggestedTags?: string[];
}

export interface UrlMetadataResponse {
  success: boolean;
  metadata?: UrlMetadata;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AIService {
  private http = inject(HttpClient);
  
  // Base URL for Cloud Functions - Always use production URL for consistency
  private readonly functionsUrl = 'https://us-central1-knowledgehub-2ed2f.cloudfunctions.net';

  private readonly httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

  /**
   * Generate multi-language summaries for resource content
   */
  generateSummaries(request: SummaryGenerationRequest): Observable<MultiLanguageText> {
    const url = `${this.functionsUrl}/generateMultiLanguageSummary`;
    
    return this.http.post<SummaryGenerationResponse>(url, request, this.httpOptions).pipe(
      timeout(180000), // 3 minutes timeout
      retry(1), // Retry once on failure
      map(response => {
        if (response.success && response.summaries) {
          return response.summaries;
        }
        throw new Error(response.error || 'Failed to generate summaries');
      }),
      catchError(error => {
        console.error('AI Summary Generation Error:', error);
        
        // Fallback response
        const fallbackSummary = this.createFallbackSummary(request.content);
        return of(fallbackSummary);
      })
    );
  }

  /**
   * Suggest relevant tags based on resource content
   */
  suggestTags(request: TagSuggestionRequest): Observable<TagSuggestion[]> {
    const url = `${this.functionsUrl}/suggestTags`;
    
    return this.http.post<TagSuggestionResponse>(url, request, this.httpOptions).pipe(
      timeout(60000), // 1 minute timeout
      retry(1),
      map(response => {
        if (response.success && response.suggestions) {
          return response.suggestions;
        }
        throw new Error(response.error || 'Failed to suggest tags');
      }),
      catchError(error => {
        console.error('AI Tag Suggestion Error:', error);
        
        // Fallback to basic suggestions
        return of(this.createFallbackTags(request));
      })
    );
  }

  /**
   * Create a basic summary when AI is unavailable
   */
  private createFallbackSummary(content: string): MultiLanguageText {
    // Extract first 150-200 words as a basic summary
    const words = content.split(/\s+/).slice(0, 150).join(' ');
    const basicSummary = words + (words.length < content.length ? '...' : '');
    
    return {
      en: basicSummary,
      es: 'Resumen no disponible. Por favor, agregue una descripción manualmente.',
      pt: 'Resumo não disponível. Por favor, adicione uma descrição manualmente.'
    };
  }

  /**
   * Create basic tag suggestions when AI is unavailable
   */
  private createFallbackTags(request: TagSuggestionRequest): TagSuggestion[] {
    const suggestions: TagSuggestion[] = [];
    
    // Extract words from title
    const titleWords = Object.values(request.title)
      .join(' ')
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 4);
    
    // Common CoST-related keywords
    const costKeywords = [
      'transparency', 'infrastructure', 'disclosure', 'accountability',
      'procurement', 'monitoring', 'assurance', 'stakeholder'
    ];
    
    // Find matching keywords
    costKeywords.forEach(keyword => {
      if (titleWords.some(word => word.includes(keyword))) {
        suggestions.push({
          tag: keyword,
          confidence: 0.5,
          reason: 'Keyword match in title'
        });
      }
    });
    
    // Add resource type as a tag if provided
    if (request.resourceType) {
      suggestions.push({
        tag: request.resourceType,
        confidence: 0.8,
        reason: 'Resource type'
      });
    }
    
    return suggestions.slice(0, 5); // Return top 5
  }

  /**
   * Extract metadata from a URL
   */
  extractUrlMetadata(request: UrlMetadataRequest): Observable<UrlMetadata> {
    const url = `${this.functionsUrl}/extractUrlMetadata`;
    
    return this.http.post<UrlMetadataResponse>(url, request, this.httpOptions).pipe(
      timeout(30000), // 30 seconds timeout
      retry(1),
      map(response => {
        if (response.success && response.metadata) {
          return response.metadata;
        }
        throw new Error(response.error || 'Failed to extract metadata');
      }),
      catchError(error => {
        console.error('URL Metadata Extraction Error:', error);
        
        // Fallback to basic metadata
        return of(this.createFallbackMetadata(request.url));
      })
    );
  }

  /**
   * Create basic metadata when extraction fails
   */
  private createFallbackMetadata(url: string): UrlMetadata {
    // Extract a basic title from the URL
    const urlParts = url.split('/');
    const lastPart = urlParts[urlParts.length - 1] || urlParts[urlParts.length - 2];
    const title = lastPart
      .replace(/-/g, ' ')
      .replace(/_/g, ' ')
      .split('.')
      [0]
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    return {
      title: {
        en: title || 'Independent Review Report',
        es: title || 'Informe de Revisión Independiente',
        pt: title || 'Relatório de Revisão Independente'
      },
      description: {
        en: 'Please add a description for this report.',
        es: 'Por favor, agregue una descripción para este informe.',
        pt: 'Por favor, adicione uma descrição para este relatório.'
      },
      suggestedTopics: ['assurance'],
      suggestedTags: ['independent-review', 'cost-report']
    };
  }

  /**
   * Check if AI features are available
   */
  checkAIAvailability(): Observable<boolean> {
    const url = `${this.functionsUrl}/aiHealthCheck`;
    
    return this.http.get<{ available: boolean }>(url).pipe(
      timeout(5000),
      map(response => response.available),
      catchError(() => of(false))
    );
  }
}