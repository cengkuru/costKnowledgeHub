import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ResourceService } from './resource.service';
import { ResourceItem, ResourceCategory, ResourceType } from '../models/types';
import { provideHttpClient } from '@angular/common/http';

describe('ResourceService', () => {
  let service: ResourceService;
  let httpMock: HttpTestingController;
  const API_BASE = 'http://localhost:3000/api';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ResourceService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(ResourceService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify(); // Ensure no outstanding HTTP requests
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getResources', () => {
    it('should return resources from API', (done) => {
      const mockResources: ResourceItem[] = [
        {
          id: 'test-1',
          title: 'Test Resource',
          description: 'Test Description',
          url: 'https://test.com',
          category: ResourceCategory.OC4IDS,
          type: ResourceType.DOCUMENTATION,
          date: '2024-01-01'
        }
      ];

      service.getResources().subscribe(resources => {
        expect(resources).toEqual(mockResources);
        expect(resources.length).toBe(1);
        expect(resources[0].title).toBe('Test Resource');
        done();
      });

      const req = httpMock.expectOne(`${API_BASE}/resources`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResources);
    });

    it('should handle errors when fetching resources', (done) => {
      service.getResources().subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
          done();
        }
      });

      const req = httpMock.expectOne(`${API_BASE}/resources`);
      req.flush('Error fetching resources', { status: 500, statusText: 'Server Error' });
    });
  });

  describe('trackInteraction', () => {
    it('should send interaction to API', (done) => {
      const resourceId = 'test-1';
      const mockResponse = { success: true, clicks: 5 };

      service.trackInteraction(resourceId).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.success).toBe(true);
        expect(response.clicks).toBe(5);
        done();
      });

      const req = httpMock.expectOne(`${API_BASE}/interact/${resourceId}`);
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);
    });

    it('should handle errors when tracking interaction', (done) => {
      const resourceId = 'test-1';

      service.trackInteraction(resourceId).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
          done();
        }
      });

      const req = httpMock.expectOne(`${API_BASE}/interact/${resourceId}`);
      req.flush('Error tracking interaction', { status: 500, statusText: 'Server Error' });
    });
  });

  describe('getPopularResources', () => {
    it('should return popular resource IDs from API', (done) => {
      const mockPopularIds = ['res-1', 'res-2', 'res-3'];

      service.getPopularResources().subscribe(ids => {
        expect(ids).toEqual(mockPopularIds);
        expect(ids.length).toBe(3);
        done();
      });

      const req = httpMock.expectOne(`${API_BASE}/popular`);
      expect(req.request.method).toBe('GET');
      req.flush(mockPopularIds);
    });

    it('should handle errors when fetching popular resources', (done) => {
      service.getPopularResources().subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
          done();
        }
      });

      const req = httpMock.expectOne(`${API_BASE}/popular`);
      req.flush('Error fetching popular resources', { status: 500, statusText: 'Server Error' });
    });
  });
});
