import { Injectable, inject } from '@angular/core';
import { Functions, httpsCallable, HttpsCallableResult } from '@angular/fire/functions';
import { BehaviorSubject, Observable, from, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { Resource } from '../models/resource.model';

/**
 * Confidence level categories
 */
export enum ConfidenceLevel {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

/**
 * Confidence scoring result interface
 */
export interface ConfidenceResult {
  score: number;              // 0-100 confidence score
  level: ConfidenceLevel;     // high, medium, or low
  feedback: string[];         // Array of specific feedback messages
  recommendations: string[];  // Actionable recommendations for improvement
  validationDetails: {
    completeness: number;     // 0-100 score for content completeness
    clarity: number;          // 0-100 score for clarity and coherence
    relevance: number;        // 0-100 score for topic relevance
    consistency: number;      // 0-100 score for cross-field consistency
  };
}

/**
 * Validation options interface
 */
export interface ValidationOptions {
  minConfidenceScore?: number;  // Minimum acceptable confidence score (default: 50)
  strictMode?: boolean;          // Enable strict validation (default: false)
}

/**
 * Validation state for tracking ongoing validations
 */
interface ValidationState {
  isValidating: boolean;
  lastResult: ConfidenceResult | null;
  error: string | null;
}

/**
 * Service for validating resource content using AI-powered confidence scoring
 *
 * This service provides methods to:
 * - Validate resource content quality and completeness
 * - Get confidence scores and actionable feedback
 * - Prevent publication of low-confidence resources
 * - Cache validation results for performance
 */
@Injectable({
  providedIn: 'root'
})
export class ContentValidationService {
  private functions = inject(Functions);

  // Validation state management
  private validationStateSubject = new BehaviorSubject<ValidationState>({
    isValidating: false,
    lastResult: null,
    error: null
  });
  public validationState$ = this.validationStateSubject.asObservable();

  // Cache for validation results (keyed by resource ID)
  private validationCache = new Map<string, {
    result: ConfidenceResult;
    timestamp: number;
  }>();

  // Cache expiration time (5 minutes)
  private readonly CACHE_EXPIRATION_MS = 5 * 60 * 1000;

  constructor() {
    console.log('ContentValidationService initialized');
  }

  /**
   * Validate a resource and return confidence score
   *
   * @param resource - Resource to validate
   * @param options - Validation options
   * @returns Observable with confidence result
   */
  validateResource(
    resource: Partial<Resource>,
    options?: ValidationOptions
  ): Observable<ConfidenceResult> {
    console.log('Validating resource:', resource.id || 'new resource');

    // Check cache first
    if (resource.id) {
      const cached = this.getCachedValidation(resource.id);
      if (cached) {
        console.log('Using cached validation result');
        return of(cached);
      }
    }

    // Update state to validating
    this.updateValidationState({
      isValidating: true,
      lastResult: null,
      error: null
    });

    // Call Cloud Function
    const validateFunction = httpsCallable<
      { resource: any; options?: ValidationOptions },
      ConfidenceResult
    >(this.functions, 'validateResourceContent');

    return from(validateFunction({
      resource: this.prepareResourceForValidation(resource),
      options: options || {}
    })).pipe(
      map((result: HttpsCallableResult<ConfidenceResult>) => result.data),
      tap((result: ConfidenceResult) => {
        console.log('Validation result:', result);

        // Cache the result
        if (resource.id) {
          this.cacheValidation(resource.id, result);
        }

        // Update state with result
        this.updateValidationState({
          isValidating: false,
          lastResult: result,
          error: null
        });
      }),
      catchError((error) => {
        console.error('Validation error:', error);

        // Update state with error
        this.updateValidationState({
          isValidating: false,
          lastResult: null,
          error: error.message || 'Validation failed'
        });

        // Return safe default on error
        return of(this.getDefaultConfidenceResult(error.message));
      })
    );
  }

  /**
   * Quick validation check - returns true if confidence is acceptable
   *
   * @param resource - Resource to validate
   * @param minScore - Minimum acceptable score (default: 50)
   * @returns Observable<boolean> - true if confidence is acceptable
   */
  isConfidenceAcceptable(
    resource: Partial<Resource>,
    minScore: number = 50
  ): Observable<boolean> {
    return this.validateResource(resource, { minConfidenceScore: minScore }).pipe(
      map((result: ConfidenceResult) => result.score >= minScore)
    );
  }

  /**
   * Get the current validation state
   */
  getValidationState(): ValidationState {
    return this.validationStateSubject.value;
  }

  /**
   * Clear validation state
   */
  clearValidationState(): void {
    this.updateValidationState({
      isValidating: false,
      lastResult: null,
      error: null
    });
  }

  /**
   * Clear validation cache for a specific resource
   */
  clearCache(resourceId?: string): void {
    if (resourceId) {
      this.validationCache.delete(resourceId);
      console.log('Cleared validation cache for resource:', resourceId);
    } else {
      this.validationCache.clear();
      console.log('Cleared all validation cache');
    }
  }

  /**
   * Determine if a confidence level should prevent publishing
   */
  shouldPreventPublishing(confidenceLevel: ConfidenceLevel): boolean {
    return confidenceLevel === ConfidenceLevel.LOW;
  }

  /**
   * Get confidence level from score
   */
  getConfidenceLevelFromScore(score: number): ConfidenceLevel {
    if (score >= 80) return ConfidenceLevel.HIGH;
    if (score >= 50) return ConfidenceLevel.MEDIUM;
    return ConfidenceLevel.LOW;
  }

  /**
   * Prepare resource data for validation
   * Extracts only the fields needed for validation
   */
  private prepareResourceForValidation(resource: Partial<Resource>): any {
    return {
      title: resource.title || { en: '', es: '', pt: '' },
      description: resource.description || { en: '', es: '', pt: '' },
      type: resource.type || '',
      tags: resource.tags || [],
      country: resource.country || '',
      language: resource.language || 'en',
      externalLink: resource.externalLink,
      fileLinks: resource.fileLinks
    };
  }

  /**
   * Update validation state
   */
  private updateValidationState(state: Partial<ValidationState>): void {
    this.validationStateSubject.next({
      ...this.validationStateSubject.value,
      ...state
    });
  }

  /**
   * Get cached validation result if available and not expired
   */
  private getCachedValidation(resourceId: string): ConfidenceResult | null {
    const cached = this.validationCache.get(resourceId);

    if (!cached) {
      return null;
    }

    // Check if cache is expired
    const now = Date.now();
    if (now - cached.timestamp > this.CACHE_EXPIRATION_MS) {
      this.validationCache.delete(resourceId);
      return null;
    }

    return cached.result;
  }

  /**
   * Cache validation result
   */
  private cacheValidation(resourceId: string, result: ConfidenceResult): void {
    this.validationCache.set(resourceId, {
      result,
      timestamp: Date.now()
    });
  }

  /**
   * Get default confidence result (used as fallback)
   */
  private getDefaultConfidenceResult(errorMessage?: string): ConfidenceResult {
    return {
      score: 50,
      level: ConfidenceLevel.MEDIUM,
      feedback: [
        errorMessage || 'Unable to complete full validation analysis',
        'Please ensure all required fields are filled correctly'
      ],
      recommendations: [
        'Ensure all required fields are filled',
        'Provide clear, professional descriptions',
        'Add relevant tags for better discoverability',
        'Include multi-language translations where possible'
      ],
      validationDetails: {
        completeness: 50,
        clarity: 50,
        relevance: 50,
        consistency: 50
      }
    };
  }
}
