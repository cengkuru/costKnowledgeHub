import { Injectable, inject } from '@angular/core';
import { Observable, BehaviorSubject, map, tap, switchMap } from 'rxjs';
import { SettingsService } from '../../admin/components/settings/services/settings.service';
import { ResourceTypeSettings } from '../../admin/components/settings/models/settings.model';

@Injectable({
  providedIn: 'root'
})
export class ResourceTypeService {
  private settingsService = inject(SettingsService);
  
  private resourceTypesSubject = new BehaviorSubject<ResourceTypeSettings[]>([]);
  public resourceTypes$ = this.resourceTypesSubject.asObservable();
  
  private enabledResourceTypesSubject = new BehaviorSubject<ResourceTypeSettings[]>([]);
  public enabledResourceTypes$ = this.enabledResourceTypesSubject.asObservable();
  
  constructor() {
    this.initializeResourceTypes();
  }
  
  /**
   * Initialize resource types from settings
   */
  private initializeResourceTypes(): void {
    this.settingsService.getResourceTypes().pipe(
      tap(types => {
        this.resourceTypesSubject.next(types);
        this.enabledResourceTypesSubject.next(types.filter(t => t.enabled));
      })
    ).subscribe();
    
    // Subscribe to settings changes
    this.settingsService.settings$.pipe(
      switchMap(() => this.settingsService.getResourceTypes()),
      tap(types => {
        this.resourceTypesSubject.next(types);
        this.enabledResourceTypesSubject.next(types.filter(t => t.enabled));
      })
    ).subscribe();
  }
  
  /**
   * Get all resource types
   */
  getResourceTypes(): Observable<ResourceTypeSettings[]> {
    return this.resourceTypes$;
  }
  
  /**
   * Get enabled resource types only
   */
  getEnabledResourceTypes(): Observable<ResourceTypeSettings[]> {
    return this.enabledResourceTypes$;
  }
  
  /**
   * Get resource type by ID
   */
  getResourceTypeById(id: string): Observable<ResourceTypeSettings | undefined> {
    return this.resourceTypes$.pipe(
      map(types => types.find(t => t.id === id))
    );
  }
  
  /**
   * Get resource type options for dropdowns
   */
  getResourceTypeOptions(): Observable<{ value: string; label: string; icon?: string }[]> {
    return this.enabledResourceTypes$.pipe(
      map(types => types
        .sort((a, b) => a.order - b.order)
        .map(type => ({
          value: type.id,
          label: type.label,
          icon: type.icon
        }))
      )
    );
  }
  
  /**
   * Check if a resource type is enabled
   */
  isResourceTypeEnabled(id: string): Observable<boolean> {
    return this.enabledResourceTypes$.pipe(
      map(types => types.some(t => t.id === id))
    );
  }
  
  /**
   * Get default resource type
   */
  getDefaultResourceType(): Observable<string> {
    return this.settingsService.settings$.pipe(
      map(settings => settings?.contentManagement?.defaultResourceType || 'guidance')
    );
  }
  
  /**
   * Convert legacy resource type to new format if needed
   */
  convertLegacyType(type: string): Observable<string> {
    // Map old types to new types if needed
    const legacyMapping: Record<string, string> = {
      'guide': 'guidance',
      'casestudy': 'case-study',
      'case_study': 'case-study',
      'independent_review': 'independent-review'
    };
    
    return this.resourceTypes$.pipe(
      map(types => {
        const mappedType = legacyMapping[type] || type;
        const exists = types.some(t => t.id === mappedType);
        return exists ? mappedType : 'other';
      })
    );
  }
  
  /**
   * Get resource type label
   */
  getResourceTypeLabel(id: string): Observable<string> {
    return this.getResourceTypeById(id).pipe(
      map(type => type?.label || 'Unknown')
    );
  }
  
  /**
   * Get resource type icon
   */
  getResourceTypeIcon(id: string): Observable<string> {
    return this.getResourceTypeById(id).pipe(
      map(type => type?.icon || 'folder')
    );
  }
  
  /**
   * Get default cover for resource type
   */
  getDefaultCover(typeId: string): Observable<string | undefined> {
    return this.getResourceTypeById(typeId).pipe(
      map(type => type?.defaultCover)
    );
  }
}