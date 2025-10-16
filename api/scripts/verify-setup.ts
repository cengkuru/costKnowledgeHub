#!/usr/bin/env tsx
/**
 * Setup Verification Script
 *
 * Verifies that all components of the full-scale system are in place:
 * - Required files exist
 * - MongoDB connection works
 * - Environment variables configured
 * - Dependencies installed
 */

import { existsSync } from 'fs';
import { MongoClient } from 'mongodb';
import 'dotenv/config';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const NC = '\x1b[0m';

interface CheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
}

const results: CheckResult[] = [];

const check = (name: string, condition: boolean, passMsg: string, failMsg: string): boolean => {
  if (condition) {
    results.push({ name, status: 'pass', message: passMsg });
    return true;
  } else {
    results.push({ name, status: 'fail', message: failMsg });
    return false;
  }
};

const warn = (name: string, message: string) => {
  results.push({ name, status: 'warn', message });
};

console.log(`${BLUE}╔════════════════════════════════════════════════════════════╗${NC}`);
console.log(`${BLUE}║  Full-Scale Setup Verification                             ║${NC}`);
console.log(`${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n`);

// Check 1: Required files
console.log('1️⃣  Checking required files...');

const requiredFiles = [
  'scripts/seed-full-scale.ts',
  'scripts/seed-incremental.ts',
  'scripts/utils/crawler-parallel.ts',
  'scripts/utils/chunker-adaptive.ts',
  'scripts/resources/cost-resources-expanded.ts',
  'scripts/db/ensure-indexes.ts',
  'scripts/monitoring/cost-tracker.ts',
  'scripts/qa/quality-checks.ts',
  'scripts/cron/daily-update.sh',
  'SCALING_GUIDE.md',
  'IMPLEMENTATION_SUMMARY.md'
];

let filesOk = true;
requiredFiles.forEach(file => {
  const exists = existsSync(file);
  filesOk = filesOk && exists;
  check(
    `File: ${file}`,
    exists,
    'Found',
    'Missing - re-run setup'
  );
});

console.log('');

// Check 2: Environment variables
console.log('2️⃣  Checking environment variables...');

check(
  'MONGODB_URI',
  !!process.env.MONGODB_URI,
  'Configured',
  'Missing - add to .env'
);

check(
  'OPENAI_API_KEY',
  !!process.env.OPENAI_API_KEY,
  'Configured',
  'Missing - add to .env'
);

check(
  'DB_NAME',
  !!process.env.DB_NAME,
  `Set to: ${process.env.DB_NAME}`,
  'Missing - add to .env (defaults to "infrascope")'
);

if (!process.env.OPENAI_EMBEDDING_MODEL) {
  warn('OPENAI_EMBEDDING_MODEL', 'Not set - defaulting to "text-embedding-3-large"');
}

console.log('');

// Check 3: MongoDB connection
console.log('3️⃣  Testing MongoDB connection...');

if (process.env.MONGODB_URI) {
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(process.env.DB_NAME || 'infrascope');
    const collection = db.collection('docs');

    check(
      'MongoDB Connection',
      true,
      'Connected successfully',
      'Failed to connect'
    );

    // Check for existing data
    const docCount = await collection.countDocuments();
    if (docCount > 0) {
      warn('Existing Data', `Found ${docCount} documents - incremental mode will skip duplicates`);
    } else {
      warn('Existing Data', 'No documents found - ready for initial seed');
    }

    // Check for vector index
    const indexes = await collection.listIndexes().toArray();
    const hasVectorIndex = indexes.some(idx => idx.name === 'embedding_index');

    if (hasVectorIndex) {
      check(
        'Vector Search Index',
        true,
        'Found',
        'Not found'
      );
    } else {
      results.push({
        name: 'Vector Search Index',
        status: 'warn',
        message: 'Not found - must be created manually in MongoDB Atlas'
      });
    }

    await client.close();
  } catch (error) {
    check(
      'MongoDB Connection',
      false,
      'Connected',
      `Failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
} else {
  check('MongoDB Connection', false, 'Connected', 'MONGODB_URI not set');
}

console.log('');

// Check 4: Resource count
console.log('4️⃣  Checking resource configuration...');

try {
  const { ALL_EXPANDED_RESOURCES } = await import('./resources/cost-resources-expanded.js');

  check(
    'Total Resources',
    ALL_EXPANDED_RESOURCES.length >= 50,
    `${ALL_EXPANDED_RESOURCES.length} resources configured`,
    `Only ${ALL_EXPANDED_RESOURCES.length} resources - expected 50+`
  );

  // Count by category
  const byType = ALL_EXPANDED_RESOURCES.reduce((acc: Record<string, number>, r: { type: string }) => {
    acc[r.type] = (acc[r.type] || 0) + 1;
    return acc;
  }, {});

  console.log('   Resource breakdown:');
  Object.entries(byType).forEach(([type, count]) => {
    console.log(`   - ${type}: ${count}`);
  });
} catch (error) {
  check('Resource Configuration', false, 'Loaded', 'Failed to load resources');
}

console.log('');

// Check 5: Scripts in package.json
console.log('5️⃣  Checking npm scripts...');

try {
  const packageJson = await import('../package.json', { assert: { type: 'json' } });
  const scripts = packageJson.default.scripts;

  const requiredScripts = [
    'seed:full',
    'seed:incremental',
    'db:indexes',
    'qa:check',
    'cost:today',
    'cost:month'
  ];

  requiredScripts.forEach(script => {
    check(
      `npm run ${script}`,
      !!scripts[script],
      'Available',
      'Missing'
    );
  });
} catch (error) {
  warn('Package Scripts', 'Could not verify - check package.json manually');
}

console.log('');

// Summary
console.log(`${BLUE}╔════════════════════════════════════════════════════════════╗${NC}`);
console.log(`${BLUE}║  Verification Summary                                      ║${NC}`);
console.log(`${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n`);

const passed = results.filter(r => r.status === 'pass').length;
const failed = results.filter(r => r.status === 'fail').length;
const warned = results.filter(r => r.status === 'warn').length;

console.log(`${GREEN}✅ Passed: ${passed}${NC}`);
console.log(`${RED}❌ Failed: ${failed}${NC}`);
console.log(`${YELLOW}⚠️  Warnings: ${warned}${NC}\n`);

// Show failures and warnings
if (failed > 0) {
  console.log(`${RED}Failures:${NC}`);
  results
    .filter(r => r.status === 'fail')
    .forEach(r => console.log(`  ❌ ${r.name}: ${r.message}`));
  console.log('');
}

if (warned > 0) {
  console.log(`${YELLOW}Warnings:${NC}`);
  results
    .filter(r => r.status === 'warn')
    .forEach(r => console.log(`  ⚠️  ${r.name}: ${r.message}`));
  console.log('');
}

// Final verdict
if (failed === 0) {
  console.log(`${GREEN}╔════════════════════════════════════════════════════════════╗${NC}`);
  console.log(`${GREEN}║  ✅ System Ready!                                          ║${NC}`);
  console.log(`${GREEN}╚════════════════════════════════════════════════════════════╝${NC}\n`);

  console.log('Next steps:');
  console.log('  1. Run: npm run seed:full');
  console.log('  2. Check: npm run qa:check');
  console.log('  3. Review: npm run cost:today');
  console.log('');

  if (warned > 0) {
    console.log(`${YELLOW}Note: ${warned} warning(s) detected but system is functional${NC}`);
    console.log('');
  }

  process.exit(0);
} else {
  console.log(`${RED}╔════════════════════════════════════════════════════════════╗${NC}`);
  console.log(`${RED}║  ❌ Setup Incomplete                                       ║${NC}`);
  console.log(`${RED}╚════════════════════════════════════════════════════════════╝${NC}\n`);

  console.log('Please fix the failures above before proceeding.');
  console.log('See SCALING_GUIDE.md for setup instructions.');
  console.log('');

  process.exit(1);
}
