import { Language } from '../models/types';

export interface Translations {
  // Navigation
  nav: {
    brandName: string;
    brandNameShort: string;
    aboutUs: string;
    selectLanguage: string;
    adminLogin: string;
  };
  // Hero
  hero: {
    title: string;
    subtitle: string;
    keywordSearch: string;
    smartSearch: string;
    searchPlaceholder: string;
    smartSearchPlaceholder: string;
    smartSearchHint: string;
    askAI: string;
  };
  // Featured Section
  featured: {
    title: string;
    subtitle: string;
    viewAll: string;
    access: string;
  };
  // Filters
  filters: {
    activeFilters: string;
    clearAll: string;
    allTopics: string;
    allTypes: string;
    sort: string;
    sortBy: string;
    mostRecent: string;
    mostPopular: string;
    oldestFirst: string;
    azTitle: string;
    topic: string;
    type: string;
    tag: string;
    search: string;
    filtersTitle: string;
    reset: string;
    resetAll: string;
    resources: string;
  };
  // Results
  results: {
    noResults: string;
    noResultsAI: string;
    noResultsKeyword: string;
    resetFilters: string;
    searchResults: string;
    foundMatches: string;
    noResourcesInCategory: string;
    noResourcesInCategoryDesc: string;
  };
  // Resource Card
  card: {
    access: string;
    popular: string;
  };
  // Footer
  footer: {
    description: string;
    keyResources: string;
    connect: string;
    adminDashboard: string;
    copyright: string;
    privacyPolicy: string;
    termsOfService: string;
    cookiePolicy: string;
  };
  // Loading
  loading: {
    translating: string;
    poweredBy: string;
  };
  // Detail Page
  detail: {
    backToHub: string;
    aboutResource: string;
    topicsCovered: string;
    readyToAccess: string;
    redirectNotice: string;
    accessResource: string;
    relatedResources: string;
    notFound: string;
    notFoundMessage: string;
  };
}

export const translations: Record<Language, Translations> = {
  en: {
    nav: {
      brandName: 'CoST Knowledge Hub',
      brandNameShort: 'CoST Hub',
      aboutUs: 'About Us',
      selectLanguage: 'Select language',
      adminLogin: 'Admin',
    },
    hero: {
      title: 'CoST Knowledge Hub',
      subtitle: 'Discover standards, tools, and guidance notes designed to strengthen infrastructure transparency.',
      keywordSearch: 'Keyword Search',
      smartSearch: 'Smart Search',
      searchPlaceholder: 'Search for tools, guides, standards...',
      smartSearchPlaceholder: 'Ask a question about infrastructure transparency...',
      smartSearchHint: 'AI groups results by logical workflow',
      askAI: 'Ask AI',
    },
    featured: {
      title: 'Independent Review',
      subtitle: 'Essential guides and tools for conducting independent reviews of infrastructure projects',
      viewAll: 'View all Independent Review resources',
      access: 'Access',
    },
    filters: {
      activeFilters: 'Active filters:',
      clearAll: 'Clear all',
      allTopics: 'All Topics',
      allTypes: 'All Types',
      sort: 'Sort',
      sortBy: 'Sort by',
      mostRecent: 'Most Recent',
      mostPopular: 'Most Popular',
      oldestFirst: 'Oldest First',
      azTitle: 'A-Z (Title)',
      topic: 'Topic',
      type: 'Type',
      tag: 'tag',
      search: 'search',
      filtersTitle: 'Filters',
      reset: 'Reset',
      resetAll: 'Reset all',
      resources: 'Resources',
    },
    results: {
      noResults: 'No resources found',
      noResultsAI: "Our AI couldn't find a logical grouping for your query. Try rephrasing.",
      noResultsKeyword: "We couldn't find any resources matching your current filters.",
      resetFilters: 'Reset All Filters',
      searchResults: 'Search Results',
      foundMatches: 'Found {count} matches for "{query}"',
      noResourcesInCategory: 'No resources in this category yet',
      noResourcesInCategoryDesc: 'Resources for this category are coming soon. Check back later or explore other topics.',
    },
    card: {
      access: 'Access',
      popular: 'Popular',
    },
    footer: {
      description: 'Connecting government, private sector, and civil society to improve lives through better infrastructure transparency, accountability, and data standards.',
      keyResources: 'Key Resources',
      connect: 'Connect',
      adminDashboard: 'Admin Login',
      copyright: '© 2024 Infrastructure Transparency Initiative. All rights reserved.',
      privacyPolicy: 'Privacy Policy',
      termsOfService: 'Terms of Service',
      cookiePolicy: 'Cookie Policy',
    },
    loading: {
      translating: 'AI is translating content...',
      poweredBy: 'Powered by Gemini',
    },
    detail: {
      backToHub: 'Back to Knowledge Hub',
      aboutResource: 'About This Resource',
      topicsCovered: 'Topics Covered',
      readyToAccess: 'Ready to access this resource?',
      redirectNotice: "You'll be redirected to the original source",
      accessResource: 'Access Resource',
      relatedResources: 'Related Resources',
      notFound: 'Resource Not Found',
      notFoundMessage: "The resource you're looking for doesn't exist or has been removed.",
    },
  },
  es: {
    nav: {
      brandName: 'Base de Conocimiento CoST',
      brandNameShort: 'CoST Hub',
      aboutUs: 'Sobre Nosotros',
      selectLanguage: 'Seleccionar idioma',
      adminLogin: 'Admin',
    },
    hero: {
      title: 'Base de Conocimiento CoST',
      subtitle: 'Descubra estándares, herramientas y notas de orientación diseñadas para fortalecer la transparencia en infraestructura.',
      keywordSearch: 'Búsqueda por Palabra',
      smartSearch: 'Búsqueda Inteligente',
      searchPlaceholder: 'Buscar herramientas, guías, estándares...',
      smartSearchPlaceholder: 'Haga una pregunta sobre transparencia en infraestructura...',
      smartSearchHint: 'La IA agrupa resultados por flujo lógico',
      askAI: 'Preguntar IA',
    },
    featured: {
      title: 'Revisión Independiente',
      subtitle: 'Guías y herramientas esenciales para realizar revisiones independientes de proyectos de infraestructura',
      viewAll: 'Ver todos los recursos de Revisión Independiente',
      access: 'Acceder',
    },
    filters: {
      activeFilters: 'Filtros activos:',
      clearAll: 'Limpiar todo',
      allTopics: 'Todos los Temas',
      allTypes: 'Todos los Tipos',
      sort: 'Ordenar',
      sortBy: 'Ordenar por',
      mostRecent: 'Más Reciente',
      mostPopular: 'Más Popular',
      oldestFirst: 'Más Antiguo',
      azTitle: 'A-Z (Título)',
      topic: 'Tema',
      type: 'Tipo',
      tag: 'etiqueta',
      search: 'búsqueda',
      filtersTitle: 'Filtros',
      reset: 'Restablecer',
      resetAll: 'Restablecer todo',
      resources: 'Recursos',
    },
    results: {
      noResults: 'No se encontraron recursos',
      noResultsAI: 'Nuestra IA no pudo encontrar una agrupación lógica para su consulta. Intente reformular.',
      noResultsKeyword: 'No pudimos encontrar recursos que coincidan con sus filtros actuales.',
      resetFilters: 'Restablecer Filtros',
      searchResults: 'Resultados de Búsqueda',
      foundMatches: 'Se encontraron {count} coincidencias para "{query}"',
      noResourcesInCategory: 'Aún no hay recursos en esta categoría',
      noResourcesInCategoryDesc: 'Los recursos para esta categoría estarán disponibles pronto. Vuelva más tarde o explore otros temas.',
    },
    card: {
      access: 'Acceder',
      popular: 'Popular',
    },
    footer: {
      description: 'Conectando gobierno, sector privado y sociedad civil para mejorar vidas a través de mejor transparencia, rendición de cuentas y estándares de datos en infraestructura.',
      keyResources: 'Recursos Clave',
      connect: 'Conectar',
      adminDashboard: 'Acceso Admin',
      copyright: '© 2024 Iniciativa de Transparencia en Infraestructura. Todos los derechos reservados.',
      privacyPolicy: 'Política de Privacidad',
      termsOfService: 'Términos de Servicio',
      cookiePolicy: 'Política de Cookies',
    },
    loading: {
      translating: 'La IA está traduciendo el contenido...',
      poweredBy: 'Desarrollado por Gemini',
    },
    detail: {
      backToHub: 'Volver a la Base de Conocimiento',
      aboutResource: 'Sobre Este Recurso',
      topicsCovered: 'Temas Tratados',
      readyToAccess: '¿Listo para acceder a este recurso?',
      redirectNotice: 'Serás redirigido a la fuente original',
      accessResource: 'Acceder al Recurso',
      relatedResources: 'Recursos Relacionados',
      notFound: 'Recurso No Encontrado',
      notFoundMessage: 'El recurso que buscas no existe o ha sido eliminado.',
    },
  },
  pt: {
    nav: {
      brandName: 'Base de Conhecimento CoST',
      brandNameShort: 'CoST Hub',
      aboutUs: 'Sobre Nós',
      selectLanguage: 'Selecionar idioma',
      adminLogin: 'Admin',
    },
    hero: {
      title: 'Base de Conhecimento CoST',
      subtitle: 'Descubra padrões, ferramentas e notas de orientação projetadas para fortalecer a transparência em infraestrutura.',
      keywordSearch: 'Busca por Palavra',
      smartSearch: 'Busca Inteligente',
      searchPlaceholder: 'Buscar ferramentas, guias, padrões...',
      smartSearchPlaceholder: 'Faça uma pergunta sobre transparência em infraestrutura...',
      smartSearchHint: 'A IA agrupa resultados por fluxo lógico',
      askAI: 'Perguntar IA',
    },
    featured: {
      title: 'Revisão Independente',
      subtitle: 'Guias e ferramentas essenciais para realizar revisões independentes de projetos de infraestrutura',
      viewAll: 'Ver todos os recursos de Revisão Independente',
      access: 'Acessar',
    },
    filters: {
      activeFilters: 'Filtros ativos:',
      clearAll: 'Limpar tudo',
      allTopics: 'Todos os Tópicos',
      allTypes: 'Todos os Tipos',
      sort: 'Ordenar',
      sortBy: 'Ordenar por',
      mostRecent: 'Mais Recente',
      mostPopular: 'Mais Popular',
      oldestFirst: 'Mais Antigo',
      azTitle: 'A-Z (Título)',
      topic: 'Tópico',
      type: 'Tipo',
      tag: 'tag',
      search: 'busca',
      filtersTitle: 'Filtros',
      reset: 'Redefinir',
      resetAll: 'Redefinir tudo',
      resources: 'Recursos',
    },
    results: {
      noResults: 'Nenhum recurso encontrado',
      noResultsAI: 'Nossa IA não conseguiu encontrar um agrupamento lógico para sua consulta. Tente reformular.',
      noResultsKeyword: 'Não conseguimos encontrar recursos que correspondam aos seus filtros atuais.',
      resetFilters: 'Redefinir Filtros',
      searchResults: 'Resultados da Busca',
      foundMatches: 'Encontrados {count} resultados para "{query}"',
      noResourcesInCategory: 'Ainda não há recursos nesta categoria',
      noResourcesInCategoryDesc: 'Os recursos para esta categoria estarão disponíveis em breve. Volte mais tarde ou explore outros tópicos.',
    },
    card: {
      access: 'Acessar',
      popular: 'Popular',
    },
    footer: {
      description: 'Conectando governo, setor privado e sociedade civil para melhorar vidas através de melhor transparência, prestação de contas e padrões de dados em infraestrutura.',
      keyResources: 'Recursos Principais',
      connect: 'Conectar',
      adminDashboard: 'Acesso Admin',
      copyright: '© 2024 Iniciativa de Transparência em Infraestrutura. Todos os direitos reservados.',
      privacyPolicy: 'Política de Privacidade',
      termsOfService: 'Termos de Serviço',
      cookiePolicy: 'Política de Cookies',
    },
    loading: {
      translating: 'A IA está traduzindo o conteúdo...',
      poweredBy: 'Desenvolvido por Gemini',
    },
    detail: {
      backToHub: 'Voltar para a Base de Conhecimento',
      aboutResource: 'Sobre Este Recurso',
      topicsCovered: 'Tópicos Abordados',
      readyToAccess: 'Pronto para acessar este recurso?',
      redirectNotice: 'Você será redirecionado para a fonte original',
      accessResource: 'Acessar Recurso',
      relatedResources: 'Recursos Relacionados',
      notFound: 'Recurso Não Encontrado',
      notFoundMessage: 'O recurso que você está procurando não existe ou foi removido.',
    },
  },
};

export function getTranslation(lang: Language): Translations {
  return translations[lang] || translations.en;
}
