#!/usr/bin/env node
/**
 * Password Reset Utility
 * 
 * Usage: node scripts/reset_user_password.js <email> <new_password>
 * Example: node scripts/reset_user_password.js instructor@playfit.com NewPassword123
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('../src/config/database');

async function resetUserPassword() {
  try {
    const email = process.argv[2];
    const newPassword = process.argv[3];
    
    if (!email || !newPassword) {
      console.error('\n❌ Usage: node scripts/reset_user_password.js <email> <new_password>\n');
      console.log('Example: node scripts/reset_user_password.js instructor@playfit.com NewPassword123\n');
      process.exit(1);
    }
    
    if (newPassword.length < 8) {
      console.error('❌ Password must be at least 8 characters long\n');
      process.exit(1);
    }
    
    // Check if user exists
    const checkUser = await pool.query(
      'SELECT id, name, email, role FROM users WHERE email = $1',
      [email]
    );
    
    if (checkUser.rows.length === 0) {
      console.error(`❌ No user found with email: ${email}\n`);
      process.exit(1);
    }
    
    const user = checkUser.rows[0];
    console.log('\n📋 User found:');
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    
    // Hash the password
    console.log('\n🔒 Hashing password...');
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    // Update the password
    console.log('💾 Updating password in database...');
    await pool.query(
      'UPDATE users SET password = $1 WHERE email = $2',
      [hashedPassword, email]
    );
    
    console.log('\n✅ Password reset successfully!');
    console.log('\n📝 New credentials:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${newPassword}`);
    console.log(`   Role: ${user.role}`);
    console.log('\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

resetUserPassword();
