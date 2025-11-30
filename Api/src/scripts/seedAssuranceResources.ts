/**
 * Seed comprehensive assurance and independent review resources
 * These are core CoST documents for infrastructure transparency
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';

dotenv.config();

const ASSURANCE_RESOURCES = [
  {
    title: "CoST Assurance Manual Volume 1: Independent Review",
    description: "Comprehensive guide to conducting independent reviews of infrastructure projects. Covers methodology, data analysis, stakeholder engagement, and report writing. The manual provides step-by-step guidance for assurance teams to review disclosed data, identify issues, and produce high-quality independent review reports.",
    url: "https://infrastructuretransparency.org/resource/cost-assurance-manual/",
    resourceType: "guidance",
    themes: ["project_monitoring", "data_standards", "msg_governance"],
    countryPrograms: ["global"],
    tags: ["independent review", "assurance", "methodology", "data analysis", "report writing"],
    featured: true,
    priority: 1
  },
  {
    title: "CoST Assurance Manual Volume 2: Formal Verification",
    description: "Detailed guidance on formal verification processes including technical audits, physical inspections, and quality assurance. Explains how to verify that disclosed data accurately reflects project reality through site visits and document examination.",
    url: "https://infrastructuretransparency.org/resource/cost-assurance-manual-vol-2/",
    resourceType: "guidance",
    themes: ["project_monitoring", "data_standards"],
    countryPrograms: ["global"],
    tags: ["verification", "audit", "site inspection", "quality assurance"],
    featured: true,
    priority: 2
  },
  {
    title: "Independent Review Step-by-Step Guide",
    description: "Practical step-by-step guide for conducting independent reviews. Walks through the entire process from project selection to final report publication, with templates and checklists for each stage.",
    url: "https://infrastructuretransparency.org/resource/independent-review-step-by-step/",
    resourceType: "guidance",
    themes: ["project_monitoring"],
    countryPrograms: ["global"],
    tags: ["step-by-step", "checklist", "methodology", "independent review"],
    featured: true,
    priority: 3
  },
  {
    title: "Annex 2: Independent Review Excel Tool",
    description: "Excel-based tool for systematically analyzing infrastructure project data during independent reviews. Includes templates for tracking CoST IDS data points, identifying red flags, and generating summary reports.",
    url: "https://infrastructuretransparency.org/resource/manual-vol-1-annex-2/",
    resourceType: "tool",
    themes: ["project_monitoring", "digital_tools"],
    countryPrograms: ["global"],
    tags: ["excel tool", "data analysis", "template", "independent review"]
  },
  {
    title: "Annex 4: Quality Verification Checklist",
    description: "Comprehensive checklist for verifying data quality during independent reviews. Covers completeness, accuracy, timeliness, and consistency checks for each CoST IDS data point.",
    url: "https://infrastructuretransparency.org/resource/manual-vol-1-annex-4/",
    resourceType: "template",
    themes: ["project_monitoring", "data_standards"],
    countryPrograms: ["global"],
    tags: ["checklist", "data quality", "verification", "CoST IDS"]
  },
  {
    title: "Sample Independent Review Report",
    description: "Example independent review report demonstrating best practices in structure, analysis, findings presentation, and recommendations. Use as a template for producing high-quality assurance reports.",
    url: "https://infrastructuretransparency.org/resource/sample-ir-report/",
    resourceType: "template",
    themes: ["project_monitoring"],
    countryPrograms: ["global"],
    tags: ["sample report", "template", "best practice", "independent review"]
  },
  {
    title: "Assurance Findings Classification Framework",
    description: "Framework for categorizing and prioritizing findings from independent reviews. Classifies issues by severity, type (procurement, implementation, data quality), and potential impact on value for money.",
    url: "https://infrastructuretransparency.org/resource/findings-classification/",
    resourceType: "guidance",
    themes: ["project_monitoring", "procurement"],
    countryPrograms: ["global"],
    tags: ["findings", "classification", "prioritization", "value for money"]
  },
  {
    title: "Designing an Assurance Process: Guidance Note",
    description: "Guidance for CoST programmes on establishing and institutionalizing assurance processes. Covers team composition, legal frameworks, resource requirements, and integration with government oversight systems.",
    url: "https://infrastructuretransparency.org/resource/designing-assurance-process/",
    resourceType: "guidance",
    themes: ["msg_governance", "project_monitoring"],
    countryPrograms: ["global"],
    tags: ["process design", "institutionalization", "governance", "assurance"],
    featured: true,
    priority: 4
  },
  {
    title: "Red Flags in Infrastructure: Identification Guide",
    description: "Practical guide to identifying red flags and anomalies in infrastructure project data. Covers common issues in procurement, contract management, project delays, cost overruns, and data disclosure.",
    url: "https://infrastructuretransparency.org/resource/red-flags-guide/",
    resourceType: "guidance",
    themes: ["project_monitoring", "procurement"],
    countryPrograms: ["global"],
    tags: ["red flags", "anomalies", "risk identification", "procurement"]
  },
  {
    title: "CoST Uganda: Independent Review Case Studies",
    description: "Collection of independent review reports from Uganda's CoST programme. Demonstrates practical application of assurance methodology in African context with findings on road, health, and education infrastructure.",
    url: "https://infrastructuretransparency.org/resource/uganda-ir-case-studies/",
    resourceType: "case_study",
    themes: ["project_monitoring", "local_government"],
    countryPrograms: ["uganda"],
    tags: ["case study", "Uganda", "roads", "health infrastructure", "independent review"]
  },
  {
    title: "CoST Honduras: Assurance Impact Report",
    description: "Report documenting the impact of independent reviews in Honduras, including recovered funds, cancelled contracts, and systemic reforms triggered by assurance findings.",
    url: "https://infrastructuretransparency.org/resource/honduras-assurance-impact/",
    resourceType: "case_study",
    themes: ["project_monitoring", "impact_measurement"],
    countryPrograms: ["honduras"],
    tags: ["impact", "Honduras", "reforms", "accountability", "independent review"]
  },
  {
    title: "Terms of Reference Template: Independent Review Team",
    description: "Template Terms of Reference for recruiting and contracting independent review teams. Includes required qualifications, scope of work, deliverables, and performance indicators.",
    url: "https://infrastructuretransparency.org/resource/ir-team-tor/",
    resourceType: "template",
    themes: ["project_monitoring", "msg_governance"],
    countryPrograms: ["global"],
    tags: ["TOR", "recruitment", "contracting", "team composition"]
  },
  {
    title: "Quality Verification List for Independent Review Reports",
    description: "Checklist for reviewing and quality assuring independent review reports before publication. Ensures reports meet CoST standards for evidence, analysis, and presentation.",
    url: "https://infrastructuretransparency.org/resource/ir-report-qv-list/",
    resourceType: "template",
    themes: ["project_monitoring"],
    countryPrograms: ["global"],
    tags: ["quality assurance", "checklist", "report review", "standards"]
  }
];

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100);
}

async function seedAssuranceResources() {
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
    console.log(`Adding ${ASSURANCE_RESOURCES.length} assurance resources...`);

    let inserted = 0;
    let updated = 0;

    for (const resource of ASSURANCE_RESOURCES) {
      const doc = {
        title: resource.title,
        description: resource.description,
        url: resource.url,
        slug: generateSlug(resource.title),
        resourceType: resource.resourceType,
        countryPrograms: resource.countryPrograms,
        themes: resource.themes,
        oc4idsAlignment: ['full_schema'],
        workstreams: ['assurance'],
        audience: ['technical', 'policy', 'msg'],
        accessLevel: 'public',
        language: 'en',
        isTranslation: false,
        translations: [],
        publicationDate: new Date('2024-01-01'),
        lastVerified: new Date(),
        status: 'published',
        statusHistory: [{
          from: 'pending_review',
          to: 'published',
          changedAt: new Date(),
          reason: 'Core CoST assurance resource'
        }],
        publishedAt: new Date(),
        source: 'manual',
        tags: resource.tags,
        topics: resource.themes,
        regions: ['global'],
        clicks: 0,
        aiCitations: 0,
        featured: resource.featured || false,
        priority: resource.priority || 99,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await collection.updateOne(
        { url: doc.url },
        { $set: doc },
        { upsert: true }
      );

      if (result.upsertedCount > 0) {
        inserted++;
        console.log(`  + ${resource.title}`);
      } else if (result.modifiedCount > 0) {
        updated++;
        console.log(`  ~ ${resource.title}`);
      }
    }

    console.log('\n=== Assurance Resources Seeded ===');
    console.log(`Inserted: ${inserted}`);
    console.log(`Updated: ${updated}`);

    // Count assurance resources
    const assuranceCount = await collection.countDocuments({
      $or: [
        { workstreams: 'assurance' },
        { tags: { $in: ['independent review', 'assurance'] } }
      ]
    });
    console.log(`Total assurance resources: ${assuranceCount}`);

  } finally {
    await client.close();
    console.log('\nDatabase connection closed');
  }
}

seedAssuranceResources()
  .then(() => {
    console.log('\nSeeding completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  });
