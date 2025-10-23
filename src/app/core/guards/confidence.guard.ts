import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ContentValidationService, ConfidenceLevel } from '../services/content-validation.service';
import { Resource } from '../models/resource.model';

/**
 * Guard to prevent publishing resources with low confidence scores
 *
 * This guard checks the resource's confidence score and prevents
 * publishing if the score is too low (< 50 or level is 'low').
 *
 * Usage:
 * - Call canPublish() before publishing a resource
 * - Returns Observable<CanPublishResult> with details about publish eligibility
 */
@Injectable({
  providedIn: 'root'
})
export class ConfidenceGuard {
  constructor(private contentValidationService: ContentValidationService) {}

  /**
   * Check if a resource can be published based on confidence score
   *
   * @param resource - Resource to check
   * @param options - Additional options
   * @returns Observable<CanPublishResult>
   */
  canPublish(
    resource: Partial<Resource>,
    options?: {
      minScore?: number;        // Minimum required score (default: 50)
      strictMode?: boolean;     // Require validation to be present (default: false)
      revalidate?: boolean;     // Force revalidation (default: false)
    }
  ): Observable<CanPublishResult> {
    const minScore = options?.minScore ?? 50;
    const strictMode = options?.strictMode ?? false;
    const revalidate = options?.revalidate ?? false;

    // If revalidate is requested or no confidence data exists, validate now
    if (revalidate || !resource.confidence) {
      return this.validateAndCheckPublish(resource, minScore, strictMode);
    }

    // Use existing confidence data
    return this.checkExistingConfidence(resource, minScore, strictMode);
  }

  /**
   * Validate resource and check if it can be published
   */
  private validateAndCheckPublish(
    resource: Partial<Resource>,
    minScore: number,
    strictMode: boolean
  ): Observable<CanPublishResult> {
    return this.contentValidationService.validateResource(resource, {
      minConfidenceScore: minScore,
      strictMode
    }).pipe(
      map(result => {
        const canPublish = result.score >= minScore && result.level !== ConfidenceLevel.LOW;

        return {
          canPublish,
          confidenceScore: result.score,
          confidenceLevel: result.level,
          reason: canPublish
            ? 'Resource meets quality standards'
            : 'Resource quality score is too low for publishing',
          feedback: result.feedback,
          recommendations: result.recommendations,
          validationDetails: result.validationDetails
        };
      }),
      catchError(error => {
        console.error('Validation error in canPublish:', error);

        // In strict mode, prevent publishing on validation error
        if (strictMode) {
          return of({
            canPublish: false,
            confidenceScore: 0,
            confidenceLevel: ConfidenceLevel.LOW,
            reason: 'Validation failed - cannot verify resource quality',
            feedback: ['Unable to validate resource quality'],
            recommendations: ['Please try validating again before publishing'],
            validationDetails: {
              completeness: 0,
              clarity: 0,
              relevance: 0,
              consistency: 0
            }
          });
        }

        // In non-strict mode, allow publishing but warn
        return of({
          canPublish: true,
          confidenceScore: 50,
          confidenceLevel: ConfidenceLevel.MEDIUM,
          reason: 'Validation unavailable - proceeding with caution',
          feedback: ['Quality validation was not available'],
          recommendations: ['Consider validating the resource quality after publishing'],
          validationDetails: {
            completeness: 50,
            clarity: 50,
            relevance: 50,
            consistency: 50
          }
        });
      })
    );
  }

  /**
   * Check existing confidence data
   */
  private checkExistingConfidence(
    resource: Partial<Resource>,
    minScore: number,
    strictMode: boolean
  ): Observable<CanPublishResult> {
    if (!resource.confidence) {
      // No confidence data and strict mode - prevent publishing
      if (strictMode) {
        return of({
          canPublish: false,
          confidenceScore: 0,
          confidenceLevel: ConfidenceLevel.LOW,
          reason: 'Resource has not been validated',
          feedback: ['This resource must be validated before publishing'],
          recommendations: ['Click "Check Content Quality" to validate this resource'],
          validationDetails: {
            completeness: 0,
            clarity: 0,
            relevance: 0,
            consistency: 0
          }
        });
      }

      // No confidence data and non-strict mode - allow with warning
      return of({
        canPublish: true,
        confidenceScore: 50,
        confidenceLevel: ConfidenceLevel.MEDIUM,
        reason: 'Resource not validated - proceeding with default approval',
        feedback: ['This resource has not been quality-validated'],
        recommendations: ['Consider validating resources before publishing for better quality assurance'],
        validationDetails: {
          completeness: 50,
          clarity: 50,
          relevance: 50,
          consistency: 50
        }
      });
    }

    // Check existing confidence data
    const conf = resource.confidence;
    const canPublish = conf.score >= minScore && conf.level !== ConfidenceLevel.LOW;

    return of({
      canPublish,
      confidenceScore: conf.score,
      confidenceLevel: conf.level,
      reason: canPublish
        ? 'Resource meets quality standards'
        : `Resource quality score (${conf.score}) is below minimum requirement (${minScore})`,
      feedback: conf.feedback,
      recommendations: conf.recommendations || [],
      validationDetails: conf.validationDetails || {
        completeness: conf.score,
        clarity: conf.score,
        relevance: conf.score,
        consistency: conf.score
      }
    });
  }

  /**
   * Quick check - returns boolean only
   */
  canPublishQuick(resource: Partial<Resource>, minScore: number = 50): boolean {
    if (!resource.confidence) {
      return true; // Allow if not validated (non-strict default)
    }

    return resource.confidence.score >= minScore &&
           resource.confidence.level !== ConfidenceLevel.LOW;
  }

  /**
   * Get publish button state based on confidence
   */
  getPublishButtonState(resource: Partial<Resource>): PublishButtonState {
    if (!resource.confidence) {
      return {
        enabled: true,
        text: 'Publish',
        warning: 'Consider validating content quality before publishing',
        cssClass: 'btn-warning'
      };
    }

    const level = resource.confidence.level;

    switch (level) {
      case ConfidenceLevel.HIGH:
        return {
          enabled: true,
          text: 'Publish',
          warning: null,
          cssClass: 'btn-primary'
        };

      case ConfidenceLevel.MEDIUM:
        return {
          enabled: true,
          text: 'Publish with Caution',
          warning: 'Quality score is acceptable but could be improved',
          cssClass: 'btn-warning'
        };

      case ConfidenceLevel.LOW:
        return {
          enabled: false,
          text: 'Cannot Publish',
          warning: 'Quality score is too low. Please improve the content first.',
          cssClass: 'btn-disabled'
        };

      default:
        return {
          enabled: true,
          text: 'Publish',
          warning: null,
          cssClass: 'btn-primary'
        };
    }
  }
}

/**
 * Result of canPublish check
 */
export interface CanPublishResult {
  canPublish: boolean;
  confidenceScore: number;
  confidenceLevel: ConfidenceLevel;
  reason: string;
  feedback: string[];
  recommendations: string[];
  validationDetails: {
    completeness: number;
    clarity: number;
    relevance: number;
    consistency: number;
  };
}

/**
 * Publish button state
 */
export interface PublishButtonState {
  enabled: boolean;
  text: string;
  warning: string | null;
  cssClass: string;
}
