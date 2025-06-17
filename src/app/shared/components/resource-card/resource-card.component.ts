import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Resource } from '../../../core/models/resource.model';
import { I18nService } from '../../../core/services/i18n.service';

@Component({
  selector: 'app-resource-card',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './resource-card.component.html',
  styleUrl: './resource-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResourceCardComponent {
  @Input() resource!: Resource;
  @Input() showDescription: boolean = true;
  @Input() showTags: boolean = true;
  @Output() download = new EventEmitter<Resource>();
  @Output() share = new EventEmitter<Resource>();
  @Output() bookmark = new EventEmitter<Resource>();

  constructor(public i18nService: I18nService) {}

  getResourceTitle(): string {
    return this.i18nService.getLocalizedText(this.resource.title);
  }

  getResourceDescription(): string {
    return this.i18nService.getLocalizedText(this.resource.description);
  }

  getTypeLabel(): string {
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

  getTypeColor(): string {
    const typeColors: Record<string, string> = {
      guidance: 'bg-cost-teal',
      caseStudy: 'bg-cost-cyan',
      report: 'bg-cost-amber',
      dataset: 'bg-green-500',
      tool: 'bg-purple-500',
      infographic: 'bg-pink-500',
      other: 'bg-gray-500'
    };
    return typeColors[this.resource.type] || 'bg-gray-500';
  }

  getCountryName(): string {
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

  formatDate(): string {
    const date = new Date(this.resource.datePublished.seconds * 1000);
    return date.toLocaleDateString(this.i18nService.getCurrentLanguage(), {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  onDownload(event: Event): void {
    event.stopPropagation();
    this.download.emit(this.resource);
  }

  onShare(event: Event): void {
    event.stopPropagation();
    this.share.emit(this.resource);
  }

  onBookmark(event: Event): void {
    event.stopPropagation();
    this.bookmark.emit(this.resource);
  }

  hasDownloadLink(): boolean {
    const currentLang = this.i18nService.getCurrentLanguage();
    return !!(this.resource.fileLinks && this.resource.fileLinks[currentLang]) || !!this.resource.externalLink;
  }
}
