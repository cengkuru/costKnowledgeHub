import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ResourceCardComponent } from '../../shared/components/resource-card/resource-card.component';
import { LanguageToggleComponent } from '../../shared/components/language-toggle/language-toggle.component';
import { ResourceService } from '../../core/services/resource.service';
import { I18nService } from '../../core/services/i18n.service';
import { Resource } from '../../core/models/resource.model';

@Component({
  selector: 'app-resource-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ResourceCardComponent,
    LanguageToggleComponent
  ],
  templateUrl: './resource-detail.component.html',
  styleUrl: './resource-detail.component.scss'
})
export class ResourceDetailComponent implements OnInit, OnDestroy {
  resource: Resource | null = null;
  relatedResources: Resource[] = [];
  loading = true;
  error = false;

  private destroy$ = new Subject<void>();

  constructor(
    private resourceService: ResourceService,
    public i18nService: I18nService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        if (params['id']) {
          this.loadResource(params['id']);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadResource(id: string): void {
    this.loading = true;
    this.error = false;

    this.resourceService.getResourceById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resource) => {
          this.resource = resource;
          this.loading = false;
          if (resource) {
            this.loadRelatedResources(resource);
          }
        },
        error: () => {
          this.error = true;
          this.loading = false;
        }
      });
  }

  private loadRelatedResources(resource: Resource): void {
    this.resourceService.getRelatedResources(resource.id, resource.type, resource.tags)
      .pipe(takeUntil(this.destroy$))
      .subscribe(related => {
        this.relatedResources = related;
      });
  }

  getResourceTitle(): string {
    return this.resource ? this.i18nService.getLocalizedText(this.resource.title) : '';
  }

  getResourceDescription(): string {
    return this.resource ? this.i18nService.getLocalizedText(this.resource.description) : '';
  }

  getTypeLabel(): string {
    if (!this.resource) return '';
    const typeLabels: Record<string, string> = {
      guidance: this.i18nService.t('resourceTypes.guidance'),
      caseStudy: this.i18nService.t('resourceTypes.caseStudy'),
      report: this.i18nService.t('resourceTypes.report'),
      dataset: this.i18nService.t('resourceTypes.dataset'),
      tool: this.i18nService.t('resourceTypes.tool'),
      infographic: this.i18nService.t('resourceTypes.infographic'),
      other: this.i18nService.t('resourceTypes.other')
    };
    return typeLabels[this.resource.type] || this.resource.type;
  }

  getCountryName(): string {
    if (!this.resource) return '';
    if (this.resource.country === 'global') {
      return this.i18nService.t('common.global');
    }

    const countryNames: Record<string, string> = {
      gt: 'Guatemala',
      ug: 'Uganda',
      th: 'Thailand',
      uk: 'United Kingdom',
      ph: 'Philippines'
    };

    return countryNames[this.resource.country] || this.resource.country.toUpperCase();
  }

  formatDate(timestamp: any): string {
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString(this.i18nService.getCurrentLanguage(), {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  onDownload(): void {
    if (!this.resource) return;

    const currentLang = this.i18nService.getCurrentLanguage();
    const downloadUrl = this.resource.fileLinks?.[currentLang] || this.resource.externalLink;

    if (downloadUrl) {
      window.open(downloadUrl, '_blank');
    }
  }

  onShare(): void {
    if (!this.resource) return;

    if (navigator.share) {
      navigator.share({
        title: this.getResourceTitle(),
        text: this.getResourceDescription(),
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      // Could add a toast notification here
    }
  }

  onRelatedResourceDownload(resource: Resource): void {
    const currentLang = this.i18nService.getCurrentLanguage();
    const downloadUrl = resource.fileLinks?.[currentLang] || resource.externalLink;

    if (downloadUrl) {
      window.open(downloadUrl, '_blank');
    }
  }

  onRelatedResourceShare(resource: Resource): void {
    if (navigator.share) {
      navigator.share({
        title: this.i18nService.getLocalizedText(resource.title),
        text: this.i18nService.getLocalizedText(resource.description),
        url: window.location.origin + '/resources/' + resource.id
      });
    } else {
      navigator.clipboard.writeText(window.location.origin + '/resources/' + resource.id);
    }
  }

  hasDownloadLink(): boolean {
    if (!this.resource) return false;
    const currentLang = this.i18nService.getCurrentLanguage();
    return !!(this.resource.fileLinks && this.resource.fileLinks[currentLang]) || !!this.resource.externalLink;
  }

  getFileFormat(): string {
    if (!this.resource?.format) return 'PDF';
    return this.resource.format.toUpperCase();
  }

  getFileSize(): string {
    return this.resource?.fileSize || '';
  }

  trackByResourceId(index: number, resource: Resource): string {
    return resource.id;
  }
}
