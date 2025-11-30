import { connectToDatabase, closeDatabase } from '../db';
import { Resource, COLLECTION_NAME, RESOURCE_TYPES, ResourceType } from '../models/Resource';
import { categorize, getTokenUsageStats, resetTokenTracking } from '../services/claudeService';
import { Filter } from 'mongodb';

/**
 * AI-powered script to classify resources with missing resourceType
 * Uses Claude AI to analyze title, description, and URL to determine the best type
 *
 * Run with: npx ts-node src/scripts/classifyResourceTypes.ts
 *
 * Options:
 *   --dry-run    Preview classifications without updating database
 *   --limit N    Only process N resources (for testing)
 */

const VALID_TYPES = RESOURCE_TYPES;

// More descriptive type names for AI context
const TYPE_DESCRIPTIONS: Record<string, string> = {
  'assurance_report': 'Assurance Reports - Formal reports assessing compliance, performance, or outcomes of infrastructure projects',
  'guidance': 'Guidance Documents - Guidelines, manuals, how-to guides, best practices, and implementation instructions',
  'case_study': 'Case Studies - Real-world examples, success stories, lessons learned from specific implementations',
  'tool': 'Tools - Software, applications, calculators, data portals, interactive resources for practical use',
  'template': 'Templates - Reusable documents, forms, frameworks, and standardized formats',
  'research': 'Research - Academic papers, studies, analysis, evidence-based publications',
  'news': 'News - Press releases, announcements, updates, blog posts, current events',
  'training': 'Training Materials - Educational content, courses, webinars, learning resources',
  'policy': 'Policy Documents - Regulations, legal frameworks, official standards, government policies'
};

async function classifyResource(resource: Resource): Promise<{
  type: string;
  confidence: number;
  reasoning: string;
}> {
  // Build content description for AI
  const content = `
Title: ${resource.title}
Description: ${resource.description || 'No description available'}
URL: ${resource.url}
${resource.countryPrograms?.length ? `Country Programs: ${resource.countryPrograms.join(', ')}` : ''}
${resource.themes?.length ? `Themes: ${resource.themes.join(', ')}` : ''}
  `.trim();

  // Format categories with descriptions for better AI understanding
  const categoriesWithDescriptions = VALID_TYPES.map(type =>
    TYPE_DESCRIPTIONS[type] || type
  );

  try {
    const result = await categorize(content, categoriesWithDescriptions);

    // Extract the type key from the result (remove the description part)
    const matchedType = VALID_TYPES.find(type =>
      result.category.toLowerCase().includes(type.replace('_', ' ')) ||
      result.category.toLowerCase().includes(type)
    );

    return {
      type: matchedType || 'guidance', // Default to guidance if no match
      confidence: result.confidence,
      reasoning: result.reasoning
    };
  } catch (error) {
    console.error(`  Error classifying resource ${resource._id}:`, error);
    return {
      type: 'guidance',
      confidence: 0,
      reasoning: 'Classification failed, defaulting to guidance'
    };
  }
}

async function classifyResourceTypes() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const limitIndex = args.indexOf('--limit');
  const limit = limitIndex !== -1 ? parseInt(args[limitIndex + 1], 10) : undefined;

  console.log('🤖 AI Resource Type Classification\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (dryRun) {
    console.log('📋 DRY RUN MODE - No changes will be made to the database\n');
  }

  if (limit) {
    console.log(`📊 Processing limit: ${limit} resources\n`);
  }

  console.log('Valid resource types:');
  VALID_TYPES.forEach(type => console.log(`   - ${type}`));
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    const db = await connectToDatabase();
    const collection = db.collection<Resource>(COLLECTION_NAME);

    // Find resources with missing or null resourceType
    // Use 'as any' to bypass strict MongoDB typing for $or queries
    const query: Filter<Resource> = {
      $or: [
        { resourceType: null as any },
        { resourceType: { $exists: false } as any },
        { resourceType: '' as any }
      ]
    } as Filter<Resource>;

    let cursor = collection.find(query);
    if (limit) {
      cursor = cursor.limit(limit);
    }

    const resources = await cursor.toArray();

    console.log(`📊 Found ${resources.length} resources with missing resourceType\n`);

    if (resources.length === 0) {
      console.log('✅ All resources have a resourceType assigned!\n');
      await closeDatabase();
      return;
    }

    resetTokenTracking();

    let updated = 0;
    let failed = 0;
    const results: Array<{
      id: string;
      title: string;
      type: string;
      confidence: number;
      reasoning: string;
    }> = [];

    for (let i = 0; i < resources.length; i++) {
      const resource = resources[i];
      const progress = `[${i + 1}/${resources.length}]`;

      console.log(`${progress} Processing: ${resource.title.substring(0, 60)}...`);

      const classification = await classifyResource(resource);

      results.push({
        id: resource._id?.toString() || 'unknown',
        title: resource.title,
        type: classification.type,
        confidence: classification.confidence,
        reasoning: classification.reasoning
      });

      console.log(`   → Type: ${classification.type} (${(classification.confidence * 100).toFixed(0)}% confidence)`);
      console.log(`   → Reason: ${classification.reasoning}\n`);

      if (!dryRun) {
        try {
          await collection.updateOne(
            { _id: resource._id },
            {
              $set: {
                resourceType: classification.type as ResourceType,
                updatedAt: new Date()
              }
            }
          );
          updated++;
        } catch (updateError) {
          console.error(`   ❌ Failed to update resource: ${updateError}`);
          failed++;
        }
      }

      // Small delay to avoid rate limiting
      if (i < resources.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 CLASSIFICATION SUMMARY\n');

    // Group by type
    const byType: Record<string, number> = {};
    results.forEach(r => {
      byType[r.type] = (byType[r.type] || 0) + 1;
    });

    console.log('Classifications by type:');
    Object.entries(byType)
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        console.log(`   ${type}: ${count}`);
      });

    // Confidence stats
    const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;
    const lowConfidence = results.filter(r => r.confidence < 0.7);

    console.log(`\nAverage confidence: ${(avgConfidence * 100).toFixed(1)}%`);

    if (lowConfidence.length > 0) {
      console.log(`\n⚠️  ${lowConfidence.length} resource(s) with low confidence (<70%):`);
      lowConfidence.forEach(r => {
        console.log(`   - ${r.title.substring(0, 50)}... → ${r.type} (${(r.confidence * 100).toFixed(0)}%)`);
      });
    }

    // Token usage
    const usage = getTokenUsageStats();
    console.log(`\n💰 AI Token Usage:`);
    console.log(`   Requests: ${usage.totalRequests}`);
    console.log(`   Total tokens: ${usage.totalTokens.toLocaleString()}`);
    console.log(`   Estimated cost: $${usage.totalCost.toFixed(4)}`);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (dryRun) {
      console.log(`\n📋 DRY RUN COMPLETE - ${results.length} resources would be updated`);
      console.log('   Run without --dry-run to apply changes\n');
    } else {
      console.log(`\n✅ COMPLETE: ${updated} updated, ${failed} failed\n`);
    }

    await closeDatabase();
  } catch (error) {
    console.error('❌ Script failed:', error);
    await closeDatabase();
    process.exit(1);
  }
}

classifyResourceTypes();
