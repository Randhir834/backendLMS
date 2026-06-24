const { query } = require('../src/config/database');

async function removeConstraint() {
  try {
    console.log('🔍 Checking for idx_one_slot_per_day_per_student constraint...');
    
    // Check if constraint exists
    const check = await query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'slot_registrations' 
      AND indexname = 'idx_one_slot_per_day_per_student'
    `);
    
    if (check.rows.length === 0) {
      console.log('✅ Constraint does not exist (already removed)');
      process.exit(0);
    }
    
    console.log('⚠️  Constraint exists - removing it now...');
    
    // Drop the constraint
    await query('DROP INDEX IF EXISTS idx_one_slot_per_day_per_student');
    
    console.log('✅ Successfully removed idx_one_slot_per_day_per_student constraint');
    console.log('');
    console.log('📝 Note: Students can now book multiple slots on the same day');
    console.log('   Time-based overlap validation is handled by the application');
    
    // Verify removal
    const verify = await query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'slot_registrations' 
      AND indexname = 'idx_one_slot_per_day_per_student'
    `);
    
    if (verify.rows.length === 0) {
      console.log('✅ Verified: Constraint successfully removed');
    } else {
      console.log('❌ Warning: Constraint still exists after removal attempt');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

removeConstraint();
