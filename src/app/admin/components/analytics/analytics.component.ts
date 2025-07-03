import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-8">
      <h1 class="text-2xl font-semibold mb-4">Analytics Dashboard</h1>
      <p>Analytics component - to be implemented</p>
    </div>
  `,
  styles: []
})
export class AnalyticsComponent {}