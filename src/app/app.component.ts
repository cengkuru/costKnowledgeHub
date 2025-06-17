import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterModule, Router } from '@angular/router';
import { LanguageToggleComponent } from './shared/components/language-toggle/language-toggle.component';
import { I18nService } from './core/services/i18n.service';

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

  constructor(
    private router: Router,
    public i18nService: I18nService
  ) {}

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

  // Features dropdown navigation methods
  navigateToAdvancedSearch(): void {
    this.closeDropdowns();
    this.router.navigate(['/resources'], {
      queryParams: { advanced: 'true' }
    }).then(() => {
      // Scroll to search section after navigation
      setTimeout(() => {
        this.scrollToElement('search-section');
      }, 100);
    });
  }

  showSmartFilters(): void {
    this.closeDropdowns();
    this.router.navigate(['/resources']).then(() => {
      // Scroll to filters section after navigation
      setTimeout(() => {
        this.scrollToElement('filters-section');
      }, 100);
    });
  }

  showLanguageSupport(): void {
    this.closeDropdowns();
    // For now, just focus on the language toggle
    setTimeout(() => {
      const languageToggle = document.querySelector('app-language-toggle');
      if (languageToggle) {
        languageToggle.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Add a visual highlight
        languageToggle.classList.add('ring-2', 'ring-cost-cyan', 'ring-opacity-50');
        setTimeout(() => {
          languageToggle.classList.remove('ring-2', 'ring-cost-cyan', 'ring-opacity-50');
        }, 2000);
      }
    }, 100);
  }

  navigateToCollaboration(): void {
    this.closeDropdowns();
    // Navigate to resources and filter by collaboration tools
    this.router.navigate(['/resources'], {
      queryParams: {
        topic: 'collaboration',
        type: 'tool'
      }
    });
  }

  // Top navigation methods
  navigateToSearch(): void {
    this.closeDropdowns();
    this.router.navigate(['/resources'], {
      queryParams: { search: 'true' }
    }).then(() => {
      // Focus on search input after navigation
      setTimeout(() => {
        const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }, 100);
    });
  }

  navigateToLogin(): void {
    this.closeDropdowns();
    this.router.navigate(['/login']);
  }

  private scrollToElement(elementId: string): void {
    const element = document.getElementById(elementId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}
