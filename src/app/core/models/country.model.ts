// Country models for CoST member countries

export interface Country {
  code: string; // ISO 3166 alpha-2
  name: string;
  region: Region;
  status: 'Active Member' | 'Affiliate' | 'Supporter';
  joinedYear: number;
  projects: number; // Number of disclosed projects
  disclosureRate: number; // Percentage of transparency
  flagUrl: string; // Flag image URL
  population?: number;
  gdpPerCapita?: number;
  languages?: string[]; // Spoken languages
  website?: string; // National CoST website
  coordinator?: {
    name: string;
    email: string;
    organization: string;
  };
  stats?: {
    totalProjects: number;
    valueDisclosed: string; // e.g., "$2.3 billion"
    assuranceReports: number;
    savings?: string; // e.g., "$50 million saved"
  };
}

export type Region = 'africa' | 'asia' | 'latam' | 'europe' | 'global';

export const COST_COUNTRIES: Country[] = [
  {
    code: 'UG',
    name: 'Uganda',
    region: 'africa',
    status: 'Active Member',
    joinedYear: 2014,
    projects: 127,
    disclosureRate: 78,
    flagUrl: '/flags/ug.svg',
    stats: {
      totalProjects: 127,
      valueDisclosed: '$890 million',
      assuranceReports: 23,
      savings: '$45 million'
    }
  },
  {
    code: 'GT',
    name: 'Guatemala',
    region: 'latam',
    status: 'Active Member',
    joinedYear: 2016,
    projects: 89,
    disclosureRate: 82,
    flagUrl: '/flags/gt.svg',
    stats: {
      totalProjects: 89,
      valueDisclosed: '$1.2 billion',
      assuranceReports: 18,
      savings: '$38 million'
    }
  },
  {
    code: 'TH',
    name: 'Thailand',
    region: 'asia',
    status: 'Active Member',
    joinedYear: 2015,
    projects: 156,
    disclosureRate: 85,
    flagUrl: '/flags/th.svg',
    stats: {
      totalProjects: 156,
      valueDisclosed: '$3.4 billion',
      assuranceReports: 31,
      savings: '$360 million'
    }
  },
  {
    code: 'UK',
    name: 'United Kingdom',
    region: 'europe',
    status: 'Active Member',
    joinedYear: 2012,
    projects: 203,
    disclosureRate: 92,
    flagUrl: '/flags/uk.svg',
    stats: {
      totalProjects: 203,
      valueDisclosed: '$5.8 billion',
      assuranceReports: 42,
      savings: '$180 million'
    }
  },
  {
    code: 'HN',
    name: 'Honduras',
    region: 'latam',
    status: 'Active Member',
    joinedYear: 2017,
    projects: 67,
    disclosureRate: 74,
    flagUrl: '/flags/hn.svg',
    stats: {
      totalProjects: 67,
      valueDisclosed: '$456 million',
      assuranceReports: 12,
      savings: '$28 million'
    }
  },
  {
    code: 'MW',
    name: 'Malawi',
    region: 'africa',
    status: 'Active Member',
    joinedYear: 2018,
    projects: 43,
    disclosureRate: 68,
    flagUrl: '/flags/mw.svg',
    stats: {
      totalProjects: 43,
      valueDisclosed: '$234 million',
      assuranceReports: 8,
      savings: '$12 million'
    }
  },
  {
    code: 'PH',
    name: 'Philippines',
    region: 'asia',
    status: 'Active Member',
    joinedYear: 2019,
    projects: 124,
    disclosureRate: 71,
    flagUrl: '/flags/ph.svg',
    stats: {
      totalProjects: 124,
      valueDisclosed: '$2.1 billion',
      assuranceReports: 19,
      savings: '$95 million'
    }
  },
  {
    code: 'ET',
    name: 'Ethiopia',
    region: 'africa',
    status: 'Active Member',
    joinedYear: 2020,
    projects: 78,
    disclosureRate: 63,
    flagUrl: '/flags/et.svg',
    stats: {
      totalProjects: 78,
      valueDisclosed: '$567 million',
      assuranceReports: 11,
      savings: '$31 million'
    }
  }
];

export const REGIONS = [
  { value: 'africa', label: 'Africa', count: 48 },
  { value: 'asia', label: 'Asia Pacific', count: 37 },
  { value: 'latam', label: 'Latin America', count: 29 },
  { value: 'europe', label: 'Europe', count: 21 }
] as const;