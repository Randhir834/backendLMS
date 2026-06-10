const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? {
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false'
  } : false
});

async function checkAndFixUserRole() {
  const email = 'kumarrandhir1702@gmail.com';
  
  try {
    // Check current user role
    const result = await pool.query(
      'SELECT id, name, email, role FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      console.log(`❌ User not found: ${email}`);
      console.log('\nYou need to register this user first through the instructor registration form.');
      return;
    }

    const user = result.rows[0];
    console.log('\n📋 Current User Details:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);

    if (user.role === 'instructor') {
      console.log('\n✅ User already has instructor role! You should be able to log in.');
      console.log('\nIf you still get 403 error, check:');
      console.log('   1. Make sure you\'re using the correct password');
      console.log('   2. Check that the frontend is sending expectedRole: "instructor"');
      return;
    }

    // Offer to update role
    console.log(`\n⚠️  User has role: "${user.role}" but trying to login as "instructor"`);
    console.log('\nTo fix this, update the user role to instructor:');
    
    // Update role to instructor
    await pool.query(
      'UPDATE users SET role = $1 WHERE email = $2',
      ['instructor', email]
    );

    console.log('\n✅ User role updated to "instructor"!');
    console.log('   You can now log in to the instructor portal.');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkAndFixUserRole();
