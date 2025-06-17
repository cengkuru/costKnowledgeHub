import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { SearchBarComponent } from '../../shared/components/search-bar/search-bar.component';
import { ResourceCardComponent } from '../../shared/components/resource-card/resource-card.component';
import { LanguageToggleComponent } from '../../shared/components/language-toggle/language-toggle.component';
import { ResourceService } from '../../core/services/resource.service';
import { I18nService } from '../../core/services/i18n.service';
import { Resource, MultiLanguageText } from '../../core/models/resource.model';
import { Topic, COST_TOPICS } from '../../core/models/topic.model';

interface HomeTopic {
  id: string;
  name: MultiLanguageText;
  icon: string;
  color: string;
  description: MultiLanguageText;
  resourceCount: number;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    SearchBarComponent,
    ResourceCardComponent,
    LanguageToggleComponent
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit, OnDestroy {
  featuredResources: Resource[] = [];

  // Dropdown states
  isKnowledgeDropdownOpen = false;
  isFeaturesDropdownOpen = false;

  topicCategories: HomeTopic[] = [
    {
      id: 'disclosure',
      name: {
        en: 'Data Disclosure',
        es: 'Divulgación de Datos',
        pt: 'Divulgação de Dados'
      },
      icon: 'database',
      color: 'bg-cost-teal',
      description: {
        en: 'Open data and transparency in infrastructure',
        es: 'Datos abiertos y transparencia en infraestructura',
        pt: 'Dados abertos e transparência em infraestrutura'
      },
      resourceCount: 45
    },
    {
      id: 'assurance',
      name: {
        en: 'Independent Assurance',
        es: 'Aseguramiento Independiente',
        pt: 'Garantia Independente'
      },
      icon: 'shield-check',
      color: 'bg-cost-cyan',
      description: {
        en: 'Third-party verification and validation',
        es: 'Verificación y validación de terceros',
        pt: 'Verificação e validação de terceiros'
      },
      resourceCount: 32
    },
    {
      id: 'procurement',
      name: {
        en: 'Public Procurement',
        es: 'Contratación Pública',
        pt: 'Contratação Pública'
      },
      icon: 'clipboard-list',
      color: 'bg-cost-amber',
      description: {
        en: 'Transparent tendering and contracting',
        es: 'Licitación y contratación transparente',
        pt: 'Licitação e contratação transparente'
      },
      resourceCount: 68
    },
    {
      id: 'monitoring',
      name: {
        en: 'Project Monitoring',
        es: 'Monitoreo de Proyectos',
        pt: 'Monitoramento de Projetos'
      },
      icon: 'chart-line',
      color: 'bg-red-500',
      description: {
        en: 'Tracking implementation and progress',
        es: 'Seguimiento de implementación y progreso',
        pt: 'Acompanhamento de implementação e progresso'
      },
      resourceCount: 41
    },
    {
      id: 'stakeholder',
      name: {
        en: 'Multi-stakeholder Working',
        es: 'Trabajo Multi-actor',
        pt: 'Trabalho Multi-stakeholder'
      },
      icon: 'users',
      color: 'bg-purple-500',
      description: {
        en: 'Collaborative governance approaches',
        es: 'Enfoques de gobernanza colaborativa',
        pt: 'Abordagens de governança colaborativa'
      },
      resourceCount: 29
    },
    {
      id: 'accountability',
      name: {
        en: 'Social Accountability',
        es: 'Rendición de Cuentas Social',
        pt: 'Prestação de Contas Social'
      },
      icon: 'megaphone',
      color: 'bg-blue-500',
      description: {
        en: 'Citizen engagement and oversight',
        es: 'Participación ciudadana y supervisión',
        pt: 'Envolvimento cidadão e supervisão'
      },
      resourceCount: 37
    }
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private resourceService: ResourceService,
    public i18nService: I18nService
  ) {}

  ngOnInit(): void {
    this.loadFeaturedResources();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadFeaturedResources(): void {
    this.resourceService.getFeaturedResources()
      .pipe(takeUntil(this.destroy$))
      .subscribe(resources => {
        this.featuredResources = resources;
      });
  }

  onSearch(query: string): void {
    if (query.trim()) {
      this.resourceService.updateFilters({ searchQuery: query });
      // Navigate to resources page - will be implemented with routing
    }
  }

  onResourceDownload(resource: Resource): void {
    // Handle download logic
    const currentLang = this.i18nService.getCurrentLanguage();
    const downloadUrl = resource.fileLinks?.[currentLang] || resource.externalLink;

    if (downloadUrl) {
      window.open(downloadUrl, '_blank');
    }
  }

  onResourceShare(resource: Resource): void {
    // Handle share logic
    if (navigator.share) {
      navigator.share({
        title: this.i18nService.getLocalizedText(resource.title),
        text: this.i18nService.getLocalizedText(resource.description),
        url: window.location.origin + '/resources/' + resource.id
      });
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(window.location.origin + '/resources/' + resource.id);
    }
  }

  getTopicName(topic: HomeTopic): string {
    return this.i18nService.getLocalizedText(topic.name);
  }

  getTopicDescription(topic: HomeTopic): string {
    return this.i18nService.getLocalizedText(topic.description);
  }

  getIconSvg(iconName: string): string {
    const icons: Record<string, string> = {
      'database': 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4',
      'shield-check': 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
      'clipboard-list': 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
      'chart-line': 'M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4v16',
      'users': 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a4 4 0 11-8 0 4 4 0 018 0z',
      'megaphone': 'M7 4V2a1 1 0 011-1h1a1 1 0 011 1v2h3a1 1 0 011 1v2a1 1 0 01-1 1h-3v2a1 1 0 01-1 1H8a1 1 0 01-1-1V8H4a1 1 0 01-1-1V5a1 1 0 011-1h3z'
    };
    return icons[iconName] || icons['database'];
  }

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
