# Testing Guide - CoST Knowledge Hub

This guide covers all testing procedures for the CoST Knowledge Hub application.

## Table of Contents

- [Overview](#overview)
- [Test Stack](#test-stack)
- [Running Tests](#running-tests)
- [Test Coverage](#test-coverage)
- [Deployment Scripts](#deployment-scripts)
- [Pre-Deployment Checklist](#pre-deployment-checklist)
- [Post-Deployment Verification](#post-deployment-verification)
- [Troubleshooting](#troubleshooting)

## Overview

The CoST Knowledge Hub uses comprehensive testing at multiple levels:

1. **Server Tests** (Jest + Supertest)
   - Database connection tests
   - API endpoint tests
   - Integration tests

2. **Client Tests** (Jasmine + Karma)
   - Component tests
   - Service tests
   - E2E tests

3. **Deployment Tests**
   - Pre-deployment validation
   - Post-deployment verification
   - Live endpoint testing

## Test Stack

### Server (Node.js/TypeScript)

- **Jest**: Test framework
- **Supertest**: HTTP testing
- **ts-jest**: TypeScript support
- **MongoDB**: Real dev database (no mocks)

### Client (Angular 21)

- **Jasmine**: Test framework
- **Karma**: Test runner
- **Chrome Headless**: Browser testing

## Running Tests

### Server Tests

```bash
cd server

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Pre-commit checks (tests + build)
npm run precommit
```

### Client Tests

```bash
cd client

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Pre-commit checks (tests + build)
npm run precommit
```

### Test Suites

#### 1. Database Tests (`server/src/__tests__/database.test.ts`)

Tests database connectivity and operations:

- MongoDB connection
- Resource retrieval
- Data structure validation
- Click tracking
- Filtering and sorting

**Important**: Uses real dev database (MongoDB).

```bash
cd server
npm test -- database.test.ts
```

#### 2. API Tests (`server/src/__tests__/api.test.ts`)

Tests all API endpoints:

- `GET /api/resources` - Resource listing with filters
- `POST /api/interact/:id` - Click tracking
- `GET /api/popular` - Popular resources
- `POST /api/search` - AI semantic search
- `POST /api/translate` - Translation
- CORS configuration
- Error handling

```bash
cd server
npm test -- api.test.ts
```

#### 3. Integration Tests (`server/src/__tests__/integration.test.ts`)

Tests full request/response cycles:

- Complete resource retrieval flow
- Interaction tracking flow
- Popular resources calculation
- AI features (if API_KEY set)
- CORS headers
- End-to-end scenarios
- Error recovery

```bash
cd server
npm test -- integration.test.ts
```

## Test Coverage

### Coverage Requirements

- **Minimum**: 80% coverage (branches, functions, lines, statements)
- **Enforced**: Via Jest configuration
- **Reports**: Generated in `server/coverage/`

### Viewing Coverage

```bash
cd server
npm run test:coverage

# Open coverage report
open coverage/lcov-report/index.html
```

### Coverage Configuration

Configured in `server/jest.config.js`:

```javascript
coverageThreshold: {
  global: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80,
  },
}
```

## Deployment Scripts

### 1. Pre-Deployment (`scripts/pre-deploy.sh`)

Runs before deployment to ensure everything is ready.

**Checks:**
- Environment variables set
- Server tests pass
- Server builds successfully
- Client tests pass
- Client builds successfully
- Build artifacts exist

**Usage:**

```bash
./scripts/pre-deploy.sh
```

**Exit codes:**
- `0`: All checks passed
- `1`: One or more checks failed

### 2. Post-Deployment (`scripts/post-deploy.sh`)

Runs after deployment to verify everything works.

**Tests:**
- Frontend accessibility (HTTPS)
- Backend API endpoints (all routes)
- CORS headers
- Database connectivity
- POST endpoints (search, translate, interact)
- Error handling (404, 400)

**Usage:**

```bash
./scripts/post-deploy.sh
```

**URLs Tested:**
- Frontend: `https://infralens-b1eed.web.app`
- Backend: `https://cost-knowledge-hub-api-rektxtbxiq-uc.a.run.app/api`

### 3. Full Deployment (`scripts/deploy.sh`)

Orchestrates entire deployment process.

**Steps:**
1. Run pre-deployment checks
2. Deploy backend to Cloud Run
3. Deploy frontend to Firebase Hosting
4. Run post-deployment verification

**Usage:**

```bash
./scripts/deploy.sh
```

**Requirements:**
- `gcloud` CLI installed and configured
- `firebase` CLI installed and authenticated
- Environment variables configured in `server/.env`

## Pre-Deployment Checklist

Before deploying, ensure:

### Server

- [ ] All tests passing: `cd server && npm test`
- [ ] Build succeeds: `cd server && npm run build`
- [ ] Environment variables set in `server/.env`:
  - `MONGODB_URI` (required)
  - `DB_NAME` (required)
  - `API_KEY` (optional, for AI features)
  - `ALLOWED_ORIGINS` (optional, defaults to localhost)

### Client

- [ ] All tests passing: `cd client && npm test`
- [ ] Build succeeds: `cd client && npm run build`

### Scripts

- [ ] Pre-deploy script passes: `./scripts/pre-deploy.sh`

## Post-Deployment Verification

After deploying, verify:

### Automated Checks

Run post-deployment script:

```bash
./scripts/post-deploy.sh
```

### Manual Checks

1. **Frontend**:
   - Visit https://infralens-b1eed.web.app
   - Check resources load
   - Test filtering
   - Test search (if API_KEY configured)
   - Test language switching

2. **Backend**:
   - Check API: `curl https://cost-knowledge-hub-api-rektxtbxiq-uc.a.run.app/api/resources`
   - Test CORS: Use browser DevTools Network tab
   - Monitor logs: `gcloud run services logs read cost-knowledge-hub-api --region us-central1`

3. **Database**:
   - Verify resources loading from MongoDB
   - Test click tracking
   - Check popular resources calculation

## Troubleshooting

### Server Tests Failing

**Issue**: `MONGODB_URI is not defined`

**Solution**:
```bash
cd server
cp .env.example .env
# Edit .env with your MongoDB connection string
```

**Issue**: `Cannot connect to MongoDB`

**Solution**:
- Check MongoDB URI is correct
- Verify network connectivity
- Ensure IP is whitelisted in MongoDB Atlas

**Issue**: `API_KEY not found - AI tests failing`

**Solution**:
- AI tests will skip if API_KEY not set (expected behavior)
- To enable: Add `API_KEY=your-key` to `server/.env`

### Client Tests Failing

**Issue**: `Chrome Headless not found`

**Solution**:
```bash
# Install Chrome
# Or configure Karma to use different browser
```

### Deployment Failing

**Issue**: `gcloud: command not found`

**Solution**:
```bash
# Install Google Cloud SDK
curl https://sdk.cloud.google.com | bash
gcloud init
```

**Issue**: `firebase: command not found`

**Solution**:
```bash
npm install -g firebase-tools
firebase login
```

**Issue**: `Pre-deployment checks failed`

**Solution**:
- Read error output carefully
- Fix failing tests or build errors
- Re-run `./scripts/pre-deploy.sh`

### Post-Deployment Issues

**Issue**: `Frontend not accessible (404)`

**Solution**:
- Check Firebase deployment: `firebase hosting:sites:list`
- Redeploy: `cd client && firebase deploy --only hosting`

**Issue**: `Backend API returning 500`

**Solution**:
- Check Cloud Run logs: `gcloud run services logs read cost-knowledge-hub-api --region us-central1`
- Verify environment variables set correctly
- Check MongoDB connection

**Issue**: `CORS errors in browser`

**Solution**:
- Ensure `ALLOWED_ORIGINS` includes frontend URL
- Redeploy backend with correct environment variables

## Environment Variables

### Required

```bash
# server/.env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/
DB_NAME=infrascope
```

### Optional

```bash
# server/.env
API_KEY=your-gemini-api-key
ALLOWED_ORIGINS=http://localhost:4200,https://infralens-b1eed.web.app
PORT=3000
```

## Test Database

**Important**: All tests use the **real dev database**. No mocks or test data.

- Database: MongoDB Atlas
- Connection: See `MONGODB_URI` in `server/.env`
- Collections: `resources`

**Why real database?**
- Tests actual data structure
- Validates real-world scenarios
- Ensures database compatibility
- No mock/real discrepancies

**Safety**:
- Tests read data (mostly)
- Write tests clean up after themselves
- Never deletes production data

## Continuous Integration

### GitHub Actions (Optional)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Pre-deployment checks
        run: ./scripts/pre-deploy.sh
      - name: Deploy
        run: ./scripts/deploy.sh
      - name: Post-deployment verification
        run: ./scripts/post-deploy.sh
```

## Quick Reference

### Command Cheatsheet

```bash
# Server tests
cd server && npm test                 # Run all tests
cd server && npm run test:watch       # Watch mode
cd server && npm run test:coverage    # Coverage report
cd server && npm run precommit        # Pre-commit checks

# Client tests
cd client && npm test                 # Run all tests
cd client && npm run test:watch       # Watch mode
cd client && npm run precommit        # Pre-commit checks

# Deployment
./scripts/pre-deploy.sh              # Pre-deployment checks
./scripts/deploy.sh                  # Full deployment
./scripts/post-deploy.sh             # Post-deployment verification

# Cloud Run
gcloud run services list                                    # List services
gcloud run services logs read cost-knowledge-hub-api        # View logs
gcloud run services describe cost-knowledge-hub-api         # Service details

# Firebase
firebase hosting:sites:list          # List sites
firebase deploy --only hosting       # Deploy frontend
firebase hosting:channel:list        # List preview channels
```

## Support

For issues or questions:
- Check this guide first
- Review test output carefully
- Check deployment logs
- Verify environment variables
- Ensure database connectivity

## License

MIT
