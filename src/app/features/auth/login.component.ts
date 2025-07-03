import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../../core/services/i18n.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  email = '';
  password = '';
  rememberMe = false;
  loading = false;
  errorMessage = '';
  successMessage = '';
  showResetPassword = false;
  resetEmail = '';
  
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  
  constructor(
    public i18nService: I18nService
  ) {}

  async onSubmit(): Promise<void> {
    if (!this.email || !this.password) {
      this.errorMessage = this.i18nService.t('login.errors.requiredFields');
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    try {
      const credential = await this.authService.signIn(this.email, this.password, this.rememberMe);
      
      // Check if user needs to complete profile setup
      if (!credential.user.displayName) {
        await this.router.navigate(['/profile-setup']);
      } else {
        // Navigate to return URL or admin dashboard
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/admin';
        await this.router.navigate([returnUrl]);
      }
    } catch (error: any) {
      this.loading = false;
      
      // Handle specific Firebase auth errors
      switch (error.code) {
        case 'auth/user-not-found':
          this.errorMessage = this.i18nService.t('login.errors.userNotFound');
          break;
        case 'auth/wrong-password':
          this.errorMessage = this.i18nService.t('login.errors.wrongPassword');
          break;
        case 'auth/invalid-credential':
          // This is the new error code for wrong email/password in Firebase v10+
          this.errorMessage = 'Invalid email or password. Please check your credentials and try again.';
          break;
        case 'auth/invalid-email':
          this.errorMessage = this.i18nService.t('login.errors.invalidEmail');
          break;
        case 'auth/too-many-requests':
          this.errorMessage = this.i18nService.t('login.errors.tooManyAttempts');
          break;
        default:
          this.errorMessage = this.i18nService.t('login.errors.genericError') + ' (' + error.code + ')';
      }
    }
  }
  
  async onResetPassword(): Promise<void> {
    if (!this.resetEmail) {
      this.errorMessage = this.i18nService.t('login.errors.emailRequired');
      return;
    }
    
    this.loading = true;
    this.errorMessage = '';
    
    try {
      await this.authService.sendPasswordResetEmail(this.resetEmail);
      this.successMessage = this.i18nService.t('login.resetPassword.success');
      this.showResetPassword = false;
      this.resetEmail = '';
    } catch (error: any) {
      switch (error.code) {
        case 'auth/user-not-found':
          this.errorMessage = this.i18nService.t('login.errors.emailNotFound');
          break;
        case 'auth/invalid-email':
          this.errorMessage = this.i18nService.t('login.errors.invalidEmail');
          break;
        default:
          this.errorMessage = this.i18nService.t('login.errors.resetFailed');
      }
    } finally {
      this.loading = false;
    }
  }
  
  toggleResetPassword(): void {
    this.showResetPassword = !this.showResetPassword;
    this.errorMessage = '';
    this.successMessage = '';
    this.resetEmail = this.email; // Pre-fill with login email if available
  }

  navigateBack(): void {
    this.router.navigate(['/home']);
  }
}
