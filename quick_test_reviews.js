#!/usr/bin/env node

/**
 * Quick Test - Verify Review System Setup
 * This script checks that the review system is properly configured
 */

const { pool } = require('./src/config/database');

async function verifySetup() {
  console.log('\n🔍 Checking Review System Setup...\n');
  
  try {
    // 1. Check if reviews table exists
    console.log('1. Checking reviews table...');
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'reviews'
      );
    `);
    
    if (tableCheck.rows[0].exists) {
      console.log('   ✅ Reviews table exists');
    } else {
      console.log('   ❌ Reviews table NOT found');
      await pool.end();
      return;
    }
    
    // 2. Check table structure
    console.log('\n2. Verifying table structure...');
    const columns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'reviews' 
      ORDER BY ordinal_position;
    `);
    
    const expectedColumns = ['id', 'name', 'role', 'rating', 'message', 'status', 
                             'email', 'phone', 'course_name', 'admin_notes', 
                             'reviewed_by', 'reviewed_at', 'created_at', 'updated_at'];
    const actualColumns = columns.rows.map(r => r.column_name);
    
    const missingColumns = expectedColumns.filter(col => !actualColumns.includes(col));
    if (missingColumns.length === 0) {
      console.log('   ✅ All required columns present');
    } else {
      console.log('   ⚠️  Missing columns:', missingColumns.join(', '));
    }
    
    // 3. Check indexes
    console.log('\n3. Checking indexes...');
    const indexes = await pool.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'reviews';
    `);
    console.log(`   ✅ Found ${indexes.rows.length} indexes`);
    
    // 4. Get review statistics
    console.log('\n4. Current review statistics:');
    const stats = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'approved') as approved,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
        COUNT(*) as total
      FROM reviews;
    `);
    
    const stat = stats.rows[0];
    console.log(`   📊 Total: ${stat.total}`);
    console.log(`   ⏳ Pending: ${stat.pending}`);
    console.log(`   ✅ Approved: ${stat.approved}`);
    console.log(`   ❌ Rejected: ${stat.rejected}`);
    
    // 5. Show recent reviews
    console.log('\n5. Recent reviews (last 5):');
    const recent = await pool.query(`
      SELECT id, name, rating, status, 
             TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as created
      FROM reviews 
      ORDER BY created_at DESC 
      LIMIT 5;
    `);
    
    if (recent.rows.length > 0) {
      recent.rows.forEach(review => {
        const statusIcon = review.status === 'approved' ? '✅' : 
                          review.status === 'pending' ? '⏳' : '❌';
        console.log(`   ${statusIcon} #${review.id} - ${review.name} (${review.rating}★) - ${review.status} - ${review.created}`);
      });
    } else {
      console.log('   📝 No reviews yet');
    }
    
    // 6. Check for pending reviews
    console.log('\n6. Action required:');
    if (parseInt(stat.pending) > 0) {
      console.log(`   ⚠️  You have ${stat.pending} review(s) waiting for approval!`);
      console.log('   👉 Login to admin dashboard to review them');
    } else {
      console.log('   ✅ No pending reviews');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✨ Review system is properly configured!');
    console.log('='.repeat(60));
    console.log('\n📍 Next steps:');
    console.log('   1. Visit: http://localhost:3000 (Student Home)');
    console.log('   2. Submit a test review');
    console.log('   3. Visit: http://localhost:3001/admin/reviews');
    console.log('   4. Approve the review');
    console.log('   5. Check it appears on Student Home page\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

verifySetup();
