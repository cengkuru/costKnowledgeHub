#!/bin/bash

# Pre-deployment checks for CoST Knowledge Hub
# This script runs before deploying to ensure everything is ready

set -e  # Exit on error

echo "========================================="
echo "  PRE-DEPLOYMENT CHECKS"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track failures
FAILED=0

# Function to print status
print_status() {
  if [ $1 -eq 0 ]; then
    echo -e "${GREEN}✓${NC} $2"
  else
    echo -e "${RED}✗${NC} $2"
    FAILED=1
  fi
}

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# 1. Check environment variables
echo "1. Checking environment variables..."
cd "$PROJECT_ROOT/Api"

if [ ! -f .env ]; then
  echo -e "${RED}✗${NC} .env file not found in Api/"
  FAILED=1
else
  # Check required variables
  source .env

  if [ -z "$MONGODB_URI" ]; then
    echo -e "${RED}✗${NC} MONGODB_URI not set in .env"
    FAILED=1
  else
    echo -e "${GREEN}✓${NC} MONGODB_URI is set"
  fi

  if [ -z "$GEMINI_API_KEY" ] && [ -z "$API_KEY" ]; then
    echo -e "${YELLOW}⚠${NC} GEMINI_API_KEY not set (AI features will be disabled)"
  else
    echo -e "${GREEN}✓${NC} GEMINI_API_KEY is set"
  fi

  if [ -z "$JWT_SECRET" ]; then
    echo -e "${RED}✗${NC} JWT_SECRET not set in .env"
    FAILED=1
  else
    echo -e "${GREEN}✓${NC} JWT_SECRET is set"
  fi

  if [ -z "$GCS_BUCKET_NAME" ]; then
    echo -e "${YELLOW}⚠${NC} GCS_BUCKET_NAME not set (image storage will use fallbacks)"
  else
    echo -e "${GREEN}✓${NC} GCS_BUCKET_NAME is set"
  fi

  if [ -z "$ALLOWED_ORIGINS" ]; then
    echo -e "${YELLOW}⚠${NC} ALLOWED_ORIGINS not set (using defaults)"
  else
    echo -e "${GREEN}✓${NC} ALLOWED_ORIGINS is set"
  fi
fi

echo ""

# 2. Run backend pre-deployment tests
echo "2. Running backend pre-deployment tests..."
npm ci
npm test -- --testPathPatterns="pre-deploy" --verbose 2>&1
print_status $? "Backend pre-deployment tests passed"
echo ""

# 3. Build backend
echo "3. Building backend..."
npm run build 2>&1
BUILD_STATUS=$?
print_status $BUILD_STATUS "Backend build completed"

if [ $BUILD_STATUS -eq 0 ]; then
  if [ -d "dist" ]; then
    echo -e "${GREEN}✓${NC} dist/ directory exists"
  else
    echo -e "${RED}✗${NC} dist/ directory not found after build"
    FAILED=1
  fi
fi
echo ""

# 4. Run frontend tests
echo "4. Running frontend tests..."
cd "$PROJECT_ROOT/Web"
npm ci
npm test 2>&1
print_status $? "Frontend tests passed"
echo ""

# 5. Build frontend
echo "5. Building frontend for production..."
npm run build -- --configuration=production 2>&1
BUILD_STATUS=$?
print_status $BUILD_STATUS "Frontend build completed"

if [ $BUILD_STATUS -eq 0 ]; then
  if [ -d "dist/client" ]; then
    echo -e "${GREEN}✓${NC} dist/client/ directory exists"
  else
    echo -e "${RED}✗${NC} dist/client/ directory not found after build"
    FAILED=1
  fi
fi
echo ""

# 6. Check build artifacts
echo "6. Checking build artifacts..."
cd "$PROJECT_ROOT"

# Check backend artifacts
if [ -f "Api/dist/index.js" ]; then
  echo -e "${GREEN}✓${NC} Api/dist/index.js exists"
else
  echo -e "${RED}✗${NC} Api/dist/index.js not found"
  FAILED=1
fi

# Check frontend artifacts
if [ -d "Web/dist/client/browser" ]; then
  echo -e "${GREEN}✓${NC} Frontend build artifacts exist"
else
  echo -e "${RED}✗${NC} Frontend build artifacts not found"
  FAILED=1
fi

# 7. Verify Gemini model configuration
echo ""
echo "7. Verifying AI model configuration..."
if grep -q "gemini-3-pro-image-preview" "Api/src/services/aiService.ts"; then
  echo -e "${GREEN}✓${NC} gemini-3-pro-image-preview model configured"
else
  echo -e "${RED}✗${NC} gemini-3-pro-image-preview model NOT found in aiService.ts"
  FAILED=1
fi
echo ""

# Summary
echo "========================================="
if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ PRE-DEPLOYMENT CHECKS PASSED${NC}"
  echo "========================================="
  echo ""
  echo "Ready to deploy!"
  exit 0
else
  echo -e "${RED}✗ PRE-DEPLOYMENT CHECKS FAILED${NC}"
  echo "========================================="
  echo ""
  echo "Please fix the issues above before deploying."
  exit 1
fi
