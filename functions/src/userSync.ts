import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onRequest } from 'firebase-functions/v2/https';
import { beforeUserCreated } from 'firebase-functions/v2/identity';
import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * Interface for user data synchronization
 */
interface SyncUserData {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  emailVerified: boolean;
  disabled: boolean;
  metadata: {
    creationTime: string;
    lastSignInTime?: string;
    lastRefreshTime?: string;
  };
  customClaims?: any;
}

/**
 * Interface for Firestore user document
 */
interface FirestoreUser {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: 'admin' | 'editor' | 'viewer';
  status: 'active' | 'suspended' | 'pending';
  createdAt: Timestamp;
  lastLoginAt?: Timestamp;
  lastActivityAt?: Timestamp;
  syncedAt: Timestamp;
  metadata?: {
    department?: string;
    position?: string;
    phone?: string;
    location?: string;
  };
}

/**
 * Get all Firebase Auth users with pagination
 * Only accessible by admin users
 */
export const listAllAuthUsers = onCall(async (request) => {
  // Check authentication
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'The function must be called while authenticated.'
    );
  }

  // Check admin permissions
  if (!request.auth.token.admin) {
    throw new HttpsError(
      'permission-denied',
      'Only admins can list all users.'
    );
  }

  const { pageToken, maxResults = 1000 } = request.data;

  try {
    logger.info('Listing Auth users', { 
      requestedBy: request.auth.uid, 
      maxResults,
      pageToken: pageToken ? 'provided' : 'none'
    });

    const listUsersResult = await admin.auth().listUsers(maxResults, pageToken);
    
    const users: SyncUserData[] = listUsersResult.users.map(userRecord => ({
      uid: userRecord.uid,
      email: userRecord.email || '',
      displayName: userRecord.displayName,
      photoURL: userRecord.photoURL,
      emailVerified: userRecord.emailVerified,
      disabled: userRecord.disabled,
      metadata: {
        creationTime: userRecord.metadata.creationTime,
        lastSignInTime: userRecord.metadata.lastSignInTime,
        lastRefreshTime: userRecord.metadata.lastRefreshTime
      },
      customClaims: userRecord.customClaims
    }));

    // Get sync status for each user by checking Firestore
    const firestore = admin.firestore();
    const syncStatuses = await Promise.all(
      users.map(async (user) => {
        try {
          const userDoc = await firestore.collection('users').doc(user.uid).get();
          return {
            uid: user.uid,
            syncedToFirestore: userDoc.exists,
            lastSyncedAt: userDoc.exists ? userDoc.data()?.syncedAt : null
          };
        } catch (error) {
          logger.error(`Error checking sync status for user ${user.uid}:`, error);
          return {
            uid: user.uid,
            syncedToFirestore: false,
            lastSyncedAt: null
          };
        }
      })
    );

    // Combine user data with sync status
    const usersWithSyncStatus = users.map(user => {
      const syncStatus = syncStatuses.find(s => s.uid === user.uid);
      return {
        ...user,
        syncStatus: syncStatus
      };
    });

    logger.info('Successfully listed Auth users', { 
      count: users.length,
      nextPageToken: listUsersResult.pageToken || null
    });

    return {
      users: usersWithSyncStatus,
      pageToken: listUsersResult.pageToken || null,
      totalCount: users.length
    };
  } catch (error) {
    logger.error('Error listing Auth users:', error);
    throw new HttpsError(
      'internal',
      'Unable to list users.'
    );
  }
});

/**
 * Sync a single Firebase Auth user to Firestore
 * Creates or updates the user document with Auth data
 */
export const syncAuthUserToFirestore = onCall(async (request) => {
  // Check authentication
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'The function must be called while authenticated.'
    );
  }

  // Check admin permissions
  if (!request.auth.token.admin) {
    throw new HttpsError(
      'permission-denied',
      'Only admins can sync users.'
    );
  }

  const { uid } = request.data;

  if (!uid) {
    throw new HttpsError(
      'invalid-argument',
      'User UID is required.'
    );
  }

  try {
    logger.info('Syncing user to Firestore', { 
      targetUid: uid,
      requestedBy: request.auth.uid 
    });

    // Get user from Firebase Auth
    const userRecord = await admin.auth().getUser(uid);
    
    // Get existing Firestore document if it exists
    const firestore = admin.firestore();
    const userDocRef = firestore.collection('users').doc(uid);
    const existingDoc = await userDocRef.get();
    const existingData = existingDoc.exists ? existingDoc.data() : null;

    // Determine role from custom claims or default to viewer
    let role: 'admin' | 'editor' | 'viewer' = 'viewer';
    if (userRecord.customClaims?.admin) {
      role = 'admin';
    } else if (userRecord.customClaims?.editor) {
      role = 'editor';
    }

    // Prepare Firestore user document
    const firestoreUserData: FirestoreUser = {
      uid: userRecord.uid,
      email: userRecord.email || '',
      displayName: userRecord.displayName || existingData?.displayName,
      photoURL: userRecord.photoURL || existingData?.photoURL,
      role: existingData?.role || role, // Preserve existing role if set
      status: userRecord.disabled ? 'suspended' : (existingData?.status || 'active'),
      createdAt: existingData?.createdAt || Timestamp.fromDate(new Date(userRecord.metadata.creationTime)),
      lastLoginAt: userRecord.metadata.lastSignInTime ? 
        Timestamp.fromDate(new Date(userRecord.metadata.lastSignInTime)) : 
        existingData?.lastLoginAt,
      lastActivityAt: existingData?.lastActivityAt,
      syncedAt: Timestamp.now(),
      metadata: existingData?.metadata || {} // Preserve existing metadata
    };

    // Update or create the document
    await userDocRef.set(firestoreUserData, { merge: true });

    logger.info('User synced successfully', { 
      uid,
      email: userRecord.email,
      wasExisting: existingDoc.exists
    });

    return {
      success: true,
      uid,
      email: userRecord.email,
      wasExisting: existingDoc.exists,
      syncedAt: firestoreUserData.syncedAt
    };
  } catch (error) {
    logger.error('Error syncing user to Firestore:', error);
    
    if (error && typeof error === 'object' && 'code' in error && error.code === 'auth/user-not-found') {
      throw new HttpsError(
        'not-found',
        'User not found in Firebase Auth.'
      );
    }
    
    throw new HttpsError(
      'internal',
      'Unable to sync user.'
    );
  }
});

/**
 * Migrate all Firebase Auth users to Firestore in batches
 * This is a heavy operation and should be used carefully
 */
export const migrateAllUsers = onCall(async (request) => {
  // Check authentication
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'The function must be called while authenticated.'
    );
  }

  // Check admin permissions
  if (!request.auth.token.admin) {
    throw new HttpsError(
      'permission-denied',
      'Only admins can migrate all users.'
    );
  }

  const { batchSize = 100, startAfterUid } = request.data;

  try {
    logger.info('Starting bulk user migration', { 
      requestedBy: request.auth.uid,
      batchSize,
      startAfterUid: startAfterUid || 'none'
    });

    let pageToken = startAfterUid;
    let totalProcessed = 0;
    let totalSuccessful = 0;
    let totalErrors = 0;
    const errors: any[] = [];

    // Get users in batches
    const listUsersResult = await admin.auth().listUsers(batchSize, pageToken);
    const firestore = admin.firestore();

    // Process each user
    for (const userRecord of listUsersResult.users) {
      try {
        // Check if user already exists in Firestore
        const userDocRef = firestore.collection('users').doc(userRecord.uid);
        const existingDoc = await userDocRef.get();
        const existingData = existingDoc.exists ? existingDoc.data() : null;

        // Determine role from custom claims
        let role: 'admin' | 'editor' | 'viewer' = 'viewer';
        if (userRecord.customClaims?.admin) {
          role = 'admin';
        } else if (userRecord.customClaims?.editor) {
          role = 'editor';
        }

        // Prepare user data
        const firestoreUserData: FirestoreUser = {
          uid: userRecord.uid,
          email: userRecord.email || '',
          displayName: userRecord.displayName || existingData?.displayName,
          photoURL: userRecord.photoURL || existingData?.photoURL,
          role: existingData?.role || role,
          status: userRecord.disabled ? 'suspended' : (existingData?.status || 'active'),
          createdAt: existingData?.createdAt || Timestamp.fromDate(new Date(userRecord.metadata.creationTime)),
          lastLoginAt: userRecord.metadata.lastSignInTime ? 
            Timestamp.fromDate(new Date(userRecord.metadata.lastSignInTime)) : 
            existingData?.lastLoginAt,
          lastActivityAt: existingData?.lastActivityAt,
          syncedAt: Timestamp.now(),
          metadata: existingData?.metadata || {}
        };

        // Save to Firestore
        await userDocRef.set(firestoreUserData, { merge: true });
        totalSuccessful++;
        
        logger.info('User migrated', { 
          uid: userRecord.uid, 
          email: userRecord.email 
        });
      } catch (userError) {
        totalErrors++;
        errors.push({
          uid: userRecord.uid,
          email: userRecord.email,
          error: userError instanceof Error ? userError.message : 'Unknown error'
        });
        
        logger.error('Error migrating user', {
          uid: userRecord.uid,
          email: userRecord.email,
          error: userError
        });
      }
      
      totalProcessed++;
    }

    const result = {
      success: true,
      totalProcessed,
      totalSuccessful,
      totalErrors,
      errors: errors.slice(0, 10), // Return max 10 errors for debugging
      hasMoreUsers: !!listUsersResult.pageToken,
      nextPageToken: listUsersResult.pageToken || null
    };

    logger.info('Bulk migration completed', result);
    return result;
  } catch (error) {
    logger.error('Error during bulk migration:', error);
    throw new HttpsError(
      'internal',
      'Unable to complete bulk migration.'
    );
  }
});

/**
 * Get migration status - shows counts of Auth users vs Firestore users
 */
export const getMigrationStatus = onCall(async (request) => {
  // Check authentication
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'The function must be called while authenticated.'
    );
  }

  // Check admin permissions
  if (!request.auth.token.admin) {
    throw new HttpsError(
      'permission-denied',
      'Only admins can check migration status.'
    );
  }

  try {
    logger.info('Getting migration status', { requestedBy: request.auth.uid });

    // Count Firebase Auth users
    let authUserCount = 0;
    let pageToken: string | undefined;
    
    do {
      const listResult = await admin.auth().listUsers(1000, pageToken);
      authUserCount += listResult.users.length;
      pageToken = listResult.pageToken;
    } while (pageToken);

    // Count Firestore users
    const firestore = admin.firestore();
    const firestoreSnapshot = await firestore.collection('users').count().get();
    const firestoreUserCount = firestoreSnapshot.data().count;

    // Calculate sync rate
    const syncRate = authUserCount > 0 ? (firestoreUserCount / authUserCount) * 100 : 0;

    const status = {
      authUserCount,
      firestoreUserCount,
      syncedCount: firestoreUserCount,
      unsyncedCount: authUserCount - firestoreUserCount,
      syncRate: Math.round(syncRate * 100) / 100,
      needsMigration: authUserCount > firestoreUserCount
    };

    logger.info('Migration status calculated', status);
    return status;
  } catch (error) {
    logger.error('Error getting migration status:', error);
    throw new HttpsError(
      'internal',
      'Unable to get migration status.'
    );
  }
});

/**
 * Firebase Auth trigger: Automatically create Firestore user profile when new user signs up
 * This ensures immediate sync between Firebase Auth and Firestore without manual intervention
 */
export const onUserCreate = beforeUserCreated(async (event) => {
  const { uid, email, displayName, photoURL, emailVerified } = event.data;
  
  try {
    logger.info('Auto-creating user profile for new signup', { 
      uid, 
      email: email || 'no-email',
      displayName: displayName || 'no-display-name'
    });

    const firestore = admin.firestore();
    const userDocRef = firestore.collection('users').doc(uid);

    // Create default user profile in Firestore
    const defaultUserData: FirestoreUser = {
      uid,
      email: email || '',
      displayName: displayName || '',
      photoURL: photoURL || '',
      role: 'viewer', // Default role for new users
      status: 'active', // New users start as active
      createdAt: Timestamp.now(),
      lastLoginAt: Timestamp.now(),
      syncedAt: Timestamp.now(),
      metadata: {
        // Initialize empty metadata - can be filled later
        department: '',
        position: '',
        phone: '',
        location: ''
      }
    };

    // Create the user document
    await userDocRef.set(defaultUserData);

    logger.info('User profile created successfully', { 
      uid,
      email: email || 'no-email',
      role: 'viewer',
      status: 'active'
    });

    // Log activity for the new user creation
    const activityRef = firestore.collection('user_activity').doc();
    await activityRef.set({
      userId: uid,
      action: 'user_signup',
      timestamp: Timestamp.now(),
      metadata: {
        email: email || '',
        displayName: displayName || '',
        autoCreated: true
      }
    });

    logger.info('User signup activity logged', { uid });

  } catch (error) {
    logger.error('Error auto-creating user profile:', error, {
      uid,
      email: email || 'no-email'
    });
    
    // Don't throw error - we don't want to block user signup
    // The user can still be synced manually later via the admin panel
  }
});