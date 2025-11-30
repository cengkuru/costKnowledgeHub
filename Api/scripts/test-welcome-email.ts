/**
 * Test script to verify welcome email functionality
 *
 * Usage:
 * npx ts-node scripts/test-welcome-email.ts [email]
 *
 * Example:
 * npx ts-node scripts/test-welcome-email.ts michael@cengkuru.com
 */

import 'dotenv/config';
import { emailService } from '../src/services/emailService';

const testEmail = process.argv[2] || 'michael@cengkuru.com';

async function testWelcomeEmail() {
  console.log('='.repeat(60));
  console.log('Testing Welcome Email Functionality');
  console.log('='.repeat(60));
  console.log('');

  // First, verify SMTP connection
  console.log('1. Verifying SMTP connection...');
  const connected = await emailService.verifyConnection();
  if (!connected) {
    console.error('   ❌ SMTP connection failed!');
    console.error('   Check your EMAIL_* environment variables.');
    process.exit(1);
  }
  console.log('   ✅ SMTP connection verified');
  console.log('');

  // Send test welcome email
  console.log(`2. Sending welcome email to: ${testEmail}`);
  console.log('');

  const testPassword = 'TestP@ss123!';

  const result = await emailService.sendWelcomeEmail(
    'Test Admin User',
    testEmail,
    testPassword
  );

  console.log('');
  if (result.success) {
    console.log('   ✅ Email sent successfully!');
    console.log(`   Message ID: ${result.messageId}`);
    console.log('');
    console.log('   📧 Check the inbox of:', testEmail);
    console.log('');
    console.log('   The email should contain:');
    console.log('   - Login credentials (email + temporary password)');
    console.log('   - Link to Admin Panel');
    console.log('   - Link to Public Knowledge Hub');
  } else {
    console.error('   ❌ Failed to send email!');
    console.error(`   Error: ${result.error}`);
    process.exit(1);
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('Test Complete');
  console.log('='.repeat(60));
}

testWelcomeEmail().catch(console.error);
