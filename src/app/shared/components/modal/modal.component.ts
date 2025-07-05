import { Component, EventEmitter, Input, Output, TemplateRef, ViewChild, ElementRef, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss'],
  animations: [
    trigger('modalAnimation', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('200ms ease-out', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('150ms ease-in', style({ opacity: 0 }))
      ])
    ]),
    trigger('contentAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.95) translateY(10px)' }),
        animate('200ms ease-out', style({ opacity: 1, transform: 'scale(1) translateY(0)' }))
      ]),
      transition(':leave', [
        animate('150ms ease-in', style({ opacity: 0, transform: 'scale(0.95) translateY(10px)' }))
      ])
    ])
  ]
})
export class ModalComponent implements OnInit, OnDestroy {
  @Input() isOpen = false;
  @Input() title = '';
  @Input() size: 'sm' | 'md' | 'lg' | 'xl' = 'md';
  @Input() showCloseButton = true;
  @Input() showFooter = true;
  @Input() closeOnBackdropClick = true;
  @Input() closeOnEscape = true;
  
  @Output() closeModal = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<any>();
  
  @ViewChild('modalContent') modalContent!: ElementRef;
  
  private escapeListener?: (event: KeyboardEvent) => void;
  
  ngOnInit() {
    if (this.closeOnEscape) {
      this.escapeListener = (event: KeyboardEvent) => {
        if (event.key === 'Escape' && this.isOpen) {
          this.close();
        }
      };
      document.addEventListener('keydown', this.escapeListener);
    }
  }
  
  ngOnDestroy() {
    if (this.escapeListener) {
      document.removeEventListener('keydown', this.escapeListener);
    }
  }
  
  onBackdropClick(event: MouseEvent) {
    if (this.closeOnBackdropClick && event.target === event.currentTarget) {
      this.close();
    }
  }
  
  close() {
    this.closeModal.emit();
  }
  
  onConfirm(data?: any) {
    this.confirm.emit(data);
  }
  
  getSizeClasses(): string {
    const sizeMap = {
      'sm': 'max-w-md',
      'md': 'max-w-lg',
      'lg': 'max-w-2xl',
      'xl': 'max-w-4xl'
    };
    return sizeMap[this.size] || sizeMap['md'];
  }
}