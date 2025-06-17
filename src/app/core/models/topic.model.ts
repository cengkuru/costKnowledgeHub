// Topic models for CoST Knowledge Hub - matching C40 structure

export interface Topic {
  id: TopicCategory;
  name: string;
  icon: string; // Icon name (e.g., 'database', 'shield-check')
  color: string; // Hex color for branding
  description: string;
  resourceCount: number;
  featured?: boolean;
  // C40-style metadata
  order?: number; // Display order
  parentTopic?: string; // For hierarchical topics
  relatedTopics?: string[]; // Related topic IDs
}

export interface TopicHero {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  backgroundImage?: string;
  stats?: {
    resources: number;
    countries: number;
    impact?: string;
  };
}

// Main CoST topic categories with branding
export type TopicCategory = 'disclosure' | 'assurance' | 'procurement' | 'monitoring' | 'stakeholder' | 'accountability';

export const COST_TOPICS: Topic[] = [
  {
    id: 'disclosure',
    name: 'Data Disclosure',
    icon: 'database',
    color: '#355E69', // CoST Teal
    description: 'Open data and transparency in infrastructure projects',
    resourceCount: 45
  },
  {
    id: 'assurance',
    name: 'Independent Assurance',
    icon: 'shield-check',
    color: '#0AAEA0', // CoST Cyan
    description: 'Third-party verification and validation processes',
    resourceCount: 32
  },
  {
    id: 'procurement',
    name: 'Public Procurement',
    icon: 'clipboard-list',
    color: '#F0AD4E', // CoST Amber
    description: 'Transparent tendering and contracting practices',
    resourceCount: 68
  },
  {
    id: 'monitoring',
    name: 'Project Monitoring',
    icon: 'chart-line',
    color: '#ED1C24', // CoST Red
    description: 'Tracking implementation and progress',
    resourceCount: 41
  },
  {
    id: 'stakeholder',
    name: 'Multi-stakeholder Working',
    icon: 'users',
    color: '#662D91', // CoST Purple
    description: 'Collaborative governance approaches',
    resourceCount: 29
  },
  {
    id: 'accountability',
    name: 'Social Accountability',
    icon: 'megaphone',
    color: '#00AEEF', // CoST Light Blue
    description: 'Citizen engagement and oversight mechanisms',
    resourceCount: 37
  }
];