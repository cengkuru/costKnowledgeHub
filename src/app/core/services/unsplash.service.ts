import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { map, catchError, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ResourceType, TopicCategory } from '../models/resource.model';

export interface UnsplashImage {
  id: string;
  url: string;
  thumb: string;
  description: string;
  alt_description: string;
  width: number;
  height: number;
  attribution: {
    photographer: string;
    photographer_url: string;
    download_location: string;
  };
  blur_hash: string;
}

export interface ImageSearchContext {
  title: string;
  type: ResourceType;
  topics: TopicCategory[];
  tags: string[];
  description?: string;
  country?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UnsplashService {
  private readonly apiUrl = 'https://api.unsplash.com';
  private readonly accessKey = 'YOUR_UNSPLASH_ACCESS_KEY'; // To be configured in environment
  private readonly clientName = 'CoST Knowledge Hub';

  // Contextual search mappings for infrastructure themes
  private readonly contextualSearchTerms: Record<ResourceType, string[]> = {
    'guide': ['business', 'planning', 'teamwork', 'meeting', 'office', 'strategy'],
    'case-study': ['city', 'urban', 'construction', 'architecture', 'development'],
    'report': ['document', 'analysis', 'chart', 'data', 'research', 'statistics'],
    'independent-review': ['audit', 'inspection', 'quality', 'assessment', 'governance'],
    'dataset': ['technology', 'computer', 'data', 'analytics', 'coding', 'digital'],
    'tool': ['tools', 'equipment', 'engineering', 'technical', 'instrument'],
    'policy': ['government', 'meeting', 'conference', 'discussion', 'handshake'],
    'template': ['blueprint', 'design', 'planning', 'document', 'framework'],
    'infographic': ['chart', 'diagram', 'presentation', 'visual', 'graphics'],
    'other': ['infrastructure', 'construction', 'development', 'project']
  };

  private readonly topicSearchTerms: Record<TopicCategory, string[]> = {
    'disclosure': ['transparency', 'open', 'public', 'information', 'access'],
    'assurance': ['quality', 'review', 'inspection', 'audit', 'assessment'],
    'procurement': ['business', 'contract', 'deal', 'handshake', 'meeting'],
    'monitoring': ['construction', 'progress', 'development', 'building', 'project'],
    'stakeholder': ['meeting', 'discussion', 'group', 'community', 'collaboration'],
    'accountability': ['governance', 'responsibility', 'oversight', 'leadership']
  };

  constructor(private http: HttpClient) {}

  /**
   * Generate contextually relevant images for a resource
   */
  generateContextualImages(context: ImageSearchContext): Observable<UnsplashImage[]> {
    const searchQuery = this.buildSearchQuery(context);
    return this.searchImages(searchQuery, 9); // Return 9 images for a 3x3 grid
  }

  /**
   * Search for images using Unsplash API
   */
  searchImages(query: string, count: number = 9): Observable<UnsplashImage[]> {
    if (!this.accessKey || this.accessKey === 'YOUR_UNSPLASH_ACCESS_KEY') {
      // Return demo images when API key is not configured
      return of(this.getDemoImages(query, count));
    }

    const params = new HttpParams()
      .set('query', query)
      .set('per_page', count.toString())
      .set('orientation', 'landscape')
      .set('content_filter', 'high')
      .set('order_by', 'relevant');

    const headers = {
      'Authorization': `Client-ID ${this.accessKey}`,
      'Accept-Version': 'v1',
      'User-Agent': this.clientName
    };

    return this.http.get<any>(`${this.apiUrl}/search/photos`, { params, headers })
      .pipe(
        map(response => this.transformUnsplashResponse(response.results)),
        catchError(error => {
          console.error('Unsplash API error:', error);
          // Fallback to demo images on error
          return of(this.getDemoImages(query, count));
        })
      );
  }

  /**
   * Download image for use (required by Unsplash API terms)
   */
  downloadImage(image: UnsplashImage): Observable<boolean> {
    if (!this.accessKey || this.accessKey === 'YOUR_UNSPLASH_ACCESS_KEY') {
      return of(true); // Mock success for demo mode
    }

    const headers = {
      'Authorization': `Client-ID ${this.accessKey}`,
      'Accept-Version': 'v1'
    };

    return this.http.get(image.attribution.download_location, { headers })
      .pipe(
        map(() => true),
        catchError(error => {
          console.error('Download tracking error:', error);
          return of(false);
        })
      );
  }

  /**
   * Build intelligent search query based on resource context
   */
  private buildSearchQuery(context: ImageSearchContext): string {
    const queryParts: string[] = [];

    // Add resource type terms
    const typeTerms = this.contextualSearchTerms[context.type] || [];
    if (typeTerms.length > 0) {
      queryParts.push(typeTerms[0]); // Primary type term
    }

    // Add topic-specific terms
    if (context.topics.length > 0) {
      const topicTerms = this.topicSearchTerms[context.topics[0]] || [];
      if (topicTerms.length > 0) {
        queryParts.push(topicTerms[0]);
      }
    }

    // Add country/region context if available
    if (context.country && context.country !== 'global') {
      const countryTerms = this.getCountrySearchTerms(context.country);
      if (countryTerms.length > 0) {
        queryParts.push(countryTerms[0]);
      }
    }

    // Add infrastructure base term
    queryParts.push('infrastructure');

    // Filter out duplicates and join
    const uniqueTerms = [...new Set(queryParts)];
    return uniqueTerms.join(' ');
  }

  /**
   * Get region-appropriate search terms
   */
  private getCountrySearchTerms(countryCode: string): string[] {
    const regionTerms: Record<string, string[]> = {
      'US': ['urban', 'city', 'modern'],
      'GB': ['architecture', 'building', 'urban'],
      'DE': ['engineering', 'technology', 'modern'],
      'JP': ['technology', 'modern', 'urban'],
      'IN': ['development', 'growth', 'urban'],
      'BR': ['development', 'construction', 'progress'],
      'CN': ['construction', 'development', 'modern'],
      'AU': ['infrastructure', 'development', 'modern']
    };
    
    return regionTerms[countryCode.toUpperCase()] || ['development', 'infrastructure'];
  }

  /**
   * Transform Unsplash API response to our format
   */
  private transformUnsplashResponse(results: any[]): UnsplashImage[] {
    return results.map(photo => ({
      id: photo.id,
      url: photo.urls.regular,
      thumb: photo.urls.thumb,
      description: photo.description || photo.alt_description || '',
      alt_description: photo.alt_description || '',
      width: photo.width,
      height: photo.height,
      attribution: {
        photographer: photo.user.name,
        photographer_url: photo.user.links.html,
        download_location: photo.links.download_location
      },
      blur_hash: photo.blur_hash || ''
    }));
  }

  /**
   * Provide demo images when API is not available
   */
  private getDemoImages(query: string, count: number): UnsplashImage[] {
    // Professional infrastructure-themed placeholder images
    const demoImages: UnsplashImage[] = [
      {
        id: 'demo-1',
        url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=600&fit=crop',
        thumb: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=200&h=150&fit=crop',
        description: 'Modern office building with glass facade',
        alt_description: 'Professional office building',
        width: 800,
        height: 600,
        attribution: {
          photographer: 'Demo User',
          photographer_url: '#',
          download_location: '#'
        },
        blur_hash: 'LGF5?xYk^6#M@-5c,1J5@[or[Q6.'
      },
      {
        id: 'demo-2',
        url: 'https://images.unsplash.com/photo-1541746972996-4e0b0f93e586?w=800&h=600&fit=crop',
        thumb: 'https://images.unsplash.com/photo-1541746972996-4e0b0f93e586?w=200&h=150&fit=crop',
        description: 'Construction site with cranes and development',
        alt_description: 'Infrastructure development',
        width: 800,
        height: 600,
        attribution: {
          photographer: 'Demo User',
          photographer_url: '#',
          download_location: '#'
        },
        blur_hash: 'LGF5?xYk^6#M@-5c,1J5@[or[Q6.'
      },
      {
        id: 'demo-3',
        url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop',
        thumb: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=150&fit=crop',
        description: 'Team meeting in modern conference room',
        alt_description: 'Professional collaboration',
        width: 800,
        height: 600,
        attribution: {
          photographer: 'Demo User',
          photographer_url: '#',
          download_location: '#'
        },
        blur_hash: 'LGF5?xYk^6#M@-5c,1J5@[or[Q6.'
      },
      {
        id: 'demo-4',
        url: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=600&fit=crop',
        thumb: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=200&h=150&fit=crop',
        description: 'Architectural blueprints and planning documents',
        alt_description: 'Infrastructure planning',
        width: 800,
        height: 600,
        attribution: {
          photographer: 'Demo User',
          photographer_url: '#',
          download_location: '#'
        },
        blur_hash: 'LGF5?xYk^6#M@-5c,1J5@[or[Q6.'
      },
      {
        id: 'demo-5',
        url: 'https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=800&h=600&fit=crop',
        thumb: 'https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=200&h=150&fit=crop',
        description: 'Data analytics dashboard with charts',
        alt_description: 'Data analysis and reporting',
        width: 800,
        height: 600,
        attribution: {
          photographer: 'Demo User',
          photographer_url: '#',
          download_location: '#'
        },
        blur_hash: 'LGF5?xYk^6#M@-5c,1J5@[or[Q6.'
      },
      {
        id: 'demo-6',
        url: 'https://images.unsplash.com/photo-1590479773265-7464e5d48118?w=800&h=600&fit=crop',
        thumb: 'https://images.unsplash.com/photo-1590479773265-7464e5d48118?w=200&h=150&fit=crop',
        description: 'Government building with classical architecture',
        alt_description: 'Public sector governance',
        width: 800,
        height: 600,
        attribution: {
          photographer: 'Demo User',
          photographer_url: '#',
          download_location: '#'
        },
        blur_hash: 'LGF5?xYk^6#M@-5c,1J5@[or[Q6.'
      }
    ];

    // Return subset based on count requested
    return demoImages.slice(0, Math.min(count, demoImages.length));
  }

  /**
   * Get image attribution text for display
   */
  getAttributionText(image: UnsplashImage): string {
    if (image.id.startsWith('demo-')) {
      return 'Photo by Unsplash Contributors';
    }
    return `Photo by ${image.attribution.photographer} on Unsplash`;
  }

  /**
   * Check if Unsplash API is properly configured
   */
  isConfigured(): boolean {
    return this.accessKey && this.accessKey !== 'YOUR_UNSPLASH_ACCESS_KEY';
  }
}