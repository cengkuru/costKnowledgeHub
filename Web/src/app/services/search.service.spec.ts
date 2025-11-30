import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { SearchService } from './search.service';
import { SearchResultGroup } from '../models/types';
import { provideHttpClient } from '@angular/common/http';

describe('SearchService', () => {
  let service: SearchService;
  let httpMock: HttpTestingController;
  const API_BASE = 'http://localhost:3000/api';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        SearchService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(SearchService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('performSemanticSearch', () => {
    it('should return search result groups from API', (done) => {
      const query = 'How do I start implementing OC4IDS?';
      const mockResults: SearchResultGroup[] = [
        {
          title: 'Getting Started',
          description: 'Resources to help you begin your OC4IDS journey',
          resourceIds: ['oc-1', 'oc-2']
        },
        {
          title: 'Tools and Libraries',
          description: 'Software tools for working with OC4IDS data',
          resourceIds: ['oc-6', 'oc-7']
        }
      ];

      service.performSemanticSearch(query).subscribe(results => {
        expect(results).toEqual(mockResults);
        expect(results.length).toBe(2);
        expect(results[0].title).toBe('Getting Started');
        expect(results[0].resourceIds.length).toBe(2);
        done();
      });

      const req = httpMock.expectOne(`${API_BASE}/search`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ query });
      req.flush(mockResults);
    });

    it('should return empty array for no results', (done) => {
      const query = 'nonexistent query';

      service.performSemanticSearch(query).subscribe(results => {
        expect(results).toEqual([]);
        expect(results.length).toBe(0);
        done();
      });

      const req = httpMock.expectOne(`${API_BASE}/search`);
      req.flush([]);
    });

    it('should handle errors when searching', (done) => {
      const query = 'test query';

      service.performSemanticSearch(query).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
          done();
        }
      });

      const req = httpMock.expectOne(`${API_BASE}/search`);
      req.flush('Search error', { status: 500, statusText: 'Server Error' });
    });

    it('should handle empty query string', (done) => {
      const query = '';

      service.performSemanticSearch(query).subscribe(results => {
        expect(results).toEqual([]);
        done();
      });

      const req = httpMock.expectOne(`${API_BASE}/search`);
      req.flush([]);
    });
  });
});
