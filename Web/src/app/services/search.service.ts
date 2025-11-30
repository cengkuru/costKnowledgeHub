import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SearchResultGroup } from '../models/types';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  private readonly API_BASE = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  performSemanticSearch(query: string): Observable<SearchResultGroup[]> {
    return this.http.post<SearchResultGroup[]>(`${this.API_BASE}/search`, {
      query
    });
  }
}
