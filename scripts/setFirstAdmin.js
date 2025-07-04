#!/usr/bin/env node

/**
 * Script to set admin privileges for the first user
 * Run this script locally with your service account credentials
 */

const admin = require('firebase-admin');
const path = require('path');

// Email of the user to make admin
const ADMIN_EMAIL = 'michael@cengkuru.com';

// Initialize Firebase Admin with service account
// Make sure you have downloaded your service account key from Firebase Console
// and placed it in the project root as 'serviceAccountKey.json'
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
});

async function setFirstAdmin() {
  try {
    console.log(`Setting admin privileges for: ${ADMIN_EMAIL}`);
    
    // Get user by email
    const user = await admin.auth().getUserByEmail(ADMIN_EMAIL);
    console.log(`Found user: ${user.uid}`);
    
    // Set custom claims
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });
    console.log('✅ Admin custom claims set successfully');
    
    // Update Firestore user document
    const db = admin.firestore();
    const userRef = db.collection('users').doc(user.uid);
    
    // Check if user document exists
    const userDoc = await userRef.get();
    
    if (userDoc.exists) {
      // Update existing document
      await userRef.update({
        role: 'admin',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log('✅ Firestore user document updated');
    } else {
      // Create new document if it doesn't exist
      await userRef.set({
        uid: user.uid,
        email: ADMIN_EMAIL,
        displayName: user.displayName || 'Admin User',
        role: 'admin',
        status: 'active',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log('✅ Firestore user document created');
    }
    
    // Log the activity
    await db.collection('activities').add({
      type: 'admin_privilege_granted',
      targetUserId: user.uid,
      email: ADMIN_EMAIL,
      performedBy: 'setup_script',
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('✅ Activity logged');
    
    console.log('\n🎉 Success! Admin privileges have been granted to:', ADMIN_EMAIL);
    console.log('\n⚠️  IMPORTANT: The user needs to sign out and sign back in for the changes to take effect.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'auth/user-not-found') {
      console.error(`User ${ADMIN_EMAIL} not found. Make sure the user has registered first.`);
    }
    process.exit(1);
  }
}

// Run the script
setFirstAdmin();