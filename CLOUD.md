# Cloud Deployment Guide

## CoST Knowledge Hub - GCP & Firebase Deployment

### Project Information

- **GCP Project ID:** `infralens-b1eed`
- **Firebase Project:** `infralens-b1eed`
- **Frontend URL:** https://infralens-b1eed.web.app
- **Backend URL:** https://cost-knowledge-hub-api-rektxtbxiq-uc.a.run.app/api
- **Region:** us-central1

---

## Prerequisites

### Required Tools

```bash
# Google Cloud SDK
gcloud --version

# Firebase CLI
firebase --version

# Node.js 20+
node --version

# Docker (for Cloud Run)
docker --version
```

### Authentication

```bash
# Authenticate with Google Cloud
gcloud auth login

# Set active project
gcloud config set project infralens-b1eed

# Authenticate with Firebase
firebase login
```

---

## CRITICAL: Always Run Pre & Post Deployment Scripts

**BEFORE ANY DEPLOYMENT:**

```bash
# Run pre-deployment tests and checks
./scripts/pre-deploy.sh
```

This script:
- ✓ Validates environment variables
- ✓ Runs server tests (56 tests)
- ✓ Builds server (TypeScript → JavaScript)
- ✓ Runs client tests (Angular)
- ✓ Builds client (production optimized)
- ✓ Verifies build artifacts exist

**AFTER EVERY DEPLOYMENT:**

```bash
# Run post-deployment verification
./scripts/post-deploy.sh
```

This script:
- ✓ Tests frontend accessibility
- ✓ Tests backend API health
- ✓ Validates CORS headers
- ✓ Tests database connectivity
- ✓ Tests all API endpoints
- ✓ Validates error handling

---

## Full Deployment Process

### Option 1: Automated Deployment (Recommended)

```bash
# Deploy everything with automated testing
./scripts/deploy.sh
```

This script:
1. Runs `pre-deploy.sh`
2. Deploys backend to Cloud Run
3. Deploys frontend to Firebase Hosting
4. Runs `post-deploy.sh`
5. Reports success/failure

### Option 2: Manual Deployment

**Backend (Cloud Run):**

```bash
# 1. Run pre-deployment checks
./scripts/pre-deploy.sh

# 2. Deploy backend
cd server
gcloud run deploy cost-knowledge-hub-api \
  --source . \
  --region us-central1 \
  --env-vars-file env.yaml \
  --allow-unauthenticated \
  --platform managed

# 3. Verify deployment
./scripts/post-deploy.sh
```

**Frontend (Firebase Hosting):**

```bash
# 1. Build Angular app
cd client
npm run build

# 2. Deploy to Firebase
cd ..
firebase deploy --only hosting

# 3. Verify deployment
./scripts/post-deploy.sh
```

---

## Environment Variables

### Server Environment (Cloud Run)

Located in `/server/env.yaml`:

```yaml
NODE_ENV: "production"
MONGODB_URI: "mongodb+srv://[CONNECTION_STRING]"
DB_NAME: "infrascope"
API_KEY: "[GEMINI_API_KEY]"
XAI_API_KEY: "[XAI_API_KEY]"
GEMINI_API_KEY: "[GEMINI_API_KEY]"
EXA_SEARCH_API_KEY: "[EXA_API_KEY]"
ALLOWED_ORIGINS: "https://infralens-b1eed.web.app,https://infralens-b1eed.firebaseapp.com,http://localhost:4200"
```

**Update Environment Variables:**

```bash
cd server
gcloud run services update cost-knowledge-hub-api \
  --region us-central1 \
  --env-vars-file env.yaml
```

### Client Environment

Located in `/client/src/environments/environment.prod.ts`:

```typescript
export const environment = {
  production: true,
  apiBaseUrl: 'https://cost-knowledge-hub-api-rektxtbxiq-uc.a.run.app/api'
};
```

**After changing client environment:**
1. Rebuild: `cd client && npm run build`
2. Redeploy: `firebase deploy --only hosting`
3. Verify: `./scripts/post-deploy.sh`

---

## Monitoring & Logs

### Cloud Run Logs

```bash
# View real-time logs
gcloud run services logs read cost-knowledge-hub-api \
  --region us-central1 \
  --follow

# View recent logs
gcloud run services logs read cost-knowledge-hub-api \
  --region us-central1 \
  --limit 50
```

### Cloud Run Status

```bash
# Service details
gcloud run services describe cost-knowledge-hub-api \
  --region us-central1

# Service URL
gcloud run services describe cost-knowledge-hub-api \
  --region us-central1 \
  --format="value(status.url)"
```

### Firebase Hosting

```bash
# Hosting status
firebase hosting:channel:list

# View deployment history
firebase hosting:releases:list
```

---

## Rollback Procedures

### Rollback Backend (Cloud Run)

```bash
# List revisions
gcloud run revisions list \
  --service cost-knowledge-hub-api \
  --region us-central1

# Rollback to specific revision
gcloud run services update-traffic cost-knowledge-hub-api \
  --region us-central1 \
  --to-revisions [REVISION-NAME]=100
```

### Rollback Frontend (Firebase)

```bash
# List releases
firebase hosting:releases:list

# View specific release
firebase hosting:clone [SOURCE_SITE_ID]:[SOURCE_CHANNEL] [DESTINATION_CHANNEL]
```

---

## Database Management

### MongoDB Atlas Connection

```bash
# Connection string in env.yaml
MONGODB_URI: "mongodb+srv://michael_db_user:***@infralens.zoul60d.mongodb.net/"
DB_NAME: "infrascope"
```

### Database Operations

```bash
# Connect via MongoDB shell
mongosh "mongodb+srv://infralens.zoul60d.mongodb.net/infrascope" --username michael_db_user

# Backup database
mongodump --uri="mongodb+srv://[CONNECTION_STRING]/infrascope" --out=./backup

# Restore database
mongorestore --uri="mongodb+srv://[CONNECTION_STRING]/infrascope" ./backup/infrascope
```

---

## Troubleshooting

### Frontend Not Loading

1. Check Firebase Hosting status
2. Clear browser cache
3. Verify `firebase.json` public directory
4. Check browser console for errors

```bash
# Redeploy frontend
cd client && npm run build && cd .. && firebase deploy --only hosting
./scripts/post-deploy.sh
```

### Backend API Errors

1. Check Cloud Run logs
2. Verify environment variables
3. Test API endpoints directly

```bash
# View logs
gcloud run services logs read cost-knowledge-hub-api --region us-central1

# Test API
curl https://cost-knowledge-hub-api-rektxtbxiq-uc.a.run.app/api/resources

# Redeploy backend
cd server && gcloud run deploy cost-knowledge-hub-api --source . --region us-central1
./scripts/post-deploy.sh
```

### CORS Issues

1. Check `ALLOWED_ORIGINS` environment variable
2. Verify frontend URL matches allowed origins
3. Check server CORS configuration

```bash
# Test CORS headers
curl -I -H "Origin: https://infralens-b1eed.web.app" \
  https://cost-knowledge-hub-api-rektxtbxiq-uc.a.run.app/api/resources
```

### Database Connection Errors

1. Verify MongoDB connection string
2. Check database credentials
3. Verify IP whitelist (0.0.0.0/0 for Cloud Run)
4. Test connection from server

```bash
# Check logs for connection errors
gcloud run services logs read cost-knowledge-hub-api --region us-central1 | grep -i "mongo"
```

---

## Cost Optimization

### Cloud Run

- **Minimum instances:** 0 (no idle cost)
- **Maximum instances:** 10
- **CPU:** 1 vCPU
- **Memory:** 512 MB
- **Timeout:** 300s

```bash
# Update scaling settings
gcloud run services update cost-knowledge-hub-api \
  --region us-central1 \
  --min-instances 0 \
  --max-instances 10 \
  --cpu 1 \
  --memory 512Mi \
  --timeout 300
```

### Firebase Hosting

- Free tier: 10GB storage, 360MB/day transfer
- Current usage: ~244KB per deployment
- Expected: $0/month (within free tier)

---

## Security Best Practices

1. **Never commit secrets to git**
   - Use `.gitignore` for `.env` files
   - Store secrets in GCP Secret Manager

2. **Rotate API keys regularly**
   - Update `env.yaml`
   - Redeploy with new keys

3. **Monitor access logs**
   - Review Cloud Run logs weekly
   - Set up alerts for errors

4. **Use least privilege IAM**
   - Service accounts for Cloud Run
   - Minimal Firebase permissions

---

## CI/CD Integration (Future)

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to GCP

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Pre-deployment tests
        run: ./scripts/pre-deploy.sh
      - name: Deploy
        run: ./scripts/deploy.sh
      - name: Post-deployment verification
        run: ./scripts/post-deploy.sh
```

---

## Quick Reference

```bash
# Deploy everything
./scripts/deploy.sh

# Deploy backend only
cd server && gcloud run deploy cost-knowledge-hub-api --source . --region us-central1

# Deploy frontend only
cd client && npm run build && cd .. && firebase deploy --only hosting

# View backend logs
gcloud run services logs read cost-knowledge-hub-api --region us-central1 --follow

# Test deployments
./scripts/post-deploy.sh

# Run tests locally
cd server && npm test
cd client && npm test
```

---

## Support & Resources

- **GCP Console:** https://console.cloud.google.com/run/detail/us-central1/cost-knowledge-hub-api?project=infralens-b1eed
- **Firebase Console:** https://console.firebase.google.com/project/infralens-b1eed/overview
- **Documentation:** See `TESTING.md` and `CHANGELOG.md`

---

**Last Updated:** 2025-11-20
