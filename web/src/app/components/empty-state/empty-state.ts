import { Component, output, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuickTopicsService } from '../../core/quick-topics.service';

/**
 * Elegant empty state component inspired by Jony Ive design principles
 * Shows before first search - single focus point with extreme minimalism
 *
 * Design philosophy:
 * - Simplicity is the ultimate sophistication
 * - Focus on the essential, remove everything else
 * - Every pixel has purpose
 * - Generous white space creates breathing room
 * - Subtle animations delight without distraction
 */
@Component({
  selector: 'app-empty-state',
  imports: [CommonModule],
  templateUrl: './empty-state.html',
  styles: `
    /* Jony Ive-inspired design system */
    :host {
      display: block;
      animation: fadeIn 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* Subtle hover states with depth */
    .topic-pill {
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      transform-origin: center;
    }

    .topic-pill:hover {
      transform: translateY(-2px) scale(1.02);
      box-shadow: 0 10px 30px -10px rgba(239, 68, 68, 0.15);
    }

    .topic-pill:active {
      transform: translateY(-1px) scale(1.01);
      transition-duration: 0.1s;
    }

    /* Elegant focus states */
    .topic-pill:focus-visible {
      outline: none;
      box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1),
                  0 10px 30px -10px rgba(239, 68, 68, 0.2);
    }

    /* Loading skeleton animation */
    @keyframes shimmer {
      0% {
        background-position: -200% 0;
      }
      100% {
        background-position: 200% 0;
      }
    }

    .skeleton {
      background: linear-gradient(
        90deg,
        #f3f4f6 25%,
        #e5e7eb 50%,
        #f3f4f6 75%
      );
      background-size: 200% 100%;
      animation: shimmer 2s infinite;
    }

    /* Micro-interaction for icon */
    .topic-icon {
      transition: transform 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    }

    .topic-pill:hover .topic-icon {
      transform: scale(1.15) rotate(5deg);
    }

    /* Subtle gradient overlay */
    .gradient-fade {
      background: linear-gradient(
        180deg,
        transparent 0%,
        rgba(255, 255, 255, 0.03) 50%,
        transparent 100%
      );
      pointer-events: none;
    }
  `
})
export class EmptyState implements OnInit {
  readonly quickStartSelected = output<string>();  // Keep original output name for compatibility

  private readonly quickTopicsService = inject(QuickTopicsService);

  // Transform API topics to component format with computed signal
  readonly quickTopics = computed(() =>
    this.quickTopicsService.topics().map(t => ({
      label: t.topic,  // Using 'topic' instead of 'question'
      query: t.topic,  // The topic itself becomes the search query
      icon: t.icon,
      category: t.category
    }))
  );

  readonly loading = this.quickTopicsService.loading;
  readonly error = this.quickTopicsService.error;

  ngOnInit(): void {
    // Load AI-generated quick topics from API
    this.quickTopicsService.loadTopics();
  }

  selectQuickTopic(query: string): void {
    // Emit the topic as a search query (keeping original event name for compatibility)
    this.quickStartSelected.emit(query);
  }

  // Generate placeholder items for loading state
  readonly loadingPlaceholders = Array(6).fill(null).map((_, i) => ({
    id: i,
    width: 120 + Math.random() * 40  // Varying widths for realistic skeleton
  }));
}