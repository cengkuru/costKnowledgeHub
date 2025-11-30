# Backend Architecture

## Overview
Refactored from monolithic (347 lines) to modular architecture (84 lines main file).

## Request Flow

```
HTTP Request
    ↓
┌─────────────────────────────────────────────┐
│  Express Middleware Stack                   │
├─────────────────────────────────────────────┤
│  1. CORS                                    │
│  2. Body Parser (JSON/URL-encoded)          │
│  3. Rate Limiter (apiLimiter)               │
└─────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────┐
│  Routes Layer (routes/)                     │
├─────────────────────────────────────────────┤
│  • public.ts  → Public endpoints            │
│  • admin.ts   → Admin endpoints (protected) │
└─────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────┐
│  Route-Specific Middleware                  │
├─────────────────────────────────────────────┤
│  • authenticate (JWT validation)            │
│  • requireAdmin (role check)                │
│  • validateBody (Zod schema)                │
│  • aiLimiter / authLimiter                  │
└─────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────┐
│  Controllers Layer (controllers/)           │
├─────────────────────────────────────────────┤
│  • resourceController.ts                    │
│  • searchController.ts                      │
│  • authController.ts                        │
│                                             │
│  Responsibilities:                          │
│  - Request validation                       │
│  - Call services                            │
│  - Format responses                         │
│  - Handle errors                            │
└─────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────┐
│  Services Layer (services/)                 │
├─────────────────────────────────────────────┤
│  • resourceService.ts                       │
│  • aiService.ts (Gemini integration)        │
│  • authService.ts (JWT, bcrypt)             │
│  • claudeService.ts (Anthropic)             │
│                                             │
│  Responsibilities:                          │
│  - Business logic                           │
│  - Database operations                      │
│  - External API calls                       │
│  - Data transformation                      │
└─────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────┐
│  Database Layer (db.ts)                     │
├─────────────────────────────────────────────┤
│  • MongoDB Connection                       │
│  • Connection Pooling                       │
│  • Error Handling                           │
└─────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────┐
│  MongoDB Atlas                              │
│  • resources collection                     │
│  • users collection                         │
│  • categories collection                    │
└─────────────────────────────────────────────┘
```

## Layer Responsibilities

### 1. Routes Layer (`routes/`)
```typescript
routes/
├── index.ts      // Aggregates all routes
├── public.ts     // Public API endpoints
└── admin.ts      // Admin endpoints (auth required)
```

**Responsibilities:**
- Define endpoint paths
- Apply middleware (auth, validation, rate limiting)
- Map routes to controllers
- No business logic

**Example:**
```typescript
router.post('/search', aiLimiter, validateBody(SearchSchema), searchController.semanticSearch);
```

### 2. Middleware Layer (`middleware/`)
```typescript
middleware/
├── auth.ts           // JWT authentication & authorization
├── errorHandler.ts   // Global error handling
├── rateLimiter.ts    // Rate limiting configurations
└── validation.ts     // Zod schema validation
```

**Responsibilities:**
- Request authentication (JWT)
- Request validation (Zod schemas)
- Rate limiting (prevent abuse)
- Error handling (consistent responses)
- Authorization (role checks)

**Example:**
```typescript
export const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  const decoded = jwt.verify(token, config.jwtSecret);
  req.user = decoded;
  next();
};
```

### 3. Controllers Layer (`controllers/`)
```typescript
controllers/
├── resourceController.ts   // Resource CRUD
├── searchController.ts     // Search & translation
└── authController.ts       // Authentication
```

**Responsibilities:**
- Handle HTTP requests/responses
- Call appropriate services
- Transform data for response
- Handle controller-level errors
- NO business logic
- NO database access

**Example:**
```typescript
async getResources(req, res, next) {
  try {
    const { category, type } = req.query;
    const resources = await resourceService.getResources({ category, type });
    res.json(resources);
  } catch (error) {
    next(error);
  }
}
```

### 4. Services Layer (`services/`)
```typescript
services/
├── resourceService.ts   // Resource business logic
├── aiService.ts         // AI integration (Gemini)
├── authService.ts       // Authentication & user management
└── claudeService.ts     // Anthropic Claude integration
```

**Responsibilities:**
- Business logic implementation
- Database operations (CRUD)
- External API calls (Gemini, Claude)
- Data transformation
- Input sanitization
- Error handling with ApiError

**Example:**
```typescript
async getResources(filters) {
  const db = await getDatabase();
  const collection = db.collection<Resource>(COLLECTION_NAME);

  const filter = {};
  if (filters.category && filters.category !== 'All Topics') {
    filter.category = filters.category;
  }

  const resources = await collection.find(filter).sort({ date: -1 }).toArray();
  return resources.map(transformResource);
}
```

### 5. Models Layer (`models/`)
```typescript
models/
├── Resource.ts    // Resource schema & interface
├── User.ts        // User schema with Zod validation
└── Category.ts    // Category schema
```

**Responsibilities:**
- Define data structures (TypeScript interfaces)
- Define validation schemas (Zod)
- Type inference
- Collection names

**Example:**
```typescript
export interface User {
  _id?: ObjectId;
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'user';
}

export const UserRegistrationSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(100),
});
```

### 6. Configuration (`config/`)
```typescript
config/
└── index.ts   // Environment variables & settings
```

**Responsibilities:**
- Load environment variables
- Validate configuration
- Provide typed config object
- Default values

**Example:**
```typescript
const config = {
  port: parseInt(process.env.PORT || '3000'),
  mongodbUri: process.env.MONGODB_URI || '',
  jwtSecret: process.env.JWT_SECRET || 'default-secret',
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:4200'],
};
```

### 7. Utils (`utils/`)
```typescript
utils/
└── helpers.ts   // Utility functions
```

**Responsibilities:**
- Reusable utility functions
- Data cleaning
- Retry logic
- ID generation
- No business logic

## API Endpoints

### Public Routes (`/api`)

#### Resources
```
GET    /api/resources          Get all resources (with filters)
GET    /api/resources/:id      Get single resource
POST   /api/interact/:id       Increment resource clicks
GET    /api/popular            Get popular resources
```

#### AI Features (Rate Limited: 10 req/min)
```
POST   /api/search             Semantic search using AI
POST   /api/translate          Translate resources (en/es/pt)
```

#### Authentication (Rate Limited: 5 req/15min)
```
POST   /api/auth/register      Register new user
POST   /api/auth/login         Login user (returns JWT)
```

#### Protected (Requires JWT)
```
GET    /api/auth/me            Get current user profile
PUT    /api/auth/me            Update current user profile
```

### Admin Routes (`/api/admin`)
**All require JWT + admin role**

```
POST   /api/admin/resources    Create new resource
PUT    /api/admin/resources/:id Update resource
DELETE /api/admin/resources/:id Delete resource
```

## Rate Limiting

```typescript
// General API: 100 requests per 15 minutes
apiLimiter: { windowMs: 15 * 60 * 1000, max: 100 }

// Auth endpoints: 5 requests per 15 minutes
authLimiter: { windowMs: 15 * 60 * 1000, max: 5 }

// AI endpoints: 10 requests per minute
aiLimiter: { windowMs: 60 * 1000, max: 10 }
```

## Security Features

### 1. Authentication
- JWT-based authentication
- bcrypt password hashing (10 rounds)
- Token expiration (configurable)

### 2. Authorization
- Role-based access control (admin/user)
- Middleware: `authenticate`, `requireAdmin`
- Protected routes

### 3. Input Validation
- Zod schemas for all inputs
- Type-safe validation
- Detailed error messages

### 4. Rate Limiting
- Prevents brute force attacks
- Different limits per endpoint type
- IP-based tracking

### 5. Error Handling
- Custom ApiError class
- Status code management
- No sensitive data leakage
- Stack traces only in development

### 6. CORS
- Configured allowed origins
- Credentials support
- Origin validation

## Database Schema

### Resources Collection
```typescript
{
  _id: ObjectId,
  id: string,              // Unique identifier
  title: string,
  description: string,
  url: string,
  category: ResourceCategory,
  type: ResourceType,
  date: string,            // ISO date (YYYY-MM-DD)
  clicks?: number,
  createdAt?: Date,
  updatedAt?: Date
}
```

### Users Collection
```typescript
{
  _id: ObjectId,
  email: string,           // Unique, validated
  password: string,        // bcrypt hashed
  name: string,
  role: 'admin' | 'user',
  createdAt: Date,
  updatedAt: Date
}
```

### Categories Collection
```typescript
{
  _id: ObjectId,
  id: string,
  name: string,
  description?: string,
  createdAt: Date,
  updatedAt: Date
}
```

## Error Handling

### ApiError Class
```typescript
class ApiError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(statusCode, message, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
  }
}
```

### Common Error Codes
```
400 - Bad Request (validation errors)
401 - Unauthorized (missing/invalid token)
403 - Forbidden (insufficient permissions)
404 - Not Found (resource doesn't exist)
409 - Conflict (duplicate resource)
429 - Too Many Requests (rate limit exceeded)
500 - Internal Server Error
```

### Error Response Format
```json
{
  "error": "Error message",
  "stack": "Stack trace (development only)"
}
```

## Testing Strategy

### Test Files
```
src/__tests__/
├── api.test.ts          // API endpoint tests (25 tests)
├── database.test.ts     // Database tests (13 tests)
├── integration.test.ts  // Integration tests (16 tests)
├── middleware.test.ts   // Middleware tests (20 tests)
└── services/
    └── claudeService.test.ts  // Claude service tests (40 tests)
```

### Test Coverage
- **Total Tests**: 114
- **All Passing**: ✅
- **Database**: Real MongoDB (not mocked)
- **AI Services**: Real API calls (integration tests)

## Environment Variables

### Required
```bash
MONGODB_URI=mongodb+srv://...
GEMINI_API_KEY=AIza...
JWT_SECRET=secure-secret-min-32-chars
```

### Optional
```bash
PORT=3000
NODE_ENV=development
JWT_EXPIRES_IN=7d
ANTHROPIC_API_KEY=sk-ant-...
ALLOWED_ORIGINS=http://localhost:4200,...
```

## Build & Run

### Development
```bash
npm run dev      # Watch mode with nodemon
npm test         # Run tests
npm test:watch   # Watch mode for tests
```

### Production
```bash
npm run build    # Compile TypeScript
npm start        # Start server
```

## Performance Metrics

### Before Refactoring
- Main file: 347 lines
- Monolithic structure
- Hard to maintain
- Difficult to test

### After Refactoring
- Main file: 84 lines (-76%)
- Modular structure
- Easy to maintain
- 114 tests passing

## Dependencies

### Production
```json
{
  "express": "^5.1.0",
  "cors": "^2.8.5",
  "dotenv": "^17.2.3",
  "mongodb": "^7.0.0",
  "@google/genai": "^1.30.0",
  "zod": "^3.x",
  "bcryptjs": "^2.4.x",
  "jsonwebtoken": "^9.0.x",
  "express-rate-limit": "^7.x"
}
```

### Development
```json
{
  "typescript": "^5.9.3",
  "jest": "^30.2.0",
  "ts-jest": "^29.4.5",
  "supertest": "^7.1.4",
  "@types/*": "..."
}
```

## Future Enhancements

1. **Image Generation Service**
   - DALL-E / Stable Diffusion integration
   - Image storage (S3/CloudStorage)

2. **Anthropic Claude Integration**
   - Use ANTHROPIC_API_KEY
   - Multi-model routing

3. **Caching Layer**
   - Redis for API responses
   - Cache AI results

4. **Database Migrations**
   - Version-controlled schema changes

5. **API Documentation**
   - Swagger/OpenAPI
   - Auto-generated from code

6. **Monitoring**
   - Request logging (morgan)
   - Error tracking (Sentry)
   - Performance monitoring

---

**Status**: ✅ Production Ready
**Test Coverage**: 114/114 passing
**Documentation**: Complete
