import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { I18nService } from '../../core/services/i18n.service';
import { User } from '../../core/services/user.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {
  registerForm: FormGroup;
  loading = false;
  error = '';
  passwordVisible = false;
  confirmPasswordVisible = false;
  passwordStrength = 0;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private userService: UserService,
    private router: Router,
    public i18nService: I18nService
  ) {
    this.registerForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
      displayName: ['', Validators.required],
      acceptTerms: [false, Validators.requiredTrue]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit() {
    // Check if user is already logged in
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.router.navigate(['/admin']);
      }
    });

    // Watch password changes for strength indicator
    this.registerForm.get('password')?.valueChanges.subscribe(password => {
      this.passwordStrength = this.calculatePasswordStrength(password);
    });
  }

  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    if (!password || !confirmPassword) {
      return null;
    }

    if (password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    } else {
      confirmPassword.setErrors(null);
      return null;
    }
  }

  calculatePasswordStrength(password: string): number {
    if (!password) return 0;
    
    let strength = 0;
    
    // Length check
    if (password.length >= 8) strength += 20;
    if (password.length >= 12) strength += 20;
    
    // Character variety checks
    if (/[a-z]/.test(password)) strength += 20;
    if (/[A-Z]/.test(password)) strength += 20;
    if (/[0-9]/.test(password)) strength += 10;
    if (/[^A-Za-z0-9]/.test(password)) strength += 10;
    
    return Math.min(strength, 100);
  }

  getPasswordStrengthClass(): string {
    if (this.passwordStrength < 40) return 'weak';
    if (this.passwordStrength < 70) return 'medium';
    return 'strong';
  }

  getPasswordStrengthText(): string {
    if (this.passwordStrength < 40) return this.i18nService.t('register.passwordWeak');
    if (this.passwordStrength < 70) return this.i18nService.t('register.passwordMedium');
    return this.i18nService.t('register.passwordStrong');
  }

  togglePasswordVisibility() {
    this.passwordVisible = !this.passwordVisible;
  }

  toggleConfirmPasswordVisibility() {
    this.confirmPasswordVisible = !this.confirmPasswordVisible;
  }

  async onSubmit() {
    if (this.registerForm.invalid) {
      return;
    }

    this.loading = true;
    this.error = '';

    try {
      const { email, password, displayName } = this.registerForm.value;

      // Create user account
      const userCredential = await this.authService.signUp(email, password);
      
      if (userCredential.user) {
        // Update display name
        await this.authService.updateUserProfile(displayName);

        // Check if this is the first user (will be admin)
        const users = await this.userService.getUsers();
        const isFirstUser = users.length === 0;

        // Create user document in Firestore
        // UserService.createUser handles the Firestore document creation
        // For the first user, we need to set admin role via Cloud Function
        if (isFirstUser) {
          // Set admin role for first user using special first admin function
          await this.authService.setFirstAdmin(email);
        }

        // If first user, set admin custom claim
        if (isFirstUser) {
          // Note: In production, this should be done via a Cloud Function
          // For now, the user will need to sign out and back in to get admin privileges
          console.log('First user registered - admin role assigned');
        }

        // Navigate to profile setup or admin dashboard
        this.router.navigate(['/admin']);
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      
      // Handle specific Firebase errors
      switch (error.code) {
        case 'auth/email-already-in-use':
          this.error = this.i18nService.t('register.emailInUse');
          break;
        case 'auth/weak-password':
          this.error = this.i18nService.t('register.weakPassword');
          break;
        case 'auth/invalid-email':
          this.error = this.i18nService.t('register.invalidEmail');
          break;
        default:
          this.error = this.i18nService.t('register.error');
      }
    } finally {
      this.loading = false;
    }
  }

  getFieldError(fieldName: string): string {
    const field = this.registerForm.get(fieldName);
    if (!field || !field.touched || !field.errors) {
      return '';
    }

    if (field.errors['required']) {
      return this.i18nService.t('common.fieldRequired');
    }
    if (field.errors['email']) {
      return this.i18nService.t('register.invalidEmail');
    }
    if (field.errors['minlength']) {
      return this.i18nService.t('register.passwordTooShort');
    }
    if (fieldName === 'confirmPassword' && field.errors['passwordMismatch']) {
      return this.i18nService.t('register.passwordMismatch');
    }
    if (fieldName === 'acceptTerms' && field.errors['requiredTrue']) {
      return this.i18nService.t('register.termsRequired');
    }

    return '';
  }
}