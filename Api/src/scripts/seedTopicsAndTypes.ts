/**
 * Seed script to populate topics and resource types
 * Run with: npx ts-node src/scripts/seedTopicsAndTypes.ts
 */

import 'dotenv/config';
import { connectToDatabase, closeDatabase } from '../db';

const DEFAULT_TOPICS = [
  {
    name: 'Disclosure',
    slug: 'disclosure',
    description: 'Proactive disclosure of infrastructure project information to promote transparency',
    order: 1
  },
  {
    name: 'Assurance',
    slug: 'assurance',
    description: 'Independent review and verification of infrastructure data and processes',
    order: 2
  },
  {
    name: 'Open Contracting',
    slug: 'open-contracting',
    description: 'Transparency in public procurement and contracting processes',
    order: 3
  },
  {
    name: 'Data Standards',
    slug: 'data-standards',
    description: 'Technical standards for publishing infrastructure data (OC4IDS, OCDS)',
    order: 4
  },
  {
    name: 'Monitoring & Evaluation',
    slug: 'monitoring-evaluation',
    description: 'Tracking progress and measuring impact of transparency initiatives',
    order: 5
  },
  {
    name: 'Capacity Building',
    slug: 'capacity-building',
    description: 'Training and support for implementing transparency measures',
    order: 6
  },
  {
    name: 'Multi-Stakeholder Engagement',
    slug: 'multi-stakeholder-engagement',
    description: 'Collaboration between government, industry, and civil society',
    order: 7
  },
  {
    name: 'Climate & Environment',
    slug: 'climate-environment',
    description: 'Transparency in climate finance and environmental impact',
    order: 8
  }
];

const DEFAULT_RESOURCE_TYPES = [
  {
    name: 'Guidance',
    slug: 'guidance',
    description: 'Guidelines, manuals, how-to guides, and best practices',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
    order: 1
  },
  {
    name: 'Case Study',
    slug: 'case_study',
    description: 'Real-world examples, success stories, and lessons learned',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>',
    order: 2
  },
  {
    name: 'Assurance Report',
    slug: 'assurance_report',
    description: 'Formal reports assessing compliance and outcomes of infrastructure projects',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>',
    order: 3
  },
  {
    name: 'Tool',
    slug: 'tool',
    description: 'Software, applications, calculators, and data portals',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
    order: 4
  },
  {
    name: 'Template',
    slug: 'template',
    description: 'Reusable documents, forms, and standardized formats',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>',
    order: 5
  },
  {
    name: 'Research',
    slug: 'research',
    description: 'Academic papers, studies, and evidence-based publications',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    order: 6
  },
  {
    name: 'News',
    slug: 'news',
    description: 'Press releases, announcements, and updates',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/></svg>',
    order: 7
  },
  {
    name: 'Training',
    slug: 'training',
    description: 'Educational content, courses, webinars, and learning resources',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>',
    order: 8
  },
  {
    name: 'Policy',
    slug: 'policy',
    description: 'Regulations, legal frameworks, and official standards',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    order: 9
  }
];

async function seedTopicsAndTypes() {
  console.log('🌱 Seeding Topics and Resource Types\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    const db = await connectToDatabase();
    const now = new Date();

    // Seed Topics
    console.log('📂 Seeding Topics...');
    const topicsCollection = db.collection('topics');
    const existingTopics = await topicsCollection.countDocuments();

    if (existingTopics > 0) {
      console.log(`   ⚠️  Topics collection already has ${existingTopics} documents`);
      console.log('   Skipping topics seeding. Use --force to override.\n');
    } else {
      const topicsWithTimestamps = DEFAULT_TOPICS.map(topic => ({
        ...topic,
        isActive: true,
        resourceCount: 0,
        createdAt: now,
        updatedAt: now
      }));

      const topicResult = await topicsCollection.insertMany(topicsWithTimestamps);
      console.log(`   ✅ Inserted ${topicResult.insertedCount} topics\n`);
    }

    // Seed Resource Types
    console.log('📦 Seeding Resource Types...');
    const typesCollection = db.collection('resourceTypes');
    const existingTypes = await typesCollection.countDocuments();

    if (existingTypes > 0) {
      console.log(`   ⚠️  Resource Types collection already has ${existingTypes} documents`);
      console.log('   Skipping types seeding. Use --force to override.\n');
    } else {
      const typesWithTimestamps = DEFAULT_RESOURCE_TYPES.map(type => ({
        ...type,
        isActive: true,
        resourceCount: 0,
        createdAt: now,
        updatedAt: now
      }));

      const typeResult = await typesCollection.insertMany(typesWithTimestamps);
      console.log(`   ✅ Inserted ${typeResult.insertedCount} resource types\n`);
    }

    // Verify
    const finalTopics = await topicsCollection.countDocuments();
    const finalTypes = await typesCollection.countDocuments();

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 SUMMARY\n');
    console.log(`   Topics: ${finalTopics}`);
    console.log(`   Resource Types: ${finalTypes}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('✅ Seeding complete!\n');

    await closeDatabase();
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    await closeDatabase();
    process.exit(1);
  }
}

seedTopicsAndTypes();
