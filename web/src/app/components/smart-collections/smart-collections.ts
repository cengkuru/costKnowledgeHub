import { Component, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SmartCollectionsService, SmartCollection, SmartCollectionEntry } from '../../core/smart-collections.service';
import { SearchService } from '../../core/search.service';
import { TelemetryService } from '../../core/telemetry.service';
import { getResourceTypeColor } from '../../core/resource-type-colors';

@Component({
  selector: 'app-smart-collections',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './smart-collections.html',
  styles: ``
})
export class SmartCollections {
  constructor(
    public readonly smartCollectionsService: SmartCollectionsService,
    private readonly searchService: SearchService,
    private readonly telemetryService: TelemetryService
  ) {
    effect(() => {
      const query = this.searchService.getQuery();
      const filters = this.searchService.activeFilters();
      this.smartCollectionsService.load(query, {
        topic: filters.topic,
        country: filters.country,
        year: filters.year
      });
    });
  }

  trackCollection(index: number, collection: SmartCollection): string {
    return collection.id || String(index);
  }

  trackEntry(index: number, entry: SmartCollection['items'][number]): string {
    return entry.id || `${index}-${entry.title}`;
  }

  getNoveltyPercent(novelty: number): string {
    return `${Math.round(novelty * 100)}% novel`;
  }

  onOpenEntry(collection: SmartCollection, entry: SmartCollectionEntry): void {
    const query = this.searchService.getQuery();
    const filters = this.searchService.activeFilters();

    this.telemetryService.recordSmartCollectionEntryOpened({
      collection,
      entry,
      query,
      filters: {
        topic: filters.topic,
        country: filters.country,
        year: filters.year
      }
    });
  }

  /**
   * Get color classes for resource type pills
   */
  getResourceTypeColor(type: string): string {
    return getResourceTypeColor(type);
  }
}
