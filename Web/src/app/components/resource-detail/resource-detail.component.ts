import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ResourceService, FeaturedResource } from '../../services/resource.service';
import { ResourceItem, ResourceCategory, ResourceType, Language } from '../../models/types';
import { getTranslation } from '../../i18n/translations';

@Component({
  selector: 'app-resource-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './resource-detail.component.html',
})
export class ResourceDetailComponent implements OnInit {
  resource = signal<ResourceItem | null>(null);
  relatedResources = signal<ResourceItem[]>([]);
  isLoading = signal(true);
  isRelatedLoading = signal(true);
  language = signal<Language>('en');

  // Translations - reactive based on language
  t = computed(() => getTranslation(this.language()));

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private resourceService: ResourceService
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      const id = params['id'];
      if (id) {
        this.loadResource(id);
      }
    });
  }

  private loadResource(id: string) {
    this.isLoading.set(true);
    this.resourceService.getResourceById(id).subscribe({
      next: (resource) => {
        this.resource.set(resource);
        this.isLoading.set(false);
        if (resource) {
          this.loadRelatedResources(resource);
        }
      },
      error: (err) => {
        console.error('Failed to load resource:', err);
        this.isLoading.set(false);
      }
    });
  }

  private loadRelatedResources(currentResource: ResourceItem) {
    this.isRelatedLoading.set(true);
    this.resourceService.getResources().subscribe({
      next: (resources) => {
        // Find related resources by category, type, or tags
        const related = resources
          .filter(r => r.id !== currentResource.id)
          .map(r => ({
            resource: r,
            score: this.calculateSimilarity(currentResource, r)
          }))
          .filter(r => r.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 4)
          .map(r => r.resource);

        this.relatedResources.set(related);
        this.isRelatedLoading.set(false);
      },
      error: () => {
        this.isRelatedLoading.set(false);
      }
    });
  }

  private calculateSimilarity(a: ResourceItem, b: ResourceItem): number {
    let score = 0;

    // Same category = +3
    if (a.category === b.category) score += 3;

    // Same type = +2
    if (a.type === b.type) score += 2;

    // Matching tags = +1 each
    const aTags = a.tags || [];
    const bTags = b.tags || [];
    aTags.forEach(tag => {
      if (bTags.some(t => t.toLowerCase() === tag.toLowerCase())) {
        score += 1;
      }
    });

    // Title word overlap = +0.5 each
    const aWords = a.title.toLowerCase().split(/\s+/);
    const bWords = b.title.toLowerCase().split(/\s+/);
    aWords.forEach(word => {
      if (word.length > 3 && bWords.includes(word)) {
        score += 0.5;
      }
    });

    return score;
  }

  trackInteraction(id: string) {
    this.resourceService.trackInteraction(id).subscribe();
  }

  goBack() {
    this.router.navigate(['/']);
  }

  getFormattedDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  onImageError(event: Event) {
    // Hide the image container if the image fails to load
    const target = event.target as HTMLImageElement;
    if (target?.parentElement) {
      target.parentElement.style.display = 'none';
    }
  }

  hasValidCoverImage(): boolean {
    const res = this.resource();
    if (!res?.coverImage) return false;
    const coverImage = res.coverImage.trim();
    if (!coverImage) return false;
    // Exclude data:image/svg placeholder images
    if (coverImage.startsWith('data:image/svg')) return false;
    // Require proper URL format
    return coverImage.startsWith('http://') || coverImage.startsWith('https://');
  }
}
