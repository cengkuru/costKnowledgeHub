import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-file-upload',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-8">
      <h1 class="text-2xl font-semibold mb-4">File Upload</h1>
      <p>File upload component - to be implemented</p>
    </div>
  `,
  styles: []
})
export class FileUploadComponent {}