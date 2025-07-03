import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Auth } from '@angular/fire/auth';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-test-auth',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-gray-100 p-8">
      <div class="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
        <h1 class="text-2xl font-bold mb-6">Firebase Authentication Test</h1>
        
        <div class="mb-6 p-4 bg-gray-50 rounded">
          <h2 class="font-semibold mb-2">Firebase Configuration:</h2>
          <pre class="text-xs overflow-auto">{{ firebaseConfig | json }}</pre>
        </div>
        
        <div class="mb-6 p-4 bg-blue-50 rounded">
          <h2 class="font-semibold mb-2">Test Credentials:</h2>
          <p class="text-sm">Email: m.cengkuru&#64;infrastructuretransparency.org</p>
          <p class="text-sm">Password: 12345678</p>
        </div>
        
        <form (ngSubmit)="testAuth()" class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1">Email</label>
            <input 
              type="email" 
              [(ngModel)]="email" 
              name="email"
              class="w-full px-3 py-2 border rounded-md"
              placeholder="Enter email">
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-1">Password</label>
            <input 
              type="password" 
              [(ngModel)]="password" 
              name="password"
              class="w-full px-3 py-2 border rounded-md"
              placeholder="Enter password">
          </div>
          
          <button 
            type="submit" 
            [disabled]="loading"
            class="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50">
            {{ loading ? 'Testing...' : 'Test Authentication' }}
          </button>
        </form>
        
        <div *ngIf="result" class="mt-6 p-4 rounded" 
             [ngClass]="{'bg-green-50 text-green-800': success, 'bg-red-50 text-red-800': !success}">
          <h3 class="font-semibold mb-2">{{ success ? 'Success!' : 'Error!' }}</h3>
          <pre class="text-xs whitespace-pre-wrap">{{ result }}</pre>
        </div>
        
        <div class="mt-6 p-4 bg-yellow-50 rounded">
          <h3 class="font-semibold mb-2">Debugging Tips:</h3>
          <ul class="text-sm space-y-1">
            <li>• Check browser console for detailed debug logs</li>
            <li>• Verify email/password auth is enabled in Firebase Console</li>
            <li>• Ensure the user exists in Firebase Authentication</li>
            <li>• Check for any whitespace in email/password fields</li>
            <li>• Verify you're using the correct Firebase project</li>
          </ul>
        </div>
        
        <div class="mt-4">
          <a href="/login" class="text-blue-600 hover:underline">← Back to Login</a>
        </div>
      </div>
    </div>
  `
})
export class TestAuthComponent {
  private auth = inject(Auth);
  private authService = inject(AuthService);
  
  email = 'm.cengkuru@infrastructuretransparency.org';
  password = '12345678';
  loading = false;
  result = '';
  success = false;
  
  firebaseConfig = environment.firebaseConfig;
  
  async testAuth() {
    this.loading = true;
    this.result = '';
    
    console.log('=== TEST AUTH START ===');
    console.log('Email:', this.email);
    console.log('Email length:', this.email.length);
    console.log('Password length:', this.password.length);
    console.log('Firebase Project:', this.firebaseConfig.projectId);
    
    try {
      const credential = await this.authService.signIn(this.email, this.password);
      this.success = true;
      this.result = `Authentication successful!
User UID: ${credential.user.uid}
Email: ${credential.user.email}
Email Verified: ${credential.user.emailVerified}
Display Name: ${credential.user.displayName || 'Not set'}`;
      
      console.log('=== TEST AUTH SUCCESS ===');
      console.log('User:', credential.user);
    } catch (error: any) {
      this.success = false;
      this.result = `Authentication failed!
Error Code: ${error.code}
Error Message: ${error.message}
Full Error: ${JSON.stringify(error, null, 2)}`;
      
      console.error('=== TEST AUTH ERROR ===');
      console.error('Full error object:', error);
    } finally {
      this.loading = false;
      console.log('=== TEST AUTH END ===');
    }
  }
}