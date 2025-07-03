import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../../../core/services/i18n.service';
import { FirestoreService } from '../../../core/services/firestore.service';
import { AuthService } from '../../../core/services/auth.service';
import { ResourceService } from '../../../core/services/resource.service';
import { Resource } from '../../../core/models/resource.model';

interface AnimatedResource extends Resource {
  isDeleting?: boolean;
  isPublishing?: boolean;
  isFeaturing?: boolean;
}

@Component({
  selector: 'app-resource-management',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './resource-management.component.html',
  styleUrl: './resource-management.component.scss'
})
export class ResourceManagementComponent implements OnInit {
  private resourceService = inject(ResourceService);
  private authService = inject(AuthService);
  private router = inject(Router);

  resources: AnimatedResource[] = [];
  filteredResources: AnimatedResource[] = [];
  loading = true;
  searchQuery = '';
  selectedStatus: 'all' | 'published' | 'draft' | 'unpublished' = 'all';
  selectedType: string = 'all';

  // Pagination
  pageSize = 10;
  currentPage = 1;
  totalPages = 1;

  // Bulk selection
  selectedResourceIds = new Set<string>();
  isAllSelected = false;
  bulkActionInProgress = false;

  // Animation states
  showSuccessToast = false;
  successMessage = '';
  rowAnimationStates: Record<string, boolean> = {};
  filterAnimating = false;

  constructor(public i18nService: I18nService) {}

  ngOnInit(): void {
    this.loadResources();
  }

  async loadResources(): Promise<void> {
    this.loading = true;

    try {
      // Subscribe to resources from ResourceService
      this.resourceService.resources$.subscribe(resources => {
        this.resources = resources;
        this.applyFilters();
      });
    } catch (error) {
      console.error('Error loading resources:', error);
    } finally {
      this.loading = false;
    }
  }

  applyFilters(): void {
    this.filterAnimating = true;
    
    let filtered = [...this.resources];

    // Apply status filter
    if (this.selectedStatus !== 'all') {
      filtered = filtered.filter(r => r.status === this.selectedStatus);
    }

    // Apply type filter
    if (this.selectedType !== 'all') {
      filtered = filtered.filter(r => r.type === this.selectedType);
    }

    // Apply search filter
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        Object.values(r.title).some(t => t.toLowerCase().includes(query)) ||
        Object.values(r.description).some(d => d.toLowerCase().includes(query)) ||
        r.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Animate filter changes
    setTimeout(() => {
      this.filteredResources = filtered;
      this.totalPages = Math.ceil(filtered.length / this.pageSize);
      this.currentPage = 1;
      this.filterAnimating = false;
      
      // Clear selections when filtering
      this.selectedResourceIds.clear();
      this.isAllSelected = false;
    }, 300);
  }

  get paginatedResources(): Resource[] {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.filteredResources.slice(start, end);
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onStatusFilterChange(): void {
    this.applyFilters();
  }

  onTypeFilterChange(): void {
    this.applyFilters();
  }

  async togglePublishStatus(resource: AnimatedResource): Promise<void> {
    const userId = this.authService.userId;
    if (!userId) return;

    resource.isPublishing = true;
    
    try {
      const newStatus = resource.status === 'published' ? 'unpublished' : 'published';
      await this.resourceService.updateResource(resource.id, {
        status: newStatus,
        updatedAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
        updatedBy: userId
      }, userId);
      
      this.showToast(
        newStatus === 'published' 
          ? `"${resource.title.en}" is now live! 🎉` 
          : `"${resource.title.en}" has been unpublished 📤`
      );
    } catch (error) {
      console.error('Error toggling publish status:', error);
      this.showToast('Oops! Something went wrong 😅', true);
    } finally {
      resource.isPublishing = false;
    }
  }

  async toggleFeatured(resource: AnimatedResource): Promise<void> {
    const userId = this.authService.userId;
    if (!userId) return;

    resource.isFeaturing = true;
    
    try {
      await this.resourceService.updateResource(resource.id, {
        featured: !resource.featured,
        updatedAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
        updatedBy: userId
      }, userId);
      
      this.showToast(
        resource.featured 
          ? `"${resource.title.en}" removed from featured ⭐` 
          : `"${resource.title.en}" is now featured! 🌟`
      );
    } catch (error) {
      console.error('Error toggling featured status:', error);
      this.showToast('Oops! Something went wrong 😅', true);
    } finally {
      resource.isFeaturing = false;
    }
  }

  viewAnalytics(resource: AnimatedResource): void {
    // Navigate to analytics page with resource ID filter
    this.router.navigate(['/admin/analytics'], { 
      queryParams: { resourceId: resource.id }
    });
  }

  async deleteResource(resource: AnimatedResource): Promise<void> {
    const confirmation = await this.showDeleteConfirmation(resource);
    if (!confirmation) return;

    resource.isDeleting = true;
    
    try {
      await this.resourceService.deleteResource(resource.id);
      this.showToast(`"${resource.title.en}" has been deleted 🗑️`);
      
      // Remove from selected if it was selected
      this.selectedResourceIds.delete(resource.id);
    } catch (error) {
      console.error('Error deleting resource:', error);
      this.showToast('Failed to delete resource 😔', true);
      resource.isDeleting = false;
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  goToPage(page: number): void {
    this.currentPage = page;
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'published':
        return 'text-green-600 bg-green-100';
      case 'draft':
        return 'text-gray-600 bg-gray-100';
      case 'unpublished':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  }

  formatDate(timestamp: any): string {
    if (!timestamp) return '';

    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getResourceTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'guide': 'Guide',
      'case-study': 'Case Study',
      'report': 'Report',
      'dataset': 'Dataset',
      'tool': 'Tool',
      'policy': 'Policy Brief',
      'template': 'Template',
      'infographic': 'Infographic',
      'other': 'Other'
    };

    return labels[type] || type;
  }

  // Bulk selection methods
  toggleSelectAll(): void {
    if (this.isAllSelected) {
      this.selectedResourceIds.clear();
      this.isAllSelected = false;
    } else {
      this.paginatedResources.forEach(resource => {
        this.selectedResourceIds.add(resource.id);
      });
      this.isAllSelected = true;
    }
  }

  toggleResourceSelection(resourceId: string): void {
    if (this.selectedResourceIds.has(resourceId)) {
      this.selectedResourceIds.delete(resourceId);
    } else {
      this.selectedResourceIds.add(resourceId);
    }
    
    // Update "select all" state
    this.isAllSelected = this.paginatedResources.every(r => 
      this.selectedResourceIds.has(r.id)
    );
  }

  isResourceSelected(resourceId: string): boolean {
    return this.selectedResourceIds.has(resourceId);
  }

  async performBulkAction(action: 'publish' | 'unpublish' | 'delete' | 'feature'): Promise<void> {
    if (this.selectedResourceIds.size === 0) return;
    
    this.bulkActionInProgress = true;
    const selectedIds = Array.from(this.selectedResourceIds);
    
    try {
      const userId = this.authService.userId;
      if (!userId) return;

      switch (action) {
        case 'publish':
        case 'unpublish':
          for (const id of selectedIds) {
            await this.resourceService.updateResource(id, {
              status: action === 'publish' ? 'published' : 'unpublished',
              updatedAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
              updatedBy: userId
            }, userId);
          }
          this.showToast(`${selectedIds.length} resources ${action}ed! 🎯`);
          break;
          
        case 'delete':
          if (!confirm(`Are you sure you want to delete ${selectedIds.length} resources?`)) {
            return;
          }
          for (const id of selectedIds) {
            await this.resourceService.deleteResource(id);
          }
          this.showToast(`${selectedIds.length} resources deleted! 🗑️`);
          break;
          
        case 'feature':
          for (const id of selectedIds) {
            await this.resourceService.updateResource(id, {
              featured: true,
              updatedAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
              updatedBy: userId
            }, userId);
          }
          this.showToast(`${selectedIds.length} resources featured! ⭐`);
          break;
      }
      
      // Clear selections after bulk action
      this.selectedResourceIds.clear();
      this.isAllSelected = false;
    } catch (error) {
      console.error('Error performing bulk action:', error);
      this.showToast('Some operations failed 😔', true);
    } finally {
      this.bulkActionInProgress = false;
    }
  }

  // UI Helper methods
  showToast(message: string, isError = false): void {
    this.successMessage = message;
    this.showSuccessToast = true;
    
    setTimeout(() => {
      this.showSuccessToast = false;
    }, 3000);
  }

  async showDeleteConfirmation(resource: AnimatedResource): Promise<boolean> {
    // In a real app, this would be a beautiful modal
    return confirm(`Are you sure you want to delete "${resource.title.en}"? This action cannot be undone.`);
  }

  getResourceTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      'guide': 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
      'case-study': 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      'report': 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      'dataset': 'M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z',
      'tool': 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
      'policy': 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      'template': 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z',
      'infographic': 'M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z',
      'other': 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z'
    };
    
    return icons[type] || icons['other'];
  }

  trackByResourceId(index: number, resource: Resource): string {
    return resource.id;
  }
}
