/**
 * Generate cover images for all resources
 * Uses themed placeholder images based on resource type and themes
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';

dotenv.config();

// Resource type to Unsplash query mapping
const TYPE_QUERIES: Record<string, string> = {
  guidance: 'infrastructure-blueprint,architecture',
  case_study: 'construction-site,infrastructure-project',
  tool: 'software-dashboard,data-analytics',
  template: 'document-business,office-template',
  research: 'data-analysis,research-paper',
  training: 'education-workshop,training-classroom',
  policy: 'government-building,policy-document',
  assurance_report: 'inspection-audit,quality-control',
  news: 'infrastructure-development,city-skyline',
};

// Theme to Unsplash query mapping
const THEME_QUERIES: Record<string, string> = {
  climate: 'sustainable-infrastructure,green-building',
  environmental: 'environmental-assessment,eco-construction',
  procurement: 'business-contract,procurement-bidding',
  project_monitoring: 'construction-progress,site-inspection',
  data_standards: 'data-visualization,structured-data',
  msg_governance: 'stakeholder-meeting,governance',
  digital_tools: 'digital-technology,software-interface',
  impact_measurement: 'metrics-dashboard,impact-assessment',
  local_government: 'municipal-services,local-community',
  gender: 'diverse-workforce,inclusive-workplace',
  beneficial_ownership: 'corporate-transparency,ownership',
  social_safeguards: 'community-development,social-impact',
};

function getImageUrl(resourceType: string, themes: string[] = []): string {
  // Build query from type and themes
  let query = TYPE_QUERIES[resourceType] || 'infrastructure-transparency';

  // Add theme-specific terms
  if (themes.length > 0) {
    const themeQuery = THEME_QUERIES[themes[0]];
    if (themeQuery) {
      query = themeQuery;
    }
  }

  // Use Unsplash Source for consistent, high-quality images
  // The sig parameter ensures consistent image for same query
  const sig = Buffer.from(query).toString('base64').slice(0, 10);
  return `https://source.unsplash.com/1200x630/?${encodeURIComponent(query)}&sig=${sig}`;
}

async function generateCoverImages() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI environment variable is required');
  }

  console.log('Connecting to MongoDB...');
  const client = new MongoClient(mongoUri);
  await client.connect();

  const db = client.db(process.env.DB_NAME || 'cost_knowledge_hub');
  const collection = db.collection('resources');

  try {
    // Get all resources without cover images
    const resources = await collection
      .find({
        $or: [
          { coverImage: { $exists: false } },
          { coverImage: null },
          { coverImage: '' },
        ],
      })
      .toArray();

    console.log(`Found ${resources.length} resources without cover images`);

    let updated = 0;

    for (const resource of resources) {
      const imageUrl = getImageUrl(resource.resourceType, resource.themes);

      await collection.updateOne(
        { _id: resource._id },
        {
          $set: {
            coverImage: imageUrl,
            updatedAt: new Date(),
          },
        }
      );

      updated++;
      console.log(`  [${updated}/${resources.length}] ${resource.title?.substring(0, 50)}...`);
    }

    console.log('\n=== Cover Images Generated ===');
    console.log(`Updated: ${updated}`);
    console.log(`Total resources with images: ${await collection.countDocuments({ coverImage: { $exists: true, $ne: null } })}`);

  } finally {
    await client.close();
    console.log('\nDatabase connection closed');
  }
}

generateCoverImages()
  .then(() => {
    console.log('\nCover image generation completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Cover image generation failed:', error);
    process.exit(1);
  });
