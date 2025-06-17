import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterModule } from '@angular/router';
import { LanguageToggleComponent } from './shared/components/language-toggle/language-toggle.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterModule,
    LanguageToggleComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'knowledgeHub';

  // Dropdown states
  isKnowledgeDropdownOpen = false;
  isFeaturesDropdownOpen = false;

  // Dropdown methods
  toggleKnowledgeDropdown(): void {
    this.isKnowledgeDropdownOpen = !this.isKnowledgeDropdownOpen;
    this.isFeaturesDropdownOpen = false; // Close other dropdowns
  }

  toggleFeaturesDropdown(): void {
    this.isFeaturesDropdownOpen = !this.isFeaturesDropdownOpen;
    this.isKnowledgeDropdownOpen = false; // Close other dropdowns
  }

  closeDropdowns(): void {
    this.isKnowledgeDropdownOpen = false;
    this.isFeaturesDropdownOpen = false;
  }
}
