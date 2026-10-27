require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function updatePassword() {
  try {
    const email = 'mmegha.2615@gmail.com';
    const newPassword = 'Dhairya@123A';
    
    // First, verify the user exists
    const userCheck = await pool.query(
      'SELECT id, name, email FROM users WHERE email = $1',
      [email]
    );
    
    if (userCheck.rows.length === 0) {
      console.log('Error: No user found with this email address.');
      return;
    }
    
    const user = userCheck.rows[0];
    console.log('\n===== USER FOUND =====');
    console.log('ID:', user.id);
    console.log('Name:', user.name);
    console.log('Email:', user.email);
    
    // Hash the new password
    console.log('\nHashing new password...');
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update the password
    console.log('Updating password in database...');
    const updateResult = await pool.query(
      `UPDATE users 
       SET password = $1, updated_at = NOW() 
       WHERE email = $2
       RETURNING id, name, email, updated_at`,
      [hashedPassword, email]
    );
    
    if (updateResult.rows.length > 0) {
      console.log('\n✓ PASSWORD UPDATED SUCCESSFULLY!');
      console.log('Updated At:', updateResult.rows[0].updated_at);
      console.log('\nNew Password:', newPassword);
      console.log('\nThe student can now login with:');
      console.log('Email:', email);
      console.log('Password:', newPassword);
    } else {
      console.log('\n✗ Failed to update password.');
    }
    
  } catch (error) {
    console.error('Error updating password:', error.message);
  } finally {
    await pool.end();
  }
}

updatePassword();
