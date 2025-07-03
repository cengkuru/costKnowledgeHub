# Development Guidelines - Universal Patterns

> Comprehensive development guidelines, commands, and automation setup for modern web applications

## Table of Contents

1. [Essential Commands](#essential-commands)
2. [Development Setup](#development-setup)
3. [Pre-commit Hooks & Automation](#pre-commit-hooks--automation)
4. [CI/CD Pipeline](#cicd-pipeline)
5. [Code Quality Standards](#code-quality-standards)
6. [Testing Requirements](#testing-requirements)
7. [Performance Optimization](#performance-optimization)
8. [Security Best Practices](#security-best-practices)
9. [Troubleshooting Guide](#troubleshooting-guide)

## Essential Commands

### Development Commands

```bash
# Install dependencies
npm install              # or: pnpm install / yarn install

# Start development server
npm start                # or: npm run dev

# Build for production
npm run build            # Ensure 0 errors before deployment

# Run tests
npm test                 # Unit tests
npm run test:e2e         # E2E tests
npm run test:coverage    # Coverage report

# Code quality
npm run lint             # Lint all files
npm run lint:fix         # Auto-fix issues
npm run format           # Format code
npm run typecheck        # TypeScript check

# Bundle analysis
npm run analyze          # Analyze bundle size
npm run build:stats      # Generate stats.json
```

### Deployment Commands

```bash
# Deploy to staging
npm run deploy:staging

# Deploy to production (with checks)
npm run predeploy && npm run deploy:prod

# Deploy specific services
npm run deploy:frontend
npm run deploy:functions
npm run deploy:hosting
```

### Maintenance Commands

```bash
# Update dependencies
npm run update:check     # Check for updates
npm run update:safe      # Update non-breaking
npm run update:all       # Update all (careful!)

# Clean workspace
npm run clean            # Clean build artifacts
npm run clean:cache      # Clear all caches
npm run clean:modules    # Remove node_modules

# Security audit
npm audit                # Check vulnerabilities
npm audit fix            # Auto-fix issues
```

## Development Setup

### Initial Setup

```bash
# 1. Clone repository
git clone <repository-url>
cd <project-name>

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.example .env.local
# Edit .env.local with your values

# 4. Initialize git hooks
npm run prepare

# 5. Verify setup
npm run verify:setup
```

### Environment Configuration

```bash
# Required environment variables
NODE_ENV=development
API_URL=http://localhost:3000
PUBLIC_URL=http://localhost:4200

# Optional but recommended
ENABLE_DEBUG=true
LOG_LEVEL=debug
CACHE_ENABLED=false
```

## Pre-commit Hooks & Automation

### Husky + lint-staged Setup

```bash
# Install dependencies
npm install --save-dev husky lint-staged

# Initialize Husky
npx husky init

# Create pre-commit hook
echo "npx lint-staged" > .husky/pre-commit
chmod +x .husky/pre-commit
```

### Configuration (package.json)

```json
{
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md,yml,yaml}": [
      "prettier --write"
    ],
    "*.{css,scss,less}": [
      "stylelint --fix",
      "prettier --write"
    ],
    "package.json": [
      "npm run lint:package"
    ]
  },
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "commit-msg": "commitlint -E HUSKY_GIT_PARAMS",
      "pre-push": "npm run test:ci"
    }
  }
}
```

### Commit Message Convention

```bash
# Format: <type>(<scope>): <subject>

# Types:
feat:     # New feature
fix:      # Bug fix
docs:     # Documentation only
style:    # Code style (formatting, semicolons, etc)
refactor: # Code restructuring
perf:     # Performance improvements
test:     # Test additions/corrections
build:    # Build system changes
ci:       # CI configuration changes
chore:    # Maintenance tasks

# Examples:
git commit -m "feat(auth): add password reset functionality"
git commit -m "fix(ui): resolve button alignment issue"
git commit -m "docs(api): update endpoint documentation"
```

## CI/CD Pipeline

### GitHub Actions Workflow

Create `.github/workflows/ci.yml`:

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linters
        run: |
          npm run lint
          npm run typecheck
      
      - name: Check formatting
        run: npm run format:check
      
      - name: Security audit
        run: npm audit --audit-level=moderate

  test:
    runs-on: ubuntu-latest
    needs: quality
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:ci
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info

  build:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build application
        run: npm run build
      
      - name: Check bundle size
        run: npm run size:check
      
      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: build-artifacts
          path: dist/

  deploy:
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      
      - name: Download artifacts
        uses: actions/download-artifact@v3
        with:
          name: build-artifacts
          path: dist/
      
      - name: Deploy to production
        run: npm run deploy:prod
        env:
          DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}
```

### Package Management Optimization

#### Switch to pnpm (Recommended)

```bash
# Install pnpm globally
npm install -g pnpm

# Convert existing project
pnpm import              # Import from package-lock.json
rm -rf node_modules package-lock.json
pnpm install

# Update CI configuration
# In .github/workflows/ci.yml:
- uses: pnpm/action-setup@v3
  with:
    version: 8
```

#### pnpm Benefits

- **Disk space**: Up to 75% reduction through hard linking
- **Installation speed**: 2-3x faster than npm
- **Strict dependencies**: Prevents phantom dependencies
- **Monorepo support**: Built-in workspace management

## Code Quality Standards

### TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "resolveJsonModule": true,
    "isolatedModules": true
  }
}
```

### ESLint Configuration

```javascript
module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended', // if using React
    'prettier'
  ],
  rules: {
    '@typescript-eslint/explicit-module-boundary-types': 'error',
    '@typescript-eslint/no-explicit-any': 'error',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'prefer-const': 'error',
    'no-unused-expressions': 'error'
  }
};
```

### Code Style Guidelines

1. **Consistent Formatting**: Use Prettier with team config
2. **Type Safety**: No `any` types, define interfaces
3. **Error Handling**: Always handle promise rejections
4. **Pure Functions**: Prefer pure functions where possible
5. **Early Returns**: Use guard clauses to reduce nesting
6. **Meaningful Names**: Self-documenting code over comments

## Testing Requirements

### Test Structure

```
tests/
├── unit/           # Unit tests for individual functions
├── integration/    # Integration tests for modules
├── e2e/            # End-to-end user flow tests
└── fixtures/       # Test data and mocks
```

### Coverage Requirements

```json
{
  "jest": {
    "coverageThreshold": {
      "global": {
        "branches": 80,
        "functions": 80,
        "lines": 80,
        "statements": 80
      }
    }
  }
}
```

### Testing Patterns

```typescript
// Unit test example
describe('UserService', () => {
  let service: UserService;
  
  beforeEach(() => {
    service = new UserService();
  });
  
  describe('validateEmail', () => {
    it('should validate correct email format', () => {
      expect(service.validateEmail('user@example.com')).toBe(true);
    });
    
    it('should reject invalid email format', () => {
      expect(service.validateEmail('invalid-email')).toBe(false);
    });
  });
});

// Integration test example
describe('API Integration', () => {
  it('should create and retrieve user', async () => {
    const user = await api.createUser({ name: 'Test User' });
    const retrieved = await api.getUser(user.id);
    
    expect(retrieved).toEqual(user);
  });
});
```

## Performance Optimization

### Build Optimization

```json
{
  "scripts": {
    "build:analyze": "npm run build -- --stats-json && webpack-bundle-analyzer dist/stats.json",
    "build:modern": "npm run build -- --modern",
    "build:report": "npm run build -- --report"
  }
}
```

### Runtime Optimization

1. **Code Splitting**: Lazy load routes and heavy components
2. **Tree Shaking**: Ensure proper ES6 module imports
3. **Caching Strategy**: Implement service worker caching
4. **Asset Optimization**: Compress images, use WebP format
5. **Bundle Size Monitoring**: Set size budgets

```javascript
// webpack.config.js
module.exports = {
  performance: {
    budgets: [
      {
        type: 'bundle',
        name: 'main',
        budget: 250000 // 250kb
      },
      {
        type: 'initial',
        budget: 500000 // 500kb
      }
    ]
  }
};
```

## Security Best Practices

### Dependency Management

```bash
# Regular security audits
npm audit                          # Check for vulnerabilities
npm audit fix                      # Auto-fix when possible
npm audit fix --force              # Force fixes (careful!)

# Keep dependencies updated
npx npm-check-updates              # Check available updates
npx npm-check-updates -u           # Update package.json
npm install                        # Install updates
```

### Environment Security

```javascript
// Never commit sensitive data
// .env.local (git ignored)
API_KEY=your-secret-key
DATABASE_URL=your-connection-string

// config.js
export const config = {
  apiKey: process.env.API_KEY || '',
  databaseUrl: process.env.DATABASE_URL || ''
};

// Validate required vars on startup
const requiredEnvVars = ['API_KEY', 'DATABASE_URL'];
requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
});
```

### Content Security Policy

```javascript
// CSP headers for production
const cspDirectives = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'", "'unsafe-inline'", 'https://apis.google.com'],
  styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
  imgSrc: ["'self'", 'data:', 'https:'],
  connectSrc: ["'self'", 'https://api.yourapp.com'],
  fontSrc: ["'self'", 'https://fonts.gstatic.com'],
  objectSrc: ["'none'"],
  mediaSrc: ["'self'"],
  frameSrc: ["'none'"],
};
```

## Troubleshooting Guide

### Common Issues and Solutions

#### TypeScript Errors

```typescript
// Issue: Cannot find module
// Solution: Check tsconfig paths and install @types
npm install --save-dev @types/node

// Issue: Type 'unknown' is not assignable
// Solution: Use type guards
function isError(error: unknown): error is Error {
  return error instanceof Error;
}

// Issue: Property does not exist on type
// Solution: Define proper interfaces
interface User {
  id: string;
  name: string;
  email?: string;
}
```

#### Build Failures

```bash
# Clear all caches
rm -rf node_modules/.cache
rm -rf .next .nuxt dist build  # framework specific

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Check Node version
node --version  # Should match .nvmrc
nvm use         # Switch to correct version
```

#### Performance Issues

```javascript
// Measure performance
const startTime = performance.now();
// ... your code ...
const endTime = performance.now();
console.log(`Operation took ${endTime - startTime}ms`);

// Profile React components (if applicable)
import { Profiler } from 'react';

<Profiler id="Navigation" onRender={onRenderCallback}>
  <Navigation />
</Profiler>
```

### Debug Commands

```bash
# Verbose logging
DEBUG=* npm start

# Node debugging
node --inspect npm start

# Memory profiling
node --inspect --max-old-space-size=4096 npm start

# Network debugging
NODE_TLS_REJECT_UNAUTHORIZED=0 npm start  # For SSL issues (dev only!)
```

## Best Practices Summary

1. **Always run tests before committing**
2. **Keep dependencies up to date**
3. **Use semantic versioning**
4. **Document breaking changes**
5. **Optimize bundle size continuously**
6. **Monitor performance metrics**
7. **Implement proper error boundaries**
8. **Use feature flags for gradual rollouts**
9. **Maintain comprehensive test coverage**
10. **Regular security audits**

---

*This guide provides universal patterns. Adapt commands and configurations to your specific tech stack and requirements.*