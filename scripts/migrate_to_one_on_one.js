/**
 * Migration Script: Update to 1-to-1 Mentoring Slots
 * Changes from group slots (capacity 10) to individual slots (capacity 1)
 */

const { query } = require('../src/config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  console.log('🔄 Starting migration: 1-to-1 mentoring slots\n');

  try {
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '../src/models/migrations/update_to_one_on_one_slots.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📖 Migration file loaded');
    console.log('📝 Executing migration...\n');

    // Execute the migration
    await query(migrationSQL);

    console.log('✅ Migration completed successfully!\n');
    console.log('Changes applied:');
    console.log('  - Updated all slots to max_capacity = 1');
    console.log('  - Changed default max_capacity to 1');
    console.log('  - Removed "one slot per day" constraint');
    console.log('  - Added "one student per slot" constraint');
    console.log('  - Cleaned up any duplicate slot registrations\n');
    
    // Verify the changes
    console.log('🔍 Verifying migration...\n');
    
    const capacityCheck = await query(`
      SELECT MAX(max_capacity) as max_cap, MIN(max_capacity) as min_cap
      FROM instructor_availability_slots
    `);
    
    if (capacityCheck.rows[0]) {
      console.log('✅ Slot capacities:', capacityCheck.rows[0]);
    }
    
    const indexCheck = await query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'slot_registrations' 
      AND indexname = 'idx_one_student_per_slot'
    `);
    
    if (indexCheck.rows.length > 0) {
      console.log('✅ Unique index created: idx_one_student_per_slot');
    }
    
    const oldIndexCheck = await query(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'slot_registrations' 
      AND indexname = 'idx_one_slot_per_day_per_course'
    `);
    
    if (oldIndexCheck.rows.length === 0) {
      console.log('✅ Old "one per day" constraint removed');
    }
    
    // Check for any conflicts
    const conflictCheck = await query(`
      SELECT slot_id, COUNT(*) as student_count
      FROM slot_registrations
      WHERE status = 'registered'
      GROUP BY slot_id
      HAVING COUNT(*) > 1
    `);
    
    if (conflictCheck.rows.length > 0) {
      console.log('⚠️  Warning: Found slots with multiple active registrations:');
      conflictCheck.rows.forEach(row => {
        console.log(`   Slot ${row.slot_id}: ${row.student_count} students`);
      });
    } else {
      console.log('✅ No duplicate registrations found');
    }
    
    console.log('\n🎉 Migration successful! System is now 1-to-1 mentoring.');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nError details:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run the migration
runMigration();
