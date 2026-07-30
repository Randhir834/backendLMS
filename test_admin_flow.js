#!/usr/bin/env node

const axios = require('axios');

const API_BASE_URL = 'http://localhost:5001/api';

async function testAdminFlow() {
  console.log('\n🧪 Testing Admin Review Flow\n');
  console.log('=' .repeat(60));
  
  try {
    // Step 1: Login as admin
    console.log('\n1️⃣  Logging in as admin...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'cplayfit@gmail.com',
      password: 'Admin@123'
    });
    
    const token = loginResponse.data.token;
    const user = loginResponse.data.user;
    
    console.log('   ✅ Login successful!');
    console.log(`   👤 User: ${user.name} (${user.email})`);
    console.log(`   🔑 Token: ${token.substring(0, 20)}...`);
    
    // Step 2: Fetch all reviews
    console.log('\n2️⃣  Fetching all reviews...');
    const allReviewsResponse = await axios.get(`${API_BASE_URL}/reviews/all?status=pending&limit=100`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log(`   ✅ Fetched ${allReviewsResponse.data.reviews.length} pending reviews`);
    allReviewsResponse.data.reviews.forEach(r => {
      console.log(`      - #${r.id}: ${r.name} (${r.rating}★) - ${r.status}`);
    });
    
    // Step 3: Fetch stats
    console.log('\n3️⃣  Fetching review stats...');
    const statsResponse = await axios.get(`${API_BASE_URL}/reviews/stats`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const stats = statsResponse.data.stats;
    console.log('   ✅ Stats fetched:');
    console.log(`      Pending: ${stats.pending_count}`);
    console.log(`      Approved: ${stats.approved_count}`);
    console.log(`      Rejected: ${stats.rejected_count}`);
    console.log(`      Total: ${stats.total_count}`);
    console.log(`      Avg Rating: ${stats.average_rating || 'N/A'}`);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS PASSED!');
    console.log('='.repeat(60));
    console.log('\n📌 Next Steps:');
    console.log('   1. Make sure backend is running: npm start');
    console.log('   2. Login to admin dashboard: http://localhost:3001/login');
    console.log('   3. Go to Reviews page: http://localhost:3001/admin/reviews');
    console.log('   4. You should see the pending reviews');
    console.log('\n💡 If the admin page shows "No Reviews Found":');
    console.log('   - Open browser DevTools (F12)');
    console.log('   - Check Console for [Reviews] logs');
    console.log('   - Check Network tab for API calls');
    console.log('   - Verify you\'re logged in as admin\n');
    
  } catch (error) {
    console.error('\n❌ Test Failed!');
    console.error('Error:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('\n💡 Authentication failed. Check credentials:');
      console.log('   Email: cplayfit@gmail.com');
      console.log('   Password: Admin@123');
    }
    
    process.exit(1);
  }
}

testAdminFlow();
