import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { logger } from 'firebase-functions';
import { emailService, EmailData } from './emailService';
import * as admin from 'firebase-admin';

// Email configuration secrets
const gmailUser = defineSecret('GMAIL_USER');
const gmailPassword = defineSecret('GMAIL_APP_PASSWORD');
const geminiApiKey = defineSecret('GEMINI_API_KEY');

/**
 * Send welcome email to new users
 */
export const sendWelcomeEmail = onCall({
  secrets: [gmailUser, gmailPassword, geminiApiKey],
  memory: '256MiB',
  timeoutSeconds: 60
}, async (request) => {
  // Check that request is made by an authenticated user
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required');
  }

  const { email, userName, platformUrl } = request.data;

  if (!email || !userName) {
    throw new HttpsError('invalid-argument', 'Email and userName are required');
  }

  try {
    const emailData: EmailData = {
      to: email,
      type: 'user_welcome',
      templateData: {
        userName,
        platformUrl: platformUrl || 'https://knowledgehub.com'
      }
    };

    await emailService.sendEmail(emailData);
    logger.info('Welcome email sent successfully', { email, userName });
    
    return { success: true, message: 'Welcome email sent successfully' };
  } catch (error) {
    logger.error('Failed to send welcome email:', error);
    throw new HttpsError('internal', 'Failed to send welcome email');
  }
});

/**
 * Send admin role assignment/removal email
 */
export const sendAdminRoleEmail = onCall({
  secrets: [gmailUser, gmailPassword, geminiApiKey],
  memory: '256MiB',
  timeoutSeconds: 60
}, async (request) => {
  // Check that request is made by an authenticated user
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required');
  }

  // Check that the requesting user is an admin
  if (!request.auth.token.admin) {
    throw new HttpsError('permission-denied', 'Only admins can send admin role emails');
  }

  const { email, userName, isAdmin, adminUrl, platformUrl } = request.data;

  if (!email || !userName) {
    throw new HttpsError('invalid-argument', 'Email and userName are required');
  }

  try {
    const emailData: EmailData = {
      to: email,
      type: isAdmin ? 'admin_role_assigned' : 'admin_role_removed',
      templateData: {
        userName,
        adminUrl: adminUrl || 'https://knowledgehub.com/admin',
        platformUrl: platformUrl || 'https://knowledgehub.com'
      }
    };

    await emailService.sendEmail(emailData);
    logger.info('Admin role email sent successfully', { email, userName, isAdmin });
    
    return { success: true, message: 'Admin role email sent successfully' };
  } catch (error) {
    logger.error('Failed to send admin role email:', error);
    throw new HttpsError('internal', 'Failed to send admin role email');
  }
});
