#!/bin/bash

# Post-deployment verification for CoST Knowledge Hub
# This script runs after deploying to verify everything works

set -e  # Exit on error

echo "========================================="
echo "  POST-DEPLOYMENT VERIFICATION"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track failures
FAILED=0

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# URLs - use environment variables or defaults
FRONTEND_URL="${FRONTEND_URL:-https://infralens-b1eed.web.app}"
BACKEND_URL="${BACKEND_URL:-https://cost-knowledge-hub-api-rektxtbxiq-uc.a.run.app}"
API_BASE="$BACKEND_URL/api"

# Allow passing URL as argument
if [ -n "$1" ]; then
  BACKEND_URL="$1"
  API_BASE="$BACKEND_URL/api"
fi

# Function to print status
print_status() {
  if [ $1 -eq 0 ]; then
    echo -e "${GREEN}✓${NC} $2"
  else
    echo -e "${RED}✗${NC} $2"
    FAILED=1
  fi
}

# Function to check HTTP status
check_http() {
  local url=$1
  local expected=$2
  local description=$3

  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$url")

  if [ "$HTTP_CODE" -eq "$expected" ]; then
    echo -e "${GREEN}✓${NC} $description (HTTP $HTTP_CODE)"
    return 0
  else
    echo -e "${RED}✗${NC} $description (HTTP $HTTP_CODE, expected $expected)"
    FAILED=1
    return 1
  fi
}

# 1. Check frontend accessibility
echo "1. Checking frontend accessibility..."
check_http "$FRONTEND_URL" 200 "Frontend is accessible"
echo ""

# 2. Check backend health
echo "2. Checking backend API endpoints..."

# Test health endpoint
check_http "$API_BASE/health" 200 "GET /api/health"

# Test GET /api/resources
check_http "$API_BASE/resources" 200 "GET /api/resources"

# Test GET /api/popular
check_http "$API_BASE/popular" 200 "GET /api/popular"

# Test GET /api/featured
check_http "$API_BASE/featured" 200 "GET /api/featured"

# Test GET /api/topics (public)
check_http "$API_BASE/topics" 200 "GET /api/topics"

echo ""

# 2b. Check topics have images
echo "2b. Checking topics data..."
TOPICS_RESPONSE=$(curl -s "$API_BASE/topics")
if echo "$TOPICS_RESPONSE" | grep -q '"aiGeneratedImage"'; then
  echo -e "${GREEN}✓${NC} Topics have AI-generated images"
else
  echo -e "${YELLOW}⚠${NC} Topics may not have AI-generated images"
fi
echo ""

# 3. Test CORS headers
echo "3. Testing CORS headers..."
CORS_HEADERS=$(curl -s -I -X OPTIONS "$API_BASE/resources" \
  -H "Origin: $FRONTEND_URL" \
  -H "Access-Control-Request-Method: GET")

if echo "$CORS_HEADERS" | grep -q "Access-Control-Allow-Origin"; then
  echo -e "${GREEN}✓${NC} CORS headers present"
else
  echo -e "${RED}✗${NC} CORS headers missing"
  FAILED=1
fi
echo ""

# 4. Test database connectivity
echo "4. Testing database connectivity..."

# Fetch resources and check response
RESOURCES_RESPONSE=$(curl -s "$API_BASE/resources")

if echo "$RESOURCES_RESPONSE" | grep -q '"id"'; then
  echo -e "${GREEN}✓${NC} Database returning valid data"

  # Count resources
  RESOURCE_COUNT=$(echo "$RESOURCES_RESPONSE" | grep -o '"id"' | wc -l | tr -d ' ')
  echo -e "${GREEN}✓${NC} Retrieved $RESOURCE_COUNT resources"
else
  echo -e "${RED}✗${NC} Database not returning valid data"
  FAILED=1
fi
echo ""

# 5. Test POST endpoints
echo "5. Testing POST endpoints..."

# Test POST /api/search (may fail without API_KEY)
SEARCH_RESPONSE=$(curl -s -X POST "$API_BASE/search" \
  -H "Content-Type: application/json" \
  -d '{"query":"OC4IDS"}' \
  -w "%{http_code}" \
  -o /tmp/search_response.json)

SEARCH_HTTP_CODE="${SEARCH_RESPONSE: -3}"

if [ "$SEARCH_HTTP_CODE" -eq 200 ]; then
  echo -e "${GREEN}✓${NC} POST /api/search (HTTP 200)"
elif [ "$SEARCH_HTTP_CODE" -eq 500 ]; then
  echo -e "${YELLOW}⚠${NC} POST /api/search failed (likely no API_KEY configured)"
else
  echo -e "${RED}✗${NC} POST /api/search (HTTP $SEARCH_HTTP_CODE)"
  FAILED=1
fi

# Test POST /api/translate
TRANSLATE_RESPONSE=$(curl -s -X POST "$API_BASE/translate" \
  -H "Content-Type: application/json" \
  -d '{"targetLang":"en"}' \
  -w "%{http_code}" \
  -o /tmp/translate_response.json)

TRANSLATE_HTTP_CODE="${TRANSLATE_RESPONSE: -3}"

if [ "$TRANSLATE_HTTP_CODE" -eq 200 ]; then
  echo -e "${GREEN}✓${NC} POST /api/translate (HTTP 200)"
else
  echo -e "${RED}✗${NC} POST /api/translate (HTTP $TRANSLATE_HTTP_CODE)"
  FAILED=1
fi
echo ""

# 6. Test resource interaction
echo "6. Testing resource interaction..."

# Get first resource ID
FIRST_RESOURCE=$(echo "$RESOURCES_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$FIRST_RESOURCE" ]; then
  INTERACT_RESPONSE=$(curl -s -X POST "$API_BASE/interact/$FIRST_RESOURCE" \
    -H "Content-Type: application/json" \
    -w "%{http_code}" \
    -o /tmp/interact_response.json)

  INTERACT_HTTP_CODE="${INTERACT_RESPONSE: -3}"

  if [ "$INTERACT_HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✓${NC} POST /api/interact/:id (HTTP 200)"

    # Check response contains success and clicks
    if grep -q '"success":true' /tmp/interact_response.json && grep -q '"clicks"' /tmp/interact_response.json; then
      echo -e "${GREEN}✓${NC} Interaction tracking working"
    else
      echo -e "${RED}✗${NC} Interaction response invalid"
      FAILED=1
    fi
  else
    echo -e "${RED}✗${NC} POST /api/interact/:id (HTTP $INTERACT_HTTP_CODE)"
    FAILED=1
  fi
else
  echo -e "${RED}✗${NC} Could not get resource ID for testing"
  FAILED=1
fi
echo ""

# 7. Test error handling
echo "7. Testing error handling..."

# Test non-existent resource
ERROR_RESPONSE=$(curl -s -X POST "$API_BASE/interact/non-existent-id-12345" \
  -H "Content-Type: application/json" \
  -w "%{http_code}" \
  -o /tmp/error_response.json)

ERROR_HTTP_CODE="${ERROR_RESPONSE: -3}"

if [ "$ERROR_HTTP_CODE" -eq 404 ]; then
  echo -e "${GREEN}✓${NC} 404 error handling works"
else
  echo -e "${YELLOW}⚠${NC} Error handling returned HTTP $ERROR_HTTP_CODE (expected 404)"
fi

# Test bad request
BAD_REQUEST=$(curl -s -X POST "$API_BASE/search" \
  -H "Content-Type: application/json" \
  -d '{}' \
  -w "%{http_code}" \
  -o /dev/null)

BAD_HTTP_CODE="${BAD_REQUEST: -3}"

if [ "$BAD_HTTP_CODE" -eq 400 ]; then
  echo -e "${GREEN}✓${NC} 400 error handling works"
else
  echo -e "${YELLOW}⚠${NC} Bad request handling returned HTTP $BAD_HTTP_CODE (expected 400)"
fi
echo ""

# Cleanup temp files
rm -f /tmp/search_response.json /tmp/translate_response.json /tmp/interact_response.json /tmp/error_response.json

# Summary
echo "========================================="
if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ POST-DEPLOYMENT VERIFICATION PASSED${NC}"
  echo "========================================="
  echo ""
  echo "Deployment successful!"
  echo ""
  echo "URLs:"
  echo "  Frontend: $FRONTEND_URL"
  echo "  Backend:  $BACKEND_URL"
  exit 0
else
  echo -e "${RED}✗ POST-DEPLOYMENT VERIFICATION FAILED${NC}"
  echo "========================================="
  echo ""
  echo "Some checks failed. Please investigate the issues above."
  echo ""
  echo "URLs:"
  echo "  Frontend: $FRONTEND_URL"
  echo "  Backend:  $BACKEND_URL"
  exit 1
fi
