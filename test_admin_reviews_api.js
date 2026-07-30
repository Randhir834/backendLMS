#!/usr/bin/env node

/**
 * Test Admin Reviews API Access
 */

const { pool } = require('./src/config/database');

async function testAdminReviewsAPI() {
  console.log('\n🔍 Testing Admin Reviews API Access...\n');
  
  try {
    // 1. Check if reviews exist
    console.log('1. Checking reviews in database...');
    const reviewsResult = await pool.query('SELECT id, name, status FROM reviews ORDER BY created_at DESC LIMIT 5');
    console.log(`   ✅ Found ${reviewsResult.rows.length} reviews`);
    reviewsResult.rows.forEach(r => {
      console.log(`      - #${r.id}: ${r.name} (${r.status})`);
    });
    
    // 2. Check if admin users exist
    console.log('\n2. Checking admin users...');
    const adminResult = await pool.query("SELECT id, email, name FROM users WHERE role = 'admin' LIMIT 3");
    console.log(`   ✅ Found ${adminResult.rows.length} admin users`);
    adminResult.rows.forEach(a => {
      console.log(`      - ${a.name || 'N/A'} (${a.email})`);
    });
    
    // 3. Test the API endpoint directly
    console.log('\n3. Testing API endpoint...');
    console.log('   📝 To test the API, use this curl command:');
    console.log('\n   First, login to get a token:');
    console.log('   curl -X POST http://localhost:5001/api/auth/login \\');
    console.log('     -H "Content-Type: application/json" \\');
    console.log(`     -d '{"email":"${adminResult.rows[0].email}","password":"YOUR_PASSWORD"}'`);
    console.log('\n   Then, use the token to fetch reviews:');
    console.log('   curl -X GET http://localhost:5001/api/reviews/pending \\');
    console.log('     -H "Authorization: Bearer YOUR_TOKEN_HERE"');
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Database checks passed!');
    console.log('='.repeat(60));
    console.log('\n💡 Next steps:');
    console.log('   1. Make sure you\'re logged in as an admin user');
    console.log('   2. Open browser console (F12) and check for errors');
    console.log('   3. Check Network tab for failed API requests');
    console.log('   4. Verify token is stored in localStorage\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

testAdminReviewsAPI();
