/**
 * Test script to verify authentication flow with Firebase Cloud Functions
 * This script helps debug 403 authorization issues
 */

const admin = require('firebase-admin');
const axios = require('axios');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

async function testAuthentication() {
  console.log('=== Firebase Auth Test ===');
  
  try {
    // 1. Check if michael@cengkuru.com has admin claim
    console.log('\n1. Checking admin claims...');
    const user = await admin.auth().getUserByEmail('michael@cengkuru.com');
    console.log('User UID:', user.uid);
    console.log('Custom Claims:', user.customClaims);
    console.log('Is Admin:', user.customClaims?.admin === true);
    
    // 2. Test creating an ID token (for debugging)
    console.log('\n2. Creating custom token...');
    const customToken = await admin.auth().createCustomToken(user.uid);
    console.log('Custom token created successfully:', customToken.substring(0, 50) + '...');
    
    // 3. Check migration status using the Cloud Function
    console.log('\n3. Testing getMigrationStatus function...');
    try {
      const response = await axios.post(
        'https://us-central1-knowledgehub-2ed2f.cloudfunctions.net/getMigrationStatus',
        {},
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      console.log('Migration status response:', response.data);
    } catch (error) {
      console.error('Migration status error:', error.response?.data || error.message);
    }
    
    // 4. List all users in Firebase Auth
    console.log('\n4. Listing Auth users directly...');
    const listUsersResult = await admin.auth().listUsers(5);
    console.log('Auth users found:', listUsersResult.users.length);
    listUsersResult.users.forEach(user => {
      console.log(`- ${user.email}: admin=${user.customClaims?.admin}, disabled=${user.disabled}`);
    });
    
    // 5. Check Firestore users collection
    console.log('\n5. Checking Firestore users collection...');
    const usersSnapshot = await admin.firestore().collection('users').limit(5).get();
    console.log('Firestore users found:', usersSnapshot.size);
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`- ${data.email}: role=${data.role}, status=${data.status}`);
    });
    
    console.log('\n=== Test Complete ===');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testAuthentication().then(() => {
  console.log('\n🎉 Test completed successfully!');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});
