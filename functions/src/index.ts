/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();

// Export admin functions
export { setAdminClaim, createFirstAdmin } from './admin';
export { setFirstAdmin } from './admin/setFirstAdmin';

// Export AI functions
export { generateMultiLanguageSummary, suggestTags, healthCheck as aiHealthCheck } from './ai';
export { extractUrlMetadata } from './ai/extractUrlMetadata';

// Export email functions
export {
  sendWelcomeEmail,
  sendAdminRoleEmail,
  sendResourceNotificationEmail,
  sendAIProcessingEmail,
  sendBulkOperationEmail,
  sendSystemErrorEmail,
  sendWeeklySummary,
  sendMonthlyReport,
  sendPasswordResetConfirmation
} from './emailNotifications';

// Export user synchronization functions
export {
  listAllAuthUsers,
  syncAuthUserToFirestore,
  migrateAllUsers,
  getMigrationStatus,
  onUserCreate
} from './userSync';
