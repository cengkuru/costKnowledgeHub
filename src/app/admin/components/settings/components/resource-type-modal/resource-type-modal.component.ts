import { Component, EventEmitter, Input, Output, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ModalComponent } from '../../../../../shared/components/modal/modal.component';
import { ResourceTypeSettings } from '../../models/settings.model';
import { I18nService } from '../../../../../core/services/i18n.service';
import { Storage, ref, uploadBytesResumable, getDownloadURL } from '@angular/fire/storage';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { inject } from '@angular/core';

@Component({
  selector: 'app-resource-type-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ModalComponent],
  templateUrl: './resource-type-modal.component.html',
  styleUrls: ['./resource-type-modal.component.scss']
})
export class ResourceTypeModalComponent implements OnInit, OnChanges {
  @Input() isOpen = false;
  @Input() resourceType: ResourceTypeSettings | null = null;
  @Input() existingTypes: ResourceTypeSettings[] = [];
  @Output() closeModal = new EventEmitter<void>();
  @Output() saveResourceType = new EventEmitter<ResourceTypeSettings>();
  
  form!: FormGroup;
  isEditMode = false;
  
  // File upload properties
  private storage = inject(Storage);
  private functions = inject(Functions);
  isUploading = false;
  uploadProgress = 0;
  selectedFile: File | null = null;
  isGeneratingAI = false;
  
  
  constructor(
    private fb: FormBuilder,
    public i18nService: I18nService
  ) {}
  
  ngOnInit() {
    this.initForm();
  }
  
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['resourceType'] && !changes['resourceType'].firstChange) {
      this.initForm();
    }
    
    if (changes['isOpen'] && changes['isOpen'].currentValue === true) {
      // Re-initialize form when modal opens
      this.initForm();
    }
  }
  
  initForm() {
    this.isEditMode = !!this.resourceType;
    
    this.form = this.fb.group({
      id: [this.resourceType?.id || '', [Validators.required, Validators.pattern(/^[a-z][a-zA-Z0-9]*$/)]],
      label: [this.resourceType?.label || '', [Validators.required, Validators.minLength(3)]],
      description: [this.resourceType?.description || '', [Validators.required, Validators.minLength(10)]],
      enabled: [this.resourceType?.enabled ?? true],
      order: [this.resourceType?.order || this.getNextOrder(), [Validators.required, Validators.min(0)]],
      defaultCover: [this.resourceType?.defaultCover || '', [Validators.required]]
    });
    
    // Disable ID field in edit mode
    if (this.isEditMode) {
      this.form.get('id')?.disable();
    }
  }
  
  getNextOrder(): number {
    if (!this.existingTypes || this.existingTypes.length === 0) {
      return 0;
    }
    return Math.max(...this.existingTypes.map(t => t.order || 0)) + 1;
  }
  
  onClose() {
    this.form.reset();
    this.closeModal.emit();
  }
  
  onSave() {
    if (this.form.valid) {
      const formValue = this.form.getRawValue();
      
      // Check for duplicate ID when adding new
      if (!this.isEditMode && this.existingTypes.some(t => t.id === formValue.id)) {
        this.form.get('id')?.setErrors({ duplicate: true });
        return;
      }
      
      this.saveResourceType.emit(formValue);
      this.form.reset();
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.form.controls).forEach(key => {
        this.form.get(key)?.markAsTouched();
      });
    }
  }
  
  getFieldError(fieldName: string): string {
    const control = this.form.get(fieldName);
    if (!control || !control.touched || !control.errors) {
      return '';
    }
    
    const errors = control.errors;
    if (errors['required']) {
      return this.i18nService.t('admin.settingsPage.validation.required');
    }
    if (errors['minlength']) {
      return this.i18nService.t('admin.settingsPage.validation.minLength', { min: errors['minlength'].requiredLength });
    }
    if (errors['pattern']) {
      return this.i18nService.t('admin.settingsPage.validation.idPattern');
    }
    if (errors['duplicate']) {
      return this.i18nService.t('admin.settingsPage.validation.duplicate');
    }
    if (errors['min']) {
      return this.i18nService.t('admin.settingsPage.validation.min', { min: errors['min'].min });
    }
    
    return '';
  }
  
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }
      
      this.selectedFile = file;
      this.uploadFile();
    }
  }
  
  async uploadFile(): Promise<void> {
    if (!this.selectedFile) return;
    
    this.isUploading = true;
    this.uploadProgress = 0;
    
    try {
      // Create a unique file name
      const timestamp = Date.now();
      const fileName = `resource-covers/${timestamp}_${this.selectedFile.name}`;
      const storageRef = ref(this.storage, fileName);
      
      // Upload file
      const uploadTask = uploadBytesResumable(storageRef, this.selectedFile);
      
      uploadTask.on('state_changed',
        (snapshot) => {
          // Update progress
          this.uploadProgress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        },
        (error) => {
          console.error('Upload error:', error);
          this.isUploading = false;
          alert('Upload failed. Please try again.');
        },
        async () => {
          // Get download URL and update form
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          this.form.patchValue({ defaultCover: downloadURL });
          this.isUploading = false;
          this.selectedFile = null;
        }
      );
    } catch (error) {
      console.error('Upload error:', error);
      this.isUploading = false;
      alert('Upload failed. Please try again.');
    }
  }
  
  async generateWithAI(): Promise<void> {
    const title = this.form.get('label')?.value;
    const description = this.form.get('description')?.value;
    
    if (!title || !description) {
      alert('Please fill in the label and description fields first');
      return;
    }
    
    this.isGeneratingAI = true;
    
    try {
      const generateCoverImage = httpsCallable(this.functions, 'generateCoverImage');
      const result = await generateCoverImage({ title, description });
      const data = result.data as { success: boolean; imageUrl: string; prompt: string };
      
      if (data.success && data.imageUrl) {
        this.form.patchValue({ defaultCover: data.imageUrl });
      } else {
        alert('Failed to generate image. Please try again.');
      }
    } catch (error) {
      console.error('AI generation error:', error);
      alert('Failed to generate image. Please try again.');
    } finally {
      this.isGeneratingAI = false;
    }
  }
}