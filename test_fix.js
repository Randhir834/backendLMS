const { pool } = require('./src/config/database');

async function testFix() {
  const client = await pool.connect();
  
  try {
    console.log('Testing the fixed query...\n');
    
    // Test the query that was failing
    const result = await client.query(`
      SELECT 
        r.*,
        u.name as reviewed_by_name
      FROM reviews r
      LEFT JOIN users u ON r.reviewed_by = u.id
      WHERE r.status = $1
      ORDER BY r.created_at DESC
    `, ['pending']);
    
    console.log('✅ Query executed successfully!');
    console.log(`Found ${result.rows.length} pending review(s):\n`);
    
    result.rows.forEach(review => {
      console.log(`ID: ${review.id}`);
      console.log(`Name: ${review.name}`);
      console.log(`Role: ${review.role}`);
      console.log(`Rating: ${review.rating}★`);
      console.log(`Status: ${review.status}`);
      console.log(`Message: ${review.message}`);
      console.log(`Reviewed by: ${review.reviewed_by_name || 'Not yet reviewed'}`);
      console.log('---');
    });
    
  } catch (error) {
    console.error('❌ Query failed:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

testFix();
