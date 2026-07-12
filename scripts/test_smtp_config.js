#!/usr/bin/env node

/**
 * SMTP Configuration Test Script
 * 
 * This script tests your email configuration without requiring a full server restart.
 * Perfect for debugging email issues in production.
 * 
 * Usage:
 *   node scripts/test_smtp_config.js
 *   node scripts/test_smtp_config.js test@example.com
 */

require('dotenv').config();
const nodemailer = require('nodemailer');

const testEmail = process.argv[2] || process.env.SMTP_USER || 'test@example.com';

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📧 SMTP CONFIGURATION TEST');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Check environment variables
console.log('1️⃣  Checking Environment Variables...\n');

const config = {
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT || 587,
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASS,
  from: process.env.EMAIL_FROM,
};

const checks = [
  { name: 'SMTP_HOST', value: config.host, required: true },
  { name: 'SMTP_PORT', value: config.port, required: true },
  { name: 'SMTP_USER', value: config.user, required: true },
  { name: 'SMTP_PASS', value: config.pass, required: true, mask: true },
  { name: 'EMAIL_FROM', value: config.from, required: true },
];

let allConfigured = true;
checks.forEach(check => {
  const isSet = check.value && check.value.toString().length > 0;
  const status = isSet ? '✓' : '✗';
  const displayValue = check.mask 
    ? (isSet ? '●●●●●●●●●●●●●●●●' : 'NOT SET')
    : (check.value || 'NOT SET');
  
  console.log(`   ${status} ${check.name}: ${displayValue}`);
  
  if (check.required && !isSet) {
    allConfigured = false;
  }
});

if (!allConfigured) {
  console.log('\n❌ SMTP is NOT properly configured!');
  console.log('   Missing required environment variables.');
  console.log('\n💡 To fix this:');
  console.log('   1. Copy missing variables from .env.example');
  console.log('   2. Set them in your production environment (Render/Heroku/etc.)');
  console.log('   3. Restart your server');
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  process.exit(1);
}

console.log('\n✅ All environment variables are set!\n');

// Test SMTP connection
console.log('2️⃣  Testing SMTP Connection...\n');

const transporter = nodemailer.createTransport({
  host: config.host,
  port: Number(config.port),
  secure: Number(config.port) === 465,
  auth: {
    user: config.user,
    pass: config.pass,
  },
  // Add debug logging
  debug: false,
  logger: false,
});

async function testConnection() {
  try {
    await transporter.verify();
    console.log('   ✓ Successfully connected to SMTP server');
    console.log(`   ✓ Server: ${config.host}:${config.port}`);
    console.log(`   ✓ User: ${config.user}\n`);
    return true;
  } catch (error) {
    console.error('   ✗ Failed to connect to SMTP server');
    console.error(`   ✗ Error: ${error.message}\n`);
    
    // Provide helpful hints
    if (error.message.includes('Invalid login')) {
      console.log('💡 HINT: Invalid credentials detected');
      console.log('   For Gmail, you MUST use an App Password:');
      console.log('   1. Go to: https://myaccount.google.com/apppasswords');
      console.log('   2. Enable 2-Step Verification if not enabled');
      console.log('   3. Create a new app password for "Playfit LMS"');
      console.log('   4. Copy the 16-character password (remove spaces)');
      console.log('   5. Update SMTP_PASS with this password\n');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.log('💡 HINT: Connection refused');
      console.log('   - Check if SMTP_HOST and SMTP_PORT are correct');
      console.log('   - Ensure your server has internet access');
      console.log('   - Check if firewall is blocking port 587/465\n');
    } else if (error.message.includes('ETIMEDOUT')) {
      console.log('💡 HINT: Connection timeout');
      console.log('   - Check your internet connection');
      console.log('   - Verify SMTP server is accessible from your location');
      console.log('   - Try using a different SMTP port (587 or 465)\n');
    }
    
    return false;
  }
}

async function testSendEmail() {
  console.log('3️⃣  Sending Test Email...\n');
  console.log(`   To: ${testEmail}`);
  console.log(`   From: ${config.from}\n`);
  
  try {
    const info = await transporter.sendMail({
      from: config.from,
      to: testEmail,
      subject: '✅ Playfit LMS - SMTP Test Successful',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">✅ SMTP Test Successful</h1>
          </div>
          <div style="padding: 30px; background: #f5f5f5;">
            <h2 style="color: #333;">Congratulations!</h2>
            <p style="font-size: 16px; color: #666;">
              Your SMTP configuration is working correctly. Password reset emails will now be sent successfully.
            </p>
            <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #667eea;">Configuration Details:</h3>
              <ul style="color: #666; line-height: 1.8;">
                <li>SMTP Host: ${config.host}</li>
                <li>SMTP Port: ${config.port}</li>
                <li>SMTP User: ${config.user}</li>
                <li>Email From: ${config.from}</li>
              </ul>
            </div>
            <p style="font-size: 14px; color: #999; margin-top: 30px;">
              Tested at: ${new Date().toISOString()}<br>
              Environment: ${process.env.NODE_ENV || 'development'}
            </p>
          </div>
        </div>
      `,
      text: `
SMTP Test Successful!

Your SMTP configuration is working correctly.
Password reset emails will now be sent successfully.

Configuration:
- SMTP Host: ${config.host}
- SMTP Port: ${config.port}
- SMTP User: ${config.user}
- Email From: ${config.from}

Tested at: ${new Date().toISOString()}
Environment: ${process.env.NODE_ENV || 'development'}
      `
    });

    console.log('   ✓ Email sent successfully!');
    console.log(`   ✓ Message ID: ${info.messageId}`);
    console.log(`\n   📬 Check your inbox at: ${testEmail}`);
    console.log('      (Don\'t forget to check spam folder)\n');
    
    return true;
  } catch (error) {
    console.error('   ✗ Failed to send email');
    console.error(`   ✗ Error: ${error.message}\n`);
    return false;
  }
}

// Run tests
(async () => {
  try {
    const connectionOk = await testConnection();
    
    if (!connectionOk) {
      console.log('❌ SMTP connection failed. Fix the connection issues first.\n');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      process.exit(1);
    }
    
    const emailOk = await testSendEmail();
    
    if (emailOk) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ ALL TESTS PASSED!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');
      console.log('Your forgot password feature is now fully functional!');
      console.log('Users will receive password reset emails at their registered email addresses.');
      console.log('');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      process.exit(0);
    } else {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('❌ EMAIL TEST FAILED');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Unexpected error:', error);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    process.exit(1);
  }
})();
