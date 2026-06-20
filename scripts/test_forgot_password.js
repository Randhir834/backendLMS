#!/usr/bin/env node
/**
 * Test script for Forgot Password flow
 * 
 * Usage: node scripts/test_forgot_password.js <email>
 * Example: node scripts/test_forgot_password.js student@example.com
 */

const { findUserByEmail } = require('../src/services/userService');
const { createResetToken } = require('../src/services/passwordResetService');
const { query } = require('../src/config/database');

async function testForgotPassword(email) {
  try {
    console.log('\n🔍 Testing Forgot Password Flow...\n');
    console.log(`Email: ${email}\n`);

    // Step 1: Check if user exists
    console.log('Step 1: Looking up user...');
    const user = await findUserByEmail(email);
    
    if (!user) {
      console.log('❌ User not found\n');
      process.exit(1);
    }
    
    console.log(`✅ User found: ${user.name} (${user.role})\n`);

    // Step 2: Generate reset token
    console.log('Step 2: Generating reset token...');
    const token = await createResetToken(user.id);
    console.log(`✅ Token generated: ${token.substring(0, 20)}...\n`);

    // Step 3: Check token in database
    console.log('Step 3: Verifying token in database...');
    const tokenRecord = await query(
      'SELECT * FROM password_reset_tokens WHERE token = $1',
      [token]
    );
    
    if (tokenRecord.rows.length === 0) {
      console.log('❌ Token not found in database\n');
      process.exit(1);
    }
    
    const expiresAt = new Date(tokenRecord.rows[0].expires_at);
    const now = new Date();
    const minutesUntilExpiry = Math.floor((expiresAt - now) / 1000 / 60);
    
    console.log(`✅ Token verified in database`);
    console.log(`   Expires at: ${expiresAt.toISOString()}`);
    console.log(`   Time until expiry: ${minutesUntilExpiry} minutes\n`);

    // Step 4: Generate reset links for all portals
    console.log('Step 4: Generated reset links:\n');
    
    const portals = {
      student: 'http://localhost:3000',
      instructor: 'http://localhost:3001',
      admin: 'http://localhost:3002'
    };
    
    const userPortal = portals[user.role];
    
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📧 PASSWORD RESET LINK FOR ${user.role.toUpperCase()}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`User: ${user.name} <${user.email}>`);
    console.log(`Role: ${user.role}`);
    console.log(`Link: ${userPortal}/reset-password?token=${token}`);
    console.log(`Expires: ${minutesUntilExpiry} minutes`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    // Step 5: Summary
    console.log('✅ All checks passed!\n');
    console.log('Next steps:');
    console.log('1. Copy the reset link above');
    console.log('2. Open it in your browser');
    console.log('3. Enter a new password (min 8 characters)');
    console.log('4. Confirm the password');
    console.log('5. Click "Update password"\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Get email from command line arguments
const email = process.argv[2];

if (!email) {
  console.log('\n❌ Please provide an email address\n');
  console.log('Usage: node scripts/test_forgot_password.js <email>\n');
  console.log('Examples:');
  console.log('  node scripts/test_forgot_password.js student@example.com');
  console.log('  node scripts/test_forgot_password.js instructor@example.com');
  console.log('  node scripts/test_forgot_password.js admin@playfit.com\n');
  process.exit(1);
}

testForgotPassword(email);
