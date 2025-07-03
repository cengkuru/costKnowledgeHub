import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-resource-form',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="p-8">
      <h1 class="text-2xl font-semibold mb-4">Resource Form</h1>
      <p>Resource form component - to be implemented</p>
      <a routerLink="/admin/resources" class="text-cost-teal hover:underline">Back to resources</a>
    </div>
  `,
  styles: []
})
export class ResourceFormComponent {}