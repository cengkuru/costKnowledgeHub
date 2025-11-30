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
   * @param semantic Enable semantic search (AI-powered) for better results
   */
  listResources(
    page: number = 1,
    limit: number = 20,
    filters?: Record<string, string>,
    semantic: boolean = false
  ): Observable<PaginatedResponse<AdminResource>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (semantic) {
      params = params.set('semantic', 'true');
    }

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

  // ==================== Resource Cover Images ====================

  /**
   * Regenerate AI cover image for a resource
   */
  regenerateResourceCover(id: string): Observable<AdminResource> {
    return this.http.post<AdminResource>(`${this.apiUrl}/admin/resources/${id}/regenerate-cover`, {});
  }

  /**
   * Upload a cover image for a resource
   */
  uploadResourceCover(id: string, file: File): Observable<AdminResource> {
    const formData = new FormData();
    formData.append('cover', file);
    return this.http.post<AdminResource>(`${this.apiUrl}/admin/resources/${id}/upload-cover`, formData);
  }

  /**
   * Delete cover image from a resource
   */
  deleteResourceCover(id: string): Observable<AdminResource> {
    return this.http.delete<AdminResource>(`${this.apiUrl}/admin/resources/${id}/cover`);
  }

  // ==================== AI Tag Suggestions ====================

  /**
   * Suggest tags for a resource using AI
   */
  suggestTags(title: string, description: string): Observable<{ tags: string[] }> {
    return this.http.post<{ tags: string[] }>(`${this.apiUrl}/admin/resources/suggest-tags`, { title, description });
  }

  // ==================== AI Description Management ====================

  /**
   * Generate AI description for a single resource
   */
  generateDescription(id: string): Observable<{ message: string; description: string; source: string }> {
    return this.http.post<{ message: string; description: string; source: string }>(
      `${this.apiUrl}/admin/resources/${id}/generate-description`,
      {}
    );
  }

  /**
   * Toggle description lock for a resource
   */
  toggleDescriptionLock(id: string, locked: boolean): Observable<{ message: string; locked: boolean }> {
    return this.http.post<{ message: string; locked: boolean }>(
      `${this.apiUrl}/admin/resources/${id}/lock-description`,
      { locked }
    );
  }

  /**
   * Generate descriptions for all resources missing them (batch operation)
   */
  batchGenerateDescriptions(): Observable<{ message: string; processed: number; failed: number; errors: string[] }> {
    return this.http.post<{ message: string; processed: number; failed: number; errors: string[] }>(
      `${this.apiUrl}/admin/resources/batch-generate-descriptions`,
      {}
    );
  }

  /**
   * Get description statistics
   */
  getDescriptionStats(): Observable<{
    total: number;
    withDescription: number;
    withoutDescription: number;
    locked: number;
    aiGenerated: number;
    manual: number;
    discovery: number;
  }> {
    return this.http.get<{
      total: number;
      withDescription: number;
      withoutDescription: number;
      locked: number;
      aiGenerated: number;
      manual: number;
      discovery: number;
    }>(`${this.apiUrl}/admin/resources/description-stats`);
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

  // ==================== Scheduled Jobs ====================

  /**
   * Manually trigger the description fill job
   */
  runDescriptionFillJob(): Observable<{ message: string; processed: number; failed: number; skipped: number }> {
    return this.http.post<{ message: string; processed: number; failed: number; skipped: number }>(
      `${this.apiUrl}/admin/jobs/fill-descriptions`,
      {}
    );
  }

  // ==================== Resource Cleanup ====================

  /**
   * Validate resource URLs and find broken links (dry run)
   */
  validateResourceUrls(): Observable<{ broken: { _id: string; title: string; url: string; error: string }[]; total: number }> {
    return this.http.get<{ broken: { _id: string; title: string; url: string; error: string }[]; total: number }>(
      `${this.apiUrl}/admin/resources/validate-urls`
    );
  }

  /**
   * Cleanup broken resources (archive or delete)
   */
  cleanupBrokenResources(action: 'archive' | 'delete'): Observable<{ message: string; processed: number; failed: number; errors: string[] }> {
    return this.http.post<{ message: string; processed: number; failed: number; errors: string[] }>(
      `${this.apiUrl}/admin/resources/cleanup-broken`,
      { confirm: true, action }
    );
  }

  // ==================== User Management ====================

  /**
   * List all users
   */
  listUsers(): Observable<{ data: any[]; total: number }> {
    return this.http.get<{ data: any[]; total: number }>(`${this.apiUrl}/admin/users`);
  }

  /**
   * Create a new admin user
   */
  createUser(email: string, name: string, sendEmail: boolean = true): Observable<{ message: string; user: any; emailSent: boolean; temporaryPassword?: string }> {
    return this.http.post<{ message: string; user: any; emailSent: boolean; temporaryPassword?: string }>(
      `${this.apiUrl}/admin/users`,
      { email, name, sendEmail }
    );
  }

  /**
   * Update user role
   */
  updateUserRole(userId: string, role: 'admin' | 'user'): Observable<{ message: string; user: any }> {
    return this.http.put<{ message: string; user: any }>(`${this.apiUrl}/admin/users/${userId}/role`, { role });
  }

  /**
   * Resend welcome email with new temporary password
   */
  resendWelcomeEmail(userId: string): Observable<{ message: string; emailSent: boolean; temporaryPassword?: string }> {
    return this.http.post<{ message: string; emailSent: boolean; temporaryPassword?: string }>(
      `${this.apiUrl}/admin/users/${userId}/resend-welcome`,
      {}
    );
  }

  /**
   * Delete a user
   */
  deleteUser(userId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/admin/users/${userId}`);
  }

  // ==================== User Credentials ====================

  /**
   * Update user password
   */
  updatePassword(currentPassword: string, newPassword: string): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/auth/password`, {
      currentPassword,
      newPassword
    });
  }

  /**
   * Update user email
   */
  updateEmail(email: string, currentPassword: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/auth/email`, {
      email,
      currentPassword
    });
  }

  // ==================== Usage Analytics ====================

  /**
   * Get quick usage stats for dashboard
   */
  getUsageQuickStats(): Observable<{
    today: { events: number; users: number; searches: number };
    thisWeek: { events: number; users: number; searches: number };
    thisMonth: { events: number; users: number; searches: number };
  }> {
    return this.http.get<{
      today: { events: number; users: number; searches: number };
      thisWeek: { events: number; users: number; searches: number };
      thisMonth: { events: number; users: number; searches: number };
    }>(`${this.apiUrl}/admin/usage/stats`);
  }

  /**
   * Get detailed usage analytics
   */
  getUsageAnalytics(startDate?: string, endDate?: string): Observable<any> {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);
    return this.http.get<any>(`${this.apiUrl}/admin/usage/analytics`, { params });
  }

  /**
   * Get recent activity feed
   */
  getRecentActivity(limit: number = 50): Observable<{ data: any[]; total: number }> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<{ data: any[]; total: number }>(`${this.apiUrl}/admin/usage/recent`, { params });
  }
}
