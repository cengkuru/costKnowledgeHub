#!/usr/bin/env node

/**
 * User Migration Script
 * 
 * This script performs bulk migration of Firebase Auth users to Firestore
 * by calling the deployed migrateAllUsers Cloud Function.
 * 
 * Run with: node migrate-users.js
 */

const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFunctions, httpsCallable, connectFunctionsEmulator } = require('firebase/functions');

// Firebase configuration (from environment or config)
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyBvxbzV2lW5FmQmH3bJ8R4kQ6xRy1Zm_sA",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "knowledgehub-2ed2f.firebaseapp.com", 
  projectId: process.env.FIREBASE_PROJECT_ID || "knowledgehub-2ed2f",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "knowledgehub-2ed2f.firebasestorage.app",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: process.env.FIREBASE_APP_ID || "1:123456789:web:abcdef123456"
};

async function performMigration() {
  try {
    console.log('🔄 Starting user migration process...');
    console.log('📊 Initializing Firebase app...');
    
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const functions = getFunctions(app);
    
    // Note: In a real scenario, you would need to:
    // 1. Sign in as an admin user first
    // 2. Or use Firebase Admin SDK with service account credentials
    
    console.log('📡 Connecting to Firebase Functions...');
    
    // Get migration status first
    console.log('📊 Checking migration status...');
    const getMigrationStatus = httpsCallable(functions, 'getMigrationStatus');
    
    try {
      const statusResult = await getMigrationStatus();
      const status = statusResult.data;
      
      console.log('📊 Migration Status:');
      console.log(`   📈 Firebase Auth users: ${status.authUserCount}`);
      console.log(`   📊 Firestore users: ${status.firestoreUserCount}`);
      console.log(`   ✅ Synced users: ${status.syncedCount}`);
      console.log(`   ⏳ Unsynced users: ${status.unsyncedCount}`);
      console.log(`   📊 Sync rate: ${status.syncRate}%`);
      console.log(`   🔄 Needs migration: ${status.needsMigration ? 'Yes' : 'No'}`);
      
      if (!status.needsMigration) {
        console.log('✅ No migration needed - all users are already synced!');
        return;
      }
      
      console.log(`\n🚀 Starting migration of ${status.unsyncedCount} users...`);
      
      // Perform migration
      const migrateAllUsers = httpsCallable(functions, 'migrateAllUsers');
      const migrationResult = await migrateAllUsers({ batchSize: 50 });
      const result = migrationResult.data;
      
      console.log('✅ Migration completed!');
      console.log(`   📊 Total processed: ${result.totalProcessed}`);
      console.log(`   ✅ Successful: ${result.totalSuccessful}`);
      console.log(`   ❌ Errors: ${result.totalErrors}`);
      console.log(`   🔄 Has more users: ${result.hasMoreUsers ? 'Yes' : 'No'}`);
      
      if (result.errors && result.errors.length > 0) {
        console.log('\n❌ Migration errors:');
        result.errors.forEach((error, index) => {
          console.log(`   ${index + 1}. ${error.email || error.uid}: ${error.error}`);
        });
      }
      
      // Check final status
      console.log('\n📊 Checking final migration status...');
      const finalStatusResult = await getMigrationStatus();
      const finalStatus = finalStatusResult.data;
      
      console.log('📊 Final Migration Status:');
      console.log(`   📈 Firebase Auth users: ${finalStatus.authUserCount}`);
      console.log(`   📊 Firestore users: ${finalStatus.firestoreUserCount}`);
      console.log(`   ✅ Synced users: ${finalStatus.syncedCount}`);
      console.log(`   ⏳ Unsynced users: ${finalStatus.unsyncedCount}`);
      console.log(`   📊 Final sync rate: ${finalStatus.syncRate}%`);
      
      if (finalStatus.syncRate >= 100) {
        console.log('\n🎉 Migration completed successfully! All users are now synced.');
      } else {
        console.log('\n⚠️ Some users may still need manual sync via the admin panel.');
      }
      
    } catch (functionError) {
      if (functionError.code === 'functions/unauthenticated') {
        console.error('❌ Authentication required. Please ensure you are signed in as an admin user.');
        console.log('\n💡 To perform migration:');
        console.log('   1. Deploy the functions: npm run deploy (in functions/ directory)');
        console.log('   2. Sign in to the web app as an admin user');
        console.log('   3. Go to Admin → User Management');
        console.log('   4. Click "Sync All Users" in the migration panel');
      } else if (functionError.code === 'functions/permission-denied') {
        console.error('❌ Permission denied. Only admin users can perform migration.');
      } else {
        console.error('❌ Migration function error:', functionError.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Full error:', error);
  }
}

// Instructions for manual migration
function showManualInstructions() {
  console.log('\n📋 Manual Migration Instructions:');
  console.log('=====================================');
  console.log('');
  console.log('Since this script requires admin authentication, please perform the migration manually:');
  console.log('');
  console.log('1. 🚀 Start the development server:');
  console.log('   npm start');
  console.log('');
  console.log('2. 🌐 Open the application in your browser:');
  console.log('   http://localhost:4200');
  console.log('');
  console.log('3. 🔐 Sign in as an admin user');
  console.log('');
  console.log('4. 🛠️ Navigate to Admin Dashboard:');
  console.log('   Click "Admin Dashboard" in the top navigation');
  console.log('');
  console.log('5. 👥 Go to User Management:');
  console.log('   Click "Users" in the admin sidebar');
  console.log('');
  console.log('6. 🔄 Perform Migration:');
  console.log('   - You should see a yellow migration panel if users need syncing');
  console.log('   - Click "Sync All Users" to migrate Firebase Auth users to Firestore');
  console.log('   - Wait for the migration to complete');
  console.log('');
  console.log('7. ✅ Verify Migration:');
  console.log('   - Check that user counts are now accurate');
  console.log('   - Verify sync rate is 100%');
  console.log('');
  console.log('🎉 After migration, new users will automatically get Firestore profiles!');
}

if (require.main === module) {
  console.log('🔄 User Migration Utility');
  console.log('==========================');
  console.log('');
  
  // Show manual instructions since automated migration requires admin auth
  showManualInstructions();
  
  // Uncomment the line below to attempt automated migration (requires admin auth)
  // performMigration();
}

module.exports = { performMigration };