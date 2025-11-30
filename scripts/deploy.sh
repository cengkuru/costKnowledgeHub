#!/bin/bash

# Full deployment script for CoST Knowledge Hub
# Runs pre-deployment checks, deploys to Cloud Run and GCS, then verifies
#
# Usage: ./scripts/deploy.sh [--skip-pre-tests] [--skip-post-tests]

set -e  # Exit on error

echo "========================================="
echo "  COST KNOWLEDGE HUB DEPLOYMENT"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Configuration
BACKEND_SERVICE="cost-knowledge-hub-api"
BACKEND_REGION="${GCP_REGION:-us-central1}"
GCP_PROJECT="${GCP_PROJECT_ID:-infralens-b1eed}"
GCS_BUCKET="${GCS_FRONTEND_BUCKET:-cost-knowledge-hub-frontend}"

# Parse arguments
SKIP_PRE_TESTS=false
SKIP_POST_TESTS=false

for arg in "$@"; do
  case $arg in
    --skip-pre-tests)
      SKIP_PRE_TESTS=true
      shift
      ;;
    --skip-post-tests)
      SKIP_POST_TESTS=true
      shift
      ;;
  esac
done

# Step 1: Pre-deployment checks
echo -e "${YELLOW}Step 1/4: Running pre-deployment checks...${NC}"
echo ""

if [ "$SKIP_PRE_TESTS" = false ]; then
  if ! "$SCRIPT_DIR/pre-deploy.sh"; then
    echo ""
    echo -e "${RED}Pre-deployment checks failed. Aborting deployment.${NC}"
    exit 1
  fi
  echo ""
  echo -e "${GREEN}Pre-deployment checks passed!${NC}"
else
  echo -e "${YELLOW}Skipping pre-deployment tests (--skip-pre-tests)${NC}"
fi
echo ""

# Step 2: Deploy backend to Cloud Run
echo -e "${YELLOW}Step 2/4: Deploying backend to Cloud Run...${NC}"
echo ""

cd "$PROJECT_ROOT/Api"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
  echo -e "${RED}gcloud CLI not found. Please install Google Cloud SDK.${NC}"
  exit 1
fi

# Set project
gcloud config set project "$GCP_PROJECT"

# Load environment variables from .env
if [ -f .env ]; then
  source .env
fi

# Build and deploy
echo "Building Docker image..."
gcloud builds submit --tag "gcr.io/$GCP_PROJECT/$BACKEND_SERVICE" --quiet

echo ""
echo "Deploying to Cloud Run..."
gcloud run deploy "$BACKEND_SERVICE" \
  --image "gcr.io/$GCP_PROJECT/$BACKEND_SERVICE" \
  --region "$BACKEND_REGION" \
  --platform managed \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --set-env-vars "NODE_ENV=production" \
  --quiet

# Get deployed URL
BACKEND_URL=$(gcloud run services describe "$BACKEND_SERVICE" \
  --region "$BACKEND_REGION" \
  --format 'value(status.url)')

echo ""
echo -e "${GREEN}Backend deployed to Cloud Run!${NC}"
echo "  URL: $BACKEND_URL"
echo ""

# Step 3: Deploy frontend to GCS
echo -e "${YELLOW}Step 3/4: Deploying frontend to GCS...${NC}"
echo ""

cd "$PROJECT_ROOT/Web"

# Check if gsutil is available
if ! command -v gsutil &> /dev/null; then
  echo -e "${RED}gsutil not found. Please install Google Cloud SDK.${NC}"
  exit 1
fi

# Upload to GCS
echo "Uploading to GCS bucket: $GCS_BUCKET..."
gsutil -m rsync -r -d dist/client/browser "gs://$GCS_BUCKET"

# Set cache headers
echo "Setting cache headers..."
gsutil -m setmeta -h "Cache-Control:public, max-age=31536000" "gs://$GCS_BUCKET/**/*.js" 2>/dev/null || true
gsutil -m setmeta -h "Cache-Control:public, max-age=31536000" "gs://$GCS_BUCKET/**/*.css" 2>/dev/null || true
gsutil -m setmeta -h "Cache-Control:no-cache" "gs://$GCS_BUCKET/index.html" 2>/dev/null || true

FRONTEND_URL="https://storage.googleapis.com/$GCS_BUCKET/index.html"

echo ""
echo -e "${GREEN}Frontend deployed to GCS!${NC}"
echo "  URL: $FRONTEND_URL"
echo ""

# Step 4: Post-deployment verification
echo -e "${YELLOW}Step 4/4: Running post-deployment verification...${NC}"
echo ""

if [ "$SKIP_POST_TESTS" = false ]; then
  # Wait a few seconds for deployment to propagate
  echo "Waiting 10 seconds for deployment to propagate..."
  sleep 10
  echo ""

  cd "$PROJECT_ROOT"

  # Run smoke tests against deployed API
  echo "Running smoke tests against $BACKEND_URL..."
  if npx ts-node scripts/post-deploy-smoke-tests.ts "$BACKEND_URL"; then
    echo ""
    echo -e "${GREEN}Smoke tests passed!${NC}"
  else
    echo ""
    echo -e "${YELLOW}Smoke tests had some issues. Please check the output above.${NC}"
    echo -e "${YELLOW}The deployment may still be successful, but some features might not be working.${NC}"
  fi
else
  echo -e "${YELLOW}Skipping post-deployment tests (--skip-post-tests)${NC}"
fi

echo ""
echo "========================================="
echo -e "${GREEN}✓ DEPLOYMENT COMPLETE!${NC}"
echo "========================================="
echo ""
echo "Your application is now live:"
echo ""
echo "  Frontend: $FRONTEND_URL"
echo "  Backend:  $BACKEND_URL"
echo ""
echo "Next steps:"
echo "  - Test the application manually"
echo "  - Monitor Cloud Run logs: gcloud run services logs read $BACKEND_SERVICE --region $BACKEND_REGION"
echo "  - View GCS bucket: gsutil ls gs://$GCS_BUCKET"
echo ""

exit 0
