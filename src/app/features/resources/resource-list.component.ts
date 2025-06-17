import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { Subject, takeUntil, combineLatest } from 'rxjs';
import { SearchBarComponent } from '../../shared/components/search-bar/search-bar.component';
import { ResourceCardComponent } from '../../shared/components/resource-card/resource-card.component';
import { LanguageToggleComponent } from '../../shared/components/language-toggle/language-toggle.component';
import { ResourceService } from '../../core/services/resource.service';
import { I18nService } from '../../core/services/i18n.service';
import { Resource, ResourceSearchResult } from '../../core/models/resource.model';
import { FilterGroup, ActiveFilters } from '../../core/models/filter.model';

@Component({
  selector: 'app-resource-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    SearchBarComponent,
    ResourceCardComponent,
    LanguageToggleComponent
  ],
  templateUrl: './resource-list.component.html',
  styleUrl: './resource-list.component.scss'
})
export class ResourceListComponent implements OnInit, OnDestroy {
  searchResult: ResourceSearchResult = { resources: [], total: 0, hasMore: false };
  filterOptions: FilterGroup = {
    type: [],
    topic: [],
    region: [],
    language: [],
    country: []
  };
  activeFilters: ActiveFilters = {
    type: [],
    topic: [],
    region: [],
    language: [],
    country: [],
    searchQuery: ''
  };

  showMobileFilters = false;
  loading = false;

  private destroy$ = new Subject<void>();

  constructor(
    private resourceService: ResourceService,
    public i18nService: I18nService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.loadFilterOptions();
    this.handleRouteParams();
    this.loadResources();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadFilterOptions(): void {
    this.resourceService.getFilterOptions()
      .pipe(takeUntil(this.destroy$))
      .subscribe(options => {
        this.filterOptions = options;
      });
  }

  private loadResources(): void {
    combineLatest([
      this.resourceService.getResources(),
      this.resourceService.activeFilters$,
      this.resourceService.loading$
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([result, filters, loading]) => {
        this.searchResult = result;
        this.activeFilters = filters;
        this.loading = loading;
      });
  }

  private handleRouteParams(): void {
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const filters: Partial<ActiveFilters> = {};

        // Handle navigation from Features dropdown
        if (params['topic']) {
          if (params['topic'] === 'collaboration') {
            // For collaboration, we'll filter by relevant tags in the component
            // This will be handled in the resource service filtering logic
            filters.searchQuery = 'collaboration OR multi-stakeholder OR platform';
          } else {
            filters.topic = [params['topic']];
          }
        }
        if (params['type']) {
          filters.type = [params['type']];
        }
        if (params['country']) {
          filters.country = [params['country']];
        }
        if (params['q']) {
          filters.searchQuery = params['q'];
        }

        // Handle advanced search mode or top nav search
        if (params['advanced'] === 'true' || params['search'] === 'true') {
          // Focus on search bar when in advanced mode or from top nav
          setTimeout(() => {
            const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement;
            if (searchInput) {
              searchInput.focus();
              searchInput.select();
            }
          }, 100);
        }

        if (Object.keys(filters).length > 0) {
          this.resourceService.updateFilters(filters);
        }
      });
  }

  onSearch(query: string): void {
    this.resourceService.updateFilters({ searchQuery: query });
  }

  onToggleMobileFilters(): void {
    this.showMobileFilters = !this.showMobileFilters;
  }

  onFilterChange(filterType: keyof ActiveFilters, value: string, checked: boolean): void {
    const currentFilters = { ...this.activeFilters };

    if (filterType === 'searchQuery') {
      currentFilters.searchQuery = value;
    } else {
      const filterArray = currentFilters[filterType] as string[];
      if (checked) {
        if (!filterArray.includes(value)) {
          filterArray.push(value);
        }
      } else {
        const index = filterArray.indexOf(value);
        if (index > -1) {
          filterArray.splice(index, 1);
        }
      }
    }

    this.resourceService.updateFilters(currentFilters);
  }

  onClearFilters(): void {
    this.resourceService.clearFilters();
  }

  onResourceDownload(resource: Resource): void {
    const currentLang = this.i18nService.getCurrentLanguage();
    const downloadUrl = resource.fileLinks?.[currentLang] || resource.externalLink;

    if (downloadUrl) {
      window.open(downloadUrl, '_blank');
    }
  }

  onResourceShare(resource: Resource): void {
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

  isFilterActive(filterType: keyof ActiveFilters, value: string): boolean {
    if (filterType === 'searchQuery') {
      return this.activeFilters.searchQuery === value;
    }
    const filterArray = this.activeFilters[filterType] as string[];
    return filterArray.includes(value);
  }

  getActiveFilterCount(): number {
    return this.activeFilters.type.length +
           this.activeFilters.topic.length +
           this.activeFilters.country.length +
           this.activeFilters.language.length +
           (this.activeFilters.searchQuery ? 1 : 0);
  }

  hasActiveFilters(): boolean {
    return this.getActiveFilterCount() > 0;
  }

  trackByResourceId(index: number, resource: Resource): string {
    return resource.id;
  }
}
