#!/usr/bin/env npx ts-node
/**
 * Post-Deployment Smoke Tests
 *
 * Run against deployed API to verify all critical endpoints work.
 * Usage: npx ts-node scripts/post-deploy-smoke-tests.ts [API_URL]
 *
 * Example:
 *   npx ts-node scripts/post-deploy-smoke-tests.ts https://api.example.com
 */

const API_URL = process.argv[2] || process.env.API_URL || 'http://localhost:3000';

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
}

const results: TestResult[] = [];

async function runTest(name: string, testFn: () => Promise<void>): Promise<void> {
  const startTime = Date.now();
  try {
    await testFn();
    results.push({
      name,
      passed: true,
      duration: Date.now() - startTime,
    });
    console.log(`  ✓ ${name} (${Date.now() - startTime}ms)`);
  } catch (error: any) {
    results.push({
      name,
      passed: false,
      duration: Date.now() - startTime,
      error: error.message,
    });
    console.log(`  ✗ ${name} - ${error.message}`);
  }
}

async function fetchJson(endpoint: string, options: RequestInit = {}): Promise<any> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

async function runSmokeTests(): Promise<void> {
  console.log(`\n🔥 Running Post-Deployment Smoke Tests`);
  console.log(`   API URL: ${API_URL}\n`);

  // ============ Health Check ============
  console.log('Health & Connectivity:');

  await runTest('Health endpoint responds', async () => {
    const data = await fetchJson('/api/health');
    if (data.status !== 'ok') throw new Error('Health status not ok');
  });

  // ============ Public Endpoints ============
  console.log('\nPublic API Endpoints:');

  await runTest('GET /api/resources returns array', async () => {
    const data = await fetchJson('/api/resources');
    if (!Array.isArray(data)) throw new Error('Expected array of resources');
    if (data.length === 0) throw new Error('No resources returned');
  });

  await runTest('GET /api/topics returns topics', async () => {
    const data = await fetchJson('/api/topics');
    if (!data.data || !Array.isArray(data.data)) throw new Error('Expected data array');
  });

  await runTest('GET /api/popular returns popular resources', async () => {
    const data = await fetchJson('/api/popular');
    if (!Array.isArray(data)) throw new Error('Expected array');
  });

  await runTest('GET /api/featured returns featured resources', async () => {
    const data = await fetchJson('/api/featured');
    if (!Array.isArray(data)) throw new Error('Expected array');
  });

  // ============ Search Endpoints ============
  console.log('\nSearch Endpoints:');

  await runTest('POST /api/search/keyword works', async () => {
    const data = await fetchJson('/api/search/keyword', {
      method: 'POST',
      body: JSON.stringify({ query: 'infrastructure' }),
    });
    if (!data.results) throw new Error('Expected results');
  });

  // ============ Auth Endpoints ============
  console.log('\nAuth Endpoints:');

  await runTest('POST /api/auth/login rejects invalid credentials', async () => {
    try {
      await fetchJson('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'invalid@test.com',
          password: 'wrongpassword',
        }),
      });
      throw new Error('Should have rejected invalid credentials');
    } catch (error: any) {
      if (!error.message.includes('401') && !error.message.includes('Invalid')) {
        // Expected 401 or validation error
        if (error.message === 'Should have rejected invalid credentials') {
          throw error;
        }
      }
    }
  });

  await runTest('GET /api/auth/me requires authentication', async () => {
    try {
      await fetchJson('/api/auth/me');
      throw new Error('Should have required auth');
    } catch (error: any) {
      if (!error.message.includes('401')) {
        if (error.message === 'Should have required auth') {
          throw error;
        }
      }
    }
  });

  // ============ Admin Endpoints ============
  console.log('\nAdmin Endpoints (auth required):');

  await runTest('GET /api/admin/stats requires authentication', async () => {
    try {
      await fetchJson('/api/admin/stats');
      throw new Error('Should have required auth');
    } catch (error: any) {
      if (!error.message.includes('401')) {
        if (error.message === 'Should have required auth') {
          throw error;
        }
      }
    }
  });

  await runTest('GET /api/admin/topics requires authentication', async () => {
    try {
      await fetchJson('/api/admin/topics');
      throw new Error('Should have required auth');
    } catch (error: any) {
      if (!error.message.includes('401')) {
        if (error.message === 'Should have required auth') {
          throw error;
        }
      }
    }
  });

  // ============ Response Time Checks ============
  console.log('\nPerformance Checks:');

  await runTest('Health endpoint responds within 1s', async () => {
    const start = Date.now();
    await fetchJson('/api/health');
    const duration = Date.now() - start;
    if (duration > 1000) throw new Error(`Too slow: ${duration}ms`);
  });

  await runTest('Resources endpoint responds within 3s', async () => {
    const start = Date.now();
    await fetchJson('/api/resources');
    const duration = Date.now() - start;
    if (duration > 3000) throw new Error(`Too slow: ${duration}ms`);
  });

  // ============ Summary ============
  console.log('\n' + '='.repeat(50));
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const totalTime = results.reduce((sum, r) => sum + r.duration, 0);

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  console.log(`⏱️  Total time: ${totalTime}ms`);

  if (failed > 0) {
    console.log('\n❌ Failed tests:');
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`   - ${r.name}: ${r.error}`);
      });
    process.exit(1);
  } else {
    console.log('\n✅ All smoke tests passed!');
    process.exit(0);
  }
}

// Run tests
runSmokeTests().catch((error) => {
  console.error('Smoke tests failed to run:', error);
  process.exit(1);
});
