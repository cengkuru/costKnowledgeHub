import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../../../core/services/i18n.service';
// Use mock services until Firebase dependencies are installed
import { FirestoreService } from '../../../core/services/firestore.service.mock';
import { AuthService } from '../../../core/services/auth.service.mock';
import { Resource } from '../../../core/models/resource.model';

@Component({
  selector: 'app-resource-management',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './resource-management.component.html',
  styleUrl: './resource-management.component.scss'
})
export class ResourceManagementComponent implements OnInit {
  private firestoreService = inject(FirestoreService);
  private authService = inject(AuthService);
  
  resources: Resource[] = [];
  filteredResources: Resource[] = [];
  loading = true;
  searchQuery = '';
  selectedStatus: 'all' | 'published' | 'draft' | 'unpublished' = 'all';
  selectedType: string = 'all';
  
  // Pagination
  pageSize = 10;
  currentPage = 1;
  totalPages = 1;
  
  constructor(public i18nService: I18nService) {}
  
  ngOnInit(): void {
    this.loadResources();
  }
  
  async loadResources(): Promise<void> {
    this.loading = true;
    
    try {
      const result = await this.firestoreService.getResources(undefined, 100);
      this.resources = result.resources;
      this.applyFilters();
    } catch (error) {
      console.error('Error loading resources:', error);
    } finally {
      this.loading = false;
    }
  }
  
  applyFilters(): void {
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
    
    this.filteredResources = filtered;
    this.totalPages = Math.ceil(filtered.length / this.pageSize);
    this.currentPage = 1;
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
  
  async togglePublishStatus(resource: Resource): Promise<void> {
    const userId = this.authService.userId;
    if (!userId) return;
    
    try {
      if (resource.status === 'published') {
        await this.firestoreService.unpublishResource(resource.id, userId);
        resource.status = 'unpublished';
      } else {
        await this.firestoreService.publishResource(resource.id, userId);
        resource.status = 'published';
      }
    } catch (error) {
      console.error('Error toggling publish status:', error);
    }
  }
  
  async toggleFeatured(resource: Resource): Promise<void> {
    const userId = this.authService.userId;
    if (!userId) return;
    
    try {
      await this.firestoreService.updateResource(
        resource.id,
        { featured: !resource.featured },
        userId
      );
      resource.featured = !resource.featured;
    } catch (error) {
      console.error('Error toggling featured status:', error);
    }
  }
  
  async deleteResource(resource: Resource): Promise<void> {
    if (!confirm(`Are you sure you want to delete "${resource.title.en}"?`)) {
      return;
    }
    
    try {
      await this.firestoreService.deleteResource(resource.id);
      this.resources = this.resources.filter(r => r.id !== resource.id);
      this.applyFilters();
    } catch (error) {
      console.error('Error deleting resource:', error);
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
}