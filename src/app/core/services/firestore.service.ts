import { Injectable, inject } from '@angular/core';
import { 
  Firestore, 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc,
  getDocs,
  query, 
  where, 
  orderBy, 
  limit,
  startAfter,
  DocumentData,
  QueryConstraint,
  CollectionReference,
  DocumentReference,
  Timestamp as FirestoreTimestamp,
  serverTimestamp,
  increment
} from '@angular/fire/firestore';
import { Resource, ResourceFilter } from '../models/resource.model';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class FirestoreService {
  private firestore = inject(Firestore);
  private resourcesCollection: CollectionReference;
  
  constructor() {
    this.resourcesCollection = collection(this.firestore, 'resources');
  }
  
  /**
   * Create a new resource
   */
  async createResource(resource: Partial<Resource>, userId: string): Promise<string> {
    const resourceData = {
      ...resource,
      createdBy: userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
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
    
    const docRef = await addDoc(this.resourcesCollection, resourceData);
    return docRef.id;
  }
  
  /**
   * Update an existing resource
   */
  async updateResource(id: string, updates: Partial<Resource>, userId: string): Promise<void> {
    const docRef = doc(this.firestore, 'resources', id);
    const updateData = {
      ...updates,
      updatedBy: userId,
      updatedAt: serverTimestamp()
    };
    
    await updateDoc(docRef, updateData);
  }
  
  /**
   * Delete a resource
   */
  async deleteResource(id: string): Promise<void> {
    const docRef = doc(this.firestore, 'resources', id);
    await deleteDoc(docRef);
  }
  
  /**
   * Get a single resource by ID
   */
  async getResource(id: string): Promise<Resource | null> {
    const docRef = doc(this.firestore, 'resources', id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Resource;
    }
    
    return null;
  }
  
  /**
   * Get resources with filters
   */
  async getResources(filter?: ResourceFilter, pageSize: number = 20, lastDoc?: DocumentData): Promise<{
    resources: Resource[];
    hasMore: boolean;
    lastDocument?: DocumentData;
  }> {
    const constraints: QueryConstraint[] = [];
    
    // Apply filters
    if (filter) {
      if (filter.type && filter.type.length > 0) {
        constraints.push(where('type', 'in', filter.type));
      }
      
      if (filter.featured !== undefined) {
        constraints.push(where('featured', '==', filter.featured));
      }
      
      if (filter.language && filter.language.length > 0) {
        constraints.push(where('language', 'in', filter.language));
      }
      
      if (filter.country && filter.country.length > 0) {
        constraints.push(where('country', 'in', filter.country));
      }
    }
    
    // Add ordering and pagination
    constraints.push(orderBy('datePublished', 'desc'));
    constraints.push(limit(pageSize + 1)); // Get one extra to check if there are more
    
    if (lastDoc) {
      constraints.push(startAfter(lastDoc));
    }
    
    const q = query(this.resourcesCollection, ...constraints);
    const querySnapshot = await getDocs(q);
    
    const resources: Resource[] = [];
    let lastDocument: DocumentData | undefined;
    
    querySnapshot.forEach((doc, index) => {
      if (index < pageSize) {
        resources.push({ id: doc.id, ...doc.data() } as Resource);
        lastDocument = doc;
      }
    });
    
    return {
      resources,
      hasMore: querySnapshot.size > pageSize,
      lastDocument
    };
  }
  
  /**
   * Get published resources only (for public view)
   */
  async getPublishedResources(filter?: ResourceFilter, pageSize: number = 20): Promise<Resource[]> {
    const constraints: QueryConstraint[] = [
      where('status', '==', 'published')
    ];
    
    // Apply additional filters
    if (filter) {
      if (filter.type && filter.type.length > 0) {
        constraints.push(where('type', 'in', filter.type));
      }
      
      if (filter.featured !== undefined) {
        constraints.push(where('featured', '==', filter.featured));
      }
    }
    
    constraints.push(orderBy('datePublished', 'desc'));
    constraints.push(limit(pageSize));
    
    const q = query(this.resourcesCollection, ...constraints);
    const querySnapshot = await getDocs(q);
    
    const resources: Resource[] = [];
    querySnapshot.forEach((doc) => {
      resources.push({ id: doc.id, ...doc.data() } as Resource);
    });
    
    return resources;
  }
  
  /**
   * Publish a resource
   */
  async publishResource(id: string, userId: string): Promise<void> {
    const docRef = doc(this.firestore, 'resources', id);
    await updateDoc(docRef, {
      status: 'published',
      publishedBy: userId,
      publishedAt: serverTimestamp(),
      updatedBy: userId,
      updatedAt: serverTimestamp()
    });
  }
  
  /**
   * Unpublish a resource
   */
  async unpublishResource(id: string, userId: string): Promise<void> {
    const docRef = doc(this.firestore, 'resources', id);
    await updateDoc(docRef, {
      status: 'unpublished',
      updatedBy: userId,
      updatedAt: serverTimestamp()
    });
  }
  
  /**
   * Increment view count
   */
  async incrementViews(id: string): Promise<void> {
    const docRef = doc(this.firestore, 'resources', id);
    await updateDoc(docRef, {
      views: increment(1),
      'analytics.pageViews': increment(1),
      'analytics.lastViewedAt': serverTimestamp()
    });
  }
  
  /**
   * Increment download count
   */
  async incrementDownloads(id: string): Promise<void> {
    const docRef = doc(this.firestore, 'resources', id);
    await updateDoc(docRef, {
      downloads: increment(1),
      'analytics.downloads': increment(1)
    });
  }
  
  /**
   * Get resources by user
   */
  async getResourcesByUser(userId: string): Promise<Resource[]> {
    const q = query(
      this.resourcesCollection,
      where('createdBy', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const resources: Resource[] = [];
    
    querySnapshot.forEach((doc) => {
      resources.push({ id: doc.id, ...doc.data() } as Resource);
    });
    
    return resources;
  }
  
  /**
   * Search resources by text
   */
  async searchResources(searchQuery: string, language?: string): Promise<Resource[]> {
    // Note: For full-text search, you would typically use a dedicated search service
    // like Algolia or ElasticSearch. This is a simple implementation.
    
    const constraints: QueryConstraint[] = [
      where('status', '==', 'published')
    ];
    
    if (language) {
      constraints.push(where('language', '==', language));
    }
    
    constraints.push(orderBy('datePublished', 'desc'));
    constraints.push(limit(50));
    
    const q = query(this.resourcesCollection, ...constraints);
    const querySnapshot = await getDocs(q);
    
    const resources: Resource[] = [];
    const searchLower = searchQuery.toLowerCase();
    
    querySnapshot.forEach((doc) => {
      const data = doc.data() as Resource;
      
      // Simple text matching - in production, use proper search indexing
      const titleMatch = Object.values(data.title).some(t => 
        t.toLowerCase().includes(searchLower)
      );
      const descMatch = Object.values(data.description).some(d => 
        d.toLowerCase().includes(searchLower)
      );
      const tagMatch = data.tags.some(tag => 
        tag.toLowerCase().includes(searchLower)
      );
      
      if (titleMatch || descMatch || tagMatch) {
        resources.push({ id: doc.id, ...data });
      }
    });
    
    return resources;
  }
  
  /**
   * Get featured resources
   */
  async getFeaturedResources(limit: number = 6): Promise<Resource[]> {
    const q = query(
      this.resourcesCollection,
      where('status', '==', 'published'),
      where('featured', '==', true),
      orderBy('datePublished', 'desc'),
      limit(limit)
    );
    
    const querySnapshot = await getDocs(q);
    const resources: Resource[] = [];
    
    querySnapshot.forEach((doc) => {
      resources.push({ id: doc.id, ...doc.data() } as Resource);
    });
    
    return resources;
  }
}