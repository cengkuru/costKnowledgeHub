import { ObjectId } from 'mongodb';
import { connectToDatabase, closeDatabase } from '../db';
import { ContentStatus } from '../models/Resource';

const SYSTEM_USER_ID = new ObjectId('000000000000000000000001');

interface SeedResource {
  title: string;
  description: string;
  url: string;
  category: string;
  type: string;
  tags: string[];
}

const OC4IDS_RESOURCES: SeedResource[] = [
  // Schema & Reference
  {
    title: 'OC4IDS Schema Browser',
    description: 'Interactive tool for exploring the Open Contracting for Infrastructure Data Standard schema structure. Browse fields, data types, and relationships in the OC4IDS specification.',
    url: 'https://standard.open-contracting.org/infrastructure/latest/en/reference/browser/',
    category: 'OC4IDS',
    type: 'Tool',
    tags: ['Schema', 'Reference', 'Technical', 'Data Standard']
  },
  {
    title: 'OC4IDS Schema Reference',
    description: 'Complete technical reference for OC4IDS schema including field definitions, data types, validation rules, and structural requirements for infrastructure project data.',
    url: 'https://standard.open-contracting.org/infrastructure/latest/en/reference/schema/',
    category: 'OC4IDS',
    type: 'Documentation',
    tags: ['Schema', 'Technical', 'Reference', 'Validation']
  },
  {
    title: 'OC4IDS Codelists Reference',
    description: 'Standard codelists that limit and standardize field values to promote data interoperability across infrastructure transparency implementations.',
    url: 'https://standard.open-contracting.org/infrastructure/latest/en/reference/codelists/',
    category: 'OC4IDS',
    type: 'Documentation',
    tags: ['Codelists', 'Standardization', 'Interoperability']
  },
  {
    title: 'OC4IDS Data Packaging Guide',
    description: 'Guidance on publishing OC4IDS data as project packages containing multiple infrastructure projects with comprehensive metadata.',
    url: 'https://standard.open-contracting.org/infrastructure/latest/en/reference/package/',
    category: 'OC4IDS',
    type: 'Guide',
    tags: ['Data Packaging', 'Publishing', 'Metadata']
  },
  {
    title: 'OC4IDS Data Review Tool',
    description: 'External validation platform for reviewing and validating infrastructure contracting data against OC4IDS standards.',
    url: 'https://review-oc4ids.standard.open-contracting.org/',
    category: 'OC4IDS',
    type: 'Tool',
    tags: ['Validation', 'Data Quality', 'Review']
  },
  {
    title: 'Registered Project Prefixes',
    description: 'Reference list of registered project identifier prefixes for OC4IDS implementations worldwide.',
    url: 'https://standard.open-contracting.org/infrastructure/latest/en/reference/prefixes/',
    category: 'OC4IDS',
    type: 'Documentation',
    tags: ['Identifiers', 'Registration', 'Reference']
  },

  // Guidance Documents
  {
    title: 'Project Identifiers Guidance',
    description: 'Comprehensive guide on implementing local project identifiers in contracting data and managing project identifier prefixes for OC4IDS.',
    url: 'https://standard.open-contracting.org/infrastructure/latest/en/guidance/identifiers/',
    category: 'OC4IDS',
    type: 'Guide',
    tags: ['Identifiers', 'Implementation', 'Best Practices']
  },
  {
    title: 'Publishing from Infrastructure Transparency Portals',
    description: 'Step-by-step guidance on publishing OC4IDS data from infrastructure transparency portals, including technical requirements and best practices.',
    url: 'https://standard.open-contracting.org/infrastructure/latest/en/guidance/publishing/',
    category: 'OC4IDS',
    type: 'Guide',
    tags: ['Publishing', 'Portals', 'Implementation']
  },
  {
    title: 'OC4IDS Implementation Models',
    description: 'Describes different implementation approaches: standalone portals, integrated systems, and standalone procurement approaches for OC4IDS adoption.',
    url: 'https://standard.open-contracting.org/infrastructure/latest/en/guidance/implementation/',
    category: 'OC4IDS',
    type: 'Guide',
    tags: ['Implementation', 'Architecture', 'Systems']
  },
  {
    title: 'Using Procurement Data for Infrastructure Monitoring',
    description: 'Explains tools, platforms, and methods for leveraging procurement system data for infrastructure project monitoring and transparency.',
    url: 'https://standard.open-contracting.org/infrastructure/latest/en/guidance/using/',
    category: 'OC4IDS',
    type: 'Guide',
    tags: ['Procurement', 'Monitoring', 'Data Use']
  },
  {
    title: 'Assessing Compliance with CoST IDS',
    description: 'Methodology and guidance for evaluating compliance with the CoST Infrastructure Data Standard requirements.',
    url: 'https://standard.open-contracting.org/infrastructure/latest/en/guidance/evaluating/',
    category: 'OC4IDS',
    type: 'Guide',
    tags: ['Compliance', 'Assessment', 'CoST IDS']
  },
  {
    title: 'OC4IDS Data User Guide',
    description: 'Comprehensive reference material for data users working with OC4IDS formatted infrastructure data.',
    url: 'https://standard.open-contracting.org/infrastructure/latest/en/guidance/data_user_guide/',
    category: 'OC4IDS',
    type: 'Guide',
    tags: ['Data Users', 'Analysis', 'Reference']
  },
  {
    title: 'OC4IDS Implementation Examples',
    description: 'Worked and blank example implementations demonstrating practical OC4IDS data structures and publishing patterns.',
    url: 'https://standard.open-contracting.org/infrastructure/latest/en/guidance/example/',
    category: 'OC4IDS',
    type: 'Documentation',
    tags: ['Examples', 'Templates', 'Implementation']
  },
  {
    title: 'Publishing OC4IDS Data in Multiple Languages',
    description: 'Guidance on translating headers and publishing multilingual OC4IDS datasets for international accessibility.',
    url: 'https://standard.open-contracting.org/infrastructure/latest/en/guidance/language/',
    category: 'OC4IDS',
    type: 'Guide',
    tags: ['Multilingual', 'Translation', 'Localization']
  },
  {
    title: 'CoST IDS and OCDS Mapping',
    description: 'Documentation showing alignment and mapping between the CoST Infrastructure Data Standard and Open Contracting Data Standard.',
    url: 'https://standard.open-contracting.org/infrastructure/latest/en/cost/',
    category: 'OC4IDS',
    type: 'Documentation',
    tags: ['CoST IDS', 'OCDS', 'Mapping', 'Alignment']
  },
];

const ITI_RESOURCES: SeedResource[] = [
  {
    title: 'Infrastructure Transparency Index 2023',
    description: 'The comprehensive global assessment measuring infrastructure transparency across countries. Evaluates disclosure, participation, and accountability in public infrastructure projects.',
    url: 'https://infrastructuretransparency.org/infrastructure-transparency-index/',
    category: 'Infrastructure Transparency Index',
    type: 'Documentation',
    tags: ['Assessment', 'Global', 'Transparency Metrics', '2023']
  },
  {
    title: 'ITI Methodology Guide',
    description: 'Detailed methodology explaining how the Infrastructure Transparency Index scores are calculated, including indicators, data sources, and assessment criteria.',
    url: 'https://infrastructuretransparency.org/resource/iti-methodology/',
    category: 'Infrastructure Transparency Index',
    type: 'Guide',
    tags: ['Methodology', 'Scoring', 'Indicators']
  },
  {
    title: 'Country Assessment Framework',
    description: 'Framework for conducting national infrastructure transparency assessments aligned with the ITI methodology.',
    url: 'https://infrastructuretransparency.org/resource/country-assessment-framework/',
    category: 'Infrastructure Transparency Index',
    type: 'Guide',
    tags: ['Assessment', 'Countries', 'Framework']
  },
  {
    title: 'ITI Data Collection Tool',
    description: 'Standardized tool for collecting infrastructure transparency data at the national level for ITI assessments.',
    url: 'https://infrastructuretransparency.org/resource/iti-data-collection/',
    category: 'Infrastructure Transparency Index',
    type: 'Tool',
    tags: ['Data Collection', 'Assessment', 'Standardization']
  },
  {
    title: 'Transparency Indicators Reference',
    description: 'Complete reference of transparency indicators used in the Infrastructure Transparency Index, with definitions and scoring guidance.',
    url: 'https://infrastructuretransparency.org/resource/transparency-indicators/',
    category: 'Infrastructure Transparency Index',
    type: 'Documentation',
    tags: ['Indicators', 'Reference', 'Scoring']
  },
];

function createSlug(title: string): string {
  const baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 190);

  // Add random suffix to ensure uniqueness
  const suffix = Math.random().toString(36).substring(2, 8);
  return `${baseSlug}-${suffix}`;
}

async function seedResources() {
  console.log('🌱 Seeding OC4IDS and Infrastructure Transparency Index resources...\n');

  try {
    const db = await connectToDatabase();
    const collection = db.collection('resources');
    const now = new Date();

    let added = 0;
    let skipped = 0;

    const allResources = [...OC4IDS_RESOURCES, ...ITI_RESOURCES];

    for (const resource of allResources) {
      // Check if resource already exists
      const existing = await collection.findOne({ url: resource.url });
      if (existing) {
        console.log(`⏭️  Skipped (exists): ${resource.title}`);
        skipped++;
        continue;
      }

      const doc = {
        title: resource.title,
        description: resource.description,
        url: resource.url,
        slug: createSlug(resource.title),
        category: resource.category,
        type: resource.type,
        tags: resource.tags,
        date: now.toISOString().split('T')[0],

        // CoST taxonomy
        countryPrograms: ['global'],
        themes: ['data_standards'],
        oc4idsAlignment: resource.category === 'OC4IDS' ? ['full_schema'] : [],
        workstreams: ['disclosure'],

        // Audience & Access
        audience: ['technical'],
        accessLevel: 'public',
        language: 'en',

        // Multi-language
        isTranslation: false,
        translations: [],

        // Temporal
        publicationDate: now,
        lastVerified: now,

        // Lifecycle
        status: ContentStatus.PUBLISHED,
        statusHistory: [{
          status: ContentStatus.PUBLISHED,
          changedAt: now,
          changedBy: SYSTEM_USER_ID,
          reason: 'Seeded from official sources',
        }],
        publishedAt: now,

        // Metadata
        source: 'manual',

        // Engagement
        clicks: 0,
        aiCitations: 0,

        // Timestamps
        createdAt: now,
        updatedAt: now,
        createdBy: SYSTEM_USER_ID,
        updatedBy: SYSTEM_USER_ID,
      };

      await collection.insertOne(doc);
      console.log(`✅ Added: ${resource.title}`);
      added++;
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Added: ${added}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Total OC4IDS: ${OC4IDS_RESOURCES.length}`);
    console.log(`   Total ITI: ${ITI_RESOURCES.length}`);

    await closeDatabase();
    console.log('\n✅ Seeding complete!');
  } catch (error) {
    console.error('❌ Failed to seed resources:', error);
    await closeDatabase();
    process.exit(1);
  }
}

seedResources();
