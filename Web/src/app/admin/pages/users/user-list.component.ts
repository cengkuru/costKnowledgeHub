import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminApiService } from '../../services/admin-api.service';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  createdAt?: string;
}

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-cost-dark">Users</h1>
          <p class="text-cost-medium mt-1">Manage admin users and access</p>
        </div>
        <button (click)="showCreateModal = true"
          class="inline-flex items-center gap-2 px-4 py-2 bg-cost-blue text-white rounded-xl hover:bg-cost-blue-600 transition-colors">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add User
        </button>
      </div>

      <!-- Users Table -->
      <div class="bg-white rounded-2xl shadow-sm border border-cost-light/30 overflow-hidden">
        @if (isLoading()) {
        <div class="p-8 text-center">
          <svg class="w-8 h-8 animate-spin mx-auto text-cost-blue" xmlns="http://www.w3.org/2000/svg" fill="none"
            viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
          <p class="text-cost-medium mt-2">Loading users...</p>
        </div>
        } @else if (users().length === 0) {
        <div class="p-8 text-center">
          <svg class="w-12 h-12 mx-auto text-cost-light" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <p class="text-cost-medium mt-4">No users found</p>
        </div>
        } @else {
        <table class="w-full">
          <thead class="bg-cost-light/20">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-cost-medium uppercase tracking-wider">User</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-cost-medium uppercase tracking-wider">Role</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-cost-medium uppercase tracking-wider">Created</th>
              <th class="px-6 py-3 text-right text-xs font-medium text-cost-medium uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-cost-light/30">
            @for (user of users(); track user.id) {
            <tr class="hover:bg-cost-light/10">
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 bg-cost-blue/10 rounded-full flex items-center justify-center">
                    <span class="text-cost-blue font-medium text-sm">{{ getInitials(user.name) }}</span>
                  </div>
                  <div>
                    <p class="font-medium text-cost-dark">{{ user.name }}</p>
                    <p class="text-sm text-cost-medium">{{ user.email }}</p>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4">
                <span [class]="getRoleClass(user.role)">
                  {{ user.role }}
                </span>
              </td>
              <td class="px-6 py-4 text-sm text-cost-medium">
                {{ formatDate(user.createdAt) }}
              </td>
              <td class="px-6 py-4 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button (click)="resendWelcomeEmail(user)"
                    [disabled]="resendingEmail() === user.id"
                    class="p-2 text-cost-medium hover:text-cost-blue hover:bg-cost-blue/10 rounded-lg transition-colors"
                    title="Resend welcome email">
                    @if (resendingEmail() === user.id) {
                    <svg class="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                    } @else {
                    <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" stroke-width="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                    }
                  </button>
                  <button (click)="toggleRole(user)"
                    [disabled]="togglingRole() === user.id"
                    class="p-2 text-cost-medium hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                    title="Toggle role">
                    @if (togglingRole() === user.id) {
                    <svg class="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                    } @else {
                    <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" stroke-width="2">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                    }
                  </button>
                  <button (click)="deleteUser(user)"
                    class="p-2 text-cost-medium hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete user">
                    <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" stroke-width="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
            }
          </tbody>
        </table>
        }
      </div>

      <!-- Create User Modal -->
      @if (showCreateModal) {
      <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" (click)="showCreateModal = false">
        <div class="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" (click)="$event.stopPropagation()">
          <h2 class="text-xl font-bold text-cost-dark mb-4">Add New Admin User</h2>

          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-cost-dark mb-1">Name</label>
              <input type="text" [(ngModel)]="newUser.name"
                class="w-full px-4 py-2 border border-cost-light/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-cost-blue/50"
                placeholder="Full name">
            </div>

            <div>
              <label class="block text-sm font-medium text-cost-dark mb-1">Email</label>
              <input type="email" [(ngModel)]="newUser.email"
                class="w-full px-4 py-2 border border-cost-light/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-cost-blue/50"
                placeholder="email@example.com">
            </div>

            <div class="flex items-center gap-2">
              <input type="checkbox" id="sendEmail" [(ngModel)]="newUser.sendEmail"
                class="w-4 h-4 text-cost-blue border-cost-light rounded focus:ring-cost-blue">
              <label for="sendEmail" class="text-sm text-cost-medium">Send welcome email with credentials</label>
            </div>
          </div>

          <div class="flex justify-end gap-3 mt-6">
            <button (click)="showCreateModal = false"
              class="px-4 py-2 text-cost-medium hover:bg-cost-light/30 rounded-xl transition-colors">
              Cancel
            </button>
            <button (click)="createUser()"
              [disabled]="isCreating() || !newUser.name || !newUser.email"
              class="px-4 py-2 bg-cost-blue text-white rounded-xl hover:bg-cost-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              @if (isCreating()) {
              <svg class="w-5 h-5 animate-spin inline-block" xmlns="http://www.w3.org/2000/svg" fill="none"
                viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              } @else {
              Create User
              }
            </button>
          </div>
        </div>
      </div>
      }
    </div>
  `
})
export class UserListComponent implements OnInit {
  users = signal<User[]>([]);
  isLoading = signal(true);
  isCreating = signal(false);
  resendingEmail = signal<string | null>(null);
  togglingRole = signal<string | null>(null);
  showCreateModal = false;

  newUser = {
    name: '',
    email: '',
    sendEmail: true
  };

  constructor(private adminApi: AdminApiService) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoading.set(true);
    this.adminApi.listUsers().subscribe({
      next: (response) => {
        this.users.set(response.data);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  createUser(): void {
    if (!this.newUser.name || !this.newUser.email) return;

    this.isCreating.set(true);
    this.adminApi.createUser(this.newUser.email, this.newUser.name, this.newUser.sendEmail).subscribe({
      next: (response) => {
        this.isCreating.set(false);
        this.showCreateModal = false;
        this.newUser = { name: '', email: '', sendEmail: true };
        this.loadUsers();

        if (response.emailSent) {
          alert('User created! Welcome email sent.');
        } else {
          alert(`User created! Temporary password: ${response.temporaryPassword}\n\nPlease share this with the user securely.`);
        }
      },
      error: (err) => {
        this.isCreating.set(false);
        alert(err.error?.error || 'Failed to create user');
      }
    });
  }

  resendWelcomeEmail(user: User): void {
    this.resendingEmail.set(user.id);
    this.adminApi.resendWelcomeEmail(user.id).subscribe({
      next: (response) => {
        this.resendingEmail.set(null);
        if (response.emailSent) {
          alert('Welcome email sent with new temporary password!');
        } else {
          alert(`Email failed. New temporary password: ${response.temporaryPassword}`);
        }
      },
      error: () => {
        this.resendingEmail.set(null);
        alert('Failed to resend welcome email');
      }
    });
  }

  toggleRole(user: User): void {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    if (!confirm(`Change ${user.name}'s role from ${user.role} to ${newRole}?`)) return;

    this.togglingRole.set(user.id);
    this.adminApi.updateUserRole(user.id, newRole).subscribe({
      next: () => {
        this.togglingRole.set(null);
        this.loadUsers();
      },
      error: (err) => {
        this.togglingRole.set(null);
        alert(err.error?.error || 'Failed to update role');
      }
    });
  }

  deleteUser(user: User): void {
    if (!confirm(`Are you sure you want to delete ${user.name}? This cannot be undone.`)) return;

    this.adminApi.deleteUser(user.id).subscribe({
      next: () => {
        this.loadUsers();
      },
      error: (err) => {
        alert(err.error?.error || 'Failed to delete user');
      }
    });
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  getRoleClass(role: string): string {
    return role === 'admin'
      ? 'px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded-full'
      : 'px-2 py-1 text-xs font-medium bg-slate-100 text-slate-700 rounded-full';
  }

  formatDate(date?: string): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}
