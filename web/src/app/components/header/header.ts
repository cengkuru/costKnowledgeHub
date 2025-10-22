import { Component, OnDestroy, OnInit, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SearchService } from '../../core/search.service';

@Component({
  selector: 'app-header',
  imports: [CommonModule, FormsModule],
  templateUrl: './header.html',
  styles: ``
})
export class Header implements OnInit, OnDestroy {
  searchQuery = '';
  showHelp = false;
  readonly openFilters = output<void>();
  private readonly shortcutHandler = (event: KeyboardEvent) => this.handleKeyboardShortcut(event);

  constructor(private searchService: SearchService) {}

  ngOnInit() {
    document.addEventListener('keydown', this.shortcutHandler);
  }

  ngOnDestroy() {
    document.removeEventListener('keydown', this.shortcutHandler);
  }

  onSearchSubmit() {
    const query = this.searchQuery.trim();
    if (query.length >= 2) {
      const filters = this.searchService.getActiveFilters();
      this.searchService.search({ q: query, ...filters }).subscribe();
    }
  }

  showFiltersPanel() {
    this.openFilters.emit();
  }

  toggleHelp() {
    this.showHelp = !this.showHelp;
  }

  goToHome() {
    // Clear search query and results to return to landing page
    this.searchQuery = '';
    this.searchService.clear();
  }

  handleKeyboardShortcut(event: KeyboardEvent) {
    if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
      event.preventDefault();
      const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement;
      searchInput?.focus();
    }
  }
}
