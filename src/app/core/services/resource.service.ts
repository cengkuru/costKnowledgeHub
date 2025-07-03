import { Injectable, inject } from '@angular/core';
import { Observable, BehaviorSubject, combineLatest, from } from 'rxjs';
import { map, debounceTime, distinctUntilChanged, switchMap, tap, catchError, of } from 'rxjs/operators';
import { Resource, ResourceFilter, ResourceSearchResult, Language, ResourceType, TopicCategory, Region } from '../models/resource.model';
import { FilterGroup, ActiveFilters, DEFAULT_FILTERS } from '../models/filter.model';
import { COST_TOPICS } from '../models/topic.model';
import { COST_COUNTRIES } from '../models/country.model';
import { FirestoreService } from './firestore.service';

@Injectable({
  providedIn: 'root'
})
export class ResourceService {
  private firestoreService = inject(FirestoreService);
  
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
    difficulty: [],
    format: [],
    featured: undefined,
    searchQuery: ''
  });
  private loadingSubject = new BehaviorSubject<boolean>(false);

  public resources$ = this.resourcesSubject.asObservable();
  public filters$ = this.filtersSubject.asObservable();
  public activeFilters$ = this.activeFiltersSubject.asObservable();
  public loading$ = this.loadingSubject.asObservable();

  constructor() {
    // Load resources from Firestore
    this.loadResources();
  }

  private async loadResources(): Promise<void> {
    try {
      this.loadingSubject.next(true);
      const resources = await this.firestoreService.getResources();
      this.resourcesSubject.next(resources);
      
      // Build filters from loaded resources
      this.buildFilters(resources);
    } catch (error) {
      console.error('Error loading resources:', error);
      this.resourcesSubject.next([]);
    } finally {
      this.loadingSubject.next(false);
    }
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

        // Apply topic filter
        if (activeFilters.topic.length > 0) {
          filteredResources = filteredResources.filter(resource =>
            resource.topics.some(topic => activeFilters.topic.includes(topic))
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

  // Get related resources based on topics and tags
  getRelatedResources(resourceId: string, topics: TopicCategory[], tags: string[] = [], limit: number = 4): Observable<Resource[]> {
    return this.resources$.pipe(
      map(resources => {
        return resources
          .filter(resource => 
            resource.id !== resourceId && (
              resource.topics.some(topic => topics.includes(topic)) ||
              resource.tags.some(tag => tags.includes(tag))
            )
          )
          .sort((a, b) => {
            // Sort by relevance (matching topics count)
            const aMatches = a.topics.filter(topic => topics.includes(topic)).length;
            const bMatches = b.topics.filter(topic => topics.includes(topic)).length;
            return bMatches - aMatches;
          })
          .slice(0, limit);
      })
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
      difficulty: [],
      format: [],
      featured: undefined,
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
      guide: 'Implementation Guides',
      'case-study': 'Case Studies',
      report: 'Research Reports',
      dataset: 'Datasets',
      tool: 'Tools & Templates',
      policy: 'Policy Briefs',
      template: 'Templates',
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

  private buildFilters(resources: Resource[]): void {
    const typeCount: Record<string, number> = {};
    const topicCount: Record<string, number> = {};
    const languageCount: Record<string, number> = {};
    const countryCount: Record<string, number> = {};

    resources.forEach(resource => {
      // Count types
      if (resource.type) {
        typeCount[resource.type] = (typeCount[resource.type] || 0) + 1;
      }

      // Count languages
      if (resource.language) {
        languageCount[resource.language] = (languageCount[resource.language] || 0) + 1;
      }

      // Count countries
      if (resource.country) {
        countryCount[resource.country] = (countryCount[resource.country] || 0) + 1;
      }

      // Count tags/topics
      if (resource.tags) {
        resource.tags.forEach(tag => {
          topicCount[tag] = (topicCount[tag] || 0) + 1;
        });
      }
    });

    // Update filters subject
    this.filtersSubject.next({
      type: Object.keys(typeCount),
      topic: Object.keys(topicCount),
      region: [],
      language: Object.keys(languageCount),
      country: Object.keys(countryCount)
    });
  }

  // CRUD Operations
  async createResource(resource: Omit<Resource, 'id'>): Promise<string> {
    try {
      const id = await this.firestoreService.createResource(resource);
      await this.loadResources(); // Reload to update local state
      return id;
    } catch (error) {
      console.error('Error creating resource:', error);
      throw error;
    }
  }

  async updateResource(id: string, resource: Partial<Resource>): Promise<void> {
    try {
      await this.firestoreService.updateResource(id, resource);
      await this.loadResources(); // Reload to update local state
    } catch (error) {
      console.error('Error updating resource:', error);
      throw error;
    }
  }

  async deleteResource(id: string): Promise<void> {
    try {
      await this.firestoreService.deleteResource(id);
      await this.loadResources(); // Reload to update local state
    } catch (error) {
      console.error('Error deleting resource:', error);
      throw error;
    }
  }

  async getResourceById(id: string): Promise<Resource | null> {
    try {
      return await this.firestoreService.getResourceById(id);
    } catch (error) {
      console.error('Error getting resource by id:', error);
      return null;
    }
  }

  // Refresh resources from Firestore
  async refreshResources(): Promise<void> {
    await this.loadResources();
  }
}
