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
 * Cloud Function to create a new user using Admin SDK
 * Only admins can create users, and this doesn't affect current authentication state
 */
export const createAdminUser = onCall(async (request) => {
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
      'Only admins can create users.'
    );
  }

  const { email, password, displayName, role } = request.data;

  // Validate required fields
  if (!email || !password || !displayName || !role) {
    throw new HttpsError(
      'invalid-argument',
      'Email, password, displayName, and role are required.'
    );
  }

  // Validate role
  if (!['admin', 'editor', 'viewer'].includes(role)) {
    throw new HttpsError(
      'invalid-argument',
      'Role must be one of: admin, editor, viewer.'
    );
  }

  // Validate password strength
  if (password.length < 6) {
    throw new HttpsError(
      'invalid-argument',
      'Password must be at least 6 characters long.'
    );
  }

  try {
    // Create the user with Admin SDK (doesn't affect current auth state)
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: displayName,
      emailVerified: false
    });

    // Set custom claims for role
    const customClaims: any = {};
    if (role === 'admin') {
      customClaims.admin = true;
    } else if (role === 'editor') {
      customClaims.editor = true;
    }
    // viewers get no special claims

    if (Object.keys(customClaims).length > 0) {
      await admin.auth().setCustomUserClaims(userRecord.uid, customClaims);
    }

    // Create user document in Firestore
    const userData = {
      email: email,
      displayName: displayName,
      role: role,
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastActivityAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await admin.firestore().collection('users').doc(userRecord.uid).set(userData);

    // Send welcome email with temporary password
    try {
      const emailData: EmailData = {
        to: email,
        type: 'user_created_by_admin',
        templateData: {
          userName: displayName,
          email: email,
          tempPassword: password,
          role: role,
          adminEmail: request.auth.token.email || 'admin',
          loginUrl: 'https://knowledgehub.com/login',
          platformUrl: 'https://knowledgehub.com'
        }
      };

      await emailService.sendEmail(emailData);
      logger.info('User creation notification email sent successfully', { email, role });
    } catch (emailError) {
      logger.error('Failed to send user creation notification email:', emailError);
      // Don't fail user creation if email fails
    }

    // Log activity for the admin who created the user
    const adminEmail = request.auth.token.email || 'Unknown Admin';
    logger.info('Admin created new user', {
      adminEmail: adminEmail,
      adminUid: request.auth.uid,
      newUserEmail: email,
      newUserUid: userRecord.uid,
      newUserRole: role
    });

    return {
      success: true,
      user: {
        uid: userRecord.uid,
        email: email,
        displayName: displayName,
        role: role,
        status: 'active',
        createdAt: new Date().toISOString()
      },
      message: `User ${email} created successfully with role ${role}`
    };
  } catch (error: any) {
    console.error('Error creating user:', error);
    
    // Handle specific Firebase errors
    if (error.code === 'auth/email-already-exists') {
      throw new HttpsError(
        'already-exists',
        'A user with this email already exists.'
      );
    } else if (error.code === 'auth/invalid-email') {
      throw new HttpsError(
        'invalid-argument',
        'The email address is not valid.'
      );
    } else if (error.code === 'auth/weak-password') {
      throw new HttpsError(
        'invalid-argument',
        'The password is too weak.'
      );
    }

    throw new HttpsError(
      'internal',
      'Unable to create user. Please try again.'
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
