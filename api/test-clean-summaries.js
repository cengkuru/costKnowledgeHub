/**
 * Test clean, untruncated AI summaries
 * Run with: npx tsx test-clean-summaries.js
 */

import { generateSummary } from './src/services/summarizer.js';

// Real-world messy document (like what we saw in the screenshot)
const messyDocument = {
  title: 'Christiaan (Chrik) Poortman – Infrastructure Transparency Initiative',
  type: 'Guide',
  text: `Email: Christiaan (Chrik) Poortman | CoST – Infrastructure Transparency Initiative CoST – Infrastructure Transparency Initiative Skip to content Tools Guidance Search About Home Menu Contact

The Infrastructure Transparency Initiative (CoST) promotes transparency and accountability in public infrastructure. This guide provides comprehensive frameworks for implementing disclosure requirements, monitoring procedures, and assurance mechanisms across infrastructure projects.

Key topics covered include:
- Procurement transparency standards
- Multi-stakeholder group formation
- Assurance process implementation
- Data publication requirements
- Impact measurement frameworks

The guide draws from experiences in over 20 countries implementing infrastructure transparency reforms, with particular focus on practical implementation challenges and solutions.`
};

const cleanDocument = {
  title: 'What you need to know about transparent procurement',
  type: 'News',
  text: `The 2025 Open Government Partnership (OGP) Asia and the Pacific Regional Meeting was held in Manila, Philippines in February 2025.

The meeting brought together government officials, civil society organizations, and infrastructure transparency advocates to discuss best practices for procurement transparency. Key themes included the importance of early disclosure, citizen engagement in monitoring, and the role of digital platforms in making procurement data accessible to the public.

CoST's experience in promoting infrastructure transparency across 20+ countries provided valuable lessons for participants.`
};

async function test() {
  console.log('🧪 Testing Clean AI Summaries (No Truncations)\n');
  console.log('═'.repeat(70));

  // Test 1: Messy document with navigation and metadata
  console.log('\n📄 TEST 1: Messy Document (navigation + metadata)');
  console.log('─'.repeat(70));
  console.log('Title:', messyDocument.title);
  console.log('Type:', messyDocument.type);
  console.log('Text preview:', messyDocument.text.slice(0, 150) + '...\n');

  const result1 = await generateSummary(
    messyDocument.title,
    messyDocument.text,
    messyDocument.type
  );

  console.log('✨ AI Summary:');
  console.log('  "' + result1.summary + '"');
  console.log('\n✓ Length:', result1.summary.length, 'characters');
  console.log('✓ Has truncation (...):', result1.summary.includes('...') ? '❌ YES (BAD!)' : '✅ NO (GOOD!)');
  console.log('✓ Has ellipsis (…):', result1.summary.includes('…') ? '❌ YES (BAD!)' : '✅ NO (GOOD!)');
  console.log('✓ Contains email:', result1.summary.toLowerCase().includes('email') ? '❌ YES (BAD!)' : '✅ NO (GOOD!)');
  console.log('✓ Contains navigation:', /skip|menu|search/i.test(result1.summary) ? '❌ YES (BAD!)' : '✅ NO (GOOD!)');
  console.log('✓ Starts with action verb:', /^(Explains|Provides|Outlines|Details|Describes|Covers|Discusses)/i.test(result1.summary) ? '✅ YES (GOOD!)' : '❌ NO (BAD!)');

  // Test 2: Clean document
  console.log('\n═'.repeat(70));
  console.log('\n📄 TEST 2: Clean Document');
  console.log('─'.repeat(70));
  console.log('Title:', cleanDocument.title);
  console.log('Type:', cleanDocument.type, '\n');

  const result2 = await generateSummary(
    cleanDocument.title,
    cleanDocument.text,
    cleanDocument.type
  );

  console.log('✨ AI Summary:');
  console.log('  "' + result2.summary + '"');
  console.log('\n✓ Length:', result2.summary.length, 'characters');
  console.log('✓ Has truncation (...):', result2.summary.includes('...') ? '❌ YES (BAD!)' : '✅ NO (GOOD!)');
  console.log('✓ Has ellipsis (…):', result2.summary.includes('…') ? '❌ YES (BAD!)' : '✅ NO (GOOD!)');
  console.log('✓ Starts with action verb:', /^(Explains|Provides|Outlines|Details|Describes|Covers|Discusses)/i.test(result2.summary) ? '✅ YES (GOOD!)' : '❌ NO (BAD!)');

  // Final assessment
  console.log('\n═'.repeat(70));
  console.log('\n🎯 JONY IVE QUALITY CHECK:');
  console.log('─'.repeat(70));

  const checks = [
    { name: 'No truncations or ellipsis', pass: !result1.summary.includes('...') && !result1.summary.includes('…') && !result2.summary.includes('...') && !result2.summary.includes('…') },
    { name: 'No navigation text', pass: !/skip|menu|search/i.test(result1.summary) },
    { name: 'No email metadata', pass: !result1.summary.toLowerCase().includes('email') },
    { name: 'Action-oriented (verbs)', pass: /^(Explains|Provides|Outlines|Details|Describes|Covers|Discusses)/i.test(result1.summary) && /^(Explains|Provides|Outlines|Details|Describes|Covers|Discusses)/i.test(result2.summary) },
    { name: 'Complete sentences', pass: result1.summary.match(/[.!?]$/) && result2.summary.match(/[.!?]$/) },
    { name: 'Reasonable length (20-200 chars)', pass: result1.summary.length >= 20 && result1.summary.length <= 200 && result2.summary.length >= 20 && result2.summary.length <= 200 }
  ];

  checks.forEach(check => {
    console.log(check.pass ? '✅' : '❌', check.name);
  });

  const allPass = checks.every(c => c.pass);
  console.log('\n' + (allPass ? '🎉 ALL CHECKS PASSED!' : '⚠️  SOME CHECKS FAILED'));
  console.log('\n"Simplicity is the ultimate sophistication." – Jony Ive\n');

  if (!allPass) {
    process.exit(1);
  }
}

test().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
