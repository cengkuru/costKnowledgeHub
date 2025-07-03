import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray } from '@angular/forms';
import { I18nService } from '../../../core/services/i18n.service';
import { ResourceService } from '../../../core/services/resource.service';
import { FirestoreService } from '../../../core/services/firestore.service';
import { StorageService } from '../../../core/services/storage.service';
import { AuthService } from '../../../core/services/auth.service';
import { ActivityService } from '../../../core/services/activity.service';
import { Resource, ResourceType, Language, TopicCategory } from '../../../core/models/resource.model';
import { FileUploadComponent } from '../file-upload/file-upload.component';
import { AIService, TagSuggestion } from '../../../core/services/ai.service';

interface FormTab {
  id: string;
  label: string;
  icon: string;
  complete: boolean;
}

interface WorkflowConfig {
  tabOrder: string[];
  requiredFields: string[];
  autoFillFields: Record<string, any>;
  skipTabs?: string[];
  hints?: Record<string, string>;
}

// Workflow configurations for each resource type
const WORKFLOW_CONFIGS: Record<ResourceType, WorkflowConfig> = {
  'independent-review': {
    tabOrder: ['files', 'basic', 'content', 'metadata'],
    requiredFields: ['reportUrl', 'reportPeriod', 'title.en'],
    autoFillFields: {
      topics: ['assurance'],
      targetAudience: ['government', 'cso', 'oversight']
    },
    hints: {
      files: 'Upload the Independent Review Report PDF first to auto-extract metadata',
      metadata: 'Report period and oversight details are critical for tracking'
    }
  },
  'dataset': {
    tabOrder: ['files', 'metadata', 'basic', 'content'],
    requiredFields: ['fileLinks.en', 'format', 'country'],
    autoFillFields: {
      format: 'csv',
      difficulty: 'intermediate'
    },
    hints: {
      files: 'Upload your dataset files (CSV, Excel, or JSON)',
      metadata: 'Specify data format and coverage details'
    }
  },
  'infographic': {
    tabOrder: ['files', 'basic', 'content', 'metadata'],
    requiredFields: ['thumbnailUrl', 'title.en'],
    autoFillFields: {
      format: 'image',
      difficulty: 'beginner'
    },
    skipTabs: ['content'],
    hints: {
      files: 'Upload your infographic image first'
    }
  },
  'case-study': {
    tabOrder: ['basic', 'content', 'files', 'metadata'],
    requiredFields: ['title.en', 'description.en', 'country'],
    autoFillFields: {
      targetAudience: ['academic', 'practitioner']
    },
    hints: {
      content: 'Provide detailed context and lessons learned'
    }
  },
  'tool': {
    tabOrder: ['basic', 'metadata', 'content', 'files'],
    requiredFields: ['title.en', 'externalLink', 'format'],
    autoFillFields: {
      format: 'tool',
      difficulty: 'intermediate'
    },
    hints: {
      metadata: 'Include system requirements and compatibility'
    }
  },
  'guide': {
    tabOrder: ['basic', 'content', 'files', 'metadata'],
    requiredFields: ['title.en', 'description.en'],
    autoFillFields: {
      difficulty: 'beginner',
      targetAudience: ['practitioner']
    }
  },
  'report': {
    tabOrder: ['basic', 'content', 'files', 'metadata'],
    requiredFields: ['title.en', 'description.en', 'fileLinks.en'],
    autoFillFields: {
      targetAudience: ['government', 'oversight']
    }
  },
  'policy': {
    tabOrder: ['basic', 'content', 'metadata', 'files'],
    requiredFields: ['title.en', 'description.en', 'country'],
    autoFillFields: {
      targetAudience: ['government', 'policy-maker']
    }
  },
  'template': {
    tabOrder: ['basic', 'files', 'content', 'metadata'],
    requiredFields: ['title.en', 'fileLinks.en'],
    autoFillFields: {
      format: 'document',
      difficulty: 'beginner'
    }
  },
  'other': {
    tabOrder: ['basic', 'content', 'files', 'metadata'],
    requiredFields: ['title.en', 'description.en'],
    autoFillFields: {}
  }
};

@Component({
  selector: 'app-resource-form',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FileUploadComponent],
  templateUrl: './resource-form.component.html',
  styleUrl: './resource-form.component.scss'
})
export class ResourceFormComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private resourceService = inject(ResourceService);
  private storageService = inject(StorageService);
  private authService = inject(AuthService);
  private aiService = inject(AIService);
  private activityService = inject(ActivityService);
  
  resourceForm!: FormGroup;
  isEditMode = false;
  resourceId: string | null = null;
  resource?: Resource; // Current resource for edit mode
  loading = false;
  saving = false;
  autoSaveTimer: any;
  lastSaved: Date | null = null;
  
  // UI State
  activeTab = 'basic';
  activeLanguage: Language = 'en';
  activeFileLanguage: Language = 'en';
  showPreview = false;
  uploadProgress = 0;
  validationMessages: Record<string, string> = {};
  importingUrl = false;
  selectedUploadMethod: 'file' | 'link' | 'import' | null = null;
  selectedResourceType: ResourceType | null = null;
  showTypeSelection = true;
  
  // Form completion tracking
  formCompletion = 0;
  sectionCompletion: Record<string, boolean> = {
    basic: false,
    content: false,
    files: false,
    metadata: false
  };
  
  // Tabs configuration
  tabs: FormTab[] = [
    { id: 'basic', label: 'Basic Info', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', complete: false },
    { id: 'content', label: 'Content', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253', complete: false },
    { id: 'files', label: 'Files & Media', icon: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12', complete: false },
    { id: 'metadata', label: 'Metadata', icon: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z', complete: false }
  ];
  
  // Resource types
  resourceTypes: { value: ResourceType; label: string }[] = [
    { value: 'guide', label: 'Implementation Guide' },
    { value: 'case-study', label: 'Case Study' },
    { value: 'report', label: 'Research Report' },
    { value: 'independent-review', label: 'Independent Review Report' },
    { value: 'dataset', label: 'Dataset' },
    { value: 'tool', label: 'Tool' },
    { value: 'policy', label: 'Policy Brief' },
    { value: 'template', label: 'Template' },
    { value: 'infographic', label: 'Infographic' },
    { value: 'other', label: 'Other' }
  ];
  
  // Topics
  topics: { value: TopicCategory; label: string }[] = [
    { value: 'disclosure', label: 'Data Disclosure' },
    { value: 'assurance', label: 'Independent Review' },
    { value: 'procurement', label: 'Public Procurement' },
    { value: 'monitoring', label: 'Project Monitoring' },
    { value: 'stakeholder', label: 'Multi-stakeholder Working' },
    { value: 'accountability', label: 'Social Accountability' }
  ];
  
  // Languages
  languages: { value: Language; label: string; flag: string }[] = [
    { value: 'en', label: 'English', flag: '🇬🇧' },
    { value: 'es', label: 'Español', flag: '🇪🇸' },
    { value: 'pt', label: 'Português', flag: '🇵🇹' }
  ];
  
  // Uploaded files
  uploadedFiles: { url: string; name: string; size: number }[] = [];
  languageFiles: Record<string, { url: string; name: string; size: number }[]> = {
    en: [],
    es: [],
    pt: []
  };
  thumbnailUrl: string | null = null;
  
  // AI Features
  aiAvailable = false;
  generatingSummaries = false;
  suggestingTags = false;
  suggestedTags: TagSuggestion[] = [];
  summariesGenerated = false;
  
  // Enhanced validation messages with specific, actionable guidance
  friendlyMessages = {
    required: "This field is required to help users find and understand your resource",
    minlength: "Please add a bit more detail - aim for at least {{requiredLength}} characters",
    maxlength: "Let's keep this concise - please reduce to {{requiredLength}} characters or less",
    email: "Please enter a valid email address (e.g., user@example.com)",
    url: "Please enter a complete URL starting with https:// or http://",
    pattern: "This format doesn't match what's expected - please check the example format",
    titleTooShort: "Titles work best with 10-80 characters for clear understanding",
    titleTooLong: "Shorter titles (under 80 characters) are more effective",
    descriptionTooShort: "Descriptions should be at least 50 characters to be helpful",
    descriptionTooLong: "Consider breaking this into shorter, clearer sections",
    invalidUrl: "Please check this URL - it should start with https:// and be complete",
    noTopicsSelected: "Please select at least one topic to help categorize this resource",
    noTypeSelected: "Please choose a resource type to help users understand what this is"
  };
  
  constructor(public i18nService: I18nService) {}
  
  ngOnInit(): void {
    this.initializeForm();
    
    // Check if we're in edit mode
    this.resourceId = this.route.snapshot.paramMap.get('id');
    if (this.resourceId) {
      this.isEditMode = true;
      this.loadResource();
    }
    
    // Set up auto-save
    this.setupAutoSave();
    
    // Track form completion
    this.trackFormCompletion();
    
    // Check AI availability
    this.checkAIAvailability();
  }
  
  initializeForm(): void {
    // URL validation pattern
    const urlPattern = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;
    
    this.resourceForm = this.fb.group({
      // Basic Information
      title: this.fb.group({
        en: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(80)]],
        es: ['', [Validators.minLength(10), Validators.maxLength(80)]],
        pt: ['', [Validators.minLength(10), Validators.maxLength(80)]]
      }),
      type: ['', Validators.required],
      topics: [[], Validators.required],
      featured: [false],
      status: ['draft'],
      
      // Content
      description: this.fb.group({
        en: ['', [Validators.required, Validators.minLength(50), Validators.maxLength(2000)]],
        es: ['', [Validators.minLength(50), Validators.maxLength(2000)]],
        pt: ['', [Validators.minLength(50), Validators.maxLength(2000)]]
      }),
      tags: [[]],
      
      // Files & Media
      fileLinks: this.fb.group({
        en: ['', [Validators.pattern(urlPattern)]],
        es: ['', [Validators.pattern(urlPattern)]],
        pt: ['', [Validators.pattern(urlPattern)]]
      }),
      externalLink: ['', [Validators.pattern(urlPattern)]],
      thumbnailUrl: ['', [Validators.pattern(urlPattern)]],
      
      // Metadata
      country: ['global', Validators.required],
      language: ['en', Validators.required],
      difficulty: ['beginner'],
      targetAudience: [[]],
      format: [''],
      
      // Independent Review Report fields
      independentReviewData: this.fb.group({
        reportUrl: ['', [Validators.pattern(urlPattern)]],
        reportPeriod: ['']
      })
    });
  }
  
  setupAutoSave(): void {
    // Auto-save every 30 seconds if form is dirty
    this.autoSaveTimer = setInterval(() => {
      if (this.resourceForm.dirty && this.resourceForm.valid) {
        this.autoSave();
      }
    }, 30000);
  }
  
  async autoSave(): Promise<void> {
    if (!this.isEditMode) return; // Only auto-save in edit mode
    
    try {
      const formData = this.prepareFormData();
      const userId = this.authService.userId;
      if (!userId) return;
      
      await this.resourceService.updateResource(this.resourceId!, formData, userId);
      this.lastSaved = new Date();
      this.resourceForm.markAsPristine();
      
      // Show subtle save indicator
      this.showAutoSaveSuccess();
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  }
  
  showAutoSaveSuccess(): void {
    // This would trigger a subtle animation in the UI
    const saveIndicator = document.querySelector('.auto-save-indicator');
    if (saveIndicator) {
      saveIndicator.classList.add('pulse');
      setTimeout(() => saveIndicator.classList.remove('pulse'), 1000);
    }
  }
  
  trackFormCompletion(): void {
    this.resourceForm.valueChanges.subscribe(() => {
      this.updateFormCompletion();
    });
  }
  
  updateFormCompletion(): void {
    // Check each section
    const basicValid = this.resourceForm.get('title.en')?.valid && 
                      this.resourceForm.get('type')?.valid &&
                      this.resourceForm.get('topics')?.value.length > 0;
    
    const contentValid = this.resourceForm.get('description.en')?.valid;
    
    const filesValid = this.uploadedFiles.length > 0 || 
                      this.resourceForm.get('externalLink')?.value;
    
    const metadataValid = this.resourceForm.get('country')?.valid &&
                         this.resourceForm.get('language')?.valid;
    
    this.sectionCompletion = {
      basic: basicValid || false,
      content: contentValid || false,
      files: filesValid || false,
      metadata: metadataValid || false
    };
    
    // Update tab completion status
    this.tabs = this.tabs.map(tab => ({
      ...tab,
      complete: this.sectionCompletion[tab.id] || false
    }));
    
    // Calculate overall completion
    const completedSections = Object.values(this.sectionCompletion).filter(v => v).length;
    this.formCompletion = Math.round((completedSections / 4) * 100);
  }
  
  async loadResource(): Promise<void> {
    if (!this.resourceId) return;
    
    this.loading = true;
    this.resourceService.getResourceById(this.resourceId).subscribe({
      next: (resource) => {
        if (resource) {
          this.resource = resource; // Store the resource for tracking
          this.populateForm(resource);
          this.updateFormCompletion();
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading resource:', error);
        this.showError('Failed to load resource');
        this.loading = false;
      }
    });
  }
  
  populateForm(resource: Resource): void {
    this.resourceForm.patchValue({
      title: resource.title,
      type: resource.type,
      topics: resource.topics,
      featured: resource.featured,
      status: resource.status,
      description: resource.description,
      tags: resource.tags,
      fileLinks: resource.fileLinks || {},
      externalLink: resource.externalLink,
      thumbnailUrl: resource.thumbnailUrl,
      country: resource.country,
      language: resource.language,
      difficulty: resource.metadata?.difficulty,
      targetAudience: resource.metadata?.targetAudience || [],
      format: resource.format,
      impact: resource.impact || {}
    });
    
    this.thumbnailUrl = resource.thumbnailUrl || null;
  }
  
  setActiveTab(tabId: string): void {
    this.activeTab = tabId;
    // Remove forced scroll to top - let users stay where they are
    // Navigation should be user-friendly and respect user's context
  }
  
  setActiveLanguage(lang: Language): void {
    this.activeLanguage = lang;
  }

  /**
   * Navigate to next/previous tab for better UX
   */
  navigateToTab(direction: 'next' | 'previous'): void {
    const currentIndex = this.tabs.findIndex(tab => tab.id === this.activeTab);
    if (direction === 'next' && currentIndex < this.tabs.length - 1) {
      this.setActiveTab(this.tabs[currentIndex + 1].id);
    } else if (direction === 'previous' && currentIndex > 0) {
      this.setActiveTab(this.tabs[currentIndex - 1].id);
    }
  }

  /**
   * Copy content from English to all other languages
   */
  copyToAllLanguages(fieldType: 'title' | 'description'): void {
    const englishValue = this.resourceForm.get(`${fieldType}.en`)?.value;
    if (!englishValue) {
      this.showError('Please enter English content first');
      return;
    }

    // Copy to Spanish and Portuguese
    const formGroup = this.resourceForm.get(fieldType);
    if (formGroup) {
      formGroup.patchValue({
        es: englishValue,
        pt: englishValue
      });
      this.showSuccess(`${fieldType} copied to all languages!`);
    }
  }

  /**
   * Get current tab index for navigation
   */
  getCurrentTabIndex(): number {
    return this.tabs.findIndex(tab => tab.id === this.activeTab);
  }

  /**
   * Check if we can navigate to next/previous tab
   */
  canNavigate(direction: 'next' | 'previous'): boolean {
    const currentIndex = this.getCurrentTabIndex();
    return direction === 'next' ? currentIndex < this.tabs.length - 1 : currentIndex > 0;
  }
  
  toggleTopic(topic: TopicCategory): void {
    const topics = this.resourceForm.get('topics')?.value || [];
    const index = topics.indexOf(topic);
    
    if (index > -1) {
      topics.splice(index, 1);
    } else {
      topics.push(topic);
    }
    
    this.resourceForm.patchValue({ topics });
    this.updateFormCompletion();
  }
  
  isTopicSelected(topic: TopicCategory): boolean {
    const topics = this.resourceForm.get('topics')?.value || [];
    return topics.includes(topic);
  }
  
  addTag(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.trim();
    
    if (value) {
      const tags = this.resourceForm.get('tags')?.value || [];
      if (!tags.includes(value)) {
        tags.push(value);
        this.resourceForm.patchValue({ tags });
      }
      input.value = '';
    }
  }
  
  removeTag(tag: string): void {
    const tags = this.resourceForm.get('tags')?.value || [];
    const index = tags.indexOf(tag);
    if (index > -1) {
      tags.splice(index, 1);
      this.resourceForm.patchValue({ tags });
    }
  }
  
  async handleFileUpload(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files) return;
    
    for (const file of Array.from(files)) {
      await this.uploadFile(file);
    }
  }
  
  async uploadFile(file: File): Promise<void> {
    try {
      const userId = this.authService.userId;
      if (!userId) return;
      
      const path = `resources/${Date.now()}_${file.name}`;
      const metadata = {
        uploadedBy: userId,
        resourceId: this.resourceId || 'new',
        originalName: file.name
      };
      
      const result = await this.storageService.uploadFileWithUrl(file, 'resources', metadata);
      
      if (result.downloadUrl) {
        this.uploadedFiles.push({
          url: result.downloadUrl,
          name: file.name,
          size: file.size
        });
        
        // If it's an image and no thumbnail is set, use it as thumbnail
        if (file.type.startsWith('image/') && !this.thumbnailUrl) {
          this.thumbnailUrl = result.downloadUrl;
          this.resourceForm.patchValue({ thumbnailUrl: result.downloadUrl });
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      this.showError('Failed to upload file');
    }
  }
  
  removeFile(index: number): void {
    this.uploadedFiles.splice(index, 1);
  }
  
  setAsThumbnail(file: { url: string }): void {
    this.thumbnailUrl = file.url;
    this.resourceForm.patchValue({ thumbnailUrl: file.url });
  }
  
  togglePreview(): void {
    this.showPreview = !this.showPreview;
  }
  
  prepareFormData(): Partial<Resource> {
    const formValue = this.resourceForm.value;
    
    return {
      title: formValue.title,
      description: formValue.description,
      type: formValue.type,
      topics: formValue.topics,
      tags: formValue.tags,
      featured: formValue.featured,
      status: formValue.status,
      country: formValue.country,
      language: formValue.language,
      fileLinks: formValue.fileLinks,
      externalLink: formValue.externalLink,
      thumbnailUrl: formValue.thumbnailUrl,
      format: formValue.format,
      metadata: {
        difficulty: formValue.difficulty,
        targetAudience: formValue.targetAudience
      },
      impact: formValue.impact
    };
  }
  
  async saveResource(publish = false): Promise<void> {
    if (!this.resourceForm.valid) {
      this.markFormGroupTouched(this.resourceForm);
      this.showValidationErrors();
      return;
    }
    
    this.saving = true;
    
    try {
      const formData = this.prepareFormData();
      const userId = this.authService.userId;
      if (!userId) return;
      
      if (publish) {
        formData.status = 'published';
      }
      
      if (this.isEditMode && this.resourceId) {
        await this.resourceService.updateResource(this.resourceId, formData, userId);
        
        // Track resource update or publish
        const activityType = publish ? 'resource_publish' : 'resource_update';
        await this.activityService.trackResourceManagement(
          activityType,
          this.resourceId,
          formData.title?.en || formData.title?.es || formData.title?.pt || 'Untitled',
          { previousStatus: this.resource?.status, newStatus: formData.status },
          this.authService.currentUser
        );
        
        this.showSuccess('Resource updated successfully! 🎉');
      } else {
        const resourceId = await this.resourceService.createResource(formData as Omit<Resource, 'id'>, userId);
        
        // Track resource creation
        await this.activityService.trackResourceManagement(
          'resource_add',
          resourceId,
          formData.title?.en || formData.title?.es || formData.title?.pt || 'Untitled',
          undefined,
          this.authService.currentUser
        );
        
        this.showSuccess('Resource created successfully! 🎉');
        
        // Navigate to edit mode
        this.router.navigate(['/admin/resources', resourceId, 'edit']);
      }
      
      this.resourceForm.markAsPristine();
    } catch (error) {
      console.error('Error saving resource:', error);
      this.showError('Failed to save resource');
    } finally {
      this.saving = false;
    }
  }
  
  async publishResource(): Promise<void> {
    await this.saveResource(true);
  }
  
  markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
      
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }
  
  showValidationErrors(): void {
    const summary = this.getFormValidationSummary();
    
    if (summary) {
      // Find first invalid field and focus
      const firstError = document.querySelector('.ng-invalid');
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        (firstError as HTMLElement).focus();
      }
      
      this.showError(summary);
    } else {
      this.showError('Please review and fix the highlighted fields');
    }
  }
  
  showSuccess(message: string): void {
    // This would show a delightful success notification
    console.log('Success:', message);
  }
  
  showError(message: string): void {
    // This would show a friendly error notification
    console.error('Error:', message);
  }
  
  cancel(): void {
    if (this.resourceForm.dirty) {
      if (confirm('You have unsaved changes. Are you sure you want to leave?')) {
        this.router.navigate(['/admin/resources']);
      }
    } else {
      this.router.navigate(['/admin/resources']);
    }
  }
  
  getFieldError(fieldPath: string): string {
    const field = this.resourceForm.get(fieldPath);
    if (!field || !field.touched || !field.errors) return '';
    
    const errorKey = Object.keys(field.errors)[0];
    const errorValue = field.errors[errorKey];
    
    // Handle specific field types with enhanced messaging
    if (fieldPath.includes('title')) {
      if (errorKey === 'minlength') return this.friendlyMessages.titleTooShort;
      if (errorKey === 'maxlength') return this.friendlyMessages.titleTooLong;
    }
    
    if (fieldPath.includes('description')) {
      if (errorKey === 'minlength') return this.friendlyMessages.descriptionTooShort;
      if (errorKey === 'maxlength') return this.friendlyMessages.descriptionTooLong;
    }
    
    if (fieldPath.includes('Link') || fieldPath.includes('Url')) {
      if (errorKey === 'pattern') return this.friendlyMessages.invalidUrl;
    }
    
    // Handle length-specific errors with actual requirements
    if (errorKey === 'minlength' && errorValue.requiredLength) {
      return this.friendlyMessages.minlength.replace('{{requiredLength}}', errorValue.requiredLength);
    }
    
    if (errorKey === 'maxlength' && errorValue.requiredLength) {
      return this.friendlyMessages.maxlength.replace('{{requiredLength}}', errorValue.requiredLength);
    }
    
    return this.friendlyMessages[errorKey as keyof typeof this.friendlyMessages] || 'Please check this field';
  }
  
  /**
   * Get character count and status for text fields
   */
  getCharacterInfo(fieldPath: string): { count: number; max?: number; status: 'good' | 'warning' | 'error' } {
    const field = this.resourceForm.get(fieldPath);
    const value = field?.value || '';
    const count = value.length;
    
    // Define optimal ranges for different field types
    let min = 0;
    let max = 500;
    let optimal = 100;
    
    if (fieldPath.includes('title')) {
      min = 10;
      max = 80;
      optimal = 50;
    } else if (fieldPath.includes('description')) {
      min = 50;
      max = 2000;
      optimal = 200;
    }
    
    let status: 'good' | 'warning' | 'error' = 'good';
    
    if (count < min) {
      status = 'error';
    } else if (count > max) {
      status = 'error';
    } else if (count < optimal * 0.5 || count > optimal * 1.5) {
      status = 'warning';
    }
    
    return { count, max, status };
  }
  
  /**
   * Get contextual hint for field improvement
   */
  getFieldHint(fieldPath: string): string {
    if (fieldPath.includes('title')) {
      return 'Clear, descriptive titles help users understand your resource quickly';
    }
    
    if (fieldPath.includes('description')) {
      return 'Explain what this resource contains and how it helps users';
    }
    
    if (fieldPath.includes('externalLink')) {
      return 'Link to the original source or authoritative version';
    }
    
    if (fieldPath.includes('tags')) {
      return 'Add keywords that users might search for';
    }
    
    return '';
  }
  
  /**
   * Check if form has validation errors and provide specific guidance
   */
  getFormValidationSummary(): string {
    const errors: string[] = [];
    
    // Check required title
    if (!this.resourceForm.get('title.en')?.value) {
      errors.push('Add a title in English');
    }
    
    // Check type selection
    if (!this.resourceForm.get('type')?.value) {
      errors.push('Select a resource type');
    }
    
    // Check topics
    const topics = this.resourceForm.get('topics')?.value || [];
    if (topics.length === 0) {
      errors.push('Choose at least one topic');
    }
    
    // Check description
    if (!this.resourceForm.get('description.en')?.value) {
      errors.push('Add a description in English');
    }
    
    if (errors.length === 0) return '';
    
    return `Please complete: ${errors.join(', ')}`;
  }
  
  isFieldValid(fieldPath: string): boolean {
    const field = this.resourceForm.get(fieldPath);
    return !!(field && field.valid && field.touched);
  }
  
  
  onFilesUploaded(files: {url: string, name: string, size: number}[]): void {
    // Add uploaded files to the list
    this.uploadedFiles = [...this.uploadedFiles, ...files];
    
    // Update form completion
    this.updateFormCompletion();
    
    // Mark form as dirty
    this.resourceForm.markAsDirty();
  }
  
  onFileRemoved(fileUrl: string): void {
    // Remove file from the list
    this.uploadedFiles = this.uploadedFiles.filter(f => f.url !== fileUrl);
    
    // If this was the thumbnail, clear it
    if (this.thumbnailUrl === fileUrl) {
      this.thumbnailUrl = null;
      this.resourceForm.patchValue({ thumbnailUrl: '' });
    }
    
    // Update form completion
    this.updateFormCompletion();
    
    // Mark form as dirty
    this.resourceForm.markAsDirty();
  }
  
  
  onLanguageFilesUploaded(files: {url: string, name: string, size: number}[], language: Language): void {
    // Store the file for this language (replace existing since we only allow one per language)
    this.languageFiles[language as string] = files;
    
    // Update the file link in the form
    const fileLinksGroup = this.resourceForm.get('fileLinks') as FormGroup;
    if (fileLinksGroup && files.length > 0) {
      fileLinksGroup.patchValue({ [language]: files[0].url });
    }
    
    // Update form completion
    this.updateFormCompletion();
    
    // Mark form as dirty
    this.resourceForm.markAsDirty();
  }
  
  onLanguageFileRemoved(fileUrl: string, language: Language): void {
    // Clear the file for this language
    this.languageFiles[language as string] = [];
    
    // Clear the file link in the form
    const fileLinksGroup = this.resourceForm.get('fileLinks') as FormGroup;
    if (fileLinksGroup) {
      fileLinksGroup.patchValue({ [language]: '' });
    }
    
    // Update form completion
    this.updateFormCompletion();
    
    // Mark form as dirty
    this.resourceForm.markAsDirty();
  }
  
  checkAIAvailability(): void {
    this.aiService.checkAIAvailability().subscribe({
      next: (available) => {
        this.aiAvailable = available;
      },
      error: (error) => {
        console.error('Failed to check AI availability:', error);
        this.aiAvailable = false;
      }
    });
  }

  generateSummaries(): void {
    const titleEn = this.resourceForm.get('title.en')?.value;
    const content = this.resourceForm.get('description.en')?.value || '';
    const resourceType = this.resourceForm.get('type')?.value;

    if (!titleEn && !content) {
      alert('Please provide a title or some content in English first.');
      return;
    }

    this.generatingSummaries = true;

    this.aiService.generateSummaries({
      content: content || titleEn,
      title: titleEn,
      resourceType
    }).subscribe({
      next: (summaries) => {
        // Update form with generated summaries
        this.resourceForm.patchValue({
          description: summaries
        });
        this.summariesGenerated = true;
        this.generatingSummaries = false;
        
        // Show success message
        this.showSuccess('Summaries generated successfully! Feel free to edit them.');
      },
      error: (error) => {
        console.error('Failed to generate summaries:', error);
        this.generatingSummaries = false;
        this.showError('Failed to generate summaries. Please try again.');
      }
    });
  }

  suggestTags(): void {
    const title = this.resourceForm.get('title')?.value;
    const description = this.resourceForm.get('description')?.value;
    const type = this.resourceForm.get('type')?.value;
    const existingTags = this.resourceForm.get('tags')?.value || [];

    if (!title?.en) {
      alert('Please provide at least an English title first.');
      return;
    }

    this.suggestingTags = true;
    this.suggestedTags = [];

    this.aiService.suggestTags({
      title,
      description,
      resourceType: type,
      existingTags
    }).subscribe({
      next: (suggestions) => {
        this.suggestedTags = suggestions;
        this.suggestingTags = false;
        
        if (suggestions.length === 0) {
          this.showSuccess('No additional tags suggested.');
        }
      },
      error: (error) => {
        console.error('Failed to suggest tags:', error);
        this.suggestingTags = false;
        this.showError('Failed to suggest tags. Please try again.');
      }
    });
  }

  addSuggestedTag(tag: string): void {
    const currentTags = this.resourceForm.get('tags')?.value || [];
    if (!currentTags.includes(tag)) {
      this.resourceForm.patchValue({
        tags: [...currentTags, tag]
      });
      
      // Remove from suggestions
      this.suggestedTags = this.suggestedTags.filter(s => s.tag !== tag);
    }
  }

  async importFromUrl(): Promise<void> {
    const url = this.resourceForm.get('independentReviewData.reportUrl')?.value;
    if (!url) return;

    this.importingUrl = true;
    
    try {
      // Call AI service to extract metadata from the URL
      const metadata = await this.aiService.extractUrlMetadata({
        url: url,
        resourceType: 'independent-review'
      }).toPromise();

      if (metadata) {
        // Update form with extracted data
        if (metadata.title) {
          this.resourceForm.patchValue({
            title: {
              en: typeof metadata.title === 'string' ? metadata.title : metadata.title.en || '',
              es: typeof metadata.title === 'string' ? '' : metadata.title.es || '',
              pt: typeof metadata.title === 'string' ? '' : metadata.title.pt || ''
            }
          });
        }

        if (metadata.description) {
          this.resourceForm.patchValue({
            description: {
              en: typeof metadata.description === 'string' ? metadata.description : metadata.description.en || '',
              es: typeof metadata.description === 'string' ? '' : metadata.description.es || '',
              pt: typeof metadata.description === 'string' ? '' : metadata.description.pt || ''
            }
          });
        }

        if (metadata.thumbnailUrl) {
          this.thumbnailUrl = metadata.thumbnailUrl;
          this.resourceForm.patchValue({ thumbnailUrl: metadata.thumbnailUrl });
        }

        if (metadata.publishedDate) {
          // Extract report period from date if possible
          const date = new Date(metadata.publishedDate);
          const year = date.getFullYear();
          const quarter = Math.floor((date.getMonth() / 3)) + 1;
          
          // Suggest a report period based on the date
          const suggestedPeriod = `${year} Q${quarter} Review`;
          const currentPeriod = this.resourceForm.get('independentReviewData.reportPeriod')?.value;
          
          if (!currentPeriod) {
            this.resourceForm.patchValue({
              independentReviewData: {
                ...this.resourceForm.get('independentReviewData')?.value,
                reportPeriod: suggestedPeriod
              }
            });
          }
        }

        // Set external link to the CoST website URL
        this.resourceForm.patchValue({ externalLink: url });

        // Auto-select relevant topics based on content
        if (metadata.suggestedTopics && metadata.suggestedTopics.length > 0) {
          this.resourceForm.patchValue({ topics: metadata.suggestedTopics });
        }

        // Add suggested tags
        if (metadata.suggestedTags && metadata.suggestedTags.length > 0) {
          this.resourceForm.patchValue({ tags: metadata.suggestedTags });
        }

        this.showSuccess('Report details imported successfully! 🎉 You can now review and edit the information.');
        
        // Mark form as dirty to enable save
        this.resourceForm.markAsDirty();
        
        // Update form completion
        this.updateFormCompletion();
      }
    } catch (error) {
      console.error('Error importing from URL:', error);
      this.showError('Could not import from this URL. Please check the URL and try again, or enter the details manually.');
    } finally {
      this.importingUrl = false;
    }
  }

  // Files & Media Tab Methods for Progressive Disclosure
  onPrimaryFileUploaded(file: any): void {
    if (file && file.url) {
      this.uploadedFiles = [{ url: file.url, name: file.name || 'Uploaded file', size: file.size || 0 }];
      this.updateFormCompletion();
    }
  }

  onPrimaryFileRemoved(): void {
    this.uploadedFiles = [];
    this.thumbnailUrl = null;
    this.updateFormCompletion();
  }

  hasFileOrLink(): boolean {
    const hasUploadedFiles = this.uploadedFiles.length > 0;
    const hasExternalLink = !!this.resourceForm.get('externalLink')?.value;
    const hasLanguageFiles = Object.values(this.languageFiles).some(files => files.length > 0);
    return hasUploadedFiles || hasExternalLink || hasLanguageFiles;
  }

  getResourcePreviewName(): string {
    if (this.uploadedFiles.length > 0) {
      return this.uploadedFiles[0].name;
    }
    
    const externalLink = this.resourceForm.get('externalLink')?.value;
    if (externalLink) {
      try {
        const url = new URL(externalLink);
        return url.hostname.replace('www.', '');
      } catch {
        return 'External Resource';
      }
    }
    
    const languageFilesCount = Object.values(this.languageFiles)
      .reduce((total, files) => total + files.length, 0);
    if (languageFilesCount > 0) {
      return `${languageFilesCount} language file${languageFilesCount > 1 ? 's' : ''}`;
    }
    
    return 'No files selected';
  }

  getResourcePreviewType(): string {
    if (this.uploadedFiles.length > 0) {
      return 'Uploaded File';
    }
    
    if (this.resourceForm.get('externalLink')?.value) {
      return 'External Link';
    }
    
    const languageFilesCount = Object.values(this.languageFiles)
      .reduce((total, files) => total + files.length, 0);
    if (languageFilesCount > 0) {
      return 'Language Files';
    }
    
    return 'None';
  }

  clearFileSelection(): void {
    this.selectedUploadMethod = null;
    this.uploadedFiles = [];
    this.languageFiles = { en: [], es: [], pt: [] };
    this.thumbnailUrl = null;
    this.resourceForm.patchValue({
      externalLink: '',
      thumbnailUrl: '',
      fileLinks: { en: '', es: '', pt: '' }
    });
    this.updateFormCompletion();
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  ngOnDestroy(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }
  }
}