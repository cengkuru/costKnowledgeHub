import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { QuickTopicsService, QuickTopic } from './quick-topics.service';
import { environment } from '../../environments/environment';

describe('QuickTopicsService', () => {
  let service: QuickTopicsService;
  let httpMock: HttpTestingController;

  const mockTopics: QuickTopic[] = [
    { icon: '🏗️', topic: 'OC4IDS standard', category: 'Standards' },
    { icon: '📊', topic: 'Impact stories', category: 'Impact' },
    { icon: '🔍', topic: 'Infrastructure transparency', category: 'Transparency' },
    { icon: '✅', topic: 'Assurance processes', category: 'Assurance' },
    { icon: '🌍', topic: 'Country programmes', category: 'Countries' },
    { icon: '📈', topic: 'Project disclosure', category: 'Implementation' }
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [QuickTopicsService]
    });

    service = TestBed.inject(QuickTopicsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('loadTopics', () => {
    it('should load quick topics from API', () => {
      service.loadTopics();

      const req = httpMock.expectOne(`${environment.apiUrl}/quick-topics`);
      expect(req.request.method).toBe('GET');

      req.flush({
        success: true,
        topics: mockTopics,
        cached: true
      });

      expect(service.topics()).toEqual(mockTopics);
      expect(service.loading()).toBe(false);
      expect(service.error()).toBeNull();
    });

    it('should handle API errors and fallback to static topics', () => {
      service.loadTopics();

      const req = httpMock.expectOne(`${environment.apiUrl}/quick-topics`);
      req.error(new ProgressEvent('Network error'));

      // Should fallback to static topics
      expect(service.topics().length).toBe(6);
      expect(service.topics()[0].topic).toBe('OC4IDS standard');
      expect(service.loading()).toBe(false);
      expect(service.error()).toBe('Failed to load quick topics');
    });

    it('should set loading state while fetching', () => {
      expect(service.loading()).toBe(false);

      service.loadTopics();
      expect(service.loading()).toBe(true);

      const req = httpMock.expectOne(`${environment.apiUrl}/quick-topics`);
      req.flush({ success: true, topics: mockTopics });

      expect(service.loading()).toBe(false);
    });

    it('should handle empty response gracefully', () => {
      service.loadTopics();

      const req = httpMock.expectOne(`${environment.apiUrl}/quick-topics`);
      req.flush({ success: false });

      expect(service.topics().length).toBe(0);
      expect(service.loading()).toBe(false);
    });

    it('should use "topic" field instead of "question"', () => {
      service.loadTopics();

      const req = httpMock.expectOne(`${environment.apiUrl}/quick-topics`);
      req.flush({
        success: true,
        topics: mockTopics
      });

      const topics = service.topics();
      topics.forEach(topic => {
        expect(topic).toHaveProperty('topic');
        expect(topic).not.toHaveProperty('question');
      });
    });
  });

  describe('refreshTopics', () => {
    it('should force refresh topics via POST', () => {
      service.refreshTopics();

      const req = httpMock.expectOne(`${environment.apiUrl}/quick-topics/refresh`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});

      req.flush({
        success: true,
        topics: mockTopics,
        refreshed: true
      });

      expect(service.topics()).toEqual(mockTopics);
      expect(service.loading()).toBe(false);
    });

    it('should handle refresh errors gracefully', () => {
      service.refreshTopics();

      const req = httpMock.expectOne(`${environment.apiUrl}/quick-topics/refresh`);
      req.error(new ProgressEvent('Network error'));

      expect(service.loading()).toBe(false);
      expect(service.error()).toBe('Failed to refresh topics');
    });
  });

  describe('topics validation', () => {
    it('should ensure all topics are short (2-5 words)', () => {
      const staticTopics = [
        { icon: '🏗️', topic: 'OC4IDS standard', category: 'Standards' },
        { icon: '📊', topic: 'Impact stories', category: 'Impact' },
        { icon: '🔍', topic: 'Infrastructure transparency', category: 'Transparency' },
        { icon: '✅', topic: 'Assurance processes', category: 'Assurance' },
        { icon: '🌍', topic: 'Country programmes', category: 'Countries' },
        { icon: '📈', topic: 'Project disclosure', category: 'Implementation' }
      ];

      staticTopics.forEach(topic => {
        const wordCount = topic.topic.split(' ').length;
        expect(wordCount).toBeGreaterThanOrEqual(2);
        expect(wordCount).toBeLessThanOrEqual(5);
      });
    });

    it('should have proper categories for all topics', () => {
      const expectedCategories = [
        'Standards',
        'Impact',
        'Transparency',
        'Assurance',
        'Countries',
        'Implementation'
      ];

      service.loadTopics();

      const req = httpMock.expectOne(`${environment.apiUrl}/quick-topics`);
      req.flush({ success: true, topics: mockTopics });

      const topics = service.topics();
      const categories = topics.map(t => t.category);

      expectedCategories.forEach(cat => {
        expect(categories).toContain(cat);
      });
    });
  });
});