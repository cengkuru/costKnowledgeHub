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

// Export AI functions
export { generateMultiLanguageSummary, suggestTags, healthCheck as aiHealthCheck } from './ai';
export { extractUrlMetadata } from './ai/extractUrlMetadata';

// Export email functions will be added after creating emailNotifications.ts
