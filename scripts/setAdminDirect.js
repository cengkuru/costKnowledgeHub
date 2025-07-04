#!/usr/bin/env node

/**
 * Script to set admin claims directly using the createFirstAdmin HTTP endpoint
 * This bypasses the authentication requirement
 */

const https = require('https');

const email = 'michael@cengkuru.com';
const projectId = 'knowledgehub-2ed2f';

async function setAdminDirect() {
  try {
    console.log(`Attempting to set admin for: ${email}`);
    console.log(`Using createFirstAdmin endpoint...`);

    // Make HTTP request to the createFirstAdmin endpoint
    const url = `https://us-central1-${projectId}.cloudfunctions.net/createFirstAdmin`;

    https.get(url, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log('Response status:', res.statusCode);
        console.log('Response:', data);

        if (res.statusCode === 200) {
          console.log('✅ Success! Admin privileges may have been set.');
          console.log('\n⚠️  IMPORTANT: The user needs to sign out and sign back in for the changes to take effect.');
        } else {
          console.log('❌ Failed to set admin privileges');
        }
      });
    }).on('error', (err) => {
      console.error('❌ Error:', err.message);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the script
setAdminDirect();
