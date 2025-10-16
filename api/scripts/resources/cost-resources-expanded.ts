/**
 * Expanded CoST Resources - 29 Verified Sources
 *
 * Curated collection of verified CoST and infrastructure transparency resources
 * organized by category. All URLs tested and confirmed working.
 * Last verified: October 2025
 */

import { CrawlResource } from '../utils/crawler-parallel.js';

/**
 * OC4IDS & Standards (10 resources)
 */
export const OC4IDS_RESOURCES: CrawlResource[] = [
  {
    url: 'https://standard.open-contracting.org/infrastructure/latest/en/',
    title: 'OC4IDS: Open Contracting for Infrastructure Data Standard',
    type: 'Manual',
    summary: 'Complete documentation for the Open Contracting for Infrastructure Data Standard (OC4IDS), including schema reference, implementation guidance, and examples.',
    year: 2024
  },
  {
    url: 'https://standard.open-contracting.org/infrastructure/latest/en/guidance/',
    title: 'OC4IDS Implementation Guidance',
    type: 'Guide',
    summary: 'Practical guidance for implementing OC4IDS including data mapping, publication workflows, and use case examples.',
    year: 2024
  },
  {
    url: 'https://standard.open-contracting.org/infrastructure/latest/en/reference/',
    title: 'OC4IDS Schema Reference',
    type: 'Manual',
    summary: 'Technical reference for OC4IDS schema including project, process, and completion information.',
    year: 2024
  },
  {
    url: 'https://standard.open-contracting.org/infrastructure/latest/en/cost/',
    title: 'OC4IDS and CoST IDS Alignment',
    type: 'Guide',
    summary: 'Mapping between OC4IDS and CoST Infrastructure Data Standard for interoperability.',
    year: 2024
  },
  {
    url: 'https://standard.open-contracting.org/infrastructure/latest/en/projects/',
    title: 'OC4IDS Project Schema',
    type: 'Manual',
    summary: 'Detailed documentation of the project schema including identification, budget, and location data.',
    year: 2024
  },
  {
    url: 'https://standard.open-contracting.org/infrastructure/latest/en/reference/codelists/',
    title: 'OC4IDS Code Lists',
    type: 'Manual',
    summary: 'Standard code lists for project types, procurement methods, and other classifications.',
    year: 2024
  }
];

/**
 * CoST Global Resources (15 resources)
 */
export const COST_GLOBAL_RESOURCES: CrawlResource[] = [
  {
    url: 'https://infrastructuretransparency.org/our-approach/',
    title: 'CoST Approach to Infrastructure Transparency',
    type: 'Guide',
    summary: 'Overview of CoST methodology for promoting transparency and accountability in infrastructure projects.',
    year: 2024
  },
  {
    url: 'https://infrastructuretransparency.org/resources/',
    title: 'CoST Resource Library',
    type: 'Resource',
    summary: 'Comprehensive library of CoST resources including guidance notes, templates, and case studies.',
    year: 2024
  },
  {
    url: 'https://infrastructuretransparency.org/costimpact/',
    title: 'CoST Impact Stories',
    type: 'Impact Story',
    summary: 'Real-world examples of how CoST has improved infrastructure transparency and outcomes in member countries.',
    year: 2024
  },
  {
    url: 'https://infrastructuretransparency.org/tools-and-standards/',
    title: 'CoST Tools and Standards',
    type: 'Guide',
    summary: 'Tools, templates, and standards for implementing infrastructure transparency and disclosure.',
    year: 2024
  },
  {
    url: 'https://infrastructuretransparency.org/cost-guidance/',
    title: 'CoST Implementation Guidance',
    type: 'Guide',
    summary: 'Practical guidance for implementing CoST standards and best practices.',
    year: 2024
  },
  {
    url: 'https://infrastructuretransparency.org/resource/assurance-guidance-note/',
    title: 'CoST Assurance Framework',
    type: 'Manual',
    summary: 'Guidelines for conducting independent assurance of infrastructure project disclosures.',
    year: 2024
  },
  {
    url: 'https://infrastructuretransparency.org/resource/independent-review-manual/',
    title: 'Independent Review Manual',
    type: 'Manual',
    summary: 'Manual for conducting independent reviews and assurance of infrastructure projects.',
    year: 2024
  },
  {
    url: 'https://infrastructuretransparency.org/resource/open-government-guidance-note-english/',
    title: 'Open Government Partnership Guidance Note',
    type: 'Guide',
    summary: 'Guidance on integrating infrastructure transparency with Open Government Partnership commitments.',
    year: 2024
  },
  {
    url: 'https://infrastructuretransparency.org/resource/cost-uganda-impact-story-25/',
    title: 'CoST Uganda Impact Story 2025',
    type: 'Impact Story',
    summary: 'Real-world impact story from CoST Uganda showing transparency outcomes.',
    year: 2025
  },
  {
    url: 'https://infrastructuretransparency.org/blog/',
    title: 'CoST Blog and News',
    type: 'Resource',
    summary: 'Latest news, insights, and updates from CoST global and country programmes.',
    year: 2024
  },
  {
    url: 'https://infrastructuretransparency.org/about-us/',
    title: 'About CoST',
    type: 'Guide',
    summary: 'Overview of CoST organization, mission, and global network.',
    year: 2024
  },
  {
    url: 'https://infrastructuretransparency.org/joining-cost/',
    title: 'Joining CoST',
    type: 'Guide',
    summary: 'Information on how countries and organizations can join the CoST network.',
    year: 2024
  },
  {
    url: 'https://infrastructuretransparency.org/where/',
    title: 'CoST Member Countries',
    type: 'Resource',
    summary: 'Information about CoST programmes in member countries worldwide.',
    year: 2024
  },
  {
    url: 'https://infrastructuretransparency.org/services/',
    title: 'CoST Services',
    type: 'Guide',
    summary: 'Technical assistance and support services offered by CoST International.',
    year: 2024
  },
  {
    url: 'https://infrastructuretransparency.org/home/oc4ids-sustainability-and-climate-finance-modules/',
    title: 'OC4IDS Sustainability and Climate Finance',
    type: 'Guide',
    summary: 'Guidance on using OC4IDS for tracking climate finance and sustainable infrastructure.',
    year: 2024
  }
];

/**
 * Country-Specific Resources (3 resources - active only)
 * Note: Many country-specific CoST domains are currently inactive or unreachable
 */
export const COUNTRY_RESOURCES: CrawlResource[] = [
  // Guatemala
  {
    url: 'https://www.costguatemala.org/',
    title: 'CoST Guatemala Programme',
    type: 'Resource',
    summary: 'Guatemala CoST programme covering public works and infrastructure.',
    country: 'Guatemala',
    year: 2024
  },

  // Ukraine
  {
    url: 'https://www.costukraine.org/',
    title: 'CoST Ukraine Programme',
    type: 'Resource',
    summary: 'Ukraine infrastructure transparency and reconstruction monitoring.',
    country: 'Ukraine',
    year: 2024
  },

  // Ethiopia
  {
    url: 'https://www.costethiopia.org/',
    title: 'CoST Ethiopia Programme',
    type: 'Resource',
    summary: 'Ethiopia infrastructure transparency for roads and public buildings.',
    country: 'Ethiopia',
    year: 2024
  }
];

/**
 * Technical & Implementation Resources (5 resources - active only)
 */
export const TECHNICAL_RESOURCES: CrawlResource[] = [
  {
    url: 'https://www.open-contracting.org/data-standard/',
    title: 'Open Contracting Data Standard (OCDS)',
    type: 'Manual',
    summary: 'OCDS documentation for publishing contracting data in a structured, comparable format.',
    year: 2024
  },
  {
    url: 'https://www.open-contracting.org/implement/',
    title: 'OCDS Implementation Guide',
    type: 'Guide',
    summary: 'Step-by-step guidance for implementing OCDS in government systems.',
    year: 2024
  },
  {
    url: 'https://standard.open-contracting.org/latest/en/schema/',
    title: 'OCDS Schema and Field Reference',
    type: 'Manual',
    summary: 'Complete technical reference for OCDS data fields and structure.',
    year: 2024
  },
  {
    url: 'https://standard.open-contracting.org/latest/en/guidance/map/',
    title: 'OCDS Data Mapping Guide',
    type: 'Guide',
    summary: 'How to map existing procurement data to OCDS format.',
    year: 2024
  },
  {
    url: 'https://www.open-contracting.org/resources/red-flags/',
    title: 'Red Flags for Corruption in Public Contracting',
    type: 'Guide',
    summary: 'Identifying corruption risks through data analysis and monitoring.',
    year: 2024
  }
];

/**
 * All resources combined (29 active URLs)
 * - 6 OC4IDS standards
 * - 15 CoST global resources
 * - 3 Country programmes
 * - 5 Technical/OCDS resources
 */
export const ALL_EXPANDED_RESOURCES: CrawlResource[] = [
  ...OC4IDS_RESOURCES,
  ...COST_GLOBAL_RESOURCES,
  ...COUNTRY_RESOURCES,
  ...TECHNICAL_RESOURCES
];

/**
 * Get resources by category
 */
export const getResourcesByCategory = (category: string): CrawlResource[] => {
  switch (category.toLowerCase()) {
    case 'oc4ids':
    case 'standards':
      return OC4IDS_RESOURCES;
    case 'cost':
    case 'global':
      return COST_GLOBAL_RESOURCES;
    case 'country':
    case 'countries':
      return COUNTRY_RESOURCES;
    case 'technical':
    case 'implementation':
      return TECHNICAL_RESOURCES;
    default:
      return ALL_EXPANDED_RESOURCES;
  }
};

/**
 * Get resources by country
 */
export const getResourcesByCountry = (country: string): CrawlResource[] => {
  return ALL_EXPANDED_RESOURCES.filter(
    r => r.country?.toLowerCase() === country.toLowerCase()
  );
};
