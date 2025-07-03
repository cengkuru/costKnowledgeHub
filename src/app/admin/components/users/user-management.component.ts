import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-8">
      <h1 class="text-2xl font-semibold mb-4">User Management</h1>
      <p>User management component - to be implemented</p>
    </div>
  `,
  styles: []
})
export class UserManagementComponent {}