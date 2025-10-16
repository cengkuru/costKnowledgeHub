import { Component, OnInit, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SearchService } from '../../core/search.service';
import { SelectionService } from '../../core/selection.service';
import { ComposeService } from '../../core/compose.service';
import { RecommendationsService } from '../../core/recommendations.service';
import { getResourceTypeColor } from '../../core/resource-type-colors';

@Component({
  selector: 'app-compose-panel',
  imports: [CommonModule, FormsModule],
  templateUrl: './compose-panel.html',
  styles: ``
})
export class ComposePanel implements OnInit {
  exportFormat: 'brief' | 'pack' | 'notes' = 'brief';
  isExporting = false;
  readonly panelOpen = signal(false);

  constructor(
    public selectionService: SelectionService,
    public recommendationsService: RecommendationsService,
    protected searchService: SearchService,
    private composeService: ComposeService
  ) {
    effect(() => {
      const hasSelection = this.selectionService.selectedCount() > 0;
      const hasRecommendations = this.recommendationsService.hasRecommendations();
      if (hasSelection || hasRecommendations) {
        this.panelOpen.set(true);
      }
    });
  }

  ngOnInit(): void {
    // Initial recommendations load
    this.recommendationsService.refresh();
  }

  removeItem(itemId: string) {
    this.selectionService.remove(itemId);
  }

  exportSelection() {
    const selectedIds = this.selectionService.getSelectedIds();
    const answer = this.searchService.answer();

    if (selectedIds.length === 0 && answer.length === 0) {
      alert('Please select items or wait for search results');
      return;
    }

    this.isExporting = true;

    this.composeService.exportPDF({
      items: selectedIds,
      bullets: answer
    }).subscribe({
      next: () => {
        this.isExporting = false;
      },
      error: (err) => {
        console.error('Export failed:', err);
        alert('Export failed. Please try again.');
        this.isExporting = false;
      }
    });
  }

  /**
   * Execute a recommendation (search for that document)
   */
  executeRecommendation(recommendation: any): void {
    this.recommendationsService.executeRecommendation(recommendation);
  }

  /**
   * Get percentage string for relevance score
   */
  getRelevancePercent(score: number): string {
    return Math.round(score * 100) + '%';
  }

  /**
   * Get selection insights (type breakdown)
   */
  getSelectionInsights(): { type: string; count: number }[] {
    const items = this.selectionService.selectedItems();
    const typeCounts = new Map<string, number>();

    for (const item of items) {
      typeCounts.set(item.type, (typeCounts.get(item.type) || 0) + 1);
    }

    return Array.from(typeCounts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Get unique countries in selection
   */
  getUniqueCountries(): number {
    const items = this.selectionService.selectedItems();
    const countries = new Set(items.filter(i => i.country).map(i => i.country));
    return countries.size;
  }

  /**
   * Check if selection needs complementary docs
   */
  hasGaps(): boolean {
    const items = this.selectionService.selectedItems();
    const types = new Set(items.map(i => i.type));

    // If they selected Manuals but no Guides, suggest gap
    if (types.has('Manual') && !types.has('Guide')) return true;
    if (types.has('Guide') && !types.has('Template')) return true;

    return false;
  }

  togglePanel(): void {
    this.panelOpen.update(open => !open);
  }

  /**
   * Get color classes for resource type pills
   */
  getResourceTypeColor(type: string): string {
    return getResourceTypeColor(type);
  }
}
