/**
 * Migration Script: Add one slot per day restriction (global)
 * Enforces: Student can book only ONE slot per day across ALL courses
 */

const { query } = require('../src/config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  console.log('🔄 Starting migration: One slot per day per student (global)\n');

  try {
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '../src/models/migrations/add_one_slot_per_day_global.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📖 Migration file loaded');
    console.log('📝 Executing migration...\n');

    // Execute the migration
    await query(migrationSQL);

    console.log('✅ Migration completed successfully!\n');
    console.log('Changes applied:');
    console.log('  - Added constraint: one slot per day per student (any course)');
    console.log('  - Cleaned up any duplicate day bookings');
    console.log('  - Kept existing: one student per slot constraint\n');
    
    // Verify the changes
    console.log('🔍 Verifying migration...\n');
    
    const indexCheck = await query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'slot_registrations' 
      AND indexname IN ('idx_one_slot_per_day_per_student', 'idx_one_student_per_slot')
      ORDER BY indexname
    `);
    
    if (indexCheck.rows.length === 2) {
      console.log('✅ Both constraints exist:');
      indexCheck.rows.forEach(idx => {
        console.log(`   - ${idx.indexname}`);
      });
    } else {
      console.log('⚠️  Warning: Expected 2 constraints, found:', indexCheck.rows.length);
    }
    
    // Check for any violations
    const dayViolations = await query(`
      SELECT sr.student_id, ias.day_of_week, COUNT(*) as booking_count
      FROM slot_registrations sr
      JOIN instructor_availability_slots ias ON sr.slot_id = ias.id
      WHERE sr.status = 'registered'
      GROUP BY sr.student_id, ias.day_of_week
      HAVING COUNT(*) > 1
    `);
    
    if (dayViolations.rows.length > 0) {
      console.log('\n⚠️  Warning: Found students with multiple day bookings:');
      dayViolations.rows.forEach(row => {
        console.log(`   Student ${row.student_id}, Day ${row.day_of_week}: ${row.booking_count} bookings`);
      });
    } else {
      console.log('\n✅ No duplicate day bookings found');
    }
    
    const slotViolations = await query(`
      SELECT slot_id, COUNT(*) as student_count
      FROM slot_registrations
      WHERE status = 'registered'
      GROUP BY slot_id
      HAVING COUNT(*) > 1
    `);
    
    if (slotViolations.rows.length > 0) {
      console.log('⚠️  Warning: Found slots with multiple students:');
      slotViolations.rows.forEach(row => {
        console.log(`   Slot ${row.slot_id}: ${row.student_count} students`);
      });
    } else {
      console.log('✅ No duplicate slot bookings found');
    }
    
    console.log('\n🎉 Migration successful!');
    console.log('   Rule 1: One student per slot (1-to-1 mentoring)');
    console.log('   Rule 2: One slot per day per student (any course)\n');
    
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
