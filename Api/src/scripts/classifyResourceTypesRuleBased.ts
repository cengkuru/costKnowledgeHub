import { connectToDatabase, closeDatabase } from '../db';
import { Resource, COLLECTION_NAME, ResourceType } from '../models/Resource';
import { Filter } from 'mongodb';

/**
 * Rule-based script to classify resources with missing resourceType
 * Uses keyword matching on title, description, and URL patterns
 *
 * Run with: npx ts-node src/scripts/classifyResourceTypesRuleBased.ts
 *
 * Options:
 *   --dry-run    Preview classifications without updating database
 *   --limit N    Only process N resources (for testing)
 */

interface ClassificationRule {
  type: ResourceType;
  keywords: string[];
  urlPatterns?: string[];
  priority: number; // Higher = more specific
}

// Classification rules ordered by specificity
const CLASSIFICATION_RULES: ClassificationRule[] = [
  // High priority - very specific matches
  {
    type: ResourceType.ASSURANCE_REPORT,
    keywords: ['assurance report', 'assurance findings', 'audit report', 'monitoring report', 'evaluation report'],
    urlPatterns: ['/assurance/', 'assurance-report'],
    priority: 100
  },
  {
    type: ResourceType.TOOL,
    keywords: ['tool', 'toolkit', 'calculator', 'portal', 'platform', 'data portal', 'visualization', 'visualisation', 'application', 'software', 'database', 'api', 'extension'],
    urlPatterns: ['/tools/', 'github.com', 'tool'],
    priority: 90
  },
  {
    type: ResourceType.TEMPLATE,
    keywords: ['template', 'form', 'schema', 'boilerplate', 'standard format', 'sample document'],
    urlPatterns: ['/template', 'schema'],
    priority: 85
  },
  {
    type: ResourceType.TRAINING,
    keywords: ['training', 'course', 'webinar', 'workshop', 'learning', 'e-learning', 'module', 'lesson', 'tutorial', 'curriculum', 'certificate'],
    urlPatterns: ['/training/', '/learn/', 'webinar', 'course'],
    priority: 80
  },
  {
    type: ResourceType.CASE_STUDY,
    keywords: ['case study', 'success story', 'lessons learned', 'implementation story', 'example', 'pilot project', 'country experience'],
    urlPatterns: ['/case-stud', 'case_study'],
    priority: 75
  },
  {
    type: ResourceType.RESEARCH,
    keywords: ['research', 'study', 'analysis', 'findings', 'paper', 'academic', 'journal', 'evidence', 'assessment'],
    urlPatterns: ['/research/', 'paper', 'academic'],
    priority: 70
  },
  {
    type: ResourceType.POLICY,
    keywords: ['policy', 'regulation', 'law', 'legal', 'standard', 'requirement', 'mandate', 'framework', 'act', 'decree', 'directive'],
    urlPatterns: ['/policy/', '/legal/'],
    priority: 65
  },
  {
    type: ResourceType.NEWS,
    keywords: ['news', 'announcement', 'press release', 'blog', 'update', 'event'],
    urlPatterns: ['/news/', '/blog/', '/press/'],
    priority: 60
  },
  // Default fallback - guidance (most common for infrastructure transparency)
  {
    type: ResourceType.GUIDANCE,
    keywords: ['guidance', 'guide', 'how to', 'how-to', 'implementation', 'introduction', 'getting started', 'overview', 'manual', 'handbook', 'best practice', 'primer', 'faq'],
    urlPatterns: ['/guidance/', '/guide/', 'guide'],
    priority: 50
  }
];

function classifyResource(resource: Resource): {
  type: ResourceType;
  confidence: number;
  reasoning: string;
  matchedRules: string[];
} {
  const title = (resource.title || '').toLowerCase();
  const description = (resource.description || '').toLowerCase();
  const url = (resource.url || '').toLowerCase();

  const text = `${title} ${description}`;

  let bestMatch: ClassificationRule | null = null;
  let bestScore = 0;
  const matchedRules: string[] = [];

  for (const rule of CLASSIFICATION_RULES) {
    let score = 0;
    const matches: string[] = [];

    // Check keywords in title/description
    for (const keyword of rule.keywords) {
      if (title.includes(keyword)) {
        score += 30; // Title match is strong
        matches.push(`title contains "${keyword}"`);
      } else if (description.includes(keyword)) {
        score += 15; // Description match is weaker
        matches.push(`description contains "${keyword}"`);
      }
    }

    // Check URL patterns
    if (rule.urlPatterns) {
      for (const pattern of rule.urlPatterns) {
        if (url.includes(pattern)) {
          score += 20; // URL pattern match
          matches.push(`URL contains "${pattern}"`);
        }
      }
    }

    // Apply priority weighting
    if (score > 0) {
      score += rule.priority * 0.1;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = rule;
      matchedRules.length = 0;
      matchedRules.push(...matches);
    }
  }

  // Calculate confidence based on score
  // Max reasonable score would be around 100 (3 keyword matches + URL + priority)
  const confidence = Math.min(1, bestScore / 80);

  // Default to guidance if no strong match
  if (!bestMatch || bestScore < 10) {
    return {
      type: ResourceType.GUIDANCE,
      confidence: 0.3,
      reasoning: 'No strong matches found, defaulting to guidance',
      matchedRules: []
    };
  }

  return {
    type: bestMatch.type,
    confidence,
    reasoning: `Matched ${bestMatch.type}: ${matchedRules.join(', ')}`,
    matchedRules
  };
}

async function classifyResourceTypes() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const limitIndex = args.indexOf('--limit');
  const limit = limitIndex !== -1 ? parseInt(args[limitIndex + 1], 10) : undefined;

  console.log('📋 Rule-Based Resource Type Classification\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (dryRun) {
    console.log('📋 DRY RUN MODE - No changes will be made to the database\n');
  }

  if (limit) {
    console.log(`📊 Processing limit: ${limit} resources\n`);
  }

  console.log('Valid resource types:');
  Object.values(ResourceType).forEach(type => console.log(`   - ${type}`));
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    const db = await connectToDatabase();
    const collection = db.collection<Resource>(COLLECTION_NAME);

    // Find resources with missing or null resourceType
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

    let updated = 0;
    let failed = 0;
    const results: Array<{
      id: string;
      title: string;
      type: ResourceType;
      confidence: number;
      reasoning: string;
    }> = [];

    for (let i = 0; i < resources.length; i++) {
      const resource = resources[i];
      const progress = `[${i + 1}/${resources.length}]`;

      console.log(`${progress} Processing: ${resource.title.substring(0, 60)}...`);

      const classification = classifyResource(resource);

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
                resourceType: classification.type,
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
    const lowConfidence = results.filter(r => r.confidence < 0.5);
    const highConfidence = results.filter(r => r.confidence >= 0.7);

    console.log(`\nConfidence distribution:`);
    console.log(`   High (>=70%): ${highConfidence.length}`);
    console.log(`   Medium (50-70%): ${results.length - highConfidence.length - lowConfidence.length}`);
    console.log(`   Low (<50%): ${lowConfidence.length}`);
    console.log(`\nAverage confidence: ${(avgConfidence * 100).toFixed(1)}%`);

    if (lowConfidence.length > 0) {
      console.log(`\n⚠️  ${lowConfidence.length} resource(s) with low confidence (<50%):`);
      lowConfidence.slice(0, 5).forEach(r => {
        console.log(`   - ${r.title.substring(0, 50)}... → ${r.type} (${(r.confidence * 100).toFixed(0)}%)`);
      });
      if (lowConfidence.length > 5) {
        console.log(`   ... and ${lowConfidence.length - 5} more`);
      }
    }

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
