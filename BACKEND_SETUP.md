# CoST Knowledge Hub - Backend Setup Guide

## Overview

The backend system provides a complete content management system for the CoST Knowledge Hub with the following features:

- **Firebase Authentication**: Email/password authentication with password reset and remember me functionality
- **Admin Dashboard**: Intuitive admin interface with header, sidebar, and footer navigation
- **Resource Management**: Full CRUD operations for managing knowledge resources
- **File Storage**: Firebase Storage integration for uploading documents (PDFs, Excel, images, etc.)
- **Document Tracking**: Analytics for page views and downloads
- **Contextual Validation**: Field validation based on resource type
- **Security**: Role-based access control with admin-only write access

## Architecture

### Services

1. **AuthService** (`src/app/core/services/auth.service.ts`)
   - User authentication (sign in, sign up, sign out)
   - Password reset functionality
   - Session persistence (remember me)
   - User state management

2. **FirestoreService** (`src/app/core/services/firestore.service.ts`)
   - Resource CRUD operations
   - Publishing/unpublishing resources
   - Search and filtering
   - View/download tracking

3. **StorageService** (`src/app/core/services/storage.service.ts`)
   - File upload with progress tracking
   - File metadata management
   - Supported formats: PDF, Word, Excel, CSV, Images, ZIP
   - Automatic file organization by resource type

4. **AnalyticsService** (`src/app/core/services/analytics.service.ts`)
   - Page view tracking
   - Download tracking
   - Search query analytics
   - Resource performance metrics

### Data Models

#### Resource Model
```typescript
{
  id: string;
  title: MultiLanguageText;
  description: MultiLanguageText;
  type: ResourceType;
  status: 'draft' | 'published' | 'unpublished';
  featured: boolean;
  
  // File management
  fileLinks?: { en?: string, es?: string, pt?: string };
  externalLink?: string;  // For CoST IS website resources
  fileSize?: string;
  format?: string;
  
  // Metadata
  createdBy: string;
  createdAt: Timestamp;
  publishedBy?: string;
  publishedAt?: Timestamp;
  
  // Analytics
  views?: number;
  downloads?: number;
  
  // Assurance report specific
  assuranceData?: {
    projectsReviewed: number;
    totalInvestment: string;
    sectors: string[];
    disclosureRate: number;
    // ... more fields
  };
}
```

## Setup Instructions

### 1. Firebase Project Setup

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Your project `knowledgehub-2ed2f` is already created
3. Enable the following services:
   - Authentication (Email/Password provider)
   - Firestore Database
   - Storage
   - Analytics

### 2. Create First Admin User

1. First, create a regular user account:
   ```bash
   # Go to http://localhost:4200/login
   # Click "Sign Up" and create an account with your admin email
   ```

2. Set the admin email in Firebase Functions config:
   ```bash
   firebase functions:config:set admin.email="your-admin@example.com"
   ```

3. Deploy the functions:
   ```bash
   cd functions
   npm install
   npm run build
   firebase deploy --only functions
   ```

4. Make the user an admin by visiting:
   ```
   https://us-central1-knowledgehub-2ed2f.cloudfunctions.net/createFirstAdmin
   ```

5. **IMPORTANT**: After creating the first admin, disable the `createFirstAdmin` function by commenting it out in `functions/src/admin.ts` and redeploying.

### 3. Deploy Security Rules

```bash
# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Storage rules
firebase deploy --only storage:rules
```

### 4. Access Admin Dashboard

1. Go to http://localhost:4200/login
2. Sign in with your admin credentials
3. You'll be redirected to the admin dashboard at http://localhost:4200/admin

## Admin Dashboard Features

### Dashboard Overview
- Total resources count
- Published vs unpublished status
- View and download statistics
- Recent activity feed
- Resources by type breakdown

### Resource Management
- **List View**: Search, filter by status/type, pagination
- **Create/Edit**: Multi-language support, file upload, metadata
- **Publishing**: Toggle between published/unpublished states
- **Featured**: Mark resources as featured for homepage display
- **Delete**: Remove resources (with confirmation)

### File Management
- **Supported Formats**: PDF, Word, Excel, CSV, PNG, JPG, ZIP
- **Max File Size**: 50MB for documents, 5MB for images
- **Organization**: Files automatically organized by type and year
- **External URLs**: Support for linking to CoST IS website resources

### Analytics
- **Page Views**: Track resource page visits
- **Downloads**: Monitor file download counts
- **Search Terms**: Analyze popular search queries
- **User Engagement**: Time on page, bounce rate

## Resource Types & Fields

### Common Fields (All Types)
- Title (multi-language)
- Description (multi-language)
- Tags
- Country/Region
- Language
- Publication date
- File upload or external URL

### Assurance Reports
Additional fields:
- Projects reviewed count
- Total investment value
- Sectors covered
- Disclosure rate percentage
- Time/cost overrun data
- Key findings
- Recommendations

### Implementation Guides
Additional fields:
- Difficulty level
- Implementation timeframe
- Target audience
- Prerequisites

### Case Studies
Additional fields:
- Impact metrics (savings, projects affected)
- Success factors
- Lessons learned

## API Endpoints (Cloud Functions)

### Admin Management
- `setAdminClaim`: Add/remove admin privileges (admin only)
- `createFirstAdmin`: One-time setup for first admin

## Testing

### Test Authentication Flow
1. Sign up new user
2. Sign in with email/password
3. Test "Remember Me" functionality
4. Test password reset flow
5. Sign out

### Test Resource Management
1. Create draft resource
2. Upload file
3. Add metadata
4. Publish resource
5. View on public site
6. Track analytics

### Test File Upload
1. Upload PDF document
2. Upload Excel spreadsheet
3. Upload image for thumbnail
4. Test file size limits
5. Verify storage organization

## Production Deployment

1. Update environment files:
   ```typescript
   // src/environments/environment.prod.ts
   export const environment = {
     production: true,
     firebaseConfig: { /* ... */ }
   };
   ```

2. Build for production:
   ```bash
   npm run build
   ```

3. Deploy to Firebase Hosting:
   ```bash
   firebase deploy
   ```

## Security Considerations

1. **Authentication**: Only authenticated admins can modify resources
2. **Public Access**: Only published resources are visible to public
3. **File Access**: Storage rules prevent unauthorized file access
4. **Admin Claims**: Custom claims system for admin privileges
5. **Input Validation**: All inputs validated on both frontend and backend

## Troubleshooting

### User Can't Access Admin
- Verify user has admin claim: Check Firebase Auth console
- Re-run `setAdminClaim` function if needed

### Files Not Uploading
- Check Storage rules are deployed
- Verify file size and type restrictions
- Check browser console for errors

### Resources Not Showing
- Ensure resources have `status: 'published'`
- Check Firestore rules allow read access
- Verify data structure matches model

## Future Enhancements

1. **Bulk Operations**: Import/export multiple resources
2. **Version Control**: Track resource versions
3. **Workflow**: Approval process for publishing
4. **Collaboration**: Multiple admin roles
5. **Advanced Analytics**: Custom reports and dashboards
6. **Search**: Full-text search with Algolia/ElasticSearch
7. **CDN**: CloudFlare for global file distribution