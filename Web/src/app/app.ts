import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ResourceCardComponent } from './components/resource-card/resource-card.component';
import { ResourceService, FeaturedResource, TopicInfo } from './services/resource.service';
import { SearchService } from './services/search.service';
import { TranslateService } from './services/translate.service';
import {
  ResourceItem,
  ResourceCategory,
  ResourceType,
  Language,
  SearchResultGroup,
  AIState,
} from './models/types';
import { getTranslation, Translations } from './i18n/translations';

type SortOption = 'newest' | 'oldest' | 'az' | 'popular';

interface ViewGroup {
  title: string;
  description: string;
  resources: ResourceItem[];
}

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule, RouterLink, ResourceCardComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
  standalone: true,
})
export class App implements OnInit {
  // Expose enums to template
  ResourceCategory = ResourceCategory;
  ResourceType = ResourceType;


  // Core Data State
  displayResources = signal<ResourceItem[]>([]);
  featuredResources = signal<FeaturedResource[]>([]);
  language = signal<Language>('en');

  // Translations - reactive based on language
  t = computed(() => getTranslation(this.language()));

  // Search & Filter State
  searchQuery = signal('');
  isSemanticMode = signal(false);
  semanticGroups = signal<SearchResultGroup[] | null>(null);

  selectedTopic = signal<string>('All');
  selectedType = signal<ResourceType | 'All'>('All' as any);
  selectedTag = signal<string | null>(null);
  sortOrder = signal<SortOption>('newest');

  // Active filters display
  activeFilters = computed(() => {
    const filters: { type: string; value: string }[] = [];
    if (this.selectedTopic() !== 'All') {
      filters.push({ type: 'topic', value: this.selectedTopic() });
    }
    if (this.selectedType() !== 'All') {
      filters.push({ type: 'type', value: this.selectedType() as string });
    }
    if (this.selectedTag()) {
      filters.push({ type: 'tag', value: this.selectedTag()! });
    }
    if (this.searchQuery()) {
      filters.push({ type: 'search', value: this.searchQuery() });
    }
    return filters;
  });

  // UI State
  isLangMenuOpen = signal(false);

  // Popularity State
  popularIds = signal(new Set<string>());

  // AI Loading States
  aiState = signal<AIState>({
    isTranslating: false,
    isSearching: false,
    error: null,
  });

  // Initial loading state
  isLoading = signal(true);
  isFeaturedLoading = signal(true);

  // Topics from API with images
  topicsData = signal<TopicInfo[]>([]);

  // Topic images mapped by name
  topicImages = computed(() => {
    const images: Partial<Record<ResourceCategory, string>> = {};
    this.topicsData().forEach(topic => {
      if (topic.image) {
        images[topic.name as ResourceCategory] = topic.image;
      }
    });
    return images;
  });

  // Translation Cache
  private translationCache = new Map<string, ResourceItem[]>();

  // Synonym mappings for interchangeable terms
  private synonyms: Record<string, string[]> = {
    'assurance': ['independent review', 'independent', 'review'],
    'independent review': ['assurance'],
    'independent': ['assurance'],
    'review': ['assurance', 'independent review'],
  };

  // Expand search query with synonyms
  private expandWithSynonyms(query: string): string[] {
    const terms = [query];
    const lowerQuery = query.toLowerCase();

    // Check for exact phrase matches first
    for (const [term, synonymList] of Object.entries(this.synonyms)) {
      if (lowerQuery.includes(term)) {
        synonymList.forEach(syn => {
          if (!terms.includes(syn)) {
            terms.push(syn);
          }
        });
      }
    }

    return terms;
  }

  // Computed: Filtered Resources
  filteredResources = computed(() => {
    let result = [...this.displayResources()];
    const topic = this.selectedTopic();
    const type = this.selectedType();
    const tag = this.selectedTag();
    const query = this.searchQuery();
    const semantic = this.isSemanticMode();
    const sort = this.sortOrder();

    // Filter by category
    if (topic !== 'All') {
      result = result.filter((r) => r.category === topic);
    }

    // Filter by type
    if (type !== 'All') {
      result = result.filter((r) => r.type === type);
    }

    // Filter by tag
    if (tag) {
      result = result.filter((r) => r.tags?.some(t => t.toLowerCase() === tag.toLowerCase()));
    }

    // Keyword search (not in semantic mode) - fuzzy matching with synonyms
    if (query && !semantic) {
      const q = query.toLowerCase();
      const searchTerms = this.expandWithSynonyms(q);

      result = result.filter((r) => {
        const title = r.title.toLowerCase();
        const description = r.description.toLowerCase();
        const tags = r.tags?.join(' ').toLowerCase() || '';
        const content = `${title} ${description} ${tags}`;

        // Check all search terms (original + synonyms)
        for (const term of searchTerms) {
          // Direct match
          if (title.includes(term) || description.includes(term) || tags.includes(term)) {
            return true;
          }
        }

        // Fuzzy match - check for partial word matches
        const queryWords = q.split(/\s+/);
        const contentWords = content.split(/\s+/);

        return queryWords.every(qWord =>
          contentWords.some(cWord =>
            cWord.includes(qWord) || qWord.includes(cWord) ||
            this.levenshteinDistance(qWord, cWord) <= 2
          )
        );
      });
    }

    // Sort
    result.sort((a, b) => {
      switch (sort) {
        case 'newest':
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case 'oldest':
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case 'az':
          return a.title.localeCompare(b.title);
        case 'popular':
          const aClicks = this.popularIds().has(a.id) ? 1 : 0;
          const bClicks = this.popularIds().has(b.id) ? 1 : 0;
          return bClicks - aClicks;
        default:
          return 0;
      }
    });

    return result;
  });

  // Fuzzy matching helper
  private levenshteinDistance(a: string, b: string): number {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix: number[][] = [];
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  // Computed: View Groups
  viewGroups = computed<ViewGroup[]>(() => {
    const semantic = this.isSemanticMode();
    const groups = this.semanticGroups();
    const query = this.searchQuery();
    const topic = this.selectedTopic();
    const filtered = this.filteredResources();
    const resources = this.displayResources();

    // Semantic mode with results
    if (semantic && groups) {
      return groups
        .map((group) => ({
          title: group.title,
          description: group.description,
          resources: group.resourceIds
            .map((id) => resources.find((r) => r.id === id))
            .filter(Boolean) as ResourceItem[],
        }))
        .filter((g) => g.resources.length > 0);
    }

    // Search results
    if (query && !semantic) {
      return [
        {
          title: 'Search Results',
          description: `Found ${filtered.length} matches for "${query}"`,
          resources: filtered,
        },
      ];
    }

    // Category filter
    if (topic !== 'All') {
      return [
        {
          title: topic,
          description: 'Resources in this category',
          resources: filtered,
        },
      ];
    }

    // Default: Group by category
    const categories = Object.values(ResourceCategory).filter((c) => c !== ResourceCategory.ALL);
    return categories
      .map((cat) => {
        const resourcesInCat = filtered.filter((r) => r.category === cat);
        return {
          title: cat,
          description: this.getCategoryDescription(cat),
          resources: resourcesInCat,
        };
      })
      .filter((g) => g.resources.length > 0);
  });

  // Get all topics for template
  topics = Object.values(ResourceCategory);

  // Get all types for template (excluding ALL)
  types = Object.values(ResourceType).filter((t) => t !== ResourceType.ALL);

  constructor(
    private resourceService: ResourceService,
    private searchService: SearchService,
    private translateService: TranslateService
  ) {
    // Cache English resources
    this.translationCache.set('en', []);
  }

  ngOnInit() {
    this.loadResources();
    this.loadPopularResources();
    this.loadFeaturedResources();
    this.loadTopics();
  }

  private loadResources() {
    this.resourceService.getResources().subscribe({
      next: (resources) => {
        this.displayResources.set(resources);
        this.translationCache.set('en', resources);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load resources:', err);
        this.isLoading.set(false);
      },
    });
  }

  private loadPopularResources() {
    this.resourceService.getPopularResources().subscribe({
      next: (ids) => {
        this.popularIds.set(new Set(ids));
      },
      error: (err) => console.error('Failed to load popular resources:', err),
    });
  }

  private loadFeaturedResources() {
    this.resourceService.getFeaturedResources().subscribe({
      next: (resources) => {
        this.featuredResources.set(resources);
        this.isFeaturedLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load featured resources:', err);
        this.isFeaturedLoading.set(false);
      },
    });
  }

  private loadTopics() {
    this.resourceService.getTopics().subscribe({
      next: (topics) => {
        this.topicsData.set(topics);
      },
      error: (err) => console.error('Failed to load topics:', err),
    });
  }

  handleLanguageChange(lang: Language) {
    this.isLangMenuOpen.set(false);
    if (lang === this.language()) return;
    this.language.set(lang);

    // Check cache first
    const cached = this.translationCache.get(lang);
    if (cached) {
      this.displayResources.set(cached);
      return;
    }

    // Translate using AI
    const originalResources = this.translationCache.get('en') || [];

    // Check if resources are loaded
    if (originalResources.length === 0) {
      console.warn('Resources not loaded yet - cannot translate');
      return;
    }

    this.aiState.update((state) => ({ ...state, isTranslating: true }));

    this.translateService.translateResources(originalResources, lang).subscribe({
      next: (translated) => {
        this.translationCache.set(lang, translated);
        this.displayResources.set(translated);
        this.aiState.update((state) => ({ ...state, isTranslating: false }));
      },
      error: (err) => {
        console.error('Translation failed:', err);
        this.aiState.update((state) => ({ ...state, isTranslating: false }));
      },
    });
  }

  handleSemanticSearch() {
    const query = this.searchQuery();
    if (!query.trim()) return;

    this.aiState.update((state) => ({ ...state, isSearching: true, error: null }));

    this.searchService.performSemanticSearch(query).subscribe({
      next: (groups) => {
        this.semanticGroups.set(groups);
        this.aiState.update((state) => ({ ...state, isSearching: false }));
      },
      error: (err) => {
        console.error('Semantic search failed:', err);
        this.aiState.update((state) => ({
          ...state,
          isSearching: false,
          error: 'AI Search failed. Try again.',
        }));
      },
    });
  }

  handleResourceInteract(id: string) {
    this.resourceService.trackInteraction(id).subscribe({
      next: () => {
        // Reload popular resources after interaction
        this.loadPopularResources();
      },
      error: (err) => console.error('Failed to track interaction:', err),
    });
  }

  toggleSemanticMode(isOn: boolean) {
    this.isSemanticMode.set(isOn);
    if (!isOn) {
      this.semanticGroups.set(null);
    }
  }

  resetFilters() {
    this.searchQuery.set('');
    this.selectedTopic.set('All');
    this.selectedType.set('All' as any);
    this.selectedTag.set(null);
    this.semanticGroups.set(null);
  }

  clearFilter(filterType: string) {
    switch (filterType) {
      case 'topic':
        this.selectedTopic.set('All');
        break;
      case 'type':
        this.selectedType.set('All' as any);
        break;
      case 'tag':
        this.selectedTag.set(null);
        break;
      case 'search':
        this.searchQuery.set('');
        break;
    }
  }

  handleFilterByType(type: string) {
    this.selectedType.set(type as ResourceType);
    this.scrollToFilters();
  }

  handleFilterByCategory(category: string) {
    this.selectedTopic.set(category);
    this.scrollToFilters();
  }

  handleFilterByTag(tag: string) {
    this.selectedTag.set(tag);
    this.scrollToFilters();
  }

  private scrollToFilters() {
    setTimeout(() => {
      document.getElementById('filters-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }

  onSearchKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && this.isSemanticMode()) {
      this.handleSemanticSearch();
    }
  }

  getFilterLabel(type: string): string {
    const filters = this.t().filters;
    switch (type) {
      case 'topic': return filters.topic;
      case 'type': return filters.type;
      case 'tag': return filters.tag;
      case 'search': return filters.search;
      default: return type;
    }
  }

  getTopicInitial(topic: string): string {
    return topic?.trim()?.charAt(0)?.toUpperCase() || 'T';
  }

  getTopicGradient(topic: string): string {
    const hash = topic.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    const hue = Math.abs(hash) % 360;
    return `linear-gradient(135deg, hsl(${hue}, 75%, 55%), hsl(${(hue + 40) % 360}, 70%, 45%))`;
  }

  private getCategoryDescription(cat: ResourceCategory): string {
    switch (cat) {
      case ResourceCategory.OC4IDS:
        return 'Standards, tools, and documentation for the Open Contracting for Infrastructure Data Standard.';
      case ResourceCategory.ASSURANCE:
        return 'Manuals and guides for conducting independent review and validation of infrastructure projects.';
      case ResourceCategory.INDEX:
        return 'Methodologies and calculation tools for the Infrastructure Transparency Index.';
      case ResourceCategory.GUIDANCE:
        return 'Best practices and detailed guidance notes for implementation and policy.';
      default:
        return 'Resources';
    }
  }
}
