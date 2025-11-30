/**
 * Test script to verify Anthropic API connection
 * Run with: npx ts-node src/scripts/testClaudeApi.ts
 */

import 'dotenv/config';
import {
  initClaudeClient,
  chat,
  summarize,
  categorize,
  getTokenUsageStats,
  resetTokenTracking,
  ChatMessage
} from '../services/claudeService';

async function testApiConnection() {
  console.log('🔌 Testing Anthropic API Connection\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.error('❌ ANTHROPIC_API_KEY not found in environment');
    process.exit(1);
  }

  if (apiKey.includes('your-')) {
    console.error('❌ ANTHROPIC_API_KEY appears to be a placeholder');
    process.exit(1);
  }

  console.log(`📝 API Key: ${apiKey.substring(0, 20)}...${apiKey.substring(apiKey.length - 10)}\n`);

  try {
    initClaudeClient({ apiKey });
    resetTokenTracking();

    // Test 1: Basic chat
    console.log('Test 1: Basic Chat (Haiku)');
    console.log('─────────────────────────────────────────');
    const messages: ChatMessage[] = [
      { role: 'user', content: 'Reply with exactly: "API connection successful"' }
    ];

    const response = await chat(messages, 'haiku');

    console.log(`   Response: ${response.content}`);
    console.log(`   Model: ${response.model}`);
    console.log(`   Tokens: ${response.tokenUsage.totalTokens}`);
    console.log(`   Cost: $${response.tokenUsage.estimatedCost.toFixed(6)}`);
    console.log('   ✅ PASSED\n');

    // Test 2: Summarize
    console.log('Test 2: Summarize Function');
    console.log('─────────────────────────────────────────');
    const content = `
      The Open Contracting for Infrastructure Data Standard (OC4IDS) is a data standard
      that helps governments publish infrastructure project information in a structured
      and interoperable way. It builds on the Open Contracting Data Standard and extends
      it with infrastructure-specific fields.
    `;

    const summaryResponse = await summarize(content, 100);
    console.log(`   Summary: ${summaryResponse.content.substring(0, 100)}...`);
    console.log(`   Tokens: ${summaryResponse.tokenUsage.totalTokens}`);
    console.log('   ✅ PASSED\n');

    // Test 3: Categorize
    console.log('Test 3: Categorize Function');
    console.log('─────────────────────────────────────────');
    const testContent = 'A practical guide on how to implement OC4IDS data disclosure';
    const categories = ['guidance', 'tool', 'research', 'news', 'policy'];

    const categoryResult = await categorize(testContent, categories);
    console.log(`   Content: "${testContent}"`);
    console.log(`   Category: ${categoryResult.category}`);
    console.log(`   Confidence: ${(categoryResult.confidence * 100).toFixed(0)}%`);
    console.log(`   Reasoning: ${categoryResult.reasoning}`);
    console.log('   ✅ PASSED\n');

    // Summary
    const stats = getTokenUsageStats();
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 SUMMARY\n');
    console.log(`   Total Requests: ${stats.totalRequests}`);
    console.log(`   Total Tokens: ${stats.totalTokens}`);
    console.log(`   Total Cost: $${stats.totalCost.toFixed(6)}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('✅ ALL TESTS PASSED - API CONNECTION WORKING\n');

  } catch (error: any) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ API CONNECTION FAILED\n');
    console.error(`   Error: ${error.message}`);

    if (error.message.includes('Authentication')) {
      console.error('\n   The API key appears to be invalid.');
      console.error('   Please check your ANTHROPIC_API_KEY in .env');
    }

    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    process.exit(1);
  }
}

testApiConnection();
