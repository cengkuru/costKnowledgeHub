/**
 * Quick script to set admin role using Firebase Admin SDK
 * Run with: node scripts/quickSetAdmin.js
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize with application default credentials
// This will use your gcloud auth or GOOGLE_APPLICATION_CREDENTIALS env var
initializeApp({
  projectId: 'knowledgehub-2ed2f'
});

const auth = getAuth();
const db = getFirestore();

async function makeAdmin() {
  const email = 'michael@cengkuru.com';
  
  try {
    // Get user by email
    const user = await auth.getUserByEmail(email);
    console.log('Found user:', user.uid);
    
    // Set admin custom claim
    await auth.setCustomUserClaims(user.uid, { admin: true });
    console.log('✅ Admin claim set');
    
    // Update Firestore
    await db.collection('users').doc(user.uid).set({
      role: 'admin',
      updatedAt: new Date()
    }, { merge: true });
    
    console.log('✅ Firestore updated');
    console.log('\n🎉 Success! Sign out and back in to activate admin privileges.');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

makeAdmin();