import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { Language } from '../models/resource.model';

@Injectable({
  providedIn: 'root'
})
export class I18nService {
  private currentLanguageSubject = new BehaviorSubject<Language>('en');
  public currentLanguage$ = this.currentLanguageSubject.asObservable();
  private translations: Record<Language, any> = { en: {}, es: {}, pt: {} };
  private loadedLanguages: Set<Language> = new Set();

  constructor(private http: HttpClient) {
    // Load saved language preference from localStorage
    const savedLang = localStorage.getItem('cost-hub-language') as Language;
    if (savedLang && ['en', 'es', 'pt'].includes(savedLang)) {
      this.currentLanguageSubject.next(savedLang);
    }

    // Load default language translations
    this.loadTranslations(this.currentLanguageSubject.value);
  }

  getCurrentLanguage(): Language {
    return this.currentLanguageSubject.value;
  }

  setLanguage(language: Language): void {
    if (language !== this.currentLanguageSubject.value) {
      this.currentLanguageSubject.next(language);
      localStorage.setItem('cost-hub-language', language);

      // Load translations if not already loaded
      if (!this.loadedLanguages.has(language)) {
        this.loadTranslations(language);
      }
    }
  }

  getTranslation(key: string, params?: Record<string, any>): string {
    const lang = this.currentLanguageSubject.value;
    const keys = key.split('.');
    let value = this.translations[lang];

    for (const k of keys) {
      value = value?.[k];
    }

    if (!value) {
      return key; // Return key if translation not found
    }

    // Simple parameter substitution
    if (params) {
      Object.keys(params).forEach(param => {
        value = value.replace(`{{${param}}}`, params[param]);
      });
    }

    return value;
  }

  // Synchronous translation getter for templates
  t(key: string, params?: Record<string, any>): string {
    return this.getTranslation(key, params);
  }

  // Get multi-language text in current language
  getLocalizedText(multiLangText: Record<Language, string>): string {
    const currentLang = this.currentLanguageSubject.value;
    return multiLangText[currentLang] || multiLangText['en'] || '';
  }

  // Get all available languages
  getAvailableLanguages(): {code: Language, name: string, nativeName: string}[] {
    return [
      { code: 'en', name: 'English', nativeName: 'English' },
      { code: 'es', name: 'Spanish', nativeName: 'Español' },
      { code: 'pt', name: 'Portuguese', nativeName: 'Português' }
    ];
  }

  private loadTranslations(language: Language): void {
    if (this.loadedLanguages.has(language)) {
      return;
    }

    this.http.get(`/assets/i18n/${language}.json`)
      .subscribe({
        next: (translations) => {
          this.translations[language] = translations;
          this.loadedLanguages.add(language);
        },
        error: (error) => {
          console.error(`Failed to load translations for ${language}:`, error);
          // Fallback to basic translations
          this.translations[language] = this.getFallbackTranslations(language);
          this.loadedLanguages.add(language);
        }
      });
  }

  private getFallbackTranslations(language: Language): any {
    const fallback = {
      en: {
        common: {
          search: 'Search',
          filter: 'Filter',
          download: 'Download',
          share: 'Share',
          language: 'Language',
          loading: 'Loading...',
          error: 'Error occurred',
          noResults: 'No results found'
        },
        navigation: {
          home: 'Home',
          resources: 'Resources',
          about: 'About',
          contact: 'Contact'
        }
      },
      es: {
        common: {
          search: 'Buscar',
          filter: 'Filtrar',
          download: 'Descargar',
          share: 'Compartir',
          language: 'Idioma',
          loading: 'Cargando...',
          error: 'Ocurrió un error',
          noResults: 'No se encontraron resultados'
        },
        navigation: {
          home: 'Inicio',
          resources: 'Recursos',
          about: 'Acerca de',
          contact: 'Contacto'
        }
      },
      pt: {
        common: {
          search: 'Pesquisar',
          filter: 'Filtrar',
          download: 'Baixar',
          share: 'Compartilhar',
          language: 'Idioma',
          loading: 'Carregando...',
          error: 'Ocorreu um erro',
          noResults: 'Nenhum resultado encontrado'
        },
        navigation: {
          home: 'Início',
          resources: 'Recursos',
          about: 'Sobre',
          contact: 'Contato'
        }
      }
    };

    return fallback[language] || fallback.en;
  }
}
