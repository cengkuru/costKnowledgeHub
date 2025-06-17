import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { SearchService } from '../../../core/services/search.service';
import { FilterService } from '../../../core/services/filter.service';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <header class="nav-header">
      <div class="container mx-auto px-6">
        <nav class="flex items-center justify-between py-4">
          
          <!-- Logo & Brand -->
          <div class="flex items-center space-x-4">
            <a [routerLink]="['/']" class="flex items-center space-x-3 hover:opacity-80 transition-opacity duration-200">
              <div class="w-10 h-10 bg-cost-teal rounded-lg flex items-center justify-center">
                <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L2 7v10c0 5.55 3.84 9.74 9 11 5.16-1.26 9-5.45 9-11V7l-10-5z"/>
                  <path d="M9 12l2 2 4-4" stroke="white" stroke-width="2" fill="none"/>
                </svg>
              </div>
              <div class="hidden sm:block">
                <div class="text-lg font-bold text-cost-teal">CoST</div>
                <div class="text-sm text-neutral-600 -mt-1">Knowledge Hub</div>
              </div>
            </a>
          </div>

          <!-- Desktop Navigation Menu -->
          <div class="hidden lg:flex items-center space-x-8">
            <a 
              [routerLink]="['/']" 
              routerLinkActive="text-cost-teal border-b-2 border-cost-teal" 
              [routerLinkActiveOptions]="{exact: true}"
              class="nav-link text-neutral-700 hover:text-cost-teal transition-colors duration-200 pb-1 border-b-2 border-transparent"
            >
              Home
            </a>
            <a 
              [routerLink]="['/browse']" 
              routerLinkActive="text-cost-teal border-b-2 border-cost-teal"
              class="nav-link text-neutral-700 hover:text-cost-teal transition-colors duration-200 pb-1 border-b-2 border-transparent"
            >
              Browse Resources
            </a>
            
            <!-- Topics Dropdown -->
            <div class="relative" (mouseenter)="showTopicsMenu = true" (mouseleave)="showTopicsMenu = false">
              <button class="nav-link text-neutral-700 hover:text-cost-teal transition-colors duration-200 pb-1 border-b-2 border-transparent flex items-center space-x-1">
                <span>Topics</span>
                <svg class="w-4 h-4 transition-transform duration-200" [class.rotate-180]="showTopicsMenu" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/>
                </svg>
              </button>
              
              <!-- Topics Mega Menu -->
              <div 
                *ngIf="showTopicsMenu"
                class="absolute top-full left-0 mt-2 w-96 bg-white rounded-lg shadow-glass border border-neutral-200 py-6 px-6 z-50 animate-fadeInScale"
              >
                <div class="grid grid-cols-1 gap-4">
                  <div class="text-sm font-semibold text-neutral-800 mb-2">Core Topics</div>
                  
                  <a 
                    (click)="applyTopicFilter('disclosure')"
                    class="flex items-center space-x-3 p-3 rounded-lg hover:bg-cost-teal/5 transition-colors duration-200 cursor-pointer group"
                  >
                    <div class="w-8 h-8 bg-cost-teal/10 rounded-lg flex items-center justify-center group-hover:bg-cost-teal/20">
                      <svg class="w-4 h-4 text-cost-teal" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M3 4h18v2H3V4zm0 4h18v2H3V8zm0 4h18v2H3v-2zm0 4h18v2H3v-2z"/>
                      </svg>
                    </div>
                    <div>
                      <div class="font-medium text-neutral-800">Data Disclosure</div>
                      <div class="text-sm text-neutral-500">Open data and transparency</div>
                    </div>
                  </a>
                  
                  <a 
                    (click)="applyTopicFilter('procurement')"
                    class="flex items-center space-x-3 p-3 rounded-lg hover:bg-cost-amber/5 transition-colors duration-200 cursor-pointer group"
                  >
                    <div class="w-8 h-8 bg-cost-amber/10 rounded-lg flex items-center justify-center group-hover:bg-cost-amber/20">
                      <svg class="w-4 h-4 text-cost-amber" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                    </div>
                    <div>
                      <div class="font-medium text-neutral-800">Public Procurement</div>
                      <div class="text-sm text-neutral-500">Transparent tendering</div>
                    </div>
                  </a>
                  
                  <a 
                    (click)="applyTopicFilter('assurance')"
                    class="flex items-center space-x-3 p-3 rounded-lg hover:bg-cost-cyan/5 transition-colors duration-200 cursor-pointer group"
                  >
                    <div class="w-8 h-8 bg-cost-cyan/10 rounded-lg flex items-center justify-center group-hover:bg-cost-cyan/20">
                      <svg class="w-4 h-4 text-cost-cyan" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                      </svg>
                    </div>
                    <div>
                      <div class="font-medium text-neutral-800">Independent Assurance</div>
                      <div class="text-sm text-neutral-500">Third-party verification</div>
                    </div>
                  </a>
                  
                  <div class="pt-3 border-t border-neutral-200">
                    <a 
                      [routerLink]="['/browse']" 
                      [queryParams]="{}"
                      class="text-sm font-medium text-cost-teal hover:text-cost-teal-600 transition-colors duration-200"
                    >
                      View all topics →
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <a 
              [routerLink]="['/countries']" 
              routerLinkActive="text-cost-teal border-b-2 border-cost-teal"
              class="nav-link text-neutral-700 hover:text-cost-teal transition-colors duration-200 pb-1 border-b-2 border-transparent"
            >
              Countries
            </a>
            <a 
              [routerLink]="['/about']" 
              routerLinkActive="text-cost-teal border-b-2 border-cost-teal"
              class="nav-link text-neutral-700 hover:text-cost-teal transition-colors duration-200 pb-1 border-b-2 border-transparent"
            >
              About
            </a>
          </div>

          <!-- Search & Actions -->
          <div class="flex items-center space-x-4">
            <!-- Quick Search (Desktop) -->
            <div class="hidden md:block relative">
              <div class="relative">
                <input
                  type="text"
                  placeholder="Quick search..."
                  class="w-64 px-4 py-2 pl-10 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cost-cyan focus:border-transparent transition-all duration-200 text-sm"
                  (input)="onQuickSearch($event)"
                  (focus)="showQuickResults = true"
                  (blur)="hideQuickResults()"
                >
                <svg class="absolute left-3 top-2.5 w-4 h-4 text-neutral-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"/>
                </svg>
              </div>
              
              <!-- Quick Search Results -->
              <div 
                *ngIf="showQuickResults && (quickSearchResults$ | async) as results"
                class="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-glass border border-neutral-200 py-2 z-50 max-h-64 overflow-y-auto"
              >
                <div *ngFor="let result of results" class="px-4 py-2 hover:bg-neutral-50 cursor-pointer flex items-center space-x-3">
                  <svg class="w-4 h-4 text-neutral-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"/>
                  </svg>
                  <span class="text-sm text-neutral-700">{{ result.text }}</span>
                  <span *ngIf="result.count" class="text-xs text-neutral-400">({{ result.count }})</span>
                </div>
              </div>
            </div>

            <!-- Mobile Search Toggle -->
            <button 
              class="md:hidden p-2 text-neutral-600 hover:text-cost-teal transition-colors duration-200"
              (click)="toggleMobileSearch()"
            >
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"/>
              </svg>
            </button>

            <!-- Mobile Menu Toggle -->
            <button 
              class="lg:hidden p-2 text-neutral-600 hover:text-cost-teal transition-colors duration-200"
              (click)="toggleMobileMenu()"
            >
              <svg *ngIf="!showMobileMenu" class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"/>
              </svg>
              <svg *ngIf="showMobileMenu" class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
              </svg>
            </button>
          </div>
        </nav>

        <!-- Mobile Search Bar -->
        <div *ngIf="showMobileSearch" class="lg:hidden pb-4 animate-fadeInUp">
          <div class="relative">
            <input
              type="text"
              placeholder="Search resources..."
              class="w-full px-4 py-3 pl-10 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cost-cyan focus:border-transparent"
              (input)="onQuickSearch($event)"
            >
            <svg class="absolute left-3 top-3.5 w-4 h-4 text-neutral-400" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"/>
            </svg>
          </div>
        </div>

        <!-- Mobile Menu -->
        <div *ngIf="showMobileMenu" class="lg:hidden border-t border-neutral-200 pt-4 animate-fadeInUp">
          <div class="space-y-4">
            <a 
              [routerLink]="['/']" 
              (click)="closeMobileMenu()"
              class="block text-neutral-700 hover:text-cost-teal transition-colors duration-200 py-2"
            >
              Home
            </a>
            <a 
              [routerLink]="['/browse']" 
              (click)="closeMobileMenu()"
              class="block text-neutral-700 hover:text-cost-teal transition-colors duration-200 py-2"
            >
              Browse Resources
            </a>
            
            <!-- Mobile Topics -->
            <div>
              <button 
                (click)="toggleMobileTopics()"
                class="flex items-center justify-between w-full text-neutral-700 hover:text-cost-teal transition-colors duration-200 py-2"
              >
                <span>Topics</span>
                <svg class="w-4 h-4 transition-transform duration-200" [class.rotate-180]="showMobileTopics" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/>
                </svg>
              </button>
              
              <div *ngIf="showMobileTopics" class="pl-4 space-y-2 mt-2">
                <a 
                  (click)="applyTopicFilter('disclosure'); closeMobileMenu()"
                  class="block text-sm text-neutral-600 hover:text-cost-teal transition-colors duration-200 py-1"
                >
                  Data Disclosure
                </a>
                <a 
                  (click)="applyTopicFilter('procurement'); closeMobileMenu()"
                  class="block text-sm text-neutral-600 hover:text-cost-teal transition-colors duration-200 py-1"
                >
                  Public Procurement
                </a>
                <a 
                  (click)="applyTopicFilter('assurance'); closeMobileMenu()"
                  class="block text-sm text-neutral-600 hover:text-cost-teal transition-colors duration-200 py-1"
                >
                  Independent Assurance
                </a>
              </div>
            </div>
            
            <a 
              [routerLink]="['/countries']" 
              (click)="closeMobileMenu()"
              class="block text-neutral-700 hover:text-cost-teal transition-colors duration-200 py-2"
            >
              Countries
            </a>
            <a 
              [routerLink]="['/about']" 
              (click)="closeMobileMenu()"
              class="block text-neutral-700 hover:text-cost-teal transition-colors duration-200 py-2"
            >
              About
            </a>
          </div>
        </div>
      </div>
    </header>

    <!-- Backdrop for mobile menu -->
    <div 
      *ngIf="showMobileMenu" 
      class="fixed inset-0 bg-black/25 backdrop-blur-sm z-40 lg:hidden"
      (click)="closeMobileMenu()"
    ></div>
  `,
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {
  private searchService = inject(SearchService);
  private filterService = inject(FilterService);
  private router = inject(Router);
  
  showTopicsMenu = false;
  showMobileMenu = false;
  showMobileSearch = false;
  showMobileTopics = false;
  showQuickResults = false;
  
  quickSearchResults$!: Observable<any[]>;

  ngOnInit(): void {
    this.quickSearchResults$ = this.searchService.suggestions$;
  }

  onQuickSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchService.updateSearchQuery(target.value);
  }

  hideQuickResults(): void {
    // Delay hiding to allow click events
    setTimeout(() => {
      this.showQuickResults = false;
    }, 200);
  }

  applyTopicFilter(topic: string): void {
    this.filterService.clearAllFilters();
    this.filterService.addFilter('topic', topic);
    this.router.navigate(['/browse']);
    this.closeMobileMenu();
  }

  toggleMobileMenu(): void {
    this.showMobileMenu = !this.showMobileMenu;
    if (this.showMobileMenu) {
      this.showMobileSearch = false;
    }
  }

  toggleMobileSearch(): void {
    this.showMobileSearch = !this.showMobileSearch;
    if (this.showMobileSearch) {
      this.showMobileMenu = false;
    }
  }

  toggleMobileTopics(): void {
    this.showMobileTopics = !this.showMobileTopics;
  }

  closeMobileMenu(): void {
    this.showMobileMenu = false;
    this.showMobileSearch = false;
    this.showMobileTopics = false;
  }
}