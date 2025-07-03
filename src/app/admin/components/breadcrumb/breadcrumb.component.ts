import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { BreadcrumbService, BreadcrumbItem } from '../../services/breadcrumb.service';
import { I18nService } from '../../../core/services/i18n.service';

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './breadcrumb.component.html',
  styleUrl: './breadcrumb.component.scss'
})
export class BreadcrumbComponent implements OnInit, OnDestroy {
  breadcrumbs: BreadcrumbItem[] = [];
  private destroy$ = new Subject<void>();

  constructor(
    private breadcrumbService: BreadcrumbService,
    public i18nService: I18nService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.breadcrumbService.breadcrumbs$
      .pipe(takeUntil(this.destroy$))
      .subscribe(breadcrumbs => {
        this.breadcrumbs = breadcrumbs;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getBreadcrumbLabel(item: BreadcrumbItem): string {
    if (item.translationKey) {
      return this.i18nService.t(item.translationKey);
    }
    return item.label;
  }

  trackByUrl(index: number, item: BreadcrumbItem): string {
    return item.url || item.label;
  }

  goBack(): void {
    if (this.breadcrumbs.length > 1) {
      const previousBreadcrumb = this.breadcrumbs[this.breadcrumbs.length - 2];
      if (previousBreadcrumb.url) {
        this.router.navigate([previousBreadcrumb.url]);
      }
    }
  }
}