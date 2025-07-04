import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

/**
 * Cloud Function to set admin privileges for a user
 * This can only be called by existing admins or during initial setup
 */
export const setAdminRole = functions.https.onCall(async (data, context) => {
  // For initial setup, you might want to temporarily comment out this check
  // to set the first admin user
  
  // Uncomment this after setting up the first admin:
  /*
  if (!context.auth?.token?.admin) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only admins can set admin privileges'
    );
  }
  */

  const { userId, isAdmin } = data;

  if (!userId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'userId is required'
    );
  }

  try {
    // Set custom user claims
    await admin.auth().setCustomUserClaims(userId, { admin: isAdmin });

    // Log the action
    await admin.firestore().collection('activities').add({
      type: 'admin_privilege_change',
      targetUserId: userId,
      isAdmin: isAdmin,
      performedBy: context.auth?.uid || 'system',
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    return { 
      success: true, 
      message: `Admin privilege ${isAdmin ? 'granted' : 'revoked'} for user ${userId}` 
    };
  } catch (error) {
    console.error('Error setting admin role:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to set admin role'
    );
  }
});

/**
 * Alternative: HTTP endpoint for initial admin setup
 * Use this to set up the first admin user via curl or Postman
 */
export const setInitialAdmin = functions.https.onRequest(async (req, res) => {
  // IMPORTANT: Remove or secure this function after initial setup!
  
  const { userId, secretKey } = req.body;
  
  // Use a temporary secret key for initial setup
  // CHANGE THIS and remove the function after use
  const SETUP_SECRET = 'CHANGE_THIS_SECRET_KEY';
  
  if (secretKey !== SETUP_SECRET) {
    res.status(403).json({ error: 'Invalid secret key' });
    return;
  }

  if (!userId) {
    res.status(400).json({ error: 'userId is required' });
    return;
  }

  try {
    await admin.auth().setCustomUserClaims(userId, { admin: true });
    
    await admin.firestore().collection('activities').add({
      type: 'initial_admin_setup',
      targetUserId: userId,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ 
      success: true, 
      message: `Initial admin privileges granted to user ${userId}` 
    });
  } catch (error) {
    console.error('Error setting initial admin:', error);
    res.status(500).json({ error: 'Failed to set admin role' });
  }
});