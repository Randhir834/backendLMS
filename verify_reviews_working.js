#!/usr/bin/env node

const { pool } = require('./src/config/database');

console.log('\n' + '='.repeat(70));
console.log('  🔍 ADMIN REVIEWS SYSTEM - COMPLETE VERIFICATION');
console.log('='.repeat(70) + '\n');

async function verify() {
  const client = await pool.connect();
  
  try {
    // 1. Check reviews table
    console.log('✅ Step 1: Checking reviews table...');
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'reviews'
      );
    `);
    console.log(`   ${tableCheck.rows[0].exists ? '✓' : '✗'} Reviews table exists\n`);
    
    // 2. Test the FIXED query (this was failing before)
    console.log('✅ Step 2: Testing FIXED SQL query...');
    const fixedQuery = await client.query(`
      SELECT 
        r.*,
        u.name as reviewed_by_name
      FROM reviews r
      LEFT JOIN users u ON r.reviewed_by = u.id
      WHERE r.status = 'pending'
      ORDER BY r.created_at DESC
    `);
    console.log(`   ✓ Query executed successfully (was 503 error before)`);
    console.log(`   ✓ Found ${fixedQuery.rows.length} pending reviews\n`);
    
    // 3. Display reviews
    if (fixedQuery.rows.length > 0) {
      console.log('✅ Step 3: Pending reviews that will show in admin dashboard:\n');
      fixedQuery.rows.forEach((review, index) => {
        console.log(`   Review ${index + 1}:`);
        console.log(`   ├─ ID: ${review.id}`);
        console.log(`   ├─ Name: ${review.name}`);
        console.log(`   ├─ Role: ${review.role}`);
        console.log(`   ├─ Rating: ${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)} (${review.rating}/5)`);
        console.log(`   ├─ Status: ${review.status.toUpperCase()}`);
        console.log(`   ├─ Message: "${review.message}"`);
        console.log(`   ├─ Created: ${new Date(review.created_at).toLocaleString()}`);
        console.log(`   └─ Course: ${review.course_name || 'Not specified'}\n`);
      });
    } else {
      console.log('   ⚠️  No pending reviews found\n');
    }
    
    // 4. Check stats (what admin dashboard will show)
    console.log('✅ Step 4: Review statistics (for admin dashboard):\n');
    const stats = await client.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count,
        COUNT(*) as total_count,
        ROUND(AVG(rating) FILTER (WHERE status = 'approved'), 2) as average_rating
      FROM reviews
    `);
    
    const s = stats.rows[0];
    console.log('   Statistics Cards will show:');
    console.log(`   ┌─────────────────────────────────────────┐`);
    console.log(`   │ Pending: ${String(s.pending_count).padEnd(6)} Approved: ${String(s.approved_count).padEnd(6)} Rejected: ${String(s.rejected_count).padEnd(6)} │`);
    console.log(`   │ Total: ${String(s.total_count).padEnd(8)} Avg Rating: ${s.average_rating || 'N/A'.padEnd(14)} │`);
    console.log(`   └─────────────────────────────────────────┘\n`);
    
    // 5. Check admin users
    console.log('✅ Step 5: Available admin users:\n');
    const admins = await client.query(`
      SELECT id, name, email 
      FROM users 
      WHERE role = 'admin' 
      ORDER BY id
      LIMIT 5
    `);
    
    if (admins.rows.length > 0) {
      admins.rows.forEach((admin, index) => {
        console.log(`   ${index + 1}. ${admin.name || 'No name'}`);
        console.log(`      Email: ${admin.email}`);
        console.log(`      Login at: http://localhost:3001/login\n`);
      });
    }
    
    // 6. API endpoint test
    console.log('✅ Step 6: Backend API status:\n');
    const http = require('http');
    
    const healthCheck = new Promise((resolve, reject) => {
      http.get('http://localhost:5001/health', (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve(json);
          } catch (e) {
            reject(e);
          }
        });
      }).on('error', reject);
    });
    
    try {
      const health = await healthCheck;
      console.log(`   ✓ Backend is running on port 5001`);
      console.log(`   ✓ Status: ${health.status}`);
      console.log(`   ✓ Environment: ${health.env}\n`);
    } catch (error) {
      console.log(`   ✗ Backend not running on port 5001`);
      console.log(`   → Start it with: cd backend && npm start\n`);
    }
    
    // Final summary
    console.log('='.repeat(70));
    console.log('  📊 VERIFICATION COMPLETE');
    console.log('='.repeat(70) + '\n');
    
    if (fixedQuery.rows.length > 0) {
      console.log('✅ Everything is working! The admin dashboard should now show reviews.\n');
      console.log('📌 To view reviews in admin dashboard:\n');
      console.log('   1. Make sure backend is running (check Step 6 above)');
      console.log('   2. Go to: http://localhost:3001/login');
      console.log('   3. Login with one of the admin accounts above');
      console.log('   4. Click "Reviews" in the sidebar');
      console.log('   5. You should see the pending reviews listed above\n');
      console.log('💡 If still not showing:');
      console.log('   - Press F12 to open browser DevTools');
      console.log('   - Check Console tab for [Reviews] logs');
      console.log('   - Check Network tab for API call status');
      console.log('   - Verify you\'re logged in (check localStorage.getItem(\'token\'))\n');
    } else {
      console.log('⚠️  No pending reviews to display.\n');
      console.log('   Submit a review from: http://localhost:3000\n');
    }
    
  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    console.error('   Stack:', error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

verify();
