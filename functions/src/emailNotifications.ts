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

  const { adminEmails, operationType, operationSummary, affectedCount, completedAt, operationDetails } = request.data;

  if (!adminEmails || !operationType || !operationSummary) {
    throw new HttpsError('invalid-argument', 'AdminEmails, operationType, and operationSummary are required');
  }

  try {
    const emailData: EmailData = {
      to: adminEmails,
      type: 'bulk_operation_complete',
      templateData: {
        operationType,
        operationSummary,
        affectedCount: affectedCount || 0,
        completedAt: completedAt || new Date().toISOString(),
        operationDetails
      }
    };

    await emailService.sendEmail(emailData);
    logger.info('Bulk operation email sent successfully', { adminEmails, operationType });

    return { success: true, message: 'Bulk operation email sent successfully' };
  } catch (error) {
    logger.error('Failed to send bulk operation email:', error);
    throw new HttpsError('internal', 'Failed to send bulk operation email');
  }
});

/**
 * Send system error notification email
 */
export const sendSystemErrorEmail = onCall({
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

  const { error, component, adminEmails } = request.data;

  if (!error || !component || !adminEmails) {
    throw new HttpsError('invalid-argument', 'Error, component, and adminEmails are required');
  }

  try {
    const emailData: EmailData = {
      to: adminEmails,
      type: 'system_error',
      templateData: {
        errorMessage: error.message || 'Unknown error',
        errorStack: error.stack || 'No stack trace available',
        component,
        timestamp: new Date().toISOString(),
        severity: 'high'
      }
    };

    await emailService.sendEmail(emailData);
    logger.info('System error email sent successfully', { component, adminEmails });

    return { success: true, message: 'System error email sent successfully' };
  } catch (error) {
    logger.error('Failed to send system error email:', error);
    throw new HttpsError('internal', 'Failed to send system error email');
  }
});

/**
 * Send weekly summary email
 */
export const sendWeeklySummary = onRequest({
  memory: '512MiB',
  timeoutSeconds: 120
}, async (req, res) => {
  try {
    const adminEmails = await getAdminEmails();
    const summaryData = await getWeeklySummaryData();

    const emailData: EmailData = {
      to: adminEmails,
      type: 'weekly_summary',
      templateData: summaryData
    };

    await emailService.sendEmail(emailData);
    logger.info('Weekly summary email sent successfully', { adminEmails });

    res.json({ success: true, message: 'Weekly summary email sent successfully' });
  } catch (error) {
    logger.error('Failed to send weekly summary email:', error);
    res.status(500).json({ success: false, message: 'Failed to send weekly summary email' });
  }
});

/**
 * Send monthly report email
 */
export const sendMonthlyReport = onRequest({
  memory: '512MiB',
  timeoutSeconds: 120
}, async (req, res) => {
  try {
    const adminEmails = await getAdminEmails();
    const reportData = await getMonthlyReportData();

    const emailData: EmailData = {
      to: adminEmails,
      type: 'monthly_report',
      templateData: reportData
    };

    await emailService.sendEmail(emailData);
    logger.info('Monthly report email sent successfully', { adminEmails });

    res.json({ success: true, message: 'Monthly report email sent successfully' });
  } catch (error) {
    logger.error('Failed to send monthly report email:', error);
    res.status(500).json({ success: false, message: 'Failed to send monthly report email' });
  }
});

/**
 * Send password reset confirmation email
 */
export const sendPasswordResetConfirmation = onCall({
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

// Helper functions
async function getAdminEmails(): Promise<string[]> {
  try {
    const listUsersResult = await admin.auth().listUsers();
    const adminEmails: string[] = [];

    for (const user of listUsersResult.users) {
      const userRecord = await admin.auth().getUser(user.uid);
      if (userRecord.customClaims?.admin && userRecord.email) {
        adminEmails.push(userRecord.email);
      }
    }

    return adminEmails;
  } catch (error) {
    logger.error('Failed to get admin emails:', error);
    return [];
  }
}

async function getWeeklySummaryData(): Promise<Record<string, any>> {
  try {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get weekly analytics data
    const weeklyData = {
      weekStartDate: weekAgo.toISOString().split('T')[0],
      weekEndDate: now.toISOString().split('T')[0],
      totalUsers: 0,
      newUsers: 0,
      totalResources: 0,
      newResources: 0,
      totalDownloads: 0,
      topResources: [],
      activeUsers: 0,
      systemHealth: 'Good'
    };

    // TODO: Implement actual data collection from your database
    // This is a placeholder implementation
    const listUsersResult = await admin.auth().listUsers();
    weeklyData.totalUsers = listUsersResult.users.length;
    weeklyData.newUsers = Math.floor(listUsersResult.users.length * 0.1); // 10% assumption

    return weeklyData;
  } catch (error) {
    logger.error('Failed to get weekly summary data:', error);
    return {
      weekStartDate: new Date().toISOString().split('T')[0],
      weekEndDate: new Date().toISOString().split('T')[0],
      totalUsers: 0,
      newUsers: 0,
      totalResources: 0,
      newResources: 0,
      totalDownloads: 0,
      topResources: [],
      activeUsers: 0,
      systemHealth: 'Unknown'
    };
  }
}

async function getMonthlyReportData(): Promise<Record<string, any>> {
  try {
    const now = new Date();
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get monthly analytics data
    const monthlyData = {
      monthStartDate: monthAgo.toISOString().split('T')[0],
      monthEndDate: now.toISOString().split('T')[0],
      totalUsers: 0,
      newUsers: 0,
      totalResources: 0,
      newResources: 0,
      totalDownloads: 0,
      topResources: [],
      activeUsers: 0,
      systemHealth: 'Good',
      growthRate: 0,
      engagement: {
        averageSessionTime: '5:30',
        pageViews: 0,
        bounceRate: '35%'
      }
    };

    // TODO: Implement actual data collection from your database
    // This is a placeholder implementation
    const listUsersResult = await admin.auth().listUsers();
    monthlyData.totalUsers = listUsersResult.users.length;
    monthlyData.newUsers = Math.floor(listUsersResult.users.length * 0.2); // 20% assumption

    return monthlyData;
  } catch (error) {
    logger.error('Failed to get monthly report data:', error);
    return {
      monthStartDate: new Date().toISOString().split('T')[0],
      monthEndDate: new Date().toISOString().split('T')[0],
      totalUsers: 0,
      newUsers: 0,
      totalResources: 0,
      newResources: 0,
      totalDownloads: 0,
      topResources: [],
      activeUsers: 0,
      systemHealth: 'Unknown',
      growthRate: 0,
      engagement: {
        averageSessionTime: '0:00',
        pageViews: 0,
        bounceRate: '0%'
      }
    };
  }
}
