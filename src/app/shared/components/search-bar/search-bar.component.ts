import { Component, EventEmitter, Input, Output, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { I18nService } from '../../../core/services/i18n.service';

@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './search-bar.component.html',
  styleUrl: './search-bar.component.scss'
})
export class SearchBarComponent implements OnInit, OnDestroy {
  @Input() placeholder: string = '';
  @Input() value: string = '';
  @Input() showFilters: boolean = false;
  @Output() searchChange = new EventEmitter<string>();
  @Output() filtersToggle = new EventEmitter<void>();

  searchQuery: string = '';
  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(public i18nService: I18nService) {}

  ngOnInit(): void {
    this.searchQuery = this.value;

    // Setup debounced search
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(query => {
      this.searchChange.emit(query);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchQuery = target.value;
    this.searchSubject.next(this.searchQuery);
  }

  onClearSearch(): void {
    this.searchQuery = '';
    this.searchSubject.next('');
  }

  onToggleFilters(): void {
    this.filtersToggle.emit();
  }

  getPlaceholderText(): string {
    return this.placeholder || this.i18nService.t('common.searchPlaceholder');
  }
}
