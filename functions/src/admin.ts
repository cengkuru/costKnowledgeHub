import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

/**
 * Cloud Function to set admin claims for a user
 * This should be called sparingly and only by existing admins
 */
export const setAdminClaim = functions.https.onCall(async (data, context) => {
  // Check that request is made by an authenticated user
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'The function must be called while authenticated.'
    );
  }
  
  // Check that the requesting user is an admin
  if (!context.auth.token.admin) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only admins can set admin claims.'
    );
  }
  
  const { email, makeAdmin } = data;
  
  if (!email) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Email is required.'
    );
  }
  
  try {
    // Get user by email
    const user = await admin.auth().getUserByEmail(email);
    
    // Set custom claims
    await admin.auth().setCustomUserClaims(user.uid, {
      admin: makeAdmin === true
    });
    
    return {
      success: true,
      message: `Admin claim ${makeAdmin ? 'added to' : 'removed from'} ${email}`
    };
  } catch (error) {
    console.error('Error setting admin claim:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Unable to set admin claim.'
    );
  }
});

/**
 * Temporary function to create the first admin user
 * This should be disabled after the first admin is created
 */
export const createFirstAdmin = functions.https.onRequest(async (req, res) => {
  // Check if this is the first run
  const adminEmail = functions.config().admin?.email;
  
  if (!adminEmail) {
    res.status(400).send('Admin email not configured. Set it with: firebase functions:config:set admin.email="admin@example.com"');
    return;
  }
  
  try {
    // Get user by email
    const user = await admin.auth().getUserByEmail(adminEmail);
    
    // Check if already admin
    const currentClaims = user.customClaims || {};
    if (currentClaims.admin) {
      res.status(200).send('User is already an admin.');
      return;
    }
    
    // Set admin claim
    await admin.auth().setCustomUserClaims(user.uid, {
      admin: true
    });
    
    res.status(200).send(`Successfully made ${adminEmail} an admin. This endpoint should now be disabled.`);
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      res.status(404).send(`User ${adminEmail} not found. Please create the user account first.`);
    } else {
      console.error('Error creating first admin:', error);
      res.status(500).send('Error creating admin.');
    }
  }
});