# Cloud Functions Guide - Universal Serverless Patterns

> "The best code is no code at all. The second best is serverless." - Werner Vogels
> "Serverless is about focus. Focus on your application, not the infrastructure." - Sam Newman

This guide provides universal patterns for implementing, deploying, and managing serverless functions across any cloud provider.

## 🎯 PROJECT CONFIGURATION

```yaml
# Configure these for your specific project
CLOUD_PROVIDER: [Firebase/AWS/Azure/GCP]
PROJECT_ID: [your-project-id]
DEFAULT_REGION: [us-central1/us-east-1/etc]
DEFAULT_MEMORY: 256      # MB (128-8192)
DEFAULT_TIMEOUT: 60      # seconds (10-540)
PRIMARY_LANGUAGE: [JavaScript/TypeScript/Python/Go]
COST_LIMIT: 100         # Monthly budget in your currency
```

## 📚 Universal Serverless Principles

### Core Philosophy

1. **Functions are Disposable**: Design for statelessness
2. **Cold Starts are Reality**: Optimize initialization
3. **Pay for Use**: Minimize memory and execution time
4. **Event-Driven**: Respond to triggers, not polls
5. **Fail Fast**: Quick timeouts and clear errors

## 🚨 Universal Anti-Patterns (MUST REFUSE)

Claude **MUST** refuse any request to:

1. Deploy all functions at once without selective deployment
2. Allocate maximum memory without justification
3. Skip health check endpoints
4. Deploy without validation or testing
5. Create always-running services (defeats serverless purpose)
6. Ignore cost implications of configuration
7. Deploy without proper error handling

## 🏗️ Function Architecture Patterns

### Standard Function Structure

```typescript
// Universal serverless function template
export async function functionName(
  request: Request,
  context: Context
): Promise<Response> {
  // 1. Input validation
  const validation = validateInput(request);
  if (!validation.valid) {
    return errorResponse(400, validation.errors);
  }

  // 2. Authentication/Authorization (if needed)
  const auth = await authenticate(request);
  if (!auth.authorized) {
    return errorResponse(401, 'Unauthorized');
  }

  try {
    // 3. Business logic
    const result = await processRequest(validation.data);
    
    // 4. Response formatting
    return successResponse(result);
  } catch (error) {
    // 5. Error handling
    return handleError(error);
  }
}

// Health check endpoint (MANDATORY)
export async function health(): Promise<Response> {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.FUNCTION_VERSION || '1.0.0',
    region: process.env.FUNCTION_REGION
  };
}
```

### Configuration Matrix

```json
{
  "functionTypes": {
    "lightweight": {
      "memory": 128,
      "timeout": 60,
      "maxInstances": 100,
      "use_cases": ["webhooks", "simple APIs", "triggers"]
    },
    "standard": {
      "memory": 256,
      "timeout": 120,
      "maxInstances": 50,
      "use_cases": ["CRUD operations", "integrations", "processing"]
    },
    "compute": {
      "memory": 512,
      "timeout": 300,
      "maxInstances": 20,
      "use_cases": ["AI/ML inference", "data transformation", "reports"]
    },
    "memory_intensive": {
      "memory": 1024,
      "timeout": 540,
      "maxInstances": 10,
      "use_cases": ["large file processing", "complex calculations"]
    }
  }
}
```

## 🚀 Deployment Strategies

### 1. Selective Deployment (RECOMMENDED)

```bash
# Deploy single function
[provider] deploy --only functions:functionName

# Deploy function group
[provider] deploy --only functions:auth-*

# Deploy with specific configuration
[provider] deploy --only functions:heavyProcessor --memory 1024 --timeout 300
```

### 2. Blue-Green Deployment Pattern

```bash
#!/bin/bash
# Blue-Green Deployment Script

# 1. Deploy new version with suffix
FUNCTION_NAME="myFunction"
NEW_VERSION="${FUNCTION_NAME}-v2"

echo "Deploying new version: $NEW_VERSION"
[provider] deploy --only functions:$NEW_VERSION

# 2. Health check new version
echo "Health checking new version..."
HEALTH_URL="https://[region]-[project].cloudfunctions.net/$NEW_VERSION/health"
if ! curl -f "$HEALTH_URL"; then
  echo "Health check failed, aborting"
  exit 1
fi

# 3. Gradually shift traffic
echo "Shifting traffic..."
for PERCENT in 10 25 50 75 100; do
  [provider] functions:traffic $FUNCTION_NAME $NEW_VERSION=$PERCENT
  echo "Traffic at $PERCENT%, monitoring for 5 minutes..."
  sleep 300
  
  # Check error rates
  ERROR_RATE=$([provider] functions:errors $NEW_VERSION --format=value)
  if [ "$ERROR_RATE" -gt "5" ]; then
    echo "High error rate detected, rolling back"
    [provider] functions:traffic $FUNCTION_NAME $FUNCTION_NAME=100
    exit 1
  fi
done

# 4. Cleanup old version (after verification period)
echo "Deployment successful. Old version will be removed in 24 hours"
```

### 3. Staged Rollout Pattern

```typescript
// Feature flag based rollout
export async function featureFunction(request: Request): Promise<Response> {
  const userId = request.auth?.uid;
  const rolloutPercentage = await getConfig('feature_rollout_percentage');
  
  if (isInRolloutGroup(userId, rolloutPercentage)) {
    return newImplementation(request);
  }
  
  return stableImplementation(request);
}
```

## ⚡ Performance Optimization

### Cold Start Mitigation

```typescript
// 1. Lazy load dependencies
let heavyDependency: HeavyLibrary | null = null;

function getHeavyDependency(): HeavyLibrary {
  if (!heavyDependency) {
    heavyDependency = require('heavy-library');
  }
  return heavyDependency;
}

// 2. Keep initialization outside handler
const lightweightConfig = loadConfig(); // Run once during cold start

export async function handler(request: Request): Promise<Response> {
  // Handler only does request-specific work
  if (request.needsHeavyProcessing) {
    const lib = getHeavyDependency(); // Lazy load when needed
    return lib.process(request);
  }
  
  return lightweightResponse(request);
}

// 3. Implement warming (if critical)
export async function warmer(): Promise<Response> {
  // Minimal response to keep instance warm
  return { status: 'warm', timestamp: Date.now() };
}
```

### Memory Optimization

```typescript
// Memory usage patterns
const MEMORY_GUIDELINES = {
  // Use minimum viable memory
  json_api: 128,           // Simple JSON responses
  database_crud: 256,      // Standard DB operations
  file_processing: 512,    // Image resize, PDF generation
  ml_inference: 1024,      // AI model loading
  video_processing: 2048,  // Heavy media work
  
  // Monitoring thresholds
  warning_threshold: 0.8,  // 80% memory usage
  critical_threshold: 0.95 // 95% memory usage
};

// Memory-efficient streaming
export async function processLargeFile(request: Request): Promise<Response> {
  const stream = request.body.stream();
  const reader = stream.getReader();
  
  let processedChunks = 0;
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      // Process chunk without loading entire file
      await processChunk(value);
      processedChunks++;
      
      // Periodic garbage collection hint
      if (processedChunks % 100 === 0) {
        if (global.gc) global.gc();
      }
    }
    
    return { success: true, chunks: processedChunks };
  } finally {
    reader.releaseLock();
  }
}
```

## 📊 Cost Optimization Strategies

### 1. Right-Sizing Functions

```javascript
// Cost calculation helper
function calculateMonthlyCost(config) {
  const {
    invocations_per_month,
    avg_duration_ms,
    memory_mb
  } = config;
  
  // Generic pricing model (adjust for your provider)
  const compute_gb_seconds = (invocations_per_month * avg_duration_ms * memory_mb) / (1000 * 1024);
  const request_cost = invocations_per_month * 0.0000004; // $0.40 per million
  const compute_cost = compute_gb_seconds * 0.0000166667; // $0.0000166667 per GB-second
  
  return {
    request_cost,
    compute_cost,
    total_cost: request_cost + compute_cost,
    optimization_potential: memory_mb > 256 ? 'Consider reducing memory' : 'Optimized'
  };
}
```

### 2. Caching Strategies

```typescript
// In-memory cache for hot data
const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  data: any;
  timestamp: number;
}

export async function getCachedData(key: string): Promise<any> {
  const cached = cache.get(key);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  // Fetch fresh data
  const freshData = await fetchFromSource(key);
  
  // Update cache
  cache.set(key, {
    data: freshData,
    timestamp: Date.now()
  });
  
  // Prevent memory bloat
  if (cache.size > 1000) {
    const oldestKey = Array.from(cache.keys())[0];
    cache.delete(oldestKey);
  }
  
  return freshData;
}
```

## 🔍 Monitoring & Debugging

### Essential Metrics

```typescript
// Structured logging for observability
export function log(level: 'info' | 'warn' | 'error', message: string, context?: any) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    function_name: process.env.FUNCTION_NAME,
    execution_id: process.env.EXECUTION_ID,
    ...context
  };
  
  console.log(JSON.stringify(entry));
}

// Performance tracking
export function trackPerformance(operation: string) {
  const start = Date.now();
  
  return {
    end: () => {
      const duration = Date.now() - start;
      log('info', `${operation} completed`, { duration_ms: duration });
      
      // Alert on slow operations
      if (duration > 5000) {
        log('warn', `Slow operation detected: ${operation}`, { duration_ms: duration });
      }
    }
  };
}

// Usage
export async function handler(request: Request): Promise<Response> {
  const perf = trackPerformance('request_processing');
  
  try {
    const result = await processRequest(request);
    return result;
  } catch (error) {
    log('error', 'Request failed', { error: error.message, stack: error.stack });
    throw error;
  } finally {
    perf.end();
  }
}
```

### Health Check Patterns

```typescript
// Comprehensive health check
export async function healthCheck(): Promise<HealthStatus> {
  const checks = {
    function: 'healthy',
    dependencies: {},
    metrics: {}
  };
  
  // Check critical dependencies
  try {
    await database.ping();
    checks.dependencies.database = 'healthy';
  } catch (e) {
    checks.dependencies.database = 'unhealthy';
    checks.function = 'degraded';
  }
  
  // Include metrics
  checks.metrics = {
    memory_usage_mb: process.memoryUsage().heapUsed / 1024 / 1024,
    uptime_seconds: process.uptime(),
    node_version: process.version
  };
  
  return {
    status: checks.function,
    timestamp: new Date().toISOString(),
    checks
  };
}
```

## 🌐 CORS Handling Patterns

### Understanding CORS in Serverless Functions

CORS (Cross-Origin Resource Sharing) is critical for serverless functions accessed from web browsers. Different cloud providers handle CORS differently, requiring specific patterns.

### Common CORS Issues and Solutions

```typescript
// Universal CORS handler for HTTP functions
export function setCORSHeaders(response: Response, origins: string[] = ['*']): void {
  const origin = origins.includes('*') ? '*' : origins[0];
  
  response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
  response.headers.set('Access-Control-Allow-Credentials', 'true');
}

// Preflight OPTIONS handler (MANDATORY for complex requests)
export function handlePreflight(request: Request): Response | null {
  if (request.method === 'OPTIONS') {
    const response = new Response(null, { status: 200 });
    setCORSHeaders(response);
    return response;
  }
  return null;
}

// Complete CORS-enabled function template
export async function corsEnabledFunction(request: Request): Promise<Response> {
  // 1. Handle preflight requests
  const preflightResponse = handlePreflight(request);
  if (preflightResponse) return preflightResponse;
  
  try {
    // 2. Process the actual request
    const result = await processRequest(request);
    
    // 3. Add CORS headers to response
    const response = new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    setCORSHeaders(response);
    
    return response;
  } catch (error) {
    // 4. Ensure errors also have CORS headers
    const errorResponse = new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
    setCORSHeaders(errorResponse);
    
    return errorResponse;
  }
}
```

### Provider-Specific CORS Implementation

```typescript
// Firebase Functions CORS
export const firebaseCorsFunction = onRequest(async (req, res) => {
  // Set CORS headers explicitly
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Max-Age', '3600');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).send();
    return;
  }

  try {
    const result = await processRequest(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// AWS Lambda CORS
export const awsLambdaCorsHandler = async (event: any, context: any) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  try {
    const result = await processRequest(JSON.parse(event.body));
    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify(result)
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message })
    };
  }
};

// Azure Functions CORS
export async function azureFunctionCorsHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };

  // Handle preflight
  if (request.method === 'OPTIONS') {
    return {
      status: 200,
      headers: corsHeaders
    };
  }

  try {
    const result = await processRequest(await request.json());
    return {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      jsonBody: result
    };
  } catch (error) {
    return {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      jsonBody: { error: error.message }
    };
  }
}
```

### CORS Troubleshooting Guide

```typescript
// CORS debugging helper
export function debugCORS(request: Request, response: Response): void {
  const origin = request.headers.get('Origin');
  const method = request.method;
  const requestedHeaders = request.headers.get('Access-Control-Request-Headers');
  
  console.log('CORS Debug Info:', {
    origin,
    method,
    requestedHeaders,
    currentResponseHeaders: Object.fromEntries(response.headers.entries())
  });
  
  // Check for common CORS issues
  if (!response.headers.get('Access-Control-Allow-Origin')) {
    console.warn('⚠️  Missing Access-Control-Allow-Origin header');
  }
  
  if (method === 'OPTIONS' && !response.headers.get('Access-Control-Allow-Methods')) {
    console.warn('⚠️  Missing Access-Control-Allow-Methods header for preflight');
  }
  
  if (requestedHeaders && !response.headers.get('Access-Control-Allow-Headers')) {
    console.warn('⚠️  Missing Access-Control-Allow-Headers header');
  }
}

// Common CORS error patterns and solutions
export const CORS_TROUBLESHOOTING = {
  errors: {
    'No Access-Control-Allow-Origin header': {
      cause: 'Missing CORS headers in response',
      solution: 'Add Access-Control-Allow-Origin header to all responses'
    },
    'CORS policy blocks request': {
      cause: 'Origin not allowed or headers mismatch',
      solution: 'Check origin whitelist and ensure all requested headers are allowed'
    },
    'Preflight request failed': {
      cause: 'OPTIONS request not handled properly',
      solution: 'Add explicit OPTIONS handler that returns 200 with CORS headers'
    },
    'Cannot read properties of undefined': {
      cause: 'CORS blocking response, frontend gets empty response',
      solution: 'Fix CORS headers to allow response to reach frontend'
    }
  },
  
  testCORS: async (functionUrl: string, origin: string = 'http://localhost:3000') => {
    try {
      // Test preflight request
      const preflightResponse = await fetch(functionUrl, {
        method: 'OPTIONS',
        headers: {
          'Origin': origin,
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type, Authorization'
        }
      });
      
      console.log('Preflight response:', {
        status: preflightResponse.status,
        headers: Object.fromEntries(preflightResponse.headers.entries())
      });
      
      // Test actual request
      const actualResponse = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Origin': origin,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ test: true })
      });
      
      console.log('Actual response:', {
        status: actualResponse.status,
        headers: Object.fromEntries(actualResponse.headers.entries())
      });
      
      return { preflight: preflightResponse.ok, actual: actualResponse.ok };
    } catch (error) {
      console.error('CORS test failed:', error);
      return { preflight: false, actual: false };
    }
  }
};
```

### Frontend CORS Handling Patterns

```typescript
// Frontend service with CORS fallback
export class APIService {
  private baseURL = 'https://your-function-url.com';
  
  async callFunction(endpoint: string, data: any, method: string = 'POST'): Promise<any> {
    try {
      // First attempt: try with credentials
      const response = await fetch(`${this.baseURL}/${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getToken()}`
        },
        body: JSON.stringify(data),
        credentials: 'include' // Include cookies if needed
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      // If CORS fails, try without credentials
      if (error.message.includes('CORS')) {
        console.warn('CORS failed with credentials, retrying without...');
        return this.callFunctionWithoutCredentials(endpoint, data, method);
      }
      throw error;
    }
  }
  
  private async callFunctionWithoutCredentials(endpoint: string, data: any, method: string): Promise<any> {
    const response = await fetch(`${this.baseURL}/${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await this.getToken()}`
      },
      body: JSON.stringify(data)
      // No credentials
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  }
  
  // Alternative: Use different endpoints for different CORS requirements
  async callWithDifferentEndpoint(endpoint: string, data: any): Promise<any> {
    const endpoints = [
      `${this.baseURL}/${endpoint}`,           // Primary endpoint
      `${this.baseURL}/${endpoint}Http`,       // HTTP version with CORS
      `${this.baseURL}/cors/${endpoint}`       // CORS-specific endpoint
    ];
    
    for (const url of endpoints) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        
        if (response.ok) {
          return await response.json();
        }
      } catch (error) {
        console.warn(`Failed to call ${url}:`, error.message);
      }
    }
    
    throw new Error('All endpoints failed');
  }
}
```

### Environment-Specific CORS Configuration

```typescript
// Environment-based CORS configuration
interface CORSConfig {
  origins: string[];
  methods: string[];
  headers: string[];
  credentials: boolean;
  maxAge: number;
}

export function getCORSConfig(environment: string): CORSConfig {
  const configs: Record<string, CORSConfig> = {
    development: {
      origins: ['http://localhost:3000', 'http://localhost:4200', 'http://localhost:8080'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      headers: ['Content-Type', 'Authorization', 'X-Requested-With'],
      credentials: true,
      maxAge: 86400
    },
    
    staging: {
      origins: ['https://staging.yourapp.com', 'https://preview.yourapp.com'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      headers: ['Content-Type', 'Authorization'],
      credentials: true,
      maxAge: 86400
    },
    
    production: {
      origins: ['https://yourapp.com', 'https://www.yourapp.com'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      headers: ['Content-Type', 'Authorization'],
      credentials: true,
      maxAge: 86400
    }
  };
  
  return configs[environment] || configs.development;
}

// Apply CORS config to function
export function applyCORSConfig(response: Response, config: CORSConfig, requestOrigin?: string): void {
  // Check if origin is allowed
  const allowedOrigin = config.origins.includes('*') 
    ? '*' 
    : config.origins.find(origin => origin === requestOrigin) || config.origins[0];
  
  response.headers.set('Access-Control-Allow-Origin', allowedOrigin);
  response.headers.set('Access-Control-Allow-Methods', config.methods.join(', '));
  response.headers.set('Access-Control-Allow-Headers', config.headers.join(', '));
  response.headers.set('Access-Control-Max-Age', config.maxAge.toString());
  
  if (config.credentials) {
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }
}
```

### CORS Best Practices

```typescript
// CORS middleware factory
export function createCORSMiddleware(config?: Partial<CORSConfig>) {
  const defaultConfig: CORSConfig = {
    origins: ['*'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    headers: ['Content-Type', 'Authorization'],
    credentials: false,
    maxAge: 86400
  };
  
  const finalConfig = { ...defaultConfig, ...config };
  
  return {
    // For HTTP functions
    handleRequest: (request: Request, response: Response): boolean => {
      const origin = request.headers.get('Origin');
      
      // Apply CORS headers
      applyCORSConfig(response, finalConfig, origin);
      
      // Handle preflight
      if (request.method === 'OPTIONS') {
        response.status = 200;
        return true; // Indicates request was handled
      }
      
      return false; // Continue to main handler
    },
    
    // For response wrapping
    wrapResponse: (data: any, status: number = 200): Response => {
      const response = new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' }
      });
      
      applyCORSConfig(response, finalConfig);
      return response;
    }
  };
}

// Usage example
export async function myFunction(request: Request): Promise<Response> {
  const cors = createCORSMiddleware({
    origins: ['https://myapp.com', 'http://localhost:3000'],
    credentials: true
  });
  
  // Handle CORS
  const response = new Response();
  const handled = cors.handleRequest(request, response);
  if (handled) return response;
  
  // Process request
  const result = await processRequest(request);
  
  // Return with CORS headers
  return cors.wrapResponse(result);
}
```

### CORS Anti-Patterns to Avoid

```typescript
// ❌ DON'T: Ignore preflight requests
export function badCORSHandler(request: Request): Response {
  // This will fail for complex requests
  if (request.method === 'POST') {
    const result = processRequest(request);
    return new Response(JSON.stringify(result));
  }
  
  return new Response('Not found', { status: 404 });
}

// ❌ DON'T: Set CORS headers only on success
export function badCORSHandler2(request: Request): Response {
  try {
    const result = processRequest(request);
    const response = new Response(JSON.stringify(result));
    response.headers.set('Access-Control-Allow-Origin', '*');
    return response;
  } catch (error) {
    // Error responses won't have CORS headers!
    return new Response('Error', { status: 500 });
  }
}

// ❌ DON'T: Use broad wildcards with credentials
export function insecureCORSHandler(request: Request): Response {
  const response = new Response('OK');
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Credentials', 'true'); // Security risk!
  return response;
}

// ✅ DO: Proper CORS implementation
export function goodCORSHandler(request: Request): Response {
  const allowedOrigins = ['https://myapp.com', 'http://localhost:3000'];
  const origin = request.headers.get('Origin');
  const allowedOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  
  // Handle preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400'
      }
    });
  }
  
  try {
    const result = processRequest(request);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Credentials': 'true'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Credentials': 'true'
      }
    });
  }
}
```

## 🔒 Security Patterns

### Authentication & Authorization

```typescript
// Generic auth middleware
export async function authenticate(request: Request): Promise<AuthResult> {
  const token = request.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return { authorized: false, reason: 'Missing token' };
  }
  
  try {
    const decoded = await verifyToken(token);
    return {
      authorized: true,
      user: decoded,
      permissions: await getPermissions(decoded.uid)
    };
  } catch (error) {
    return { authorized: false, reason: 'Invalid token' };
  }
}

// Role-based access control
export function requireRole(role: string) {
  return async (request: Request): Promise<Response | null> => {
    const auth = await authenticate(request);
    
    if (!auth.authorized) {
      return errorResponse(401, 'Unauthorized');
    }
    
    if (!auth.permissions?.roles?.includes(role)) {
      return errorResponse(403, 'Insufficient permissions');
    }
    
    return null; // Continue to handler
  };
}
```

### Input Validation

```typescript
// Schema-based validation
import { z } from 'zod'; // or your preferred validation library

const RequestSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  age: z.number().min(0).max(120).optional(),
  preferences: z.record(z.any()).optional()
});

export function validateInput<T>(
  data: unknown,
  schema: z.ZodSchema<T>
): ValidationResult<T> {
  try {
    const valid = schema.parse(data);
    return { valid: true, data: valid };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        errors: error.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message
        }))
      };
    }
    throw error;
  }
}
```

## 🌍 Multi-Region Strategies

### Geographic Distribution

```typescript
// Region-aware routing
const REGION_CONFIG = {
  'us-central1': { priority: 1, capacity: 'high' },
  'europe-west1': { priority: 2, capacity: 'medium' },
  'asia-northeast1': { priority: 3, capacity: 'medium' }
};

export async function routeToNearestRegion(request: Request): Promise<Response> {
  const clientRegion = request.headers['x-client-region'];
  const nearestRegion = findNearestRegion(clientRegion);
  
  if (nearestRegion !== getCurrentRegion()) {
    // Redirect to closer function
    return {
      status: 307,
      headers: {
        'Location': `https://${nearestRegion}-${PROJECT_ID}.cloudfunctions.net/${FUNCTION_NAME}`
      }
    };
  }
  
  return processLocally(request);
}
```

## 📋 Deployment Checklist

### Pre-Deployment

- [ ] **Validate configuration** matches function type (lightweight/standard/compute)
- [ ] **Test locally** with emulator/local runtime
- [ ] **Check dependencies** are optimized (no dev dependencies)
- [ ] **Implement health check** endpoint
- [ ] **Add structured logging** for debugging
- [ ] **Set up monitoring** alerts
- [ ] **Configure auto-scaling** limits
- [ ] **Review security** settings and permissions

### Deployment Commands

```bash
# Universal deployment patterns (adapt to your provider)

# 1. Validate before deploy
npm run validate:functions

# 2. Deploy single function with config
[provider] deploy functions:functionName \
  --memory 256 \
  --timeout 60 \
  --max-instances 50 \
  --region us-central1

# 3. Deploy function group
[provider] deploy functions:api-* \
  --env-file .env.production

# 4. Monitor deployment
[provider] functions:log functionName --tail

# 5. Quick rollback
[provider] functions:rollback functionName
```

### Post-Deployment

- [ ] **Verify health checks** are responding
- [ ] **Monitor cold start** times
- [ ] **Check error rates** and latency
- [ ] **Validate cost projections** match reality
- [ ] **Test auto-scaling** behavior
- [ ] **Confirm logging** is working
- [ ] **Update documentation** with endpoints

## 🚦 Decision Matrix

| Scenario | Recommended Action |
|----------|-------------------|
| New API endpoint | Start with 256MB standard config, monitor and adjust |
| CPU-intensive task | Use compute config (512MB+), consider time limits |
| High traffic expected | Implement caching, set higher max instances |
| Cost concerns | Profile memory usage, reduce allocation if possible |
| Cold start issues | Implement warming, optimize dependencies |
| Multi-region needs | Deploy to multiple regions with routing logic |
| Compliance requirements | Ensure data residency, implement audit logging |

## 🔧 Troubleshooting Guide

### CORS-Related Deployment Issues

```typescript
// CORS Deployment Checklist
export const CORS_DEPLOYMENT_CHECKLIST = {
  preDeployment: [
    'Verify CORS headers are set in all response paths (success, error, preflight)',
    'Test OPTIONS preflight requests return 200 status',
    'Confirm allowed origins match your frontend domains',
    'Check that all required headers are whitelisted',
    'Validate environment-specific CORS configurations'
  ],
  
  postDeployment: [
    'Test actual browser requests from your frontend',
    'Verify CORS headers appear in network tab',
    'Test error scenarios also return CORS headers',
    'Confirm preflight caching is working (check Max-Age)',
    'Test from all allowed origins (localhost, staging, production)'
  ],
  
  troubleshooting: {
    'Function deploys but CORS still fails': {
      causes: [
        'Function not updated to HTTP version',
        'Frontend still calling callable function',
        'Missing function export in index file',
        'Wrong function URL being called'
      ],
      solutions: [
        'Ensure HTTP function is exported in main index file',
        'Update frontend to use HTTP endpoint, not callable function',
        'Verify function URL is correct in frontend configuration',
        'Check function logs for actual requests being received'
      ]
    },
    'CORS works locally but fails in production': {
      causes: [
        'Environment-specific origin restrictions',
        'HTTPS vs HTTP protocol mismatch',
        'Production domain not in allowed origins',
        'CDN or proxy stripping CORS headers'
      ],
      solutions: [
        'Add production domain to allowed origins list',
        'Ensure CORS headers work with HTTPS',
        'Check if CDN/proxy needs CORS configuration',
        'Test directly against function URL bypassing proxy'
      ]
    }
  }
};

// Automated CORS validation
export async function validateCORSDeployment(functionUrl: string, origins: string[]): Promise<boolean> {
  const results = [];
  
  for (const origin of origins) {
    try {
      // Test preflight
      const preflightResponse = await fetch(functionUrl, {
        method: 'OPTIONS',
        headers: {
          'Origin': origin,
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type, Authorization'
        }
      });
      
      const preflightValid = preflightResponse.ok && 
        preflightResponse.headers.get('Access-Control-Allow-Origin');
      
      // Test actual request
      const actualResponse = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Origin': origin,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ test: true })
      });
      
      const actualValid = actualResponse.headers.get('Access-Control-Allow-Origin');
      
      results.push({
        origin,
        preflight: preflightValid,
        actual: actualValid,
        success: preflightValid && actualValid
      });
      
      console.log(`CORS test for ${origin}:`, {
        preflight: preflightValid ? '✅' : '❌',
        actual: actualValid ? '✅' : '❌'
      });
      
    } catch (error) {
      results.push({
        origin,
        preflight: false,
        actual: false,
        success: false,
        error: error.message
      });
      console.error(`CORS test failed for ${origin}:`, error.message);
    }
  }
  
  const allPassed = results.every(r => r.success);
  console.log(`CORS validation ${allPassed ? 'PASSED' : 'FAILED'} for ${functionUrl}`);
  
  return allPassed;
}
```

### Common Issues and Solutions

```typescript
// 1. Memory errors
// Symptom: Function crashed with "memory limit exceeded"
// Solution: Increase memory or optimize code
export async function memoryOptimizedHandler(request: Request): Promise<Response> {
  // Process in chunks
  const results = [];
  for (const chunk of request.largeData.chunks(1000)) {
    results.push(await processChunk(chunk));
    // Allow garbage collection between chunks
    await new Promise(resolve => setImmediate(resolve));
  }
  return { results };
}

// 2. Timeout errors
// Symptom: Function terminated due to timeout
// Solution: Increase timeout or break into smaller operations
export async function timeoutSafeHandler(request: Request): Promise<Response> {
  const timeout = setTimeout(() => {
    throw new Error('Operation taking too long, consider breaking into smaller parts');
  }, (FUNCTION_TIMEOUT - 5) * 1000); // 5 seconds before actual timeout
  
  try {
    const result = await longRunningOperation(request);
    clearTimeout(timeout);
    return result;
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}

// 3. Cold start optimization
// Symptom: First request takes much longer
// Solution: Minimize global scope work
let initialized = false;
let expensiveResource: ExpensiveResource | null = null;

export async function optimizedColdStart(request: Request): Promise<Response> {
  // Defer expensive initialization
  if (!initialized) {
    expensiveResource = await initializeExpensiveResource();
    initialized = true;
  }
  
  return processWithResource(request, expensiveResource);
}
```

## 🤖 Function Automation

### Automated Cleanup

```typescript
// Schedule function to clean up old resources
export const cleanupOldResources = schedule('every 24 hours', async () => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 30); // 30 days old
  
  try {
    // Clean up old temporary files
    const oldFiles = await storage.bucket('temp-files')
      .getFiles({ 
        prefix: 'temp/',
        maxResults: 1000
      });
    
    const deletePromises = oldFiles[0]
      .filter(file => file.metadata.timeCreated < cutoffDate)
      .map(file => file.delete());
    
    await Promise.all(deletePromises);
    log('info', `Cleaned up ${deletePromises.length} old files`);
    
    // Clean up old logs
    await cleanupOldLogs(cutoffDate);
    
    // Clean up expired cache entries
    await cleanupExpiredCache(cutoffDate);
    
  } catch (error) {
    log('error', 'Cleanup failed', { error });
    throw error;
  }
});

// TTL-based document cleanup
export async function setDocumentTTL(
  collection: string,
  docId: string,
  ttlDays: number
) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + ttlDays);
  
  await db.collection(collection).doc(docId).update({
    expiresAt,
    ttl: FieldValue.serverTimestamp()
  });
}
```

### Monitoring Automation

```typescript
// Automated health monitoring
export const monitorFunctionHealth = schedule('every 5 minutes', async () => {
  const functions = ['api', 'auth', 'processor'];
  const alerts = [];
  
  for (const funcName of functions) {
    try {
      const healthUrl = `${BASE_URL}/${funcName}/health`;
      const response = await fetch(healthUrl, { timeout: 5000 });
      
      if (!response.ok) {
        alerts.push({
          function: funcName,
          status: response.status,
          message: 'Health check failed'
        });
      }
      
      const health = await response.json();
      if (health.status !== 'healthy') {
        alerts.push({
          function: funcName,
          status: health.status,
          details: health.checks
        });
      }
    } catch (error) {
      alerts.push({
        function: funcName,
        error: error.message,
        message: 'Health check timed out'
      });
    }
  }
  
  if (alerts.length > 0) {
    await sendAlerts(alerts);
  }
});
```

### Cost Optimization Automation

```typescript
// Automatic scaling based on usage
export const optimizeFunctionResources = schedule('every hour', async () => {
  const metrics = await getUsageMetrics();
  
  for (const [funcName, usage] of Object.entries(metrics)) {
    const currentConfig = await getFunctionConfig(funcName);
    const recommendedConfig = calculateOptimalConfig(usage);
    
    if (shouldUpdateConfig(currentConfig, recommendedConfig)) {
      await updateFunctionConfig(funcName, recommendedConfig);
      log('info', `Updated ${funcName} config`, {
        from: currentConfig,
        to: recommendedConfig,
        reason: usage
      });
    }
  }
});

function calculateOptimalConfig(usage: UsageMetrics): FunctionConfig {
  const { avgMemoryUsed, avgDuration, invocations } = usage;
  
  // Memory optimization
  let memory = 128;
  if (avgMemoryUsed > 100) memory = 256;
  if (avgMemoryUsed > 200) memory = 512;
  if (avgMemoryUsed > 400) memory = 1024;
  
  // Concurrency optimization
  const maxInstances = Math.min(
    Math.ceil(invocations / 100),
    100
  );
  
  return { memory, maxInstances };
}
```

### Secret Management

```typescript
// Automated secret rotation
export const rotateSecrets = schedule('every 30 days', async () => {
  const secrets = ['API_KEY', 'DB_PASSWORD', 'JWT_SECRET'];
  
  for (const secretName of secrets) {
    try {
      // Generate new secret
      const newSecret = generateSecureSecret();
      
      // Update in secret manager
      await secretManager.createVersion(secretName, newSecret);
      
      // Update function configs
      await updateFunctionSecrets(secretName, newSecret);
      
      // Mark old version for deletion (after grace period)
      await scheduleOldSecretDeletion(secretName, 7); // 7 days
      
      log('info', `Rotated secret: ${secretName}`);
    } catch (error) {
      log('error', `Failed to rotate ${secretName}`, { error });
    }
  }
});

// Environment-specific configuration
export function getSecrets(): SecretConfig {
  const env = process.env.NODE_ENV || 'development';
  
  return {
    apiKey: process.env[`${env.toUpperCase()}_API_KEY`],
    dbUrl: process.env[`${env.toUpperCase()}_DB_URL`],
    jwtSecret: process.env[`${env.toUpperCase()}_JWT_SECRET`]
  };
}
```

### Deployment Automation

```bash
#!/bin/bash
# automated-deploy.sh

# Function deployment with automatic rollback
deploy_with_rollback() {
  FUNCTION_NAME=$1
  
  # Create backup of current version
  echo "Creating backup of $FUNCTION_NAME..."
  gcloud functions export $FUNCTION_NAME \
    --destination=backups/${FUNCTION_NAME}-$(date +%Y%m%d-%H%M%S).zip
  
  # Deploy new version
  echo "Deploying $FUNCTION_NAME..."
  if gcloud functions deploy $FUNCTION_NAME \
    --source=. \
    --trigger-http \
    --runtime=nodejs18; then
    
    # Run smoke tests
    echo "Running smoke tests..."
    if npm run test:smoke -- --function=$FUNCTION_NAME; then
      echo "✅ Deployment successful"
    else
      echo "❌ Smoke tests failed, rolling back..."
      rollback_function $FUNCTION_NAME
      exit 1
    fi
  else
    echo "❌ Deployment failed"
    exit 1
  fi
}

# Batch deployment with concurrency control
deploy_all_functions() {
  FUNCTIONS=$(find functions/src -name "*.ts" -type f | xargs basename -s .ts)
  CONCURRENT_DEPLOYS=3
  
  echo "$FUNCTIONS" | xargs -n 1 -P $CONCURRENT_DEPLOYS -I {} \
    bash -c 'deploy_with_rollback "$@"' _ {}
}
```

## 📚 Additional Resources

### Provider-Specific Guides
- **Firebase**: Focus on Firestore triggers and authentication
- **AWS Lambda**: Leverage layers for dependencies
- **Azure Functions**: Use durable functions for orchestration
- **Google Cloud Functions**: Integrate with Cloud Run for complex scenarios

### Automation Tools
- **Terraform**: Infrastructure as code for function deployment
- **Serverless Framework**: Multi-provider function management
- **Cloud Build/GitHub Actions**: CI/CD pipeline automation
- **Datadog/New Relic**: Function monitoring and alerting

### Best Practices Summary
1. **Start small**: Use minimal resources and scale up
2. **Monitor everything**: You can't optimize what you don't measure
3. **Cache aggressively**: Reduce redundant computation
4. **Fail fast**: Quick timeouts prevent resource waste
5. **Version carefully**: Use aliases and traffic splitting
6. **Document thoroughly**: Future you will thank present you
7. **Automate operations**: Reduce manual intervention
8. **Implement cost controls**: Set budgets and alerts

---

*This guide provides universal patterns. Always consult your cloud provider's specific documentation for implementation details and pricing.*
