import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { emailService, EmailData } from './emailService';
import { logger } from 'firebase-functions';

/**
 * Cloud Function to set admin claims for a user
 * This should be called sparingly and only by existing admins
 */
export const setAdminClaim = onCall(async (request) => {
  // Check that request is made by an authenticated user
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'The function must be called while authenticated.'
    );
  }

  // Check that the requesting user is an admin
  if (!request.auth.token.admin) {
    throw new HttpsError(
      'permission-denied',
      'Only admins can set admin claims.'
    );
  }

  const { email, makeAdmin } = request.data;

  if (!email) {
    throw new HttpsError(
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

    // Send admin role notification email
    try {
      const emailData: EmailData = {
        to: email,
        type: makeAdmin ? 'admin_role_assigned' : 'admin_role_removed',
        templateData: {
          userName: user.displayName || email.split('@')[0],
          adminUrl: 'https://knowledgehub.com/admin',
          platformUrl: 'https://knowledgehub.com'
        }
      };

      await emailService.sendEmail(emailData);
      logger.info('Admin role notification email sent successfully', { email, makeAdmin });
    } catch (emailError) {
      logger.error('Failed to send admin role notification email:', emailError);
      // Don't fail the admin role assignment if email fails
    }

    return {
      success: true,
      message: `Admin claim ${makeAdmin ? 'added to' : 'removed from'} ${email}`
    };
  } catch (error) {
    console.error('Error setting admin claim:', error);
    throw new HttpsError(
      'internal',
      'Unable to set admin claim.'
    );
  }
});

/**
 * Temporary function to create the first admin user
 * This should be disabled after the first admin is created
 */
export const createFirstAdmin = onRequest(async (req, res) => {
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
