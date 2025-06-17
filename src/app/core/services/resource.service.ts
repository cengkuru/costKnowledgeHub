import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { map, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Resource, ResourceFilter, ResourceSearchResult, Language } from '../models/resource.model';
import { FilterGroup, ActiveFilters } from '../models/filter.model';

@Injectable({
  providedIn: 'root'
})
export class ResourceService {
  private resourcesSubject = new BehaviorSubject<Resource[]>([]);
  private filtersSubject = new BehaviorSubject<FilterGroup>({
    type: [],
    topic: [],
    region: [],
    language: [],
    country: []
  });
  private activeFiltersSubject = new BehaviorSubject<ActiveFilters>({
    type: [],
    topic: [],
    region: [],
    language: [],
    country: [],
    searchQuery: ''
  });
  private loadingSubject = new BehaviorSubject<boolean>(false);

  public resources$ = this.resourcesSubject.asObservable();
  public filters$ = this.filtersSubject.asObservable();
  public activeFilters$ = this.activeFiltersSubject.asObservable();
  public loading$ = this.loadingSubject.asObservable();

  constructor() {
    // Initialize with mock data
    this.initializeMockData();
  }

  // Get all resources with optional filtering
  getResources(filter?: ResourceFilter): Observable<ResourceSearchResult> {
    return combineLatest([this.resources$, this.activeFilters$]).pipe(
      debounceTime(300),
      map(([resources, activeFilters]) => {
        let filteredResources = [...resources];

        // Apply search query
        if (activeFilters.searchQuery) {
          const query = activeFilters.searchQuery.toLowerCase();
          filteredResources = filteredResources.filter(resource =>
            Object.values(resource.title).some(title => title.toLowerCase().includes(query)) ||
            Object.values(resource.description).some(desc => desc.toLowerCase().includes(query)) ||
            resource.tags.some(tag => tag.toLowerCase().includes(query))
          );
        }

        // Apply type filter
        if (activeFilters.type.length > 0) {
          filteredResources = filteredResources.filter(resource =>
            activeFilters.type.includes(resource.type)
          );
        }

        // Apply language filter
        if (activeFilters.language.length > 0) {
          filteredResources = filteredResources.filter(resource =>
            activeFilters.language.includes(resource.language)
          );
        }

        // Apply country filter
        if (activeFilters.country.length > 0) {
          filteredResources = filteredResources.filter(resource =>
            activeFilters.country.includes(resource.country) || resource.country === 'global'
          );
        }

        // Apply tag/topic filter
        if (activeFilters.topic.length > 0) {
          filteredResources = filteredResources.filter(resource =>
            resource.tags.some(tag => activeFilters.topic.includes(tag))
          );
        }

        return {
          resources: filteredResources,
          total: filteredResources.length,
          hasMore: false // For pagination in future
        };
      })
    );
  }

  // Get featured resources
  getFeaturedResources(): Observable<Resource[]> {
    return this.resources$.pipe(
      map(resources => resources.filter(resource => resource.featured).slice(0, 6))
    );
  }

  // Get resource by ID
  getResourceById(id: string): Observable<Resource | undefined> {
    return this.resources$.pipe(
      map(resources => resources.find(resource => resource.id === id))
    );
  }

  // Update active filters
  updateFilters(filters: Partial<ActiveFilters>): void {
    const currentFilters = this.activeFiltersSubject.value;
    this.activeFiltersSubject.next({ ...currentFilters, ...filters });
  }

  // Clear all filters
  clearFilters(): void {
    this.activeFiltersSubject.next({
      type: [],
      topic: [],
      region: [],
      language: [],
      country: [],
      searchQuery: ''
    });
  }

  // Get filter options (for sidebar)
  getFilterOptions(): Observable<FilterGroup> {
    return this.resources$.pipe(
      map(resources => {
        const typeCount: Record<string, number> = {};
        const topicCount: Record<string, number> = {};
        const regionCount: Record<string, number> = {};
        const languageCount: Record<string, number> = {};
        const countryCount: Record<string, number> = {};

        resources.forEach(resource => {
          // Count types
          typeCount[resource.type] = (typeCount[resource.type] || 0) + 1;

          // Count languages
          languageCount[resource.language] = (languageCount[resource.language] || 0) + 1;

          // Count countries
          countryCount[resource.country] = (countryCount[resource.country] || 0) + 1;

          // Count tags/topics
          resource.tags.forEach(tag => {
            topicCount[tag] = (topicCount[tag] || 0) + 1;
          });
        });

        return {
          type: Object.entries(typeCount).map(([value, count]) => ({
            value,
            label: this.formatTypeLabel(value),
            count
          })),
          topic: Object.entries(topicCount).map(([value, count]) => ({
            value,
            label: value,
            count
          })),
          region: [
            { value: 'africa', label: 'Africa', count: 0 },
            { value: 'asia', label: 'Asia Pacific', count: 0 },
            { value: 'europe', label: 'Europe', count: 0 },
            { value: 'latam', label: 'Latin America', count: 0 }
          ],
          language: Object.entries(languageCount).map(([value, count]) => ({
            value,
            label: this.formatLanguageLabel(value),
            count
          })),
          country: Object.entries(countryCount).map(([value, count]) => ({
            value,
            label: this.formatCountryLabel(value),
            count
          }))
        };
      })
    );
  }

  private formatTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      guidance: 'Implementation Guides',
      caseStudy: 'Case Studies',
      report: 'Research Reports',
      dataset: 'Datasets',
      tool: 'Tools & Templates',
      infographic: 'Infographics',
      other: 'Other Resources'
    };
    return labels[type] || type;
  }

  private formatLanguageLabel(lang: string): string {
    const labels: Record<string, string> = {
      en: 'English',
      es: 'Español',
      pt: 'Português'
    };
    return labels[lang] || lang;
  }

  private formatCountryLabel(country: string): string {
    const labels: Record<string, string> = {
      global: 'Global',
      gt: 'Guatemala',
      ug: 'Uganda',
      th: 'Thailand',
      uk: 'United Kingdom',
      ph: 'Philippines'
    };
    return labels[country] || country.toUpperCase();
  }

  private initializeMockData(): void {
    const mockResources: Resource[] = [
      {
        id: 'res-001',
        title: {
          en: 'CoST Infrastructure Data Standard (IDS) Implementation Guide',
          es: 'Guía de Implementación del Estándar de Datos de Infraestructura (IDS) de CoST',
          pt: 'Guia de Implementação do Padrão de Dados de Infraestrutura (IDS) do CoST'
        },
        description: {
          en: 'Comprehensive guide for implementing the 40 core data points of CoST IDS across infrastructure projects',
          es: 'Guía completa para implementar los 40 puntos de datos centrales del IDS de CoST en proyectos de infraestructura',
          pt: 'Guia abrangente para implementar os 40 pontos de dados principais do IDS do CoST em projetos de infraestrutura'
        },
        type: 'guidance',
        tags: ['Transparency', 'Data Disclosure', 'Implementation'],
        country: 'global',
        language: 'en',
        datePublished: { seconds: 1710547200, nanoseconds: 0 }, // 2024-03-15
        fileLinks: { en: '/assets/samples/cost-ids-guide-2024.pdf' },
        thumbnailUrl: '/assets/images/ids-guide-thumb.jpg',
        featured: true,
        fileSize: '3.2 MB',
        format: 'PDF'
      },
      {
        id: 'res-002',
        title: {
          en: 'Thailand Infrastructure Transparency Success Story',
          es: 'Historia de Éxito de Transparencia en Infraestructura de Tailandia',
          pt: 'História de Sucesso da Transparência de Infraestrutura da Tailândia'
        },
        description: {
          en: 'How Thailand saved $360 million through CoST implementation in highway projects',
          es: 'Cómo Tailandia ahorró $360 millones a través de la implementación de CoST en proyectos de carreteras',
          pt: 'Como a Tailândia economizou $360 milhões através da implementação do CoST em projetos rodoviários'
        },
        type: 'caseStudy',
        tags: ['Cost Savings', 'Public Procurement', 'Southeast Asia'],
        country: 'th',
        language: 'en',
        datePublished: { seconds: 1709856000, nanoseconds: 0 }, // 2024-03-08
        thumbnailUrl: '/assets/images/thailand-highway.jpg',
        featured: true,
        impact: {
          savings: '$360 million',
          projects: 47,
          transparency: '85% disclosure rate'
        }
      },
      {
        id: 'res-003',
        title: {
          en: 'Infrastructure Transparency Index 2024 Country Scores',
          es: 'Índice de Transparencia en Infraestructura 2024 - Puntuaciones por País',
          pt: 'Índice de Transparência de Infraestrutura 2024 - Pontuações por País'
        },
        description: {
          en: 'Comprehensive dataset with transparency scores for 89 countries across infrastructure sectors',
          es: 'Conjunto de datos completo con puntuaciones de transparencia para 89 países en sectores de infraestructura',
          pt: 'Conjunto de dados abrangente com pontuações de transparência para 89 países em setores de infraestrutura'
        },
        type: 'dataset',
        tags: ['Transparency Index', 'Global Assessment', 'Data Analysis'],
        country: 'global',
        language: 'en',
        datePublished: { seconds: 1709251200, nanoseconds: 0 }, // 2024-03-01
        fileLinks: { en: '/assets/samples/iti-2024-scores.csv' },
        featured: true,
        fileSize: '1.8 MB',
        format: 'CSV'
      }
    ];

    this.resourcesSubject.next(mockResources);
  }
}
