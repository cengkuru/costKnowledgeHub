#!/usr/bin/env node

/**
 * Script to set first admin user via Cloud Function
 * This doesn't require service account credentials
 */

const admin = require('firebase-admin');
const { applicationDefault } = require('firebase-admin/app');

// Initialize Firebase Admin
const app = admin.initializeApp({
  credential: applicationDefault(),
  projectId: 'knowledgehub-2ed2f'
});

const email = 'michael@cengkuru.com';

async function setFirstAdmin() {
  try {
    console.log(`Setting first admin via Cloud Function for: ${email}`);

    // Call the Cloud Function
    const result = await admin.functions().httpsCallable('setFirstAdmin')({
      email: email
    });

    console.log('✅ Success:', result.data);
    console.log('\n⚠️  IMPORTANT: The user needs to sign out and sign back in for the changes to take effect.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'functions/permission-denied') {
      console.error('This means an admin user already exists. Use the admin panel to manage users.');
    }
    process.exit(1);
  }
}

// Run the script
setFirstAdmin();
