import { ResourceItem, ResourceCategory, ResourceType } from './types';

export const RESOURCES: ResourceItem[] = [
    // OC4IDS Resources
    {
        id: 'oc-1',
        title: 'OC4IDS Documentation',
        description: 'The official standard documentation describing the Open Contracting for Infrastructure Data Standard schema and logic.',
        url: 'https://standard.open-contracting.org/infrastructure/latest/en/',
        category: ResourceCategory.OC4IDS,
        type: ResourceType.DOCUMENTATION,
        date: '2023-10-15',
    },
    {
        id: 'oc-2',
        title: 'Implementation Guidance',
        description: 'Step-by-step guides on how to implement the OC4IDS in your projects or government systems.',
        url: 'https://standard.open-contracting.org/infrastructure/latest/en/guidance/',
        category: ResourceCategory.OC4IDS,
        type: ResourceType.GUIDE,
        date: '2023-11-02',
    },
    {
        id: 'oc-3',
        title: 'Example Data Visualisation',
        description: 'A Looker Studio report demonstrating how OC4IDS data can be visualized for impact and analysis.',
        url: 'https://lookerstudio.google.com/reporting/0b0e0557-9089-4b53-93e4-6bd5eca9b73a/page/p_23n7iqi8id',
        category: ResourceCategory.OC4IDS,
        type: ResourceType.VISUALIZATION,
        date: '2024-01-20',
    },
    {
        id: 'oc-4',
        title: 'Introduction to IDS & OC4IDS',
        description: 'Presentation slides and introductory material explaining the core concepts of the Infrastructure Data Standard.',
        url: '#',
        category: ResourceCategory.OC4IDS,
        type: ResourceType.GUIDE,
        date: '2023-08-10',
    },
    {
        id: 'oc-5',
        title: 'CoST Datastore',
        description: 'The central repository for infrastructure transparency data collected by CoST member programs.',
        url: 'https://datastore.infrastructuretransparency.org/',
        category: ResourceCategory.OC4IDS,
        type: ResourceType.DATASET,
        date: '2022-05-15',
    },
    {
        id: 'oc-6',
        title: 'Data Review Tool',
        description: 'A web-based tool to validate and check the quality of your OC4IDS formatted JSON data.',
        url: 'https://review-oc4ids.standard.open-contracting.org/',
        category: ResourceCategory.OC4IDS,
        type: ResourceType.TOOL,
        date: '2023-12-05',
    },
    {
        id: 'oc-7',
        title: 'OC4IDS Tools (Kit)',
        description: 'Python library and command-line tool for working with OC4IDS data, including validation and conversion.',
        url: 'https://oc4idskit.readthedocs.io/en/latest/index.html',
        category: ResourceCategory.OC4IDS,
        type: ResourceType.LIBRARY,
        date: '2023-09-28',
    },
    {
        id: 'oc-8',
        title: 'LibCoveOC4IDS',
        description: 'A library to validate OC4IDS data, used by the Data Review Tool.',
        url: 'https://pypi.org/project/libcoveoc4ids/',
        category: ResourceCategory.OC4IDS,
        type: ResourceType.LIBRARY,
        date: '2023-06-12',
    },

    // Assurance Resources
    {
        id: 'as-1',
        title: 'Infrastructure Assurance Manual',
        description: 'Guidelines for conducting independent validation of infrastructure project data.',
        url: 'https://infrastructuretransparency.org/our-work/assurance/',
        category: ResourceCategory.ASSURANCE,
        type: ResourceType.DOCUMENTATION,
        date: '2024-02-15',
    },
    {
        id: 'as-2',
        title: 'Assurance Process Flowchart',
        description: 'Visual guide to the steps involved in a CoST assurance process.',
        url: '#',
        category: ResourceCategory.ASSURANCE,
        type: ResourceType.VISUALIZATION,
        date: '2023-03-10',
    },

    // Infrastructure Index
    {
        id: 'idx-1',
        title: 'Infrastructure Transparency Index (ITI)',
        description: 'Methodology and scoring system for the ITI to measure levels of transparency.',
        url: 'https://infrastructuretransparency.org/our-work/infrastructure-transparency-index/',
        category: ResourceCategory.INDEX,
        type: ResourceType.DOCUMENTATION,
        date: '2023-11-20',
    },
    {
        id: 'idx-2',
        title: 'ITI Calculation Tool',
        description: 'Spreadsheet tool for calculating transparency scores based on indicator inputs.',
        url: '#',
        category: ResourceCategory.INDEX,
        type: ResourceType.TOOL,
        date: '2024-01-05',
    },

    // Guidance Notes
    {
        id: 'gn-1',
        title: 'Disclosure Guidance Note',
        description: 'Best practices for disclosing infrastructure project data to the public.',
        url: 'https://infrastructuretransparency.org/resources/guidance-notes/',
        category: ResourceCategory.GUIDANCE,
        type: ResourceType.GUIDE,
        date: '2022-11-30',
    },
    {
        id: 'gn-2',
        title: 'Multi-Stakeholder Working Group Guide',
        description: 'How to form and manage a multi-stakeholder group for infrastructure oversight.',
        url: '#',
        category: ResourceCategory.GUIDANCE,
        type: ResourceType.GUIDE,
        date: '2023-07-22',
    },
];

// In-memory storage for clicks
export const resourceClicks: Record<string, number> = {};
