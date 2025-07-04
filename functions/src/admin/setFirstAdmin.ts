import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';

/**
 * Cloud Function to set admin privileges for the first user
 * This function can only be used when there are no existing admin users
 */
export const setFirstAdmin = onCall(async (request) => {
  const { email } = request.data;

  if (!email) {
    throw new HttpsError(
      'invalid-argument',
      'Email is required.'
    );
  }

  try {
    // Check if there are any existing admin users
    const allUsers = await admin.auth().listUsers(1000);
    let hasExistingAdmin = false;

    for (const user of allUsers.users) {
      const claims = user.customClaims || {};
      if (claims.admin === true) {
        hasExistingAdmin = true;
        break;
      }
    }

    if (hasExistingAdmin) {
      throw new HttpsError(
        'permission-denied',
        'An admin user already exists. Use the setAdminClaim function instead.'
      );
    }

    // Get user by email
    const user = await admin.auth().getUserByEmail(email);

    // Set admin claim for the first user
    await admin.auth().setCustomUserClaims(user.uid, {
      admin: true
    });

    // Update Firestore user document
    await admin.firestore().collection('users').doc(user.uid).update({
      role: 'admin',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Log the action
    await admin.firestore().collection('activities').add({
      type: 'first_admin_created',
      targetUserId: user.uid,
      email: email,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    logger.info('First admin user created successfully', { email, uid: user.uid });

    return {
      success: true,
      message: `Successfully set ${email} as the first admin user`
    };
  } catch (error: any) {
    logger.error('Error setting first admin:', error);
    
    if (error instanceof HttpsError) {
      throw error;
    }
    
    throw new HttpsError(
      'internal',
      'Unable to set first admin user.'
    );
  }
});