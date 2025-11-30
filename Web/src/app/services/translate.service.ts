import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ResourceItem, Language } from '../models/types';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TranslateService {
  private readonly API_BASE = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  translateResources(resources: ResourceItem[], targetLang: Language): Observable<ResourceItem[]> {
    return this.http.post<ResourceItem[]>(`${this.API_BASE}/translate`, {
      targetLang
    });
  }
}
