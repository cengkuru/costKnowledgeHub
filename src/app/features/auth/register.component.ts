import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../../core/services/i18n.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent {
  email = '';
  password = '';
  confirmPassword = '';
  displayName = '';
  acceptTerms = false;
  loading = false;
  errorMessage = '';
  successMessage = '';
  showPassword = false;
  showConfirmPassword = false;
  
  private authService = inject(AuthService);
  private router = inject(Router);
  
  constructor(
    public i18nService: I18nService
  ) {}

  get passwordStrength(): { strength: number; label: string; color: string } {
    if (!this.password) {
      return { strength: 0, label: '', color: '' };
    }

    let strength = 0;
    
    // Length check
    if (this.password.length >= 8) strength++;
    if (this.password.length >= 12) strength++;
    
    // Character variety checks
    if (/[a-z]/.test(this.password)) strength++;
    if (/[A-Z]/.test(this.password)) strength++;
    if (/[0-9]/.test(this.password)) strength++;
    if (/[^a-zA-Z0-9]/.test(this.password)) strength++;
    
    // Determine label and color
    let label = '';
    let color = '';
    
    if (strength <= 2) {
      label = this.i18nService.t('register.passwordStrength.weak');
      color = 'text-red-600';
    } else if (strength <= 4) {
      label = this.i18nService.t('register.passwordStrength.medium');
      color = 'text-yellow-600';
    } else {
      label = this.i18nService.t('register.passwordStrength.strong');
      color = 'text-green-600';
    }
    
    return { strength: Math.min(strength, 6), label, color };
  }

  get passwordsMatch(): boolean {
    return this.password === this.confirmPassword && this.password.length > 0;
  }

  get isFormValid(): boolean {
    return this.email.length > 0 &&
           this.password.length >= 6 &&
           this.passwordsMatch &&
           this.displayName.trim().length > 0 &&
           this.acceptTerms;
  }

  async onSubmit(): Promise<void> {
    if (!this.isFormValid) {
      this.errorMessage = this.i18nService.t('register.errors.requiredFields');
      return;
    }

    if (!this.acceptTerms) {
      this.errorMessage = this.i18nService.t('register.errors.acceptTerms');
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    try {
      // Create account with Firebase Auth
      const credential = await this.authService.signUp(this.email, this.password);
      
      // Update display name immediately
      if (this.displayName.trim()) {
        await this.authService.updateUserProfile(this.displayName.trim());
      }
      
      // Show success message briefly
      this.successMessage = this.i18nService.t('register.success');
      
      // Redirect to admin dashboard (profile setup is handled if needed)
      setTimeout(async () => {
        await this.router.navigate(['/admin']);
      }, 1500);
      
    } catch (error: any) {
      this.loading = false;
      
      // Handle specific Firebase auth errors
      switch (error.code) {
        case 'auth/email-already-in-use':
          this.errorMessage = this.i18nService.t('register.errors.emailInUse');
          break;
        case 'auth/invalid-email':
          this.errorMessage = this.i18nService.t('register.errors.invalidEmail');
          break;
        case 'auth/operation-not-allowed':
          this.errorMessage = this.i18nService.t('register.errors.operationNotAllowed');
          break;
        case 'auth/weak-password':
          this.errorMessage = this.i18nService.t('register.errors.weakPassword');
          break;
        default:
          this.errorMessage = this.i18nService.t('register.errors.genericError') + ' (' + error.code + ')';
      }
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  navigateToLogin(): void {
    this.router.navigate(['/login']);
  }

  navigateBack(): void {
    this.router.navigate(['/home']);
  }
}