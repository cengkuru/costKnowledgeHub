import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  AdminResource,
  Category,
  Topic,
  DeleteTopicResponse,
  ResourceTypeEntity,
  PaginatedResponse,
  DashboardStats
} from '../models/admin-types';

@Injectable({
  providedIn: 'root'
})
export class AdminApiService {
  private apiUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  // ==================== Resources ====================

  /**
   * List resources with pagination and filters
   */
  listResources(
    page: number = 1,
    limit: number = 20,
    filters?: Record<string, string>
  ): Observable<PaginatedResponse<AdminResource>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          params = params.set(key, value);
        }
      });
    }

    return this.http.get<PaginatedResponse<AdminResource>>(`${this.apiUrl}/admin/resources`, { params });
  }

  /**
   * Get a single resource by ID
   */
  getResource(id: string): Observable<AdminResource> {
    return this.http.get<AdminResource>(`${this.apiUrl}/admin/resources/${id}`);
  }

  /**
   * Create a new resource
   */
  createResource(data: Partial<AdminResource>): Observable<AdminResource> {
    return this.http.post<AdminResource>(`${this.apiUrl}/admin/resources`, data);
  }

  /**
   * Update an existing resource
   */
  updateResource(id: string, data: Partial<AdminResource>): Observable<AdminResource> {
    return this.http.put<AdminResource>(`${this.apiUrl}/admin/resources/${id}`, data);
  }

  /**
   * Update resource status
   */
  updateResourceStatus(id: string, status: string, reason?: string): Observable<AdminResource> {
    return this.http.post<AdminResource>(`${this.apiUrl}/admin/resources/${id}/status`, { status, reason });
  }

  /**
   * Delete a resource
   */
  deleteResource(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/admin/resources/${id}`);
  }

  /**
   * Get dashboard stats
   */
  getDashboardStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.apiUrl}/admin/stats`);
  }

  // ==================== Categories ====================

  /**
   * List all categories
   */
  listCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.apiUrl}/admin/categories`);
  }

  /**
   * Create a new category
   */
  createCategory(data: Partial<Category>): Observable<Category> {
    return this.http.post<Category>(`${this.apiUrl}/admin/categories`, data);
  }

  /**
   * Update a category
   */
  updateCategory(id: string, data: Partial<Category>): Observable<Category> {
    return this.http.put<Category>(`${this.apiUrl}/admin/categories/${id}`, data);
  }

  /**
   * Delete a category
   */
  deleteCategory(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/admin/categories/${id}`);
  }

  // ==================== Topics ====================

  /**
   * List all topics
   * @param includeInactive If true, includes unpublished/inactive topics (for admin views)
   */
  listTopics(includeInactive: boolean = false): Observable<Topic[]> {
    const params = includeInactive ? new HttpParams().set('includeInactive', 'true') : undefined;
    return this.http.get<{ data: Topic[] }>(`${this.apiUrl}/admin/topics`, { params }).pipe(
      map(response => response.data)
    );
  }

  /**
   * Create a new topic
   */
  createTopic(data: Partial<Topic>): Observable<Topic> {
    return this.http.post<Topic>(`${this.apiUrl}/admin/topics`, data);
  }

  /**
   * Update a topic
   */
  updateTopic(id: string, data: Partial<Topic>): Observable<Topic> {
    return this.http.put<Topic>(`${this.apiUrl}/admin/topics/${id}`, data);
  }

  /**
   * Delete a topic and reassign its resources to the default topic
   */
  deleteTopic(id: string): Observable<DeleteTopicResponse> {
    return this.http.delete<DeleteTopicResponse>(`${this.apiUrl}/admin/topics/${id}`);
  }

  /**
   * Regenerate AI image for a topic
   */
  regenerateTopicImage(id: string): Observable<Topic> {
    return this.http.post<Topic>(`${this.apiUrl}/admin/topics/${id}/regenerate-image`, {});
  }

  // ==================== Resource Types ====================

  /**
   * List all resource types
   */
  listResourceTypes(): Observable<ResourceTypeEntity[]> {
    return this.http.get<{ data: ResourceTypeEntity[] }>(`${this.apiUrl}/admin/types`).pipe(
      map(response => response.data)
    );
  }

  /**
   * Create a new resource type
   */
  createResourceType(data: Partial<ResourceTypeEntity>): Observable<ResourceTypeEntity> {
    return this.http.post<ResourceTypeEntity>(`${this.apiUrl}/admin/types`, data);
  }

  /**
   * Update a resource type
   */
  updateResourceType(id: string, data: Partial<ResourceTypeEntity>): Observable<ResourceTypeEntity> {
    return this.http.put<ResourceTypeEntity>(`${this.apiUrl}/admin/types/${id}`, data);
  }

  /**
   * Delete a resource type
   */
  deleteResourceType(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/admin/types/${id}`);
  }

  /**
   * Regenerate SVG icon for a resource type
   */
  regenerateTypeIcon(id: string): Observable<ResourceTypeEntity> {
    return this.http.post<ResourceTypeEntity>(`${this.apiUrl}/admin/types/${id}/regenerate-icon`, {});
  }
}
