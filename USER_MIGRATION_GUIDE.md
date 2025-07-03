# User Migration Guide

## Overview

This guide explains how to migrate existing Firebase Auth users to Firestore to ensure proper synchronization between authentication and user metadata storage.

## Problem Context

The Knowledge Hub uses:
- **Firebase Auth**: For user authentication (login/signup)
- **Firestore**: For user metadata and profile information

Previously, users could sign up via Firebase Auth but wouldn't automatically get Firestore profiles, causing the admin user management page to show 0 users despite having authenticated users.

## Solution Implemented

1. **Automatic Profile Creation**: New users now automatically get Firestore profiles via Firebase Auth triggers
2. **Migration Tools**: Existing users can be migrated via the admin panel
3. **Synchronization Status**: Real-time sync status monitoring

## Migration Process

### Prerequisites

1. ✅ Firebase Functions deployed with user sync capabilities
2. ✅ Admin user account with proper permissions
3. ✅ Access to the admin panel

### Step-by-Step Migration

#### 1. Start the Application

```bash
npm start
```

Navigate to: `http://localhost:4200`

#### 2. Sign In as Admin

- Click "Login" in the top navigation
- Use admin credentials to sign in
- Ensure you have admin role permissions

#### 3. Access User Management

- Click "Admin Dashboard" in the navigation (appears after login)
- Navigate to "Users" in the admin sidebar

#### 4. Check Migration Status

You should see a migration status panel showing:
- **Firebase Auth users**: Total authenticated users
- **Firestore users**: Users with metadata profiles
- **Sync rate**: Percentage of users synced
- **Unsynced users**: Users needing migration

#### 5. Perform Migration

If unsynced users exist, you'll see a yellow migration panel:

1. Click **"Sync All Users"** button
2. Wait for the migration process to complete
3. The system will:
   - Fetch all Firebase Auth users
   - Create Firestore profiles for missing users
   - Apply default roles and metadata
   - Log migration activities

#### 6. Verify Migration

After migration:
- User counts should match between Auth and Firestore
- Sync rate should be 100%
- All users should appear in the user management table

## Migration Details

### What Gets Migrated

For each Firebase Auth user, the system creates a Firestore document with:

```typescript
{
  uid: string;                    // Firebase Auth UID
  email: string;                  // User email
  displayName?: string;           // Display name if available
  photoURL?: string;              // Profile photo if available
  role: 'viewer';                 // Default role (can be changed later)
  status: 'active';               // Default status
  createdAt: Timestamp;           // Original creation time from Auth
  lastLoginAt?: Timestamp;        // Last sign-in time if available
  syncedAt: Timestamp;            // Migration timestamp
  metadata: {};                   // Empty metadata object for future use
}
```

### Default Values

- **Role**: New users get `viewer` role by default
- **Status**: New users get `active` status
- **Metadata**: Empty object that can be populated later

### Error Handling

- Migration continues even if individual users fail
- Failed users are logged for manual review
- Users can be re-synced individually if needed

## Automated Migration Script

A Node.js script is available for automated migration (requires admin authentication):

```bash
node migrate-users.js
```

However, manual migration via the admin panel is recommended for better visibility and control.

## Post-Migration

### Automatic Sync for New Users

After migration, the `onUserCreate` Firebase Auth trigger ensures:
- New signups automatically get Firestore profiles
- No manual intervention required
- 100% sync rate maintained going forward

### User Role Management

After migration, you can:
- Update user roles via the admin panel
- Assign admin/editor permissions as needed
- Suspend or activate users

### Monitoring

The admin dashboard provides:
- Real-time user activity tracking
- User statistics and analytics
- Sync status monitoring

## Troubleshooting

### Migration Panel Not Visible

**Issue**: No migration panel appears in User Management

**Causes**:
- All users are already synced (100% sync rate)
- Not signed in as admin user
- Functions not deployed

**Solution**:
- Verify admin permissions
- Check migration status manually
- Redeploy functions if needed

### Migration Fails

**Issue**: "Sync All Users" button fails or shows errors

**Causes**:
- Insufficient permissions
- Network connectivity issues
- Function timeout for large user bases

**Solutions**:
- Verify admin custom claims are set
- Retry migration in smaller batches
- Check Firebase Function logs for details

### Partial Migration

**Issue**: Some users migrated but sync rate < 100%

**Causes**:
- Invalid user data in Firebase Auth
- Firestore write permission issues
- Function execution limits

**Solutions**:
- Use "Refresh Status" to get current state
- Retry migration for remaining users
- Sync individual users manually if needed

### Function Deployment Issues

**Issue**: Migration functions not available

**Solution**:
```bash
cd functions
npm run build
npm run deploy
```

Verify functions are deployed:
```bash
firebase functions:list | grep -E "(migrate|sync|listAll)"
```

## Security Considerations

- Only admin users can perform migration
- User data is encrypted in transit and at rest
- No sensitive information is logged
- Migration respects existing user privacy settings

## Performance Notes

- Migration processes users in batches (default: 100)
- Large user bases may require multiple migration runs
- Functions have timeout limits (9 minutes for HTTP functions)
- Migration status is cached for 5 minutes to reduce load

## Support

If you encounter issues during migration:

1. Check Firebase Function logs in the Firebase Console
2. Verify admin permissions are properly set
3. Ensure all required Firebase APIs are enabled
4. Contact the development team with specific error messages

## Success Indicators

Migration is successful when:
- ✅ Sync rate shows 100%
- ✅ User management table shows all authenticated users
- ✅ No migration panel is visible (all users synced)
- ✅ New user signups automatically create profiles