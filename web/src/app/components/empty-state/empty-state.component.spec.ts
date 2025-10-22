import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { EmptyState } from './empty-state';
import { QuickTopicsService, QuickTopic } from '../../core/quick-topics.service';
import { By } from '@angular/platform-browser';

describe('EmptyState Component', () => {
  let component: EmptyState;
  let fixture: ComponentFixture<EmptyState>;
  let quickTopicsService: QuickTopicsService;

  const mockTopics: QuickTopic[] = [
    { icon: '🏗️', topic: 'OC4IDS standard', category: 'Standards' },
    { icon: '📊', topic: 'Impact stories', category: 'Impact' },
    { icon: '🔍', topic: 'Infrastructure transparency', category: 'Transparency' },
    { icon: '✅', topic: 'Assurance processes', category: 'Assurance' },
    { icon: '🌍', topic: 'Country programmes', category: 'Countries' },
    { icon: '📈', topic: 'Project disclosure', category: 'Implementation' }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmptyState, HttpClientTestingModule],
      providers: [QuickTopicsService]
    }).compileComponents();

    fixture = TestBed.createComponent(EmptyState);
    component = fixture.componentInstance;
    quickTopicsService = TestBed.inject(QuickTopicsService);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Initialization', () => {
    it('should load topics on init', () => {
      const loadSpy = jest.spyOn(quickTopicsService, 'loadTopics');

      component.ngOnInit();

      expect(loadSpy).toHaveBeenCalled();
    });

    it('should transform topics to component format', () => {
      // Set mock topics in service
      quickTopicsService.topics.set(mockTopics);
      fixture.detectChanges();

      const quickTopics = component.quickTopics();

      expect(quickTopics.length).toBe(6);
      expect(quickTopics[0]).toEqual({
        label: 'OC4IDS standard',
        query: 'OC4IDS standard',
        icon: '🏗️',
        category: 'Standards'
      });
    });
  });

  describe('UI Rendering', () => {
    it('should display hero section with title and mission statement', () => {
      fixture.detectChanges();

      const title = fixture.debugElement.query(By.css('h1'));
      expect(title.nativeElement.textContent).toContain('ALFRED');

      const mission = fixture.debugElement.query(By.css('p.text-lg'));
      expect(mission.nativeElement.textContent).toContain('infrastructure transparency');
    });

    it('should display "Quick Explore" section header', () => {
      fixture.detectChanges();

      const sectionHeader = fixture.debugElement.query(By.css('p.uppercase'));
      expect(sectionHeader.nativeElement.textContent).toContain('Quick Explore');
    });

    it('should render topic pills when topics are loaded', () => {
      quickTopicsService.topics.set(mockTopics);
      quickTopicsService.loading.set(false);
      fixture.detectChanges();

      const topicButtons = fixture.debugElement.queryAll(By.css('.topic-pill'));

      expect(topicButtons.length).toBe(6);
      expect(topicButtons[0].nativeElement.textContent).toContain('🏗️');
      expect(topicButtons[0].nativeElement.textContent).toContain('OC4IDS standard');
    });

    it('should display loading skeletons when loading', () => {
      quickTopicsService.loading.set(true);
      fixture.detectChanges();

      const skeletons = fixture.debugElement.queryAll(By.css('.skeleton'));

      expect(skeletons.length).toBe(6);
    });

    it('should display error message when error occurs', () => {
      quickTopicsService.error.set('Failed to load topics');
      quickTopicsService.loading.set(false);
      fixture.detectChanges();

      const errorMsg = fixture.debugElement.query(By.css('.text-gray-500'));

      expect(errorMsg.nativeElement.textContent).toContain('Unable to load topics');
    });

    it('should have proper ARIA labels on topic buttons', () => {
      quickTopicsService.topics.set(mockTopics);
      quickTopicsService.loading.set(false);
      fixture.detectChanges();

      const firstButton = fixture.debugElement.query(By.css('.topic-pill'));

      expect(firstButton.nativeElement.getAttribute('aria-label')).toBe('Explore OC4IDS standard');
    });

    it('should have data-category attribute on topic buttons', () => {
      quickTopicsService.topics.set(mockTopics);
      quickTopicsService.loading.set(false);
      fixture.detectChanges();

      const buttons = fixture.debugElement.queryAll(By.css('.topic-pill'));

      expect(buttons[0].nativeElement.getAttribute('data-category')).toBe('Standards');
      expect(buttons[1].nativeElement.getAttribute('data-category')).toBe('Impact');
    });
  });

  describe('User Interactions', () => {
    it('should emit quickStartSelected when topic is clicked', () => {
      quickTopicsService.topics.set(mockTopics);
      quickTopicsService.loading.set(false);
      fixture.detectChanges();

      const emitSpy = jest.spyOn(component.quickStartSelected, 'emit');
      const firstButton = fixture.debugElement.query(By.css('.topic-pill'));

      firstButton.nativeElement.click();

      expect(emitSpy).toHaveBeenCalledWith('OC4IDS standard');
    });

    it('should call selectQuickTopic method with correct query', () => {
      quickTopicsService.topics.set(mockTopics);
      quickTopicsService.loading.set(false);
      fixture.detectChanges();

      const selectSpy = jest.spyOn(component, 'selectQuickTopic');
      const secondButton = fixture.debugElement.queryAll(By.css('.topic-pill'))[1];

      secondButton.nativeElement.click();

      expect(selectSpy).toHaveBeenCalledWith('Impact stories');
    });
  });

  describe('Design System Compliance', () => {
    it('should apply Jony Ive-inspired styling classes', () => {
      fixture.detectChanges();

      // Check for minimalist container
      const container = fixture.debugElement.query(By.css('.min-h-screen'));
      expect(container).toBeTruthy();

      // Check for elegant spacing
      const mainContent = fixture.debugElement.query(By.css('.space-y-12'));
      expect(mainContent).toBeTruthy();

      // Check for gradient overlays
      const gradientFade = fixture.debugElement.query(By.css('.gradient-fade'));
      expect(gradientFade).toBeTruthy();
    });

    it('should have proper typography hierarchy', () => {
      fixture.detectChanges();

      const title = fixture.debugElement.query(By.css('.font-extralight'));
      expect(title).toBeTruthy();

      const subtitle = fixture.debugElement.query(By.css('.font-light'));
      expect(subtitle).toBeTruthy();
    });

    it('should include micro-animations on hover', () => {
      quickTopicsService.topics.set(mockTopics);
      quickTopicsService.loading.set(false);
      fixture.detectChanges();

      const button = fixture.debugElement.query(By.css('.topic-pill'));
      const icon = button.query(By.css('.topic-icon'));

      expect(icon).toBeTruthy();
      expect(button.nativeElement.classList.contains('group')).toBe(true);
    });
  });

  describe('Loading Placeholders', () => {
    it('should generate 6 loading placeholders with varying widths', () => {
      expect(component.loadingPlaceholders.length).toBe(6);

      component.loadingPlaceholders.forEach(placeholder => {
        expect(placeholder.width).toBeGreaterThanOrEqual(120);
        expect(placeholder.width).toBeLessThanOrEqual(160);
      });
    });
  });

  describe('Accessibility', () => {
    it('should have keyboard navigable topic buttons', () => {
      quickTopicsService.topics.set(mockTopics);
      quickTopicsService.loading.set(false);
      fixture.detectChanges();

      const buttons = fixture.debugElement.queryAll(By.css('.topic-pill'));

      buttons.forEach(button => {
        // Buttons should be focusable
        expect(button.nativeElement.tabIndex).toBeGreaterThanOrEqual(0);

        // Should have focus-visible styles
        expect(button.nativeElement.classList.toString()).toContain('focus-visible');
      });
    });

    it('should have semantic HTML structure', () => {
      fixture.detectChanges();

      // Check for main heading
      const h1 = fixture.debugElement.query(By.css('h1'));
      expect(h1).toBeTruthy();

      // Check for buttons (not divs with click handlers)
      quickTopicsService.topics.set(mockTopics);
      quickTopicsService.loading.set(false);
      fixture.detectChanges();

      const buttons = fixture.debugElement.queryAll(By.css('button.topic-pill'));
      expect(buttons.length).toBe(6);
    });
  });
});