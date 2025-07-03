import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-8">
      <h1 class="text-2xl font-semibold mb-4">Settings</h1>
      <p>Settings component - to be implemented</p>
    </div>
  `,
  styles: []
})
export class SettingsComponent {}