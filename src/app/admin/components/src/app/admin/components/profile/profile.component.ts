import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { I18nService } from '../../../core/services/i18n.service';
import { User } from '../../../core/services/user.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent implements OnInit {
  private authService = inject(AuthService);
  private userService = inject(UserService);
  public i18nService = inject(I18nService);
  
  user: User | null = null;
  isLoading = true;
  isSaving = false;
  isAdmin = false;
  
  // Form fields
  displayName = '';
  photoURL = '';
  
  ngOnInit() {
    this.loadUserProfile();
  }
  
  async loadUserProfile() {
    try {
      const currentUser = this.authService.currentUser;
      if (currentUser) {
        this.user = await this.userService.getUserById(currentUser.uid);
        this.displayName = this.user?.displayName || '';
        this.photoURL = this.user?.photoURL || '';
        this.isAdmin = await this.authService.isAdmin();
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    } finally {
      this.isLoading = false;
    }
  }
  
  async saveProfile() {
    if (!this.authService.currentUser) return;
    
    this.isSaving = true;
    try {
      // Update Firebase Auth profile
      await this.authService.updateUserProfile(this.displayName, this.photoURL);
      
      // Update Firestore user document
      await this.userService.updateUser(this.authService.currentUser.uid, {
        displayName: this.displayName,
        photoURL: this.photoURL,
        updatedAt: new Date()
      });
      
      // Reload user data
      await this.loadUserProfile();
      
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Error updating profile. Please try again.');
    } finally {
      this.isSaving = false;
    }
  }
}