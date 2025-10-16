#!/usr/bin/env tsx
/**
 * Discover all pages on infrastructuretransparency.org
 *
 * Crawls the site to find all available pages and creates a resource list
 *
 * Usage:
 *   npm run discover:cost
 */

import { discoverAndSave } from './utils/sitemap-crawler.js';

const BASE_URL = 'https://infrastructuretransparency.org';
const DEFAULT_OUTPUT = 'scripts/resources/cost-site-discovered.ts';

const args = process.argv.slice(2);

const getArgValue = (flag: string): string | undefined => {
  const eqPrefix = `${flag}=`;
  const matchWithEq = args.find(arg => arg.startsWith(eqPrefix));
  if (matchWithEq) {
    return matchWithEq.slice(eqPrefix.length);
  }

  const index = args.indexOf(flag);
  if (index !== -1 && index + 1 < args.length) {
    return args[index + 1];
  }
  return undefined;
};

const parseNumberArg = (flag: string, fallback: number): number => {
  const value = getArgValue(flag);
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    console.warn(`⚠️  Ignoring invalid value for ${flag}: ${value}`);
    return fallback;
  }
  return parsed;
};

const maxDepth = parseNumberArg('--max-depth', 3);
const maxPages = parseNumberArg('--max-pages', 400);
const outputFile = getArgValue('--output') ?? DEFAULT_OUTPUT;
const useSitemap = !args.includes('--no-sitemap');

const sitemapArgs = args
  .filter(arg => arg.startsWith('--sitemap='))
  .map(arg => arg.slice('--sitemap='.length))
  .filter(Boolean);

const sitemapUrls = sitemapArgs.length > 0 ? sitemapArgs : undefined;

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  CoST Website Discovery                                    ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

console.log('📋 Discovery options:');
console.log(`  - Base URL:    ${BASE_URL}`);
console.log(`  - Max depth:   ${maxDepth}`);
console.log(`  - Max pages:   ${maxPages}`);
console.log(`  - Output file: ${outputFile}`);
console.log(`  - Use sitemap: ${useSitemap ? 'yes' : 'no'}`);
if (sitemapUrls && sitemapUrls.length > 0) {
  console.log('  - Sitemap overrides:');
  sitemapUrls.forEach(url => console.log(`      • ${url}`));
}
console.log('');

try {
  const resources = await discoverAndSave(BASE_URL, outputFile, {
    maxDepth,
    maxPages,
    useSitemap,
    sitemapUrls,
    excludePatterns: [
      /\/wp-admin\//,
      /\/wp-content\//,
      /\/wp-includes\//,
      /\.(jpg|jpeg|png|gif|pdf|zip|doc|docx|xls|xlsx|mp4|mov)$/i,
      /\/feed\//,
      /\/author\//,
      /\/tag\//,
      /\/category\//,
      /\/page\/\d+/,   // Pagination
      /\?/,            // Query parameters
      /#/              // Anchors
    ]
  });

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  ✅ Discovery Complete                                     ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log(`Discovered ${resources.length} pages`);
  console.log(`Output: ${outputFile}`);
  console.log('');
  console.log('Next steps:');
  console.log('  1. Review discovered resources');
  console.log('  2. Run: npm run seed:discovered');
  console.log('');

  process.exit(0);
} catch (error) {
  console.error('❌ Discovery failed:', error);
  process.exit(1);
}
