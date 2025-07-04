import { Component, Input, Output, EventEmitter, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UnsplashService, UnsplashImage, ImageSearchContext } from '../../../core/services/unsplash.service';
import { StorageService } from '../../../core/services/storage.service';
import { AuthService } from '../../../core/services/auth.service';
import { I18nService } from '../../../core/services/i18n.service';

export interface ImageSelectionEvent {
  image: UnsplashImage;
  url: string;
  isUploaded: boolean;
}

@Component({
  selector: 'app-image-gallery',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './image-gallery.component.html',
  styleUrl: './image-gallery.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImageGalleryComponent implements OnInit {
  @Input() searchContext: ImageSearchContext | null | undefined = undefined;
  @Input() selectedImageUrl: string | null | undefined = undefined;
  @Input() allowManualUpload = true;
  @Input() maxImages = 9;
  
  @Output() imageSelected = new EventEmitter<ImageSelectionEvent>();
  @Output() imageCleared = new EventEmitter<void>();

  // State management
  mode: 'ai-suggestions' | 'manual-upload' | 'search' = 'ai-suggestions';
  isLoading = false;
  isUploading = false;
  searchQuery = '';
  
  // Image collections
  suggestedImages: UnsplashImage[] = [];
  searchResults: UnsplashImage[] = [];
  selectedImage: UnsplashImage | null = null;
  
  // UI state
  showImagePreview = false;
  previewImage: UnsplashImage | null = null;
  dragOverActive = false;
  
  constructor(
    private unsplashService: UnsplashService,
    private storageService: StorageService,
    private authService: AuthService,
    public i18nService: I18nService
  ) {}

  ngOnInit(): void {
    if (this.searchContext) {
      this.generateSuggestions();
    }
  }

  /**
   * Generate AI-powered image suggestions based on resource context
   */
  async generateSuggestions(): Promise<void> {
    if (!this.searchContext) return;

    this.isLoading = true;
    this.suggestedImages = [];

    try {
      this.unsplashService.generateContextualImages(this.searchContext).subscribe({
        next: (images) => {
          this.suggestedImages = images;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Failed to generate image suggestions:', error);
          this.isLoading = false;
        }
      });
    } catch (error) {
      console.error('Error generating suggestions:', error);
      this.isLoading = false;
    }
  }

  /**
   * Search for images using custom query
   */
  searchImages(): void {
    if (!this.searchQuery.trim()) return;

    this.isLoading = true;
    this.searchResults = [];

    this.unsplashService.searchImages(this.searchQuery, this.maxImages).subscribe({
      next: (images) => {
        this.searchResults = images;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Search failed:', error);
        this.isLoading = false;
      }
    });
  }

  /**
   * Handle image selection from gallery
   */
  selectImage(image: UnsplashImage): void {
    this.selectedImage = image;
    
    // Track download with Unsplash (required by API terms)
    this.unsplashService.downloadImage(image).subscribe();
    
    // Emit selection event
    this.imageSelected.emit({
      image,
      url: image.url,
      isUploaded: false
    });
  }

  /**
   * Handle manual file upload
   */
  async handleFileUpload(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be smaller than 5MB');
      return;
    }

    await this.uploadFile(file);
  }

  /**
   * Handle drag and drop upload
   */
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragOverActive = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.dragOverActive = false;
  }

  async onDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    this.dragOverActive = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      
      if (file.type.startsWith('image/')) {
        await this.uploadFile(file);
      } else {
        alert('Please drop an image file');
      }
    }
  }

  /**
   * Upload file to storage and emit selection
   */
  private async uploadFile(file: File): Promise<void> {
    try {
      this.isUploading = true;
      
      const userId = this.authService.userId;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const metadata = {
        uploadedBy: userId,
        originalName: file.name,
        type: 'cover-image'
      };

      const result = await this.storageService.uploadFileWithUrl(file, 'resource-images', metadata);

      if (result.downloadUrl) {
        // Create a mock UnsplashImage for uploaded files
        const uploadedImage: UnsplashImage = {
          id: `uploaded-${Date.now()}`,
          url: result.downloadUrl,
          thumb: result.downloadUrl,
          description: file.name,
          alt_description: file.name,
          width: 800,
          height: 600,
          attribution: {
            photographer: 'User Upload',
            photographer_url: '#',
            download_location: '#'
          },
          blur_hash: ''
        };

        this.selectedImage = uploadedImage;
        
        this.imageSelected.emit({
          image: uploadedImage,
          url: result.downloadUrl,
          isUploaded: true
        });
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      this.isUploading = false;
    }
  }

  /**
   * Clear selected image
   */
  clearSelection(): void {
    this.selectedImage = null;
    this.imageCleared.emit();
  }

  /**
   * Show image preview modal
   */
  showPreview(image: UnsplashImage): void {
    this.previewImage = image;
    this.showImagePreview = true;
  }

  /**
   * Close image preview modal
   */
  closePreview(): void {
    this.showImagePreview = false;
    this.previewImage = null;
  }

  /**
   * Switch between different modes
   */
  setMode(mode: 'ai-suggestions' | 'manual-upload' | 'search'): void {
    this.mode = mode;
    
    if (mode === 'ai-suggestions' && this.suggestedImages.length === 0) {
      this.generateSuggestions();
    }
  }

  /**
   * Get images for current mode
   */
  getCurrentImages(): UnsplashImage[] {
    switch (this.mode) {
      case 'ai-suggestions':
        return this.suggestedImages;
      case 'search':
        return this.searchResults;
      default:
        return [];
    }
  }

  /**
   * Get attribution text for image
   */
  getAttributionText(image: UnsplashImage): string {
    return this.unsplashService.getAttributionText(image);
  }

  /**
   * Check if an image is currently selected
   */
  isImageSelected(image: UnsplashImage): boolean {
    return this.selectedImage?.id === image.id || this.selectedImageUrl === image.url;
  }

  /**
   * TrackBy function for ngFor performance optimization
   */
  trackByImageId(index: number, item: UnsplashImage): string {
    return item.id;
  }

  /**
   * Get mode label for display
   */
  getModeLabel(mode: string): string {
    const labels = {
      'ai-suggestions': 'AI Suggestions',
      'manual-upload': 'Upload Image',
      'search': 'Search Images'
    };
    return labels[mode as keyof typeof labels] || mode;
  }

  /**
   * Handle search input with debouncing
   */
  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery = input.value;
    
    // Simple debouncing
    setTimeout(() => {
      if (this.searchQuery === input.value && this.searchQuery.trim()) {
        this.searchImages();
      }
    }, 500);
  }

  /**
   * Check if we have images to display
   */
  hasImages(): boolean {
    return this.getCurrentImages().length > 0;
  }

  /**
   * Check if current mode should show loading
   */
  shouldShowLoading(): boolean {
    return this.isLoading && (
      (this.mode === 'ai-suggestions' && this.suggestedImages.length === 0) ||
      (this.mode === 'search' && this.searchResults.length === 0)
    );
  }
}