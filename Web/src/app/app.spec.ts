import { TestBed, ComponentFixture } from '@angular/core/testing';
import { App } from './app';
import { ResourceService } from './services/resource.service';
import { SearchService } from './services/search.service';
import { TranslateService } from './services/translate.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { ResourceCategory, ResourceType } from './models/types';

describe('App', () => {
  let component: App;
  let fixture: ComponentFixture<App>;
  let resourceService: jasmine.SpyObj<ResourceService>;
  let searchService: jasmine.SpyObj<SearchService>;
  let translateService: jasmine.SpyObj<TranslateService>;

  const mockResources = [
    {
      id: 'oc-1',
      title: 'OC4IDS Documentation',
      description: 'The official standard documentation',
      url: 'https://standard.open-contracting.org',
      category: ResourceCategory.OC4IDS,
      type: ResourceType.DOCUMENTATION,
      date: '2023-10-15',
    },
    {
      id: 'as-1',
      title: 'Infrastructure Assurance Manual',
      description: 'Guidelines for conducting independent validation',
      url: 'https://infrastructuretransparency.org',
      category: ResourceCategory.ASSURANCE,
      type: ResourceType.GUIDE,
      date: '2024-02-15',
    },
  ];

  beforeEach(async () => {
    const resourceServiceSpy = jasmine.createSpyObj('ResourceService', [
      'getResources',
      'trackInteraction',
      'getPopularResources',
    ]);
    const searchServiceSpy = jasmine.createSpyObj('SearchService', ['performSemanticSearch']);
    const translateServiceSpy = jasmine.createSpyObj('TranslateService', ['translateResources']);

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ResourceService, useValue: resourceServiceSpy },
        { provide: SearchService, useValue: searchServiceSpy },
        { provide: TranslateService, useValue: translateServiceSpy },
      ],
    }).compileComponents();

    resourceService = TestBed.inject(ResourceService) as jasmine.SpyObj<ResourceService>;
    searchService = TestBed.inject(SearchService) as jasmine.SpyObj<SearchService>;
    translateService = TestBed.inject(TranslateService) as jasmine.SpyObj<TranslateService>;

    resourceService.getResources.and.returnValue(of(mockResources));
    resourceService.getPopularResources.and.returnValue(of(['oc-1']));

    fixture = TestBed.createComponent(App);
    component = fixture.componentInstance;
  });

  it('should create the app', () => {
    expect(component).toBeTruthy();
  });

  it('should load resources on init', (done) => {
    fixture.detectChanges();

    setTimeout(() => {
      expect(resourceService.getResources).toHaveBeenCalled();
      expect(component.displayResources()).toEqual(mockResources);
      done();
    }, 100);
  });

  it('should filter resources by category', () => {
    component.displayResources.set(mockResources);
    component.selectedTopic.set(ResourceCategory.OC4IDS);

    const filtered = component.filteredResources();
    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe('oc-1');
  });

  it('should filter resources by type', () => {
    component.displayResources.set(mockResources);
    component.selectedType.set(ResourceType.DOCUMENTATION);

    const filtered = component.filteredResources();
    expect(filtered.length).toBe(1);
    expect(filtered[0].type).toBe(ResourceType.DOCUMENTATION);
  });

  it('should filter resources by search query', () => {
    component.displayResources.set(mockResources);
    component.searchQuery.set('assurance');
    component.isSemanticMode.set(false);

    const filtered = component.filteredResources();
    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe('as-1');
  });

  it('should sort resources by newest first', () => {
    component.displayResources.set(mockResources);
    component.sortOrder.set('newest');

    const filtered = component.filteredResources();
    expect(filtered[0].id).toBe('as-1'); // 2024 date
    expect(filtered[1].id).toBe('oc-1'); // 2023 date
  });

  it('should sort resources alphabetically', () => {
    component.displayResources.set(mockResources);
    component.sortOrder.set('az');

    const filtered = component.filteredResources();
    expect(filtered[0].id).toBe('as-1'); // "I" comes before "O"
  });

  it('should handle language change', (done) => {
    const translatedResources = [{ ...mockResources[0], title: 'Documentación OC4IDS' }];
    translateService.translateResources.and.returnValue(of(translatedResources));

    component.displayResources.set(mockResources);
    component.handleLanguageChange('es');

    setTimeout(() => {
      expect(translateService.translateResources).toHaveBeenCalledWith(mockResources, 'es');
      expect(component.displayResources()[0].title).toBe('Documentación OC4IDS');
      expect(component.language()).toBe('es');
      done();
    }, 100);
  });

  it('should not translate when language is already selected', () => {
    component.language.set('es');
    component.handleLanguageChange('es');

    expect(translateService.translateResources).not.toHaveBeenCalled();
  });

  it('should perform semantic search', (done) => {
    const searchResults = [
      {
        title: 'Getting Started',
        description: 'Resources for beginners',
        resourceIds: ['oc-1'],
      },
    ];
    searchService.performSemanticSearch.and.returnValue(of(searchResults));

    component.searchQuery.set('how to start');
    component.handleSemanticSearch();

    setTimeout(() => {
      expect(searchService.performSemanticSearch).toHaveBeenCalledWith('how to start');
      expect(component.semanticGroups()).toEqual(searchResults);
      expect(component.aiState().isSearching).toBe(false);
      done();
    }, 100);
  });

  it('should handle semantic search error', (done) => {
    searchService.performSemanticSearch.and.returnValue(throwError(() => new Error('AI error')));

    component.searchQuery.set('test query');
    component.handleSemanticSearch();

    setTimeout(() => {
      expect(component.aiState().error).toBe('AI Search failed. Try again.');
      expect(component.aiState().isSearching).toBe(false);
      done();
    }, 100);
  });

  it('should track resource interaction', () => {
    resourceService.trackInteraction.and.returnValue(of({ success: true, clicks: 5 }));

    component.handleResourceInteract('oc-1');

    expect(resourceService.trackInteraction).toHaveBeenCalledWith('oc-1');
  });

  it('should load popular resources', (done) => {
    fixture.detectChanges();

    setTimeout(() => {
      expect(resourceService.getPopularResources).toHaveBeenCalled();
      expect(component.popularIds().has('oc-1')).toBe(true);
      done();
    }, 100);
  });

  it('should reset all filters', () => {
    component.searchQuery.set('test');
    component.selectedTopic.set(ResourceCategory.OC4IDS);
    component.selectedType.set(ResourceType.GUIDE);
    component.semanticGroups.set([]);

    component.resetFilters();

    expect(component.searchQuery()).toBe('');
    expect(component.selectedTopic()).toBe('All' as any);
    expect(component.selectedType()).toBe('All' as any);
    expect(component.semanticGroups()).toBeNull();
  });

  // Mobile-First Responsive Tests
  describe('Mobile Responsiveness', () => {
    it('should have proper viewport meta tag', () => {
      const viewportMeta = document.querySelector('meta[name="viewport"]');
      expect(viewportMeta).toBeTruthy();
      expect(viewportMeta?.getAttribute('content')).toContain('width=device-width');
      expect(viewportMeta?.getAttribute('content')).toContain('initial-scale=1');
    });

    it('should apply mobile-first touch target sizes (min 44x44px)', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement;

      // Check language selector button
      const langButton = compiled.querySelector('[aria-label="Select language"]');
      expect(langButton).toBeTruthy();
      expect(langButton?.classList.contains('min-h-[44px]')).toBe(true);

      // Check search toggle buttons
      const searchToggles = compiled.querySelectorAll('[aria-pressed]');
      searchToggles.forEach((button: Element) => {
        expect(button.classList.contains('min-h-[44px]')).toBe(true);
      });
    });

    it('should have ARIA labels for accessibility', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement;

      // Check navigation
      const nav = compiled.querySelector('nav');
      expect(nav?.getAttribute('role')).toBe('navigation');
      expect(nav?.getAttribute('aria-label')).toBe('Main navigation');

      // Check main content
      const main = compiled.querySelector('main');
      expect(main?.getAttribute('role')).toBe('main');

      // Check footer
      const footer = compiled.querySelector('footer');
      expect(footer?.getAttribute('role')).toBe('contentinfo');
    });

    it('should have proper form input labels', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement;

      const topicSelect = compiled.querySelector('select[aria-label="Filter by topic"]');
      expect(topicSelect).toBeTruthy();

      const typeSelect = compiled.querySelector('select[aria-label="Filter by type"]');
      expect(typeSelect).toBeTruthy();

      const sortSelect = compiled.querySelector('select[aria-label="Sort resources"]');
      expect(sortSelect).toBeTruthy();
    });

    it('should apply xs breakpoint styles for ultra-small devices', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement;

      // Check hero heading uses xs: breakpoint
      const heroHeading = compiled.querySelector('h1');
      expect(heroHeading?.classList.contains('xs:text-4xl')).toBe(true);

      // Check hero paragraph uses xs: breakpoint
      const heroDescription = compiled.querySelector('header p');
      expect(heroDescription?.classList.contains('xs:text-lg')).toBe(true);
    });

    it('should have responsive grid with mobile-first gap', () => {
      component.displayResources.set(mockResources);
      fixture.detectChanges();
      const compiled = fixture.nativeElement;

      const grid = compiled.querySelector('.grid');
      expect(grid?.classList.contains('gap-6')).toBe(true);
      expect(grid?.classList.contains('xs:gap-8')).toBe(true);
      expect(grid?.classList.contains('sm:gap-10')).toBe(true);
    });

    it('should have touch-optimized select inputs (min 48px height)', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement;

      const selects = compiled.querySelectorAll('select');
      selects.forEach((select: Element) => {
        expect(select.classList.contains('min-h-[48px]')).toBe(true);
      });
    });

    it('should have mobile-optimized search input', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement;

      const searchInput = compiled.querySelector('input[aria-label="Search resources"]');
      expect(searchInput).toBeTruthy();
      expect(searchInput?.classList.contains('min-h-[56px]')).toBe(true);
    });

    it('should apply proper spacing for mobile screens', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement;

      // Check hero section padding
      const header = compiled.querySelector('header');
      expect(header?.classList.contains('py-12')).toBe(true);
      expect(header?.classList.contains('xs:py-14')).toBe(true);

      // Check main content padding
      const main = compiled.querySelector('main');
      expect(main?.classList.contains('py-10')).toBe(true);
      expect(main?.classList.contains('xs:py-12')).toBe(true);
    });

    it('should have section headings with proper IDs for accessibility', () => {
      component.displayResources.set(mockResources);
      component.selectedTopic.set('All' as any);
      fixture.detectChanges();
      const compiled = fixture.nativeElement;

      const sections = compiled.querySelectorAll('section');
      sections.forEach((section: Element, index: number) => {
        const heading = section.querySelector('h2');
        expect(heading?.id).toBe(`section-title-${index}`);
        expect(section.getAttribute('aria-labelledby')).toBe(`section-title-${index}`);
      });
    });
  });

  // Performance Tests
  describe('Mobile Performance', () => {
    it('should have preconnect hints for external resources', () => {
      const preconnect = document.querySelector('link[rel="preconnect"][href*="unsplash"]');
      expect(preconnect).toBeTruthy();

      const dnsPrefetch = document.querySelector('link[rel="dns-prefetch"][href*="unsplash"]');
      expect(dnsPrefetch).toBeTruthy();
    });

    it('should have proper meta description for SEO', () => {
      const metaDescription = document.querySelector('meta[name="description"]');
      expect(metaDescription).toBeTruthy();
      expect(metaDescription?.getAttribute('content')).toContain('infrastructure transparency');
    });

    it('should have theme-color meta tag', () => {
      const themeColor = document.querySelector('meta[name="theme-color"]');
      expect(themeColor).toBeTruthy();
      expect(themeColor?.getAttribute('content')).toBe('#5B9FB5');
    });
  });
});
