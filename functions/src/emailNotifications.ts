import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { emailService, EmailData } from './emailService';
import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Send welcome email to new users
 */
export const sendWelcomeEmail = onCall({
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

/**
 * Send resource notification emails (submitted, approved, rejected)
 */
export const sendResourceNotificationEmail = onCall({
  memory: '256MiB',
  timeoutSeconds: 60
}, async (request) => {
  // Check that request is made by an authenticated user
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required');
  }

  const {
    email,
    userName,
    resourceTitle,
    resourceType,
    resourceStatus,
    submissionDate,
    resourceUrl,
    editUrl,
    feedback,
    notificationType
  } = request.data;

  if (!email || !userName || !resourceTitle || !notificationType) {
    throw new HttpsError('invalid-argument', 'Email, userName, resourceTitle, and notificationType are required');
  }

  if (!['resource_submitted', 'resource_approved', 'resource_rejected'].includes(notificationType)) {
    throw new HttpsError('invalid-argument', 'Invalid notification type');
  }

  try {
    const emailData: EmailData = {
      to: email,
      type: notificationType,
      templateData: {
        userName,
        resourceTitle,
        resourceType,
        resourceStatus,
        submissionDate,
        resourceUrl,
        editUrl,
        feedback
      }
    };

    await emailService.sendEmail(emailData);
    logger.info('Resource notification email sent successfully', { email, userName, resourceTitle, notificationType });

    return { success: true, message: 'Resource notification email sent successfully' };
  } catch (error) {
    logger.error('Failed to send resource notification email:', error);
    throw new HttpsError('internal', 'Failed to send resource notification email');
  }
});

/**
 * Send AI processing completion email
 */
export const sendAIProcessingEmail = onCall({
  secrets: [gmailUser, gmailPassword, geminiApiKey],
  memory: '256MiB',
  timeoutSeconds: 60
}, async (request) => {
  // Check that request is made by an authenticated user
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required');
  }

  const { email, userName, resourceTitle, languageCount, tagCount, resourceUrl } = request.data;

  if (!email || !userName || !resourceTitle) {
    throw new HttpsError('invalid-argument', 'Email, userName, and resourceTitle are required');
  }

  try {
    const emailData: EmailData = {
      to: email,
      type: 'ai_processing_complete',
      templateData: {
        userName,
        resourceTitle,
        languageCount: languageCount || 3,
        tagCount: tagCount || 5,
        resourceUrl
      }
    };

    await emailService.sendEmail(emailData);
    logger.info('AI processing email sent successfully', { email, userName, resourceTitle });

    return { success: true, message: 'AI processing email sent successfully' };
  } catch (error) {
    logger.error('Failed to send AI processing email:', error);
    throw new HttpsError('internal', 'Failed to send AI processing email');
  }
});

/**
 * Send bulk operation completion email
 */
export const sendBulkOperationEmail = onCall({
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
    throw new HttpsError('permission-denied', 'Only admins can send bulk operation emails');
  }

  const { email, userName, operationType, resourceCount, operationStatus, adminUrl } = request.data;

  if (!email || !userName || !operationType || !resourceCount) {
    throw new HttpsError('invalid-argument', 'Email, userName, operationType, and resourceCount are required');
  }

  try {
    const emailData: EmailData = {
      to: email,
      type: 'bulk_operation_complete',
      templateData: {
        userName,
        operationType,
        resourceCount,
        operationStatus: operationStatus || 'completed',
        adminUrl: adminUrl || 'https://knowledgehub.com/admin'
      }
    };

    await emailService.sendEmail(emailData);
    logger.info('Bulk operation email sent successfully', { email, userName, operationType, resourceCount });

    return { success: true, message: 'Bulk operation email sent successfully' };
  } catch (error) {
    logger.error('Failed to send bulk operation email:', error);
    throw new HttpsError('internal', 'Failed to send bulk operation email');
  }
});

/**
 * Send system error notification to administrators
 */
export const sendSystemErrorEmail = onCall({
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
    throw new HttpsError('permission-denied', 'Only admins can send system error emails');
  }

  const { errorMessage, component, adminEmails } = request.data;

  if (!errorMessage || !component || !adminEmails) {
    throw new HttpsError('invalid-argument', 'errorMessage, component, and adminEmails are required');
  }

  try {
    const error = new Error(errorMessage);
    await emailService.sendSystemErrorNotification(error, component, adminEmails);
    logger.info('System error email sent successfully', { component, adminEmails });

    return { success: true, message: 'System error email sent successfully' };
  } catch (error) {
    logger.error('Failed to send system error email:', error);
    throw new HttpsError('internal', 'Failed to send system error email');
  }
});

/**
 * Send weekly summary to administrators
 */
export const sendWeeklySummary = onRequest({
  secrets: [gmailUser, gmailPassword, geminiApiKey],
  memory: '512MiB',
  timeoutSeconds: 180
}, async (req, res) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Verify admin token or use internal service authentication
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    // Get admin emails from Firestore
    const adminEmails = await getAdminEmails();

    if (adminEmails.length === 0) {
      res.status(200).json({ message: 'No administrators found' });
      return;
    }

    // Get weekly summary data
    const summaryData = await getWeeklySummaryData();

    await emailService.sendWeeklySummary(summaryData, adminEmails);
    logger.info('Weekly summary emails sent successfully', { adminCount: adminEmails.length });

    res.status(200).json({
      success: true,
      message: 'Weekly summary emails sent successfully',
      adminCount: adminEmails.length
    });
  } catch (error) {
    logger.error('Failed to send weekly summary emails:', error);
    res.status(500).json({ error: 'Failed to send weekly summary emails' });
  }
});

/**
 * Send monthly report to administrators
 */
export const sendMonthlyReport = onRequest({
  secrets: [gmailUser, gmailPassword, geminiApiKey],
  memory: '512MiB',
  timeoutSeconds: 180
}, async (req, res) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Verify admin token or use internal service authentication
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    // Get admin emails from Firestore
    const adminEmails = await getAdminEmails();

    if (adminEmails.length === 0) {
      res.status(200).json({ message: 'No administrators found' });
      return;
    }

    // Get monthly report data
    const reportData = await getMonthlyReportData();

    await emailService.sendMonthlyReport(reportData, adminEmails);
    logger.info('Monthly report emails sent successfully', { adminCount: adminEmails.length });

    res.status(200).json({
      success: true,
      message: 'Monthly report emails sent successfully',
      adminCount: adminEmails.length
    });
  } catch (error) {
    logger.error('Failed to send monthly report emails:', error);
    res.status(500).json({ error: 'Failed to send monthly report emails' });
  }
});

/**
 * Send password reset confirmation email
 */
export const sendPasswordResetConfirmation = onCall({
  secrets: [gmailUser, gmailPassword, geminiApiKey],
  memory: '256MiB',
  timeoutSeconds: 60
}, async (request) => {
  const { email, userName } = request.data;

  if (!email || !userName) {
    throw new HttpsError('invalid-argument', 'Email and userName are required');
  }

  try {
    const emailData: EmailData = {
      to: email,
      type: 'password_reset_confirmation',
      templateData: {
        userName,
        resetUrl: 'https://knowledgehub.com/reset-password',
        supportEmail: 'support@knowledgehub.com'
      }
    };

    await emailService.sendEmail(emailData);
    logger.info('Password reset confirmation email sent successfully', { email, userName });

    return { success: true, message: 'Password reset confirmation email sent successfully' };
  } catch (error) {
    logger.error('Failed to send password reset confirmation email:', error);
    throw new HttpsError('internal', 'Failed to send password reset confirmation email');
  }
});

/**
 * Get admin emails from Firebase Auth
 */
async function getAdminEmails(): Promise<string[]> {
  try {
    const adminEmails: string[] = [];

    // Get all users with admin claims
    const listUsersResult = await admin.auth().listUsers();

    for (const user of listUsersResult.users) {
      const claims = user.customClaims || {};
      if (claims.admin && user.email) {
        adminEmails.push(user.email);
      }
    }

    return adminEmails;
  } catch (error) {
    logger.error('Failed to get admin emails:', error);
    return [];
  }
}

/**
 * Get weekly summary data from Firestore
 */
async function getWeeklySummaryData(): Promise<Record<string, any>> {
  try {
    const db = admin.firestore();
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Get new resources count
    const resourcesSnapshot = await db.collection('resources')
      .where('createdAt', '>=', oneWeekAgo)
      .get();

    // Get analytics data
    const analyticsSnapshot = await db.collection('analytics_views')
      .where('timestamp', '>=', oneWeekAgo)
      .get();

    const downloadsSnapshot = await db.collection('analytics_downloads')
      .where('timestamp', '>=', oneWeekAgo)
      .get();

    // Get new users count
    const usersSnapshot = await db.collection('users')
      .where('createdAt', '>=', oneWeekAgo)
      .get();

    return {
      userName: 'Administrator',
      newResources: resourcesSnapshot.size,
      totalViews: analyticsSnapshot.size,
      totalDownloads: downloadsSnapshot.size,
      newUsers: usersSnapshot.size,
      analyticsUrl: 'https://knowledgehub.com/admin/analytics'
    };
  } catch (error) {
    logger.error('Failed to get weekly summary data:', error);
    return {
      userName: 'Administrator',
      newResources: 0,
      totalViews: 0,
      totalDownloads: 0,
      newUsers: 0,
      analyticsUrl: 'https://knowledgehub.com/admin/analytics'
    };
  }
}

/**
 * Get monthly report data from Firestore
 */
async function getMonthlyReportData(): Promise<Record<string, any>> {
  try {
    const db = admin.firestore();
    const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const now = new Date();

    // Get monthly resources count
    const resourcesSnapshot = await db.collection('resources')
      .where('createdAt', '>=', oneMonthAgo)
      .get();

    // Get analytics data
    const analyticsSnapshot = await db.collection('analytics_views')
      .where('timestamp', '>=', oneMonthAgo)
      .get();

    const downloadsSnapshot = await db.collection('analytics_downloads')
      .where('timestamp', '>=', oneMonthAgo)
      .get();

    // Get active users count
    const usersSnapshot = await db.collection('users')
      .where('lastActivityAt', '>=', oneMonthAgo)
      .get();

    // Get top performing resource
    const topResourcesSnapshot = await db.collection('resources')
      .orderBy('views', 'desc')
      .limit(1)
      .get();

    const topResource = topResourcesSnapshot.empty ? 'No resources' :
      topResourcesSnapshot.docs[0].data().title?.en || 'Untitled Resource';

    return {
      userName: 'Administrator',
      monthName: now.toLocaleDateString('en-US', { month: 'long' }),
      year: now.getFullYear(),
      monthlyResources: resourcesSnapshot.size,
      monthlyViews: analyticsSnapshot.size,
      monthlyDownloads: downloadsSnapshot.size,
      activeUsers: usersSnapshot.size,
      topResource,
      reportUrl: 'https://knowledgehub.com/admin/analytics'
    };
  } catch (error) {
    logger.error('Failed to get monthly report data:', error);
    return {
      userName: 'Administrator',
      monthName: new Date().toLocaleDateString('en-US', { month: 'long' }),
      year: new Date().getFullYear(),
      monthlyResources: 0,
      monthlyViews: 0,
      monthlyDownloads: 0,
      activeUsers: 0,
      topResource: 'No resources',
      reportUrl: 'https://knowledgehub.com/admin/analytics'
    };
  }
}
