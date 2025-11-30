import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

/**
 * @deprecated This component is no longer used.
 * Resource types have been replaced with AI-generated tags.
 * This stub remains for backwards compatibility with any remaining references.
 */
@Component({
  selector: 'app-type-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="p-8 text-center">
      <h1 class="text-2xl font-bold text-cost-dark mb-4">Resource Types Removed</h1>
      <p class="text-cost-medium mb-6">
        Resource types have been replaced with AI-generated tags.
        Tags are now automatically suggested when creating or editing resources.
      </p>
      <a routerLink="/admin/resources" class="text-cost-blue hover:underline">
        Go to Resources
      </a>
    </div>
  `
})
export class TypeListComponent {}
