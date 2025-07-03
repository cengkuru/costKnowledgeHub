import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { I18nService } from '../../core/services/i18n.service';

@Component({
  selector: 'app-profile-setup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile-setup.component.html',
  styleUrl: './profile-setup.component.scss'
})
export class ProfileSetupComponent {
  public authService = inject(AuthService);
  private router = inject(Router);
  
  displayName = '';
  loading = false;
  errorMessage = '';
  
  constructor(public i18nService: I18nService) {
    // Pre-fill with email username if available
    const email = this.authService.userEmail;
    if (email) {
      this.displayName = email.split('@')[0];
    }
  }
  
  async onSubmit(): Promise<void> {
    if (!this.displayName.trim()) {
      this.errorMessage = 'Please enter your display name';
      return;
    }
    
    this.loading = true;
    this.errorMessage = '';
    
    try {
      await this.authService.updateUserProfile(this.displayName.trim());
      
      // Navigate to admin dashboard after successful profile setup
      await this.router.navigate(['/admin']);
    } catch (error: any) {
      this.loading = false;
      this.errorMessage = 'Failed to update profile. Please try again.';
      console.error('Profile update error:', error);
    }
  }
  
  async skipForNow(): Promise<void> {
    // Allow users to skip but set a default display name
    const email = this.authService.userEmail;
    if (email) {
      try {
        await this.authService.updateUserProfile(email.split('@')[0]);
      } catch (error) {
        console.error('Error setting default display name:', error);
      }
    }
    
    await this.router.navigate(['/admin']);
  }
}