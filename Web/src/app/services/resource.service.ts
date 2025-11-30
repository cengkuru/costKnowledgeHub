import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ResourceItem } from '../models/types';
import { environment } from '../../environments/environment';

export interface FeaturedResource extends ResourceItem {
  featured?: boolean;
  tags?: string[];
}

export interface TopicInfo {
  name: string;
  slug: string;
  description: string;
  image: string | null;
  resourceCount: number;
}

@Injectable({
  providedIn: 'root'
})
export class ResourceService {
  private readonly API_BASE = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  getResources(): Observable<ResourceItem[]> {
    return this.http.get<ResourceItem[]>(`${this.API_BASE}/resources`);
  }

  getResourceById(id: string): Observable<ResourceItem> {
    return this.http.get<ResourceItem>(`${this.API_BASE}/resources/${id}`);
  }

  getFeaturedResources(): Observable<FeaturedResource[]> {
    return this.http.get<FeaturedResource[]>(`${this.API_BASE}/featured`);
  }

  trackInteraction(resourceId: string): Observable<{ success: boolean; clicks: number }> {
    return this.http.post<{ success: boolean; clicks: number }>(
      `${this.API_BASE}/interact/${resourceId}`,
      {}
    );
  }

  getPopularResources(): Observable<string[]> {
    return this.http.get<string[]>(`${this.API_BASE}/popular`);
  }

  getTopics(): Observable<TopicInfo[]> {
    return this.http.get<TopicInfo[]>(`${this.API_BASE}/topics`);
  }
}
