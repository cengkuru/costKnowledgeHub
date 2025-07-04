#!/usr/bin/env node

/**
 * Script to set first admin user via Cloud Function using client SDK
 * Run this from the project root directory
 */

const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFunctions, httpsCallable } = require('firebase/functions');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDhXBJcJJPqAoSlQrRjlPYvNkOLvHYvYrI",
  authDomain: "knowledgehub-2ed2f.firebaseapp.com",
  projectId: "knowledgehub-2ed2f",
  storageBucket: "knowledgehub-2ed2f.appspot.com",
  messagingSenderId: "1023847562033",
  appId: "1:1023847562033:web:4b6e3c4a0a8b9c5d6e7f8g"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const functions = getFunctions(app);

const email = 'michael@cengkuru.com';

async function setFirstAdmin() {
  try {
    console.log(`Setting first admin via Cloud Function for: ${email}`);

    // Call the Cloud Function
    const setFirstAdminFunc = httpsCallable(functions, 'setFirstAdmin');
    const result = await setFirstAdminFunc({ email: email });

    console.log('✅ Success:', result.data);
    console.log('\n⚠️  IMPORTANT: The user needs to sign out and sign back in for the changes to take effect.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Error details:', error);
    if (error.code === 'functions/permission-denied') {
      console.error('This means an admin user already exists. Use the admin panel to manage users.');
    }
    process.exit(1);
  }
}

// Run the script
setFirstAdmin();
