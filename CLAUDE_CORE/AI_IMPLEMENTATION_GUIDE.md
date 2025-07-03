# AI Implementation Guide

> Universal patterns for implementing AI-powered features with Google Gemini in Cloud Functions

## Table of Contents

1. [Critical Issues & Solutions](#critical-issues--solutions)
2. [Implementation Patterns](#implementation-patterns)
3. [Best Practices](#best-practices)
4. [Security & Configuration](#security--configuration)
5. [Performance Optimization](#performance-optimization)

## Critical Issues & Solutions

### 1. Module Loading Crashes

**Problem**: AI clients instantiated during module load crash containers if API keys are missing.

**Solution**: Use lazy initialization pattern

```typescript
// ❌ WRONG - Crashes on module load
export class AIService {
  private client = new GeminiClient();
}

// ✅ CORRECT - Lazy initialization
export class AIService {
  private client: GeminiClient | null = null;
  
  private getClient(): GeminiClient {
    if (!this.client) {
      this.client = new GeminiClient();
    }
    return this.client;
  }
}
```

### 2. Firebase Functions v2 Configuration

**Problem**: `functions.config()` deprecated in v2

**Solution**: Use Firebase Secrets Manager

```typescript
// ❌ WRONG - Deprecated
const config = functions.config();
const apiKey = config.gemini.api_key;

// ✅ CORRECT - Secrets Manager
import { defineSecret } from 'firebase-functions/params';

const geminiApiKey = defineSecret('GEMINI_API_KEY');

export const myFunction = onRequest({
  secrets: [geminiApiKey]
}, async (req, res) => {
  process.env.GEMINI_API_KEY = geminiApiKey.value();
});
```

### 3. CORS Configuration

**Problem**: Callable functions don't handle CORS properly for web requests

**Solution**: Use HTTP functions with explicit CORS

```typescript
// ✅ CORRECT - HTTP with CORS
export const validateData = onRequest({
  cors: ['http://localhost:4200', 'https://your-domain.com']
}, async (req, res) => {
  res.set('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).send();
    return;
  }
  // AI processing...
});
```

## Implementation Patterns

### Location Inference Pattern

```typescript
// Generic location service with configurable geographic context
export class LocationService {
  constructor(
    private geographicContext: string, // e.g., "California, USA" or "Lagos, Nigeria"
    private defaultCoordinates: { lat: number, lng: number },
    private boundingBox: { minLat: number, maxLat: number, minLng: number, maxLng: number }
  ) {}

  async inferLocationCoordinates(locationDescription: string): Promise<LocationResult> {
    try {
      const client = this.getGeminiClient();
      
      // Append geographic context for better accuracy
      const enhancedLocation = `${locationDescription}, ${this.geographicContext}`;
      
      const prompt = `
        Extract coordinates for this location: "${enhancedLocation}"
        
        Geographic context:
        - Region: ${this.geographicContext}
        - Bounds: ${JSON.stringify(this.boundingBox)}
        
        Return JSON: { "latitude": number, "longitude": number, "confidence": 0-1 }
      `;
      
      const result = await client.generateJsonContent(prompt, {
        temperature: 0.1,
        maxOutputTokens: 256
      });
      
      return this.validateCoordinates(result);
    } catch (error) {
      console.error('Location inference failed:', error);
      return this.getDefaultCoordinates();
    }
  }
  
  private validateCoordinates(result: any): LocationResult {
    const { latitude, longitude } = result;
    
    // Validate coordinates are within configured bounds
    if (latitude >= this.boundingBox.minLat && latitude <= this.boundingBox.maxLat && 
        longitude >= this.boundingBox.minLng && longitude <= this.boundingBox.maxLng) {
      return { latitude, longitude, valid: true };
    }
    
    // Fallback to default center
    return this.getDefaultCoordinates();
  }
  
  private getDefaultCoordinates(): LocationResult {
    return {
      latitude: this.defaultCoordinates.lat,
      longitude: this.defaultCoordinates.lng,
      valid: true,
      fallback: true
    };
  }
}

// Example usage for different regions:
// const nigeriaService = new LocationService(
//   "Nigeria", 
//   { lat: 9.082, lng: 8.6753 },
//   { minLat: 4.24, maxLat: 13.89, minLng: 2.68, maxLng: 14.68 }
// );
```

### Data Validation Pattern

```typescript
export class AIValidationService {
  constructor(
    private domainContext: string, // e.g., "e-commerce", "healthcare", "government"
    private validationRules: ValidationRules
  ) {}

  async validateWithAI(data: any[], options: ValidationOptions): Promise<ValidationResult> {
    try {
      const client = this.getGeminiClient();
      
      const prompt = this.buildValidationPrompt(data, options);
      
      const result = await client.generateJsonContent(prompt, {
        temperature: 0.1,  // Low temperature for consistency
        maxOutputTokens: 4096,
        responseSchema: this.validationRules.schema
      });
      
      return this.parseValidationResult(result);
    } catch (error) {
      console.error('AI validation failed:', error);
      return this.getFallbackValidation(data);
    }
  }
  
  private buildValidationPrompt(data: any[], options: ValidationOptions): string {
    return `
      Validate this ${this.domainContext} data according to these rules:
      ${JSON.stringify(this.validationRules)}
      
      Data to validate:
      ${JSON.stringify(data)}
      
      Options:
      ${JSON.stringify(options)}
      
      Return validation results in the specified schema format.
    `;
  }
  
  private getFallbackValidation(data: any[]): ValidationResult {
    // Graceful degradation when AI fails
    return {
      valid: true,
      errors: [],
      warnings: ['AI validation unavailable, basic checks only']
    };
  }
}
```

### Content Generation Pattern

```typescript
export const generateContent = onRequest({
  memory: '256MiB',
  timeoutSeconds: 180,
  secrets: [geminiApiKey]
}, async (req, res) => {
  const { data, contentType, language = 'en' } = req.body;
  
  // Input validation
  if (!data || !contentType) {
    return res.status(400).json({ error: 'Data and content type required' });
  }
  
  try {
    const content = await aiService.generateContent(data, {
      type: contentType,
      language,
      maxLength: 500,
      style: 'professional',
      domainContext: process.env.DOMAIN_CONTEXT
    });
    
    res.json({ success: true, content });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Content generation failed',
      fallback: getBasicContent(data, contentType)
    });
  }
});
```

## Best Practices

### 1. API Key Management

```bash
# Store securely
firebase functions:secrets:set GEMINI_API_KEY

# List secrets
firebase functions:secrets:list

# Access in function
const geminiApiKey = defineSecret('GEMINI_API_KEY');
```

### 2. Error Handling & Fallbacks

```typescript
export class AIService {
  async processWithAI(data: any, fallbackData: any = null): Promise<any> {
    try {
      return await this.aiOperation(data);
    } catch (error) {
      console.error('AI operation failed:', error);
      
      // Log for monitoring
      await logAIFailure(error, data);
      
      // Return fallback
      return fallbackData || this.getDefaultResponse();
    }
  }
}
```

### 3. Input Validation

```typescript
function validateAIRequest(req: Request): ValidationResult {
  const errors = [];
  
  // Check method
  if (req.method !== 'POST') {
    errors.push('Method not allowed');
  }
  
  // Check data
  const { data, options } = req.body;
  if (!data || typeof data !== 'object') {
    errors.push('Data must be an object or array');
  }
  
  // Check size limits
  if (Array.isArray(data) && data.length > 1000) {
    errors.push('Maximum 1000 items allowed');
  }
  
  // Check content size
  const contentSize = JSON.stringify(data).length;
  if (contentSize > 1_000_000) {
    errors.push('Content too large (max 1MB)');
  }
  
  return { valid: errors.length === 0, errors };
}
```

## Security & Configuration

### Required Gemini Models

```typescript
// ✅ ONLY use these models (Updated for Gemini 2.5)
const ALLOWED_MODELS = [
  'gemini-2.5-flash-lite', // Fastest and cheapest, public preview
  'gemini-2.5-flash',      // Best price-performance, GA
  'gemini-2.5-pro'         // Advanced reasoning, GA
];

// Model selection rationale:
// - gemini-2.5-flash-lite: Fastest, lowest latency, most cost-effective for high-volume tasks
// - gemini-2.5-flash: Balanced price-performance, suitable for most production workloads
// - gemini-2.5-pro: Most advanced for complex reasoning and coding tasks

// ❌ NEVER use outdated models
const FORBIDDEN_MODELS = [
  'gemini-pro', 'gemini-1.5-pro', 'gemini-1.5-flash', 'palm', 'text-bison'
];
```

### Environment Configuration

```typescript
// Project-specific configuration
export interface AIConfig {
  domainContext: string;        // Your domain (e.g., "healthcare", "finance")
  geographicContext: string;    // Your region (e.g., "California, USA")
  primaryLanguage: string;      // Default language (e.g., "en", "es", "fr")
  modelPreference: string;      // Preferred Gemini model
  maxRetries: number;          // API retry attempts
  cacheEnabled: boolean;       // Enable response caching
  cacheTTL: number;           // Cache time-to-live in seconds
}

// Load from environment
const aiConfig: AIConfig = {
  domainContext: process.env.DOMAIN_CONTEXT || 'general',
  geographicContext: process.env.GEOGRAPHIC_CONTEXT || 'Global',
  primaryLanguage: process.env.PRIMARY_LANGUAGE || 'en',
  modelPreference: process.env.AI_MODEL || 'gemini-2.5-flash',
  maxRetries: parseInt(process.env.AI_MAX_RETRIES || '3'),
  cacheEnabled: process.env.AI_CACHE_ENABLED === 'true',
  cacheTTL: parseInt(process.env.AI_CACHE_TTL || '300')
};
```

## Performance Optimization

### 1. Response Caching

```typescript
import { LRUCache } from 'lru-cache';

const aiCache = new LRUCache<string, any>({
  max: 500,
  ttl: 1000 * 60 * 5, // 5 minutes
});

export async function cachedAIOperation(key: string, operation: () => Promise<any>) {
  const cached = aiCache.get(key);
  if (cached) {
    return { ...cached, fromCache: true };
  }
  
  const result = await operation();
  aiCache.set(key, result);
  return result;
}
```

### 2. Batch Processing

```typescript
export async function batchAIProcessing<T>(
  items: T[],
  batchSize: number = 10,
  processor: (batch: T[]) => Promise<any[]>
): Promise<any[]> {
  const results = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await processor(batch);
    results.push(...batchResults);
    
    // Rate limiting pause
    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
}
```

### 3. Cost Management

```typescript
export class AIUsageTracker {
  async trackUsage(operation: string, tokens: number, cost: number) {
    await db.collection('ai_usage').add({
      operation,
      tokens,
      cost,
      timestamp: new Date(),
      month: new Date().toISOString().substring(0, 7)
    });
  }
  
  async getMonthlyUsage(): Promise<UsageStats> {
    const currentMonth = new Date().toISOString().substring(0, 7);
    const snapshot = await db.collection('ai_usage')
      .where('month', '==', currentMonth)
      .get();
    
    return snapshot.docs.reduce((acc, doc) => {
      const data = doc.data();
      return {
        totalTokens: acc.totalTokens + data.tokens,
        totalCost: acc.totalCost + data.cost,
        operationCount: acc.operationCount + 1
      };
    }, { totalTokens: 0, totalCost: 0, operationCount: 0 });
  }
}
```

## Implementation Examples

For specific implementation examples, see:
- `functions/docs/location-extraction.md` - Location inference implementation
- `functions/docs/ai-validation-patterns.md` - Data validation examples
- `functions/docs/content-generation.md` - Content generation patterns

---

*Last updated for Gemini 2.5 models and Firebase Functions v2*