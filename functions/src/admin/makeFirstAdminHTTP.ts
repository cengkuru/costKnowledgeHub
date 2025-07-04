import { onRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';

/**
 * HTTP endpoint to make michael@cengkuru.com an admin
 * This is a one-time setup function
 */
export const makeFirstAdminHTTP = onRequest(async (req, res) => {
  const email = 'michael@cengkuru.com';
  
  // Simple security check - only allow POST requests with a secret
  if (req.method !== 'POST') {
    res.status(405).send('Method not allowed');
    return;
  }
  
  const { secret } = req.body;
  if (secret !== 'make-me-admin-2025') {
    res.status(403).send('Unauthorized');
    return;
  }
  
  try {
    // Get user by email
    const user = await admin.auth().getUserByEmail(email);
    logger.info('Found user:', { uid: user.uid, email });
    
    // Set admin custom claim
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });
    
    // Update or create Firestore user document
    const userRef = admin.firestore().collection('users').doc(user.uid);
    await userRef.set({
      uid: user.uid,
      email: email,
      displayName: user.displayName || 'Michael',
      role: 'admin',
      status: 'active',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
    // Log the activity
    await admin.firestore().collection('activities').add({
      type: 'admin_role_granted_manually',
      targetUserId: user.uid,
      email: email,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.status(200).json({
      success: true,
      message: `Admin privileges granted to ${email}. Please sign out and sign back in.`
    });
    
  } catch (error: any) {
    logger.error('Error setting admin:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});