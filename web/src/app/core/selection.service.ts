import { Injectable, signal, computed } from '@angular/core';
import { ResultItem } from './search.service';

/**
 * Selection service for managing the Selection Basket
 *
 * Maintains state of selected items using Angular signals
 * Provides computed properties for UI reactivity
 */
@Injectable({
  providedIn: 'root'
})
export class SelectionService {
  // Selected items map (ID -> ResultItem)
  private readonly selectedMap = signal<Map<string, ResultItem>>(new Map());

  // Public computed signals
  readonly selectedItems = computed(() => Array.from(this.selectedMap().values()));
  readonly selectedCount = computed(() => this.selectedMap().size);
  readonly hasSelections = computed(() => this.selectedCount() > 0);

  /**
   * Checks if an item is selected
   */
  isSelected(id: string): boolean {
    return this.selectedMap().has(id);
  }

  /**
   * Adds an item to the selection
   */
  add(item: ResultItem): void {
    this.selectedMap.update(map => {
      const newMap = new Map(map);
      newMap.set(item.id, item);
      return newMap;
    });
  }

  /**
   * Removes an item from the selection
   */
  remove(id: string): void {
    this.selectedMap.update(map => {
      const newMap = new Map(map);
      newMap.delete(id);
      return newMap;
    });
  }

  /**
   * Toggles an item's selection state
   */
  toggle(item: ResultItem): void {
    if (this.isSelected(item.id)) {
      this.remove(item.id);
    } else {
      this.add(item);
    }
  }

  /**
   * Clears all selections
   */
  clear(): void {
    this.selectedMap.set(new Map());
  }

  /**
   * Gets array of selected item IDs
   */
  getSelectedIds(): string[] {
    return Array.from(this.selectedMap().keys());
  }
}
