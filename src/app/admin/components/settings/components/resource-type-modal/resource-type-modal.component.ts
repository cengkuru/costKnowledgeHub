import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ModalComponent } from '../../../../../shared/components/modal/modal.component';
import { ResourceTypeSettings } from '../../models/settings.model';
import { I18nService } from '../../../../../core/services/i18n.service';

@Component({
  selector: 'app-resource-type-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ModalComponent],
  templateUrl: './resource-type-modal.component.html',
  styleUrls: ['./resource-type-modal.component.scss']
})
export class ResourceTypeModalComponent implements OnInit {
  @Input() isOpen = false;
  @Input() resourceType: ResourceTypeSettings | null = null;
  @Input() existingTypes: ResourceTypeSettings[] = [];
  @Output() closeModal = new EventEmitter<void>();
  @Output() saveResourceType = new EventEmitter<ResourceTypeSettings>();
  
  form!: FormGroup;
  isEditMode = false;
  
  // Available icons for resource types
  availableIcons = [
    { value: 'book-open', label: 'Book', icon: '📖' },
    { value: 'academic-cap', label: 'Academic', icon: '🎓' },
    { value: 'document-text', label: 'Document', icon: '📄' },
    { value: 'chart-bar', label: 'Chart', icon: '📊' },
    { value: 'beaker', label: 'Research', icon: '🧪' },
    { value: 'clipboard-list', label: 'Checklist', icon: '📋' },
    { value: 'code', label: 'Code', icon: '💻' },
    { value: 'photograph', label: 'Image', icon: '🖼️' },
    { value: 'globe', label: 'Global', icon: '🌍' },
    { value: 'shield-check', label: 'Policy', icon: '🛡️' },
    { value: 'template', label: 'Template', icon: '📐' },
    { value: 'lightbulb', label: 'Idea', icon: '💡' },
    { value: 'database', label: 'Database', icon: '🗄️' },
    { value: 'briefcase', label: 'Business', icon: '💼' },
    { value: 'presentation-chart-bar', label: 'Presentation', icon: '📈' },
    { value: 'document-duplicate', label: 'Duplicate', icon: '📑' }
  ];
  
  constructor(
    private fb: FormBuilder,
    public i18nService: I18nService
  ) {}
  
  ngOnInit() {
    this.initForm();
  }
  
  initForm() {
    this.isEditMode = !!this.resourceType;
    
    this.form = this.fb.group({
      id: [this.resourceType?.id || '', [Validators.required, Validators.pattern(/^[a-z][a-zA-Z0-9]*$/)]],
      label: [this.resourceType?.label || '', [Validators.required, Validators.minLength(3)]],
      icon: [this.resourceType?.icon || 'document-text', [Validators.required]],
      description: [this.resourceType?.description || '', [Validators.required, Validators.minLength(10)]],
      enabled: [this.resourceType?.enabled ?? true],
      order: [this.resourceType?.order || this.getNextOrder(), [Validators.required, Validators.min(0)]],
      defaultCover: [this.resourceType?.defaultCover || '']
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
      return this.i18nService.t('validation.required');
    }
    if (errors['minlength']) {
      return this.i18nService.t('validation.minLength', { min: errors['minlength'].requiredLength });
    }
    if (errors['pattern']) {
      return this.i18nService.t('validation.idPattern');
    }
    if (errors['duplicate']) {
      return this.i18nService.t('validation.duplicate');
    }
    if (errors['min']) {
      return this.i18nService.t('validation.min', { min: errors['min'].min });
    }
    
    return '';
  }
}