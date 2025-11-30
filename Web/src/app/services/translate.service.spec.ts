import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TranslateService } from './translate.service';
import { ResourceItem, Language, ResourceCategory, ResourceType } from '../models/types';
import { provideHttpClient } from '@angular/common/http';

describe('TranslateService', () => {
  let service: TranslateService;
  let httpMock: HttpTestingController;
  const API_BASE = 'http://localhost:3000/api';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        TranslateService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(TranslateService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('translateResources', () => {
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

    it('should return translated resources for Spanish', (done) => {
      const targetLang: Language = 'es';
      const mockTranslated: ResourceItem[] = [
        {
          ...mockResources[0],
          title: 'Recurso de Prueba',
          description: 'Descripción de Prueba'
        }
      ];

      service.translateResources(mockResources, targetLang).subscribe(translated => {
        expect(translated).toEqual(mockTranslated);
        expect(translated[0].title).toBe('Recurso de Prueba');
        done();
      });

      const req = httpMock.expectOne(`${API_BASE}/translate`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ targetLang });
      req.flush(mockTranslated);
    });

    it('should return translated resources for Portuguese', (done) => {
      const targetLang: Language = 'pt';
      const mockTranslated: ResourceItem[] = [
        {
          ...mockResources[0],
          title: 'Recurso de Teste',
          description: 'Descrição de Teste'
        }
      ];

      service.translateResources(mockResources, targetLang).subscribe(translated => {
        expect(translated).toEqual(mockTranslated);
        expect(translated[0].title).toBe('Recurso de Teste');
        done();
      });

      const req = httpMock.expectOne(`${API_BASE}/translate`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ targetLang });
      req.flush(mockTranslated);
    });

    it('should return original resources for English', (done) => {
      const targetLang: Language = 'en';

      service.translateResources(mockResources, targetLang).subscribe(translated => {
        expect(translated).toEqual(mockResources);
        done();
      });

      const req = httpMock.expectOne(`${API_BASE}/translate`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ targetLang });
      req.flush(mockResources);
    });

    it('should handle errors when translating', (done) => {
      const targetLang: Language = 'es';

      service.translateResources(mockResources, targetLang).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
          done();
        }
      });

      const req = httpMock.expectOne(`${API_BASE}/translate`);
      req.flush('Translation error', { status: 500, statusText: 'Server Error' });
    });
  });
});
