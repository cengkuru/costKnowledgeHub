import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { Header } from './components/header/header';
import { AnswerBlock } from './components/answer-block/answer-block';
import { ResultsList } from './components/results-list/results-list';
import { ComposePanel } from './components/compose-panel/compose-panel';
import { FiltersDrawer } from './components/filters-drawer/filters-drawer';
import { EmptyState } from './components/empty-state/empty-state';
import { SmartCollections } from './components/smart-collections/smart-collections';
import { SearchService } from './core/search.service';
import { SelectionService } from './core/selection.service';
import { StarterQuestion, StarterQuestionsService } from './core/starter-questions.service';

@Component({
  selector: 'app-root',
  imports: [
    Header,
    AnswerBlock,
    ResultsList,
    ComposePanel,
    FiltersDrawer,
    EmptyState,
    SmartCollections
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  protected readonly searchService = inject(SearchService);
  protected readonly selectionService = inject(SelectionService);
  protected readonly starterQuestionsService = inject(StarterQuestionsService);

  ngOnInit(): void {
    // Load AI-generated starter questions on app initialization
    this.starterQuestionsService.loadQuestions();
  }

  protected readonly filtersOpen = signal(false);

  protected readonly hasQuery = computed(
    () => this.searchService.getQuery().trim().length >= 2
  );
  protected readonly hasAnswer = computed(
    () => this.searchService.answer().length > 0
  );
  protected readonly hasSelections = computed(
    () => this.selectionService.selectedCount() > 0
  );

  protected readonly showEmptyState = computed(() =>
    !this.hasQuery() &&
    this.searchService.items().length === 0 &&
    !this.searchService.loading()
  );

  protected readonly highlights = [
    'Evidence-backed insights',
    'Instant semantic search',
    'Verified official sources'
  ];

  // Dynamic AI-generated starter questions
  protected get starterQuestions(): StarterQuestion[] {
    return this.starterQuestionsService.questions();
  }

  onStarterQuestionClick(question: string): void {
    this.searchService.search({ q: question, page: 1 }).subscribe();
  }

  protected readonly resultsMeta = computed(() => {
    const items = this.searchService.items();
    const countrySet = new Set<string>();
    const typeSet = new Set<string>();

    items.forEach(item => {
      if (item.country) {
        countrySet.add(item.country);
      }
      if (item.type) {
        typeSet.add(item.type);
      }
    });

    return {
      count: items.length,
      countries: countrySet.size,
      types: typeSet.size
    };
  });

  toggleFilters(): void {
    this.filtersOpen.update(open => !open);
  }

  closeFilters(): void {
    this.filtersOpen.set(false);
  }

  onQuickStartSelected(query: string): void {
    this.searchService.search({ q: query, page: 1 }).subscribe();
  }
}
