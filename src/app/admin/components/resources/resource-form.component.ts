import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray } from '@angular/forms';
import { I18nService } from '../../../core/services/i18n.service';
import { ResourceService } from '../../../core/services/resource.service';
import { FirestoreService } from '../../../core/services/firestore.service';
import { StorageService } from '../../../core/services/storage.service';
import { AuthService } from '../../../core/services/auth.service';
import { Resource, ResourceType, Language, TopicCategory } from '../../../core/models/resource.model';
import { FileUploadComponent } from '../file-upload/file-upload.component';

interface FormTab {
  id: string;
  label: string;
  icon: string;
  complete: boolean;
}

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
  
  resourceForm!: FormGroup;
  isEditMode = false;
  resourceId: string | null = null;
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
    { value: 'assurance', label: 'Independent Assurance' },
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
  languageFiles: Record<Language, { url: string; name: string; size: number }[]> = {
    en: [],
    es: [],
    pt: []
  };
  thumbnailUrl: string | null = null;
  
  // Friendly validation messages
  friendlyMessages = {
    required: "This field would really help us! 🙏",
    minlength: "Just a bit more detail would be perfect! ✨",
    maxlength: "That's a bit too long, let's keep it concise 📏",
    email: "That doesn't look quite right. Try: example@email.com",
    url: "URLs should start with http:// or https://",
    pattern: "Hmm, that doesn't match the expected format 🤔"
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
  }
  
  initializeForm(): void {
    // URL validation pattern
    const urlPattern = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;
    
    this.resourceForm = this.fb.group({
      // Basic Information
      title: this.fb.group({
        en: ['', [Validators.required, Validators.minLength(3)]],
        es: ['', [Validators.minLength(3)]],
        pt: ['', [Validators.minLength(3)]]
      }),
      type: ['', Validators.required],
      topics: [[], Validators.required],
      featured: [false],
      status: ['draft'],
      
      // Content
      description: this.fb.group({
        en: ['', [Validators.required, Validators.minLength(10)]],
        es: ['', [Validators.minLength(10)]],
        pt: ['', [Validators.minLength(10)]]
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
      
      // Impact metrics
      impact: this.fb.group({
        savings: [''],
        projects: [''],
        transparency: [''],
        description: ['']
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
    // Smooth scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  
  setActiveLanguage(lang: Language): void {
    this.activeLanguage = lang;
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
        this.showSuccess('Resource updated successfully! 🎉');
      } else {
        const resourceId = await this.resourceService.createResource(formData as Omit<Resource, 'id'>, userId);
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
    // Find first invalid field and focus
    const firstError = document.querySelector('.ng-invalid');
    if (firstError) {
      firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      (firstError as HTMLElement).focus();
    }
    
    this.showError('Please fill in all required fields ✨');
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
    return this.friendlyMessages[errorKey as keyof typeof this.friendlyMessages] || 'Invalid field';
  }
  
  isFieldValid(fieldPath: string): boolean {
    const field = this.resourceForm.get(fieldPath);
    return !!(field && field.valid && field.touched);
  }
  
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
  
  // Legacy method for compatibility - to be removed
  handleFileUpload(event: any): void {
    // This method is no longer used since we're using FileUploadComponent
    console.warn('handleFileUpload is deprecated. Use FileUploadComponent instead.');
  }
  
  removeFile(index: number): void {
    const file = this.uploadedFiles[index];
    if (file) {
      this.onFileRemoved(file.url);
    }
  }
  
  setAsThumbnail(file: {url: string, name: string, size: number}): void {
    this.thumbnailUrl = file.url;
    this.resourceForm.patchValue({ thumbnailUrl: file.url });
    this.resourceForm.markAsDirty();
  }
  
  onLanguageFilesUploaded(files: {url: string, name: string, size: number}[], language: Language): void {
    // Store the file for this language (replace existing since we only allow one per language)
    this.languageFiles[language] = files;
    
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
    this.languageFiles[language] = [];
    
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
  
  ngOnDestroy(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }
  }
}