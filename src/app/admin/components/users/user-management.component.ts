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
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.scss'
})
export class UserManagementComponent implements OnInit {
  public i18nService = inject(I18nService);
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

  constructor() {
    this.userForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      displayName: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(6)]],
      role: ['viewer', Validators.required]
    });
  }

  async ngOnInit(): Promise<void> {
    this.currentUserId = this.authService.currentUser?.uid || null;

    // Debug: Check if user has admin privileges
    const isAdmin = await this.authService.isAdmin();
    console.log('=== USER MANAGEMENT DEBUG ===');
    console.log('Current user ID:', this.currentUserId);
    console.log('Current user email:', this.authService.currentUser?.email);
    console.log('Is user admin?', isAdmin);
    console.log('=============================');

    this.loadUsers();
  }

  async loadUsers(): Promise<void> {
    this.loading = true;

    try {
      // Load users from Firestore only
      this.users = await this.userService.getUsers();
      this.applyFilters();
    } catch (error) {
      console.error('Error loading users:', error);
      this.users = [];
      this.applyFilters();
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
