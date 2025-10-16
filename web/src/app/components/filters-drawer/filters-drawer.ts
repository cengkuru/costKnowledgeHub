import { Component, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SearchService } from '../../core/search.service';
import { ContextualFiltersService, ContextualFilter } from '../../core/contextual-filters.service';
import { TelemetryService } from '../../core/telemetry.service';

type Option = {
  label: string;
  value: string;
  description?: string;
};

type Shortcut = {
  label: string;
  description: string;
  filters: {
    topic?: string;
    country?: string;
    year?: number;
  };
};

@Component({
  selector: 'app-filters-drawer',
  imports: [CommonModule, FormsModule],
  templateUrl: './filters-drawer.html',
  styles: ``
})
export class FiltersDrawer {
  topicOptions: Option[] = [
    { label: 'Manuals', value: 'Manual', description: 'Step-by-step implementation guides' },
    { label: 'Guidance Notes', value: 'Guide', description: 'High-level recommendations' },
    { label: 'Templates', value: 'Template', description: 'Reusable document formats' },
    { label: 'Policies', value: 'Policy', description: 'Official policy positions' },
    { label: 'Case Studies', value: 'Case Study', description: 'Real-world project examples' }
  ];

  countryOptions: Option[] = [
    { label: 'Any country', value: '' },
    { label: 'Global', value: 'Global' },
    { label: 'Ukraine', value: 'Ukraine' },
    { label: 'Uganda', value: 'Uganda' },
    { label: 'Philippines', value: 'Philippines' },
    { label: 'Honduras', value: 'Honduras' }
  ];

  yearOptions: Option[] = [
    { label: 'Any year', value: '' },
    { label: '2025', value: '2025' },
    { label: '2024', value: '2024' },
    { label: '2023', value: '2023' },
    { label: '2022', value: '2022' },
    { label: '2021', value: '2021' }
  ];

  shortcuts: Shortcut[] = [
    {
      label: 'Latest manuals',
      description: 'Manuals published from 2024 onwards',
      filters: { topic: 'Manual', year: 2024 }
    },
    {
      label: 'Templates',
      description: 'Ready-to-use disclosure formats',
      filters: { topic: 'Template' }
    },
    {
      label: 'Country pilots',
      description: 'Case studies from priority countries',
      filters: { topic: 'Case Study', country: 'Uganda' }
    }
  ];

  selectedTopic = '';
  selectedCountry = '';
  selectedYear = '';

  constructor(
    public readonly searchService: SearchService,
    public readonly contextualFiltersService: ContextualFiltersService,
    private readonly telemetryService: TelemetryService
  ) {
    effect(() => {
      const filters = this.searchService.activeFilters();
      this.selectedTopic = filters.topic ?? '';
      this.selectedCountry = filters.country ?? '';
      this.selectedYear = filters.year ? String(filters.year) : '';
    });

    effect(() => {
      const query = this.searchService.getQuery();
      const filters = this.searchService.activeFilters();
      this.contextualFiltersService.load(query, {
        topic: filters.topic,
        country: filters.country,
        year: filters.year
      });
    });
  }

  get hasQuery(): boolean {
    return this.searchService.getQuery().trim().length >= 2;
  }

  get isApplying(): boolean {
    return this.searchService.loading();
  }

  get hasActiveFilters(): boolean {
    const filters = this.searchService.activeFilters();
    return Boolean(filters.topic || filters.country || filters.year);
  }

  toggleTopic(value: string): void {
    this.selectedTopic = this.selectedTopic === value ? '' : value;
  }

  onYearChange(value: string | number | null): void {
    if (value === null || value === undefined || value === '') {
      this.selectedYear = '';
      return;
    }

    this.selectedYear = String(value);
  }

  applyShortcut(shortcut: Shortcut): void {
    this.selectedTopic = shortcut.filters.topic ?? '';
    this.selectedCountry = shortcut.filters.country ?? '';
    this.selectedYear = shortcut.filters.year ? String(shortcut.filters.year) : '';
    this.applyFilters();
  }

  applyFilters(): void {
    const request = this.searchService.applyFilters({
      topic: this.selectedTopic || undefined,
      country: this.selectedCountry || undefined,
      year: this.selectedYear ? Number(this.selectedYear) : undefined
    });

    request?.subscribe();
  }

  applySuggestion(suggestion: ContextualFilter): void {
    const query = this.searchService.getQuery();
    const currentFilters = this.searchService.activeFilters();

    this.telemetryService.recordFilterSuggestionApplied({
      suggestion,
      query,
      currentFilters,
      nextFilters: {
        topic: suggestion.filters.topic,
        country: suggestion.filters.country,
        year: suggestion.filters.year
      }
    });

    this.selectedTopic = suggestion.filters.topic ?? '';
    this.selectedCountry = suggestion.filters.country ?? '';
    this.selectedYear = suggestion.filters.year ? String(suggestion.filters.year) : '';
    this.applyFilters();
  }

  resetFilters(): void {
    this.selectedTopic = '';
    this.selectedCountry = '';
    this.selectedYear = '';

    const request = this.searchService.clearFilters();
    request?.subscribe();
  }
}
