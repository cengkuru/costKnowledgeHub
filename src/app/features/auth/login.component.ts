import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../../core/services/i18n.service';

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

  constructor(
    private router: Router,
    public i18nService: I18nService
  ) {}

  onSubmit(): void {
    if (!this.email || !this.password) {
      this.errorMessage = 'Please enter both email and password.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    // Simulate login process
    setTimeout(() => {
      this.loading = false;

      // For demo purposes, accept any email/password combination
      if (this.email && this.password) {
        // Simulate successful login
        alert('Login successful! (Demo mode)');
        this.router.navigate(['/home']);
      } else {
        this.errorMessage = 'Invalid credentials. Please try again.';
      }
    }, 1500);
  }

  navigateBack(): void {
    this.router.navigate(['/home']);
  }
}
