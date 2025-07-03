import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { I18nService } from '../../../core/services/i18n.service';
import { UserService, User } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="user-management">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900">{{ i18nService.t('admin.users.title') }}</h1>
        <p class="text-gray-600 mt-2">{{ i18nService.t('admin.users.subtitle') }}</p>
      </div>

      <!-- Actions Bar -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div class="flex flex-col sm:flex-row gap-4">
          <!-- Search -->
          <div class="flex-1">
            <input
              type="text"
              [(ngModel)]="searchQuery"
              (ngModelChange)="onSearchChange()"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cost-teal focus:border-transparent"
              [placeholder]="i18nService.t('admin.users.searchPlaceholder')">
          </div>
          
          <!-- Filters -->
          <select
            [(ngModel)]="selectedRole"
            (ngModelChange)="applyFilters()"
            class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cost-teal">
            <option value="all">{{ i18nService.t('admin.users.allRoles') }}</option>
            <option value="admin">{{ i18nService.t('admin.users.adminRole') }}</option>
            <option value="editor">{{ i18nService.t('admin.users.editorRole') }}</option>
            <option value="viewer">{{ i18nService.t('admin.users.viewerRole') }}</option>
          </select>
          
          <select
            [(ngModel)]="selectedStatus"
            (ngModelChange)="applyFilters()"
            class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cost-teal">
            <option value="all">{{ i18nService.t('admin.users.allStatuses') }}</option>
            <option value="active">{{ i18nService.t('admin.users.activeStatus') }}</option>
            <option value="suspended">{{ i18nService.t('admin.users.suspendedStatus') }}</option>
            <option value="pending">{{ i18nService.t('admin.users.pendingStatus') }}</option>
          </select>
          
          <!-- Add User Button -->
          <button
            (click)="showAddUserModal = true"
            class="btn-primary px-6 py-2 rounded-lg flex items-center gap-2">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            {{ i18nService.t('admin.users.addUser') }}
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="bg-white rounded-lg shadow-sm p-8 text-center">
        <div class="inline-flex items-center">
          <svg class="animate-spin h-5 w-5 text-cost-teal mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {{ i18nService.t('admin.users.loading') }}
        </div>
      </div>

      <!-- Users Table -->
      <div *ngIf="!loading && filteredUsers.length > 0" class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {{ i18nService.t('admin.users.userColumn') }}
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {{ i18nService.t('admin.users.roleColumn') }}
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {{ i18nService.t('admin.users.statusColumn') }}
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {{ i18nService.t('admin.users.lastLoginColumn') }}
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {{ i18nService.t('admin.users.actions') }}
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr *ngFor="let user of paginatedUsers" class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div class="flex-shrink-0 h-10 w-10">
                      <div class="h-10 w-10 rounded-full bg-cost-teal text-white flex items-center justify-center font-medium">
                        {{ user.displayName ? user.displayName[0].toUpperCase() : user.email[0].toUpperCase() }}
                      </div>
                    </div>
                    <div class="ml-4">
                      <div class="text-sm font-medium text-gray-900">
                        {{ user.displayName || 'No name' }}
                      </div>
                      <div class="text-sm text-gray-500">
                        {{ user.email }}
                      </div>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <select
                    [(ngModel)]="user.role"
                    (ngModelChange)="updateUserRole(user, $event)"
                    class="text-sm border border-gray-300 rounded px-2 py-1">
                    <option value="admin">{{ i18nService.t('admin.users.adminRole') }}</option>
                    <option value="editor">{{ i18nService.t('admin.users.editorRole') }}</option>
                    <option value="viewer">{{ i18nService.t('admin.users.viewerRole') }}</option>
                  </select>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span
                    class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                    [ngClass]="{
                      'bg-green-100 text-green-800': user.status === 'active',
                      'bg-red-100 text-red-800': user.status === 'suspended',
                      'bg-yellow-100 text-yellow-800': user.status === 'pending'
                    }">
                    {{ i18nService.t('admin.users.' + user.status + 'Status') }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {{ formatDate(user.lastLoginAt) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div class="flex items-center gap-2">
                    <button
                      (click)="viewUserActivity(user)"
                      class="text-cost-teal hover:text-cost-teal/80"
                      [title]="i18nService.t('admin.users.viewActivity')">
                      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </button>
                    <button
                      (click)="toggleUserStatus(user)"
                      class="hover:text-gray-700"
                      [class.text-green-600]="user.status === 'suspended'"
                      [class.text-red-600]="user.status === 'active'"
                      [title]="user.status === 'active' ? i18nService.t('admin.users.suspend') : i18nService.t('admin.users.activate')">
                      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path *ngIf="user.status === 'active'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        <path *ngIf="user.status !== 'active'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                    <button
                      (click)="sendPasswordReset(user)"
                      class="text-blue-600 hover:text-blue-800"
                      [title]="i18nService.t('admin.users.resetPassword')">
                      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                    </button>
                    <button
                      *ngIf="user.uid !== currentUserId"
                      (click)="deleteUser(user)"
                      class="text-red-600 hover:text-red-800"
                      [title]="i18nService.t('admin.users.delete')">
                      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <!-- Pagination -->
        <div class="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div class="flex-1 flex justify-between sm:hidden">
            <button
              (click)="previousPage()"
              [disabled]="currentPage === 1"
              class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
              {{ i18nService.t('admin.users.previous') }}
            </button>
            <button
              (click)="nextPage()"
              [disabled]="currentPage === totalPages"
              class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
              {{ i18nService.t('admin.users.next') }}
            </button>
          </div>
          <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p class="text-sm text-gray-700">
                {{ i18nService.t('admin.users.showing') }}
                <span class="font-medium">{{ (currentPage - 1) * pageSize + 1 }}</span>
                {{ i18nService.t('admin.users.to') }}
                <span class="font-medium">{{ Math.min(currentPage * pageSize, filteredUsers.length) }}</span>
                {{ i18nService.t('admin.users.of') }}
                <span class="font-medium">{{ filteredUsers.length }}</span>
                {{ i18nService.t('admin.users.users') }}
              </p>
            </div>
            <div>
              <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  (click)="previousPage()"
                  [disabled]="currentPage === 1"
                  class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                  <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
                  </svg>
                </button>
                <span class="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                  {{ i18nService.t('admin.users.page') }} {{ currentPage }} / {{ totalPages }}
                </span>
                <button
                  (click)="nextPage()"
                  [disabled]="currentPage === totalPages"
                  class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                  <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>

      <!-- No Users State -->
      <div *ngIf="!loading && filteredUsers.length === 0" class="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
        <h3 class="mt-2 text-sm font-medium text-gray-900">{{ i18nService.t('admin.users.noUsers') }}</h3>
        <p class="mt-1 text-sm text-gray-500">{{ i18nService.t('admin.users.getStarted') }}</p>
        <div class="mt-6">
          <button
            (click)="showAddUserModal = true"
            class="btn-primary px-4 py-2 rounded-lg">
            {{ i18nService.t('admin.users.addFirstUser') }}
          </button>
        </div>
      </div>

      <!-- Add User Modal -->
      <div *ngIf="showAddUserModal" class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
        <div class="bg-white rounded-lg max-w-md w-full p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">{{ i18nService.t('admin.users.addNewUser') }}</h2>
          
          <form [formGroup]="userForm" (ngSubmit)="onSubmitUser()">
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  {{ i18nService.t('admin.users.email') }}
                </label>
                <input
                  type="email"
                  formControlName="email"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-cost-teal focus:border-cost-teal"
                  [class.border-red-500]="userForm.get('email')?.invalid && userForm.get('email')?.touched">
                <p *ngIf="userForm.get('email')?.invalid && userForm.get('email')?.touched" class="mt-1 text-sm text-red-600">
                  {{ i18nService.t('admin.users.emailRequired') }}
                </p>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  {{ i18nService.t('admin.users.displayName') }}
                </label>
                <input
                  type="text"
                  formControlName="displayName"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-cost-teal focus:border-cost-teal"
                  [class.border-red-500]="userForm.get('displayName')?.invalid && userForm.get('displayName')?.touched">
                <p *ngIf="userForm.get('displayName')?.invalid && userForm.get('displayName')?.touched" class="mt-1 text-sm text-red-600">
                  {{ i18nService.t('admin.users.displayNameRequired') }}
                </p>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  {{ i18nService.t('admin.users.password') }}
                </label>
                <input
                  type="password"
                  formControlName="password"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-cost-teal focus:border-cost-teal"
                  [class.border-red-500]="userForm.get('password')?.invalid && userForm.get('password')?.touched">
                <p *ngIf="userForm.get('password')?.invalid && userForm.get('password')?.touched" class="mt-1 text-sm text-red-600">
                  {{ i18nService.t('admin.users.passwordRequired') }}
                </p>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  {{ i18nService.t('admin.users.role') }}
                </label>
                <select
                  formControlName="role"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-cost-teal focus:border-cost-teal">
                  <option value="viewer">{{ i18nService.t('admin.users.viewerRole') }}</option>
                  <option value="editor">{{ i18nService.t('admin.users.editorRole') }}</option>
                  <option value="admin">{{ i18nService.t('admin.users.adminRole') }}</option>
                </select>
              </div>
            </div>

            <div class="mt-6 flex justify-end gap-3">
              <button
                type="button"
                (click)="cancelAddUser()"
                class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
                {{ i18nService.t('admin.users.cancel') }}
              </button>
              <button
                type="submit"
                [disabled]="userForm.invalid || submitting"
                class="px-4 py-2 bg-cost-teal text-white rounded-md hover:bg-cost-teal/90 disabled:opacity-50">
                {{ submitting ? i18nService.t('admin.users.adding') : i18nService.t('admin.users.addUser') }}
              </button>
            </div>

            <div *ngIf="errorMessage" class="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p class="text-sm text-red-800">{{ errorMessage }}</p>
            </div>
          </form>
        </div>
      </div>

      <!-- User Activity Modal -->
      <div *ngIf="showActivityModal && selectedUser" class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
        <div class="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-lg font-semibold text-gray-900">
              {{ i18nService.t('admin.users.activityFor') }} {{ selectedUser.displayName || selectedUser.email }}
            </h2>
            <button
              (click)="closeActivityModal()"
              class="text-gray-400 hover:text-gray-500">
              <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="space-y-3">
            <div *ngFor="let activity of userActivities" class="border-l-4 border-cost-teal/20 pl-4 py-2">
              <div class="flex justify-between items-start">
                <div>
                  <p class="text-sm font-medium text-gray-900">{{ activity.action }}</p>
                  <p *ngIf="activity.resourceId" class="text-xs text-gray-500">
                    Resource ID: {{ activity.resourceId }}
                  </p>
                </div>
                <span class="text-xs text-gray-500">{{ formatDate(activity.timestamp) }}</span>
              </div>
            </div>
            <div *ngIf="userActivities.length === 0" class="text-center py-8 text-gray-500">
              {{ i18nService.t('admin.users.noActivity') }}
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .user-management {
      padding: 2rem;
    }

    @media (max-width: 768px) {
      .user-management {
        padding: 1rem;
      }
    }
  `]
})
export class UserManagementComponent implements OnInit {
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  
  users: User[] = [];
  filteredUsers: User[] = [];
  loading = true;
  searchQuery = '';
  selectedRole: 'all' | 'admin' | 'editor' | 'viewer' = 'all';
  selectedStatus: 'all' | 'active' | 'suspended' | 'pending' = 'all';
  
  // Pagination
  pageSize = 10;
  currentPage = 1;
  totalPages = 1;
  
  // Modals
  showAddUserModal = false;
  showActivityModal = false;
  selectedUser: User | null = null;
  userActivities: any[] = [];
  
  // Form
  userForm: FormGroup;
  submitting = false;
  errorMessage = '';
  
  // Current user
  currentUserId: string | null = null;
  
  Math = Math; // For template
  
  constructor(public i18nService: I18nService) {
    this.userForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      displayName: ['', [Validators.required, Validators.minLength(2)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      role: ['viewer', Validators.required]
    });
  }
  
  ngOnInit(): void {
    this.currentUserId = this.authService.userId;
    this.loadUsers();
  }
  
  async loadUsers(): Promise<void> {
    this.loading = true;
    
    try {
      this.users = await this.userService.getUsers();
      this.applyFilters();
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      this.loading = false;
    }
  }
  
  applyFilters(): void {
    let filtered = [...this.users];
    
    // Apply role filter
    if (this.selectedRole !== 'all') {
      filtered = filtered.filter(u => u.role === this.selectedRole);
    }
    
    // Apply status filter
    if (this.selectedStatus !== 'all') {
      filtered = filtered.filter(u => u.status === this.selectedStatus);
    }
    
    // Apply search filter
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(u => 
        u.email.toLowerCase().includes(query) ||
        u.displayName?.toLowerCase().includes(query) ||
        u.metadata?.department?.toLowerCase().includes(query) ||
        u.metadata?.position?.toLowerCase().includes(query)
      );
    }
    
    this.filteredUsers = filtered;
    this.totalPages = Math.ceil(filtered.length / this.pageSize);
    this.currentPage = 1;
  }
  
  get paginatedUsers(): User[] {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.filteredUsers.slice(start, end);
  }
  
  onSearchChange(): void {
    this.applyFilters();
  }
  
  async updateUserRole(user: User, newRole: 'admin' | 'editor' | 'viewer'): Promise<void> {
    try {
      await this.userService.updateUserRole(user.uid, newRole);
      await this.userService.logActivity(
        this.currentUserId!,
        `Changed role for ${user.email} to ${newRole}`,
        undefined,
        { targetUserId: user.uid, newRole }
      );
    } catch (error) {
      console.error('Error updating user role:', error);
      // Revert the change in UI
      user.role = user.role;
    }
  }
  
  async toggleUserStatus(user: User): Promise<void> {
    const newStatus = user.status === 'active' ? 'suspended' : 'active';
    
    try {
      await this.userService.updateUserStatus(user.uid, newStatus);
      user.status = newStatus;
      
      await this.userService.logActivity(
        this.currentUserId!,
        `${newStatus === 'active' ? 'Activated' : 'Suspended'} user ${user.email}`,
        undefined,
        { targetUserId: user.uid, newStatus }
      );
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  }
  
  async sendPasswordReset(user: User): Promise<void> {
    if (confirm(`Send password reset email to ${user.email}?`)) {
      try {
        await this.userService.sendPasswordReset(user.email);
        alert('Password reset email sent successfully!');
        
        await this.userService.logActivity(
          this.currentUserId!,
          `Sent password reset to ${user.email}`,
          undefined,
          { targetUserId: user.uid }
        );
      } catch (error) {
        console.error('Error sending password reset:', error);
        alert('Failed to send password reset email.');
      }
    }
  }
  
  async deleteUser(user: User): Promise<void> {
    if (confirm(`Are you sure you want to delete ${user.email}? This action cannot be undone.`)) {
      try {
        await this.userService.deleteUser(user.uid);
        await this.loadUsers();
        
        await this.userService.logActivity(
          this.currentUserId!,
          `Deleted user ${user.email}`,
          undefined,
          { targetUserId: user.uid }
        );
      } catch (error) {
        console.error('Error deleting user:', error);
        alert('Failed to delete user. They may have associated data.');
      }
    }
  }
  
  async viewUserActivity(user: User): Promise<void> {
    this.selectedUser = user;
    this.showActivityModal = true;
    
    try {
      this.userActivities = await this.userService.getUserActivity(user.uid);
    } catch (error) {
      console.error('Error loading user activity:', error);
      this.userActivities = [];
    }
  }
  
  closeActivityModal(): void {
    this.showActivityModal = false;
    this.selectedUser = null;
    this.userActivities = [];
  }
  
  async onSubmitUser(): Promise<void> {
    if (this.userForm.invalid) return;
    
    this.submitting = true;
    this.errorMessage = '';
    
    try {
      const { email, displayName, password, role } = this.userForm.value;
      await this.userService.createUser(email, password, displayName, role);
      
      await this.userService.logActivity(
        this.currentUserId!,
        `Created new user ${email} with role ${role}`
      );
      
      this.showAddUserModal = false;
      this.userForm.reset({ role: 'viewer' });
      await this.loadUsers();
    } catch (error: any) {
      console.error('Error creating user:', error);
      this.errorMessage = error.message || 'Failed to create user.';
    } finally {
      this.submitting = false;
    }
  }
  
  cancelAddUser(): void {
    this.showAddUserModal = false;
    this.userForm.reset({ role: 'viewer' });
    this.errorMessage = '';
  }
  
  formatDate(timestamp: any): string {
    if (!timestamp) return 'Never';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch {
      return 'Invalid date';
    }
  }
  
  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }
  
  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }
}