import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { I18nService } from '../../../core/services/i18n.service';
import { Language } from '../../../core/models/resource.model';

@Component({
  selector: 'app-language-toggle',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './language-toggle.component.html',
  styleUrl: './language-toggle.component.scss'
})
export class LanguageToggleComponent implements OnInit {
  currentLanguage: Language = 'en';
  availableLanguages = this.i18nService.getAvailableLanguages();
  isDropdownOpen = false;

  constructor(private i18nService: I18nService) {}

  ngOnInit(): void {
    this.i18nService.currentLanguage$.subscribe(lang => {
      this.currentLanguage = lang;
    });
  }

  toggleDropdown(): void {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  selectLanguage(languageCode: Language): void {
    this.i18nService.setLanguage(languageCode);
    this.isDropdownOpen = false;
  }

  onClickOutside(): void {
    this.isDropdownOpen = false;
  }

  getCurrentLanguageName(): string {
    const lang = this.availableLanguages.find(l => l.code === this.currentLanguage);
    return lang ? lang.nativeName : 'English';
  }
}
