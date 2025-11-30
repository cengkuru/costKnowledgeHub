import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ResourceItem } from '../../models/types';

@Component({
  selector: 'app-resource-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './resource-card.component.html',
  styleUrl: './resource-card.component.css'
})
export class ResourceCardComponent {
  @Input() resource!: ResourceItem;
  @Input() isPopular = false;
  @Input() accessLabel = 'Access';
  @Input() popularLabel = 'Popular';
  @Output() interact = new EventEmitter<string>();
  @Output() filterByType = new EventEmitter<string>();
  @Output() filterByCategory = new EventEmitter<string>();
  @Output() filterByTag = new EventEmitter<string>();

  constructor(private router: Router) {}

  onCardClick(event: MouseEvent): void {
    event.preventDefault();
    this.interact.emit(this.resource.id);
    this.router.navigate(['/resource', this.resource.id]);
  }

  onTypeClick(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.filterByType.emit(this.resource.type);
  }

  onCategoryClick(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.filterByCategory.emit(this.resource.category);
  }

  onTagClick(event: MouseEvent, tag: string): void {
    event.preventDefault();
    event.stopPropagation();
    this.filterByTag.emit(tag);
  }

  getFormattedDate(): string {
    const date = new Date(this.resource.date);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}
