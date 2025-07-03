import { Injectable } from '@angular/core';
import { Resource } from '../models/resource.model';

/**
 * Mock Firestore Service for demo purposes
 * This simulates Firestore operations without Firebase
 */
@Injectable({
  providedIn: 'root'
})
export class FirestoreService {
  private mockResources: Resource[] = [];
  
  constructor() {
    // Load mock data from localStorage or use defaults
    const saved = localStorage.getItem('mockResources');
    if (saved) {
      this.mockResources = JSON.parse(saved);
    }
  }
  
  async createResource(resource: Partial<Resource>, userId: string): Promise<string> {
    const newResource: Resource = {
      ...resource as Resource,
      id: `res-${Date.now()}`,
      createdBy: userId,
      createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
      updatedAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
      status: resource.status || 'draft',
      featured: resource.featured || false,
      views: 0,
      downloads: 0,
      analytics: {
        pageViews: 0,
        uniqueViews: 0,
        downloads: 0
      }
    };
    
    this.mockResources.push(newResource);
    this.saveToLocalStorage();
    
    return newResource.id;
  }
  
  async updateResource(id: string, updates: Partial<Resource>, userId: string): Promise<void> {
    const index = this.mockResources.findIndex(r => r.id === id);
    if (index !== -1) {
      this.mockResources[index] = {
        ...this.mockResources[index],
        ...updates,
        updatedBy: userId,
        updatedAt: { seconds: Date.now() / 1000, nanoseconds: 0 }
      };
      this.saveToLocalStorage();
    }
  }
  
  async deleteResource(id: string): Promise<void> {
    this.mockResources = this.mockResources.filter(r => r.id !== id);
    this.saveToLocalStorage();
  }
  
  async getResource(id: string): Promise<Resource | null> {
    return this.mockResources.find(r => r.id === id) || null;
  }
  
  async getResources(filter?: any, pageSize: number = 20): Promise<{
    resources: Resource[];
    hasMore: boolean;
  }> {
    let filtered = [...this.mockResources];
    
    // Apply basic filters
    if (filter?.type && filter.type.length > 0) {
      filtered = filtered.filter(r => filter.type.includes(r.type));
    }
    
    if (filter?.featured !== undefined) {
      filtered = filtered.filter(r => r.featured === filter.featured);
    }
    
    // Sort by date
    filtered.sort((a, b) => (b.datePublished?.seconds || 0) - (a.datePublished?.seconds || 0));
    
    return {
      resources: filtered.slice(0, pageSize),
      hasMore: filtered.length > pageSize
    };
  }
  
  async getPublishedResources(filter?: any, pageSize: number = 20): Promise<Resource[]> {
    const published = this.mockResources.filter(r => r.status === 'published');
    return published.slice(0, pageSize);
  }
  
  async publishResource(id: string, userId: string): Promise<void> {
    await this.updateResource(id, {
      status: 'published',
      publishedBy: userId,
      publishedAt: { seconds: Date.now() / 1000, nanoseconds: 0 }
    }, userId);
  }
  
  async unpublishResource(id: string, userId: string): Promise<void> {
    await this.updateResource(id, { status: 'unpublished' }, userId);
  }
  
  async incrementViews(id: string): Promise<void> {
    const resource = this.mockResources.find(r => r.id === id);
    if (resource) {
      resource.views = (resource.views || 0) + 1;
      if (resource.analytics) {
        resource.analytics.pageViews = (resource.analytics.pageViews || 0) + 1;
      }
      this.saveToLocalStorage();
    }
  }
  
  async incrementDownloads(id: string): Promise<void> {
    const resource = this.mockResources.find(r => r.id === id);
    if (resource) {
      resource.downloads = (resource.downloads || 0) + 1;
      if (resource.analytics) {
        resource.analytics.downloads = (resource.analytics.downloads || 0) + 1;
      }
      this.saveToLocalStorage();
    }
  }
  
  private saveToLocalStorage(): void {
    localStorage.setItem('mockResources', JSON.stringify(this.mockResources));
  }
}