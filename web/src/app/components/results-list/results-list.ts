import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SearchService } from '../../core/search.service';
import { SelectionService } from '../../core/selection.service';
import { getResourceTypeColor } from '../../core/resource-type-colors';

@Component({
  selector: 'app-results-list',
  imports: [CommonModule],
  templateUrl: './results-list.html',
  styles: ``
})
export class ResultsList {
  expandedItemId: string | null = null;

  constructor(
    public searchService: SearchService,
    public selectionService: SelectionService
  ) {}

  getStartIndex(): number {
    if (this.searchService.items().length === 0) {
      return 0;
    }
    return (this.searchService.page() - 1) * this.searchService.pageSize() + 1;
  }

  getEndIndex(): number {
    const itemsCount = this.searchService.items().length;
    if (itemsCount === 0) {
      return 0;
    }
    return this.getStartIndex() + itemsCount - 1;
  }

  nextPage(): void {
    const request = this.searchService.nextPage();
    request?.subscribe();
  }

  previousPage(): void {
    const request = this.searchService.previousPage();
    request?.subscribe();
  }

  toggleExpand(itemId: string) {
    this.expandedItemId = this.expandedItemId === itemId ? null : itemId;
  }

  isExpanded(itemId: string): boolean {
    return this.expandedItemId === itemId;
  }

  toggleSelection(item: any) {
    if (this.selectionService.isSelected(item.id)) {
      this.selectionService.remove(item.id);
    } else {
      this.selectionService.add(item);
    }
  }

  isSelected(itemId: string): boolean {
    return this.selectionService.isSelected(itemId);
  }

  /**
   * Get color classes for resource type pills
   */
  getResourceTypeColor(type: string): string {
    return getResourceTypeColor(type);
  }
}
