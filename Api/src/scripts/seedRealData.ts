/**
 * Seed script for real CoST resources
 * Imports actual resources from infrastructuretransparency.org
 */

import { MongoClient, ObjectId } from 'mongodb';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

// Map raw resource types to our schema
const RESOURCE_TYPE_MAP: Record<string, string> = {
  'guidance': 'guidance',
  'technical_reference': 'guidance',
  'tool': 'tool',
  'tool_directory': 'tool',
  'case_study': 'case_study',
  'research': 'research',
  'article': 'news',
  'overview': 'guidance',
  'manual': 'guidance',
  'policy': 'policy',
  'resource_hub': 'guidance',
  'platform': 'tool',
  'toolkit': 'tool',
  'example': 'template',
};

// Map country names to our schema
const COUNTRY_MAP: Record<string, string> = {
  'Costa Rica': 'costa_rica',
  'El Salvador': 'el_salvador',
  'Ethiopia': 'ethiopia',
  'Guatemala': 'guatemala',
  'Honduras': 'honduras',
  'Malawi': 'malawi',
  'Tanzania': 'uganda', // Map to closest
  'Thailand': 'thailand',
  'Uganda': 'uganda',
  'UK': 'global',
  'Ukraine': 'ukraine',
  'Mexico (Nuevo León)': 'mexico',
  'Indonesia (West Lombok)': 'indonesia',
};

// Map themes to our schema
const THEME_MAP: Record<string, string> = {
  'disclosure': 'procurement',
  'transparency': 'procurement',
  'assurance': 'project_monitoring',
  'data_standards': 'data_standards',
  'OC4IDS': 'data_standards',
  'OCDS': 'data_standards',
  'CoST IDS': 'data_standards',
  'implementation': 'digital_tools',
  'procurement_systems': 'procurement',
  'infrastructure_governance': 'msg_governance',
  'multi_stakeholder': 'msg_governance',
  'social_accountability': 'impact_measurement',
  'open_data': 'data_standards',
  'data_quality': 'data_standards',
  'climate_finance': 'climate',
  'sustainability': 'environmental',
  'gender': 'gender',
  'citizen_engagement': 'impact_measurement',
  'sector_reform': 'msg_governance',
  'monitoring_evaluation': 'impact_measurement',
  'open_contracting': 'procurement',
  'data_visualization': 'digital_tools',
  'standards_alignment': 'data_standards',
  'data_conversion': 'digital_tools',
  'data_publication': 'data_standards',
  'data_validation': 'data_standards',
  'open_source': 'digital_tools',
  'governance': 'msg_governance',
  'country_program': 'local_government',
  'policy_framework': 'msg_governance',
  'collaborative_design': 'msg_governance',
  'procurement_governance': 'procurement',
  'government_transparency': 'procurement',
  'comparative_benchmarking': 'impact_measurement',
  'best_practices': 'impact_measurement',
  'institutional_arrangement': 'msg_governance',
  'process_design': 'digital_tools',
};

// Valid enums from our schema
const VALID_THEMES = [
  'climate', 'gender', 'local_government', 'beneficial_ownership',
  'social_safeguards', 'environmental', 'procurement', 'project_monitoring',
  'data_standards', 'msg_governance', 'digital_tools', 'impact_measurement'
];

const VALID_COUNTRIES = [
  'ethiopia', 'malawi', 'mozambique', 'seychelles', 'uganda', 'zambia',
  'colombia', 'costa_rica', 'ecuador', 'el_salvador', 'guatemala',
  'honduras', 'panama', 'mexico', 'afghanistan', 'indonesia', 'thailand',
  'timor_leste', 'vietnam', 'ukraine', 'global'
];

const VALID_RESOURCE_TYPES = [
  'assurance_report', 'guidance', 'case_study', 'tool', 'template',
  'research', 'news', 'training', 'policy'
];

interface RawResource {
  id: string;
  title: string;
  description: string;
  url: string;
  pdf_url?: string;
  resource_type: string;
  themes: string[];
  languages: string[];
  organizations: string[];
  country_programs: string[];
  content_focus: string[];
  publication_date: string;
  status: string;
}

function mapThemes(rawThemes: string[]): string[] {
  const mapped = rawThemes
    .map(t => THEME_MAP[t] || t)
    .filter(t => VALID_THEMES.includes(t));

  // Ensure at least one theme
  return mapped.length > 0 ? [...new Set(mapped)] : ['data_standards'];
}

function mapCountries(rawCountries: string[]): string[] {
  const mapped = rawCountries
    .map(c => COUNTRY_MAP[c] || c.toLowerCase().replace(/\s+/g, '_'))
    .filter(c => VALID_COUNTRIES.includes(c));

  // Default to global if no valid countries
  return mapped.length > 0 ? [...new Set(mapped)] : ['global'];
}

function mapResourceType(rawType: string): string {
  const mapped = RESOURCE_TYPE_MAP[rawType] || 'guidance';
  return VALID_RESOURCE_TYPES.includes(mapped) ? mapped : 'guidance';
}

function mapLanguage(languages: string[]): string {
  const langMap: Record<string, string> = {
    'English': 'en',
    'Spanish': 'es',
    'French': 'fr',
    'Portuguese': 'pt',
  };
  return langMap[languages[0]] || 'en';
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100);
}

async function seedDatabase() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI environment variable is required');
  }

  console.log('Connecting to MongoDB...');
  const client = new MongoClient(mongoUri);
  await client.connect();

  const db = client.db(process.env.DB_NAME || 'infrascope');
  const resourcesCollection = db.collection('resources');
  const categoriesCollection = db.collection('categories');

  try {
    // Load raw data
    const rawDataPath = path.join(__dirname, '../../../cost-resources-database.json');
    const rawData = JSON.parse(fs.readFileSync(rawDataPath, 'utf-8'));
    const rawResources: RawResource[] = rawData.resources;

    console.log(`Found ${rawResources.length} resources to import`);

    // Create default categories first
    const categories = [
      { name: 'Guidance & Standards', slug: 'guidance-standards', description: 'Official CoST and OC4IDS guidance documents', order: 1 },
      { name: 'Case Studies', slug: 'case-studies', description: 'Country program case studies and examples', order: 2 },
      { name: 'Tools & Platforms', slug: 'tools-platforms', description: 'Software tools and data platforms', order: 3 },
      { name: 'Research & Reports', slug: 'research-reports', description: 'Research papers and analytical reports', order: 4 },
      { name: 'Training Materials', slug: 'training-materials', description: 'Training resources and learning materials', order: 5 },
    ];

    // Insert categories
    for (const cat of categories) {
      await categoriesCollection.updateOne(
        { slug: cat.slug },
        { $set: { ...cat, createdAt: new Date(), updatedAt: new Date() } },
        { upsert: true }
      );
    }
    console.log('Categories created/updated');

    // Get category IDs
    const categoryDocs = await categoriesCollection.find({}).toArray();
    const categoryMap = new Map(categoryDocs.map(c => [c.slug, c._id]));

    // Map resource types to categories
    const typeToCategorySlug: Record<string, string> = {
      'guidance': 'guidance-standards',
      'case_study': 'case-studies',
      'tool': 'tools-platforms',
      'template': 'tools-platforms',
      'research': 'research-reports',
      'news': 'research-reports',
      'policy': 'guidance-standards',
      'training': 'training-materials',
      'assurance_report': 'research-reports',
    };

    // Transform and insert resources
    let insertedCount = 0;
    let updatedCount = 0;

    for (const raw of rawResources) {
      const resourceType = mapResourceType(raw.resource_type);
      const categorySlug = typeToCategorySlug[resourceType] || 'guidance-standards';
      const categoryId = categoryMap.get(categorySlug);

      const resource = {
        title: raw.title,
        description: raw.description,
        url: raw.pdf_url || raw.url,
        slug: generateSlug(raw.title),
        resourceType,

        // CoST taxonomy
        countryPrograms: mapCountries(raw.country_programs),
        themes: mapThemes(raw.themes),
        oc4idsAlignment: ['full_schema'], // Default
        workstreams: ['disclosure', 'assurance'],

        // Audience & access
        audience: ['technical', 'policy', 'msg'],
        accessLevel: 'public',
        language: mapLanguage(raw.languages),

        // Translation support
        isTranslation: false,
        translations: [],

        // Temporal
        publicationDate: new Date(`${raw.publication_date}-01-01`),
        lastVerified: new Date(),

        // Lifecycle - publish immediately since these are verified resources
        status: 'published',
        statusHistory: [{
          from: 'pending_review',
          to: 'published',
          changedAt: new Date(),
          reason: 'Imported from official CoST resources'
        }],
        publishedAt: new Date(),
        source: 'manual',

        // Legacy fields for compatibility
        category: categoryId,
        tags: raw.content_focus.slice(0, 5),
        topics: raw.themes.slice(0, 5),
        regions: mapCountries(raw.country_programs).map(c =>
          ['ethiopia', 'malawi', 'mozambique', 'seychelles', 'uganda', 'zambia'].includes(c) ? 'africa' :
          ['colombia', 'costa_rica', 'ecuador', 'el_salvador', 'guatemala', 'honduras', 'panama', 'mexico'].includes(c) ? 'americas' :
          ['afghanistan', 'indonesia', 'thailand', 'timor_leste', 'vietnam'].includes(c) ? 'asia' :
          ['ukraine'].includes(c) ? 'europe' : 'global'
        ).filter((v, i, a) => a.indexOf(v) === i),

        // Engagement
        clicks: 0,
        aiCitations: 0,

        // Audit
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Upsert by URL to avoid duplicates
      const result = await resourcesCollection.updateOne(
        { url: resource.url },
        { $set: resource },
        { upsert: true }
      );

      if (result.upsertedCount > 0) {
        insertedCount++;
        console.log(`  + Inserted: ${raw.title.substring(0, 50)}...`);
      } else if (result.modifiedCount > 0) {
        updatedCount++;
        console.log(`  ~ Updated: ${raw.title.substring(0, 50)}...`);
      }
    }

    console.log('\n=== Seed Complete ===');
    console.log(`Inserted: ${insertedCount}`);
    console.log(`Updated: ${updatedCount}`);
    console.log(`Total resources: ${await resourcesCollection.countDocuments()}`);
    console.log(`Total categories: ${await categoriesCollection.countDocuments()}`);

    // Create indexes
    console.log('\nCreating indexes...');
    await resourcesCollection.createIndex({ status: 1 });
    await resourcesCollection.createIndex({ slug: 1 }, { unique: true });
    await resourcesCollection.createIndex({ url: 1 }, { unique: true });
    await resourcesCollection.createIndex({ resourceType: 1 });
    await resourcesCollection.createIndex({ countryPrograms: 1 });
    await resourcesCollection.createIndex({ themes: 1 });
    await resourcesCollection.createIndex({ language: 1 });
    await resourcesCollection.createIndex({ publicationDate: -1 });
    await resourcesCollection.createIndex({ clicks: -1 });
    await resourcesCollection.createIndex(
      { title: 'text', description: 'text', tags: 'text' },
      { weights: { title: 10, description: 5, tags: 3 } }
    );
    console.log('Indexes created');

  } finally {
    await client.close();
    console.log('\nDatabase connection closed');
  }
}

// Run if executed directly
seedDatabase()
  .then(() => {
    console.log('\nSeeding completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  });
