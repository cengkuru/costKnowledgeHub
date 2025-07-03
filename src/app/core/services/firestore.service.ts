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
  serverTimestamp,
  increment
} from '@angular/fire/firestore';
import { Resource, ResourceFilter } from '../models/resource.model';
import { Activity, ActivityFilter } from '../models/activity.model';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class FirestoreService {
  private firestore = inject(Firestore);
  private resourcesCollection: any;
  private activitiesCollection: any;

  constructor() {
    this.resourcesCollection = collection(this.firestore, 'resources');
    this.activitiesCollection = collection(this.firestore, 'activities');
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
  async getResources(filter?: ResourceFilter, pageSize: number = 20, lastDoc?: any): Promise<{
    resources: Resource[];
    hasMore: boolean;
    lastDocument?: any;
  }> {
    const constraints: any[] = [];

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
    let lastDocument: any | undefined;

    let index = 0;
    querySnapshot.forEach((doc: any) => {
      if (index < pageSize) {
        resources.push({ id: doc.id, ...doc.data() } as Resource);
        lastDocument = doc;
      }
      index++;
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
    const constraints: any[] = [
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
    querySnapshot.forEach((doc: any) => {
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

    querySnapshot.forEach((doc: any) => {
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

    const constraints: any[] = [
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

        querySnapshot.forEach((doc: any) => {
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
        resources.push({ ...data, id: doc.id });
      }
    });

    return resources;
  }

  /**
   * Get featured resources
   */
    async getFeaturedResources(limitCount: number = 6): Promise<Resource[]> {
    const q = query(
      this.resourcesCollection,
      where('status', '==', 'published'),
      where('featured', '==', true),
      orderBy('datePublished', 'desc'),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    const resources: Resource[] = [];

    querySnapshot.forEach((doc: any) => {
      resources.push({ id: doc.id, ...doc.data() } as Resource);
    });

    return resources;
  }

  /**
   * Activity Tracking Methods
   */

  /**
   * Create a new activity log
   */
  async createActivity(activity: Omit<Activity, 'id'>): Promise<string> {
    const activityData = {
      ...activity,
      timestamp: serverTimestamp()
    };

    const docRef = await addDoc(this.activitiesCollection, activityData);
    return docRef.id;
  }

  /**
   * Get activities with filters
   */
  async getActivities(filter?: ActivityFilter): Promise<Activity[]> {
    const constraints: any[] = [];

    // Apply filters
    if (filter) {
      if (filter.type && filter.type.length > 0) {
        constraints.push(where('type', 'in', filter.type));
      }

      if (filter.userId) {
        constraints.push(where('userId', '==', filter.userId));
      }

      if (filter.resourceId) {
        constraints.push(where('resourceId', '==', filter.resourceId));
      }

      if (filter.startDate) {
        constraints.push(where('timestamp', '>=', filter.startDate));
      }

      if (filter.endDate) {
        constraints.push(where('timestamp', '<=', filter.endDate));
      }
    }

    // Always order by timestamp descending
    constraints.push(orderBy('timestamp', 'desc'));

    // Apply limit
    const limitCount = filter?.limit || 50;
    constraints.push(limit(limitCount));

    const q = query(this.activitiesCollection, ...constraints);
    const querySnapshot = await getDocs(q);

    const activities: Activity[] = [];
    querySnapshot.forEach((doc: any) => {
      activities.push({ id: doc.id, ...doc.data() } as Activity);
    });

    return activities;
  }

  /**
   * Get activities for a specific resource
   */
  async getResourceActivities(resourceId: string, limitCount: number = 20): Promise<Activity[]> {
    const q = query(
      this.activitiesCollection,
      where('resourceId', '==', resourceId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    const activities: Activity[] = [];

    querySnapshot.forEach((doc: any) => {
      activities.push({ id: doc.id, ...doc.data() } as Activity);
    });

    return activities;
  }

  /**
   * Get user activities
   */
  async getUserActivities(userId: string, limitCount: number = 20): Promise<Activity[]> {
    const q = query(
      this.activitiesCollection,
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    const activities: Activity[] = [];

    querySnapshot.forEach((doc: any) => {
      activities.push({ id: doc.id, ...doc.data() } as Activity);
    });

    return activities;
  }

  /**
   * Clean up old activities (older than 30 days)
   * This should be run periodically via a Cloud Function
   */
  async cleanupOldActivities(): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const q = query(
      this.activitiesCollection,
      where('timestamp', '<', thirtyDaysAgo),
      limit(100) // Process in batches
    );

    const querySnapshot = await getDocs(q);
    let deletedCount = 0;

    const deletePromises: Promise<void>[] = [];
    querySnapshot.forEach((doc: any) => {
      deletePromises.push(deleteDoc(doc.ref));
      deletedCount++;
    });

    await Promise.all(deletePromises);
    return deletedCount;
  }
}
