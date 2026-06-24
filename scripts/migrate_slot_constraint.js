/**
 * Migration Script: Update Slot Registration Constraint
 * Changes from: One slot per course (per student)
 * To: One slot per day per course (per student)
 */

const { query } = require('../src/config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  console.log('🔄 Starting migration: One slot per day per course constraint\n');

  try {
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '../src/models/migrations/update_slot_registration_constraint.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📖 Migration file loaded');
    console.log('📝 Executing migration...\n');

    // Execute the migration
    const result = await query(migrationSQL);

    console.log('✅ Migration completed successfully!\n');
    console.log('Changes applied:');
    console.log('  - Removed old UNIQUE(slot_id, student_id) constraint');
    console.log('  - Added day_of_week column to slot_registrations');
    console.log('  - Created unique index: one slot per day per course per student');
    console.log('  - Added trigger to auto-sync day_of_week from slots\n');
    
    // Verify the changes
    console.log('🔍 Verifying migration...\n');
    
    const columnCheck = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'slot_registrations' AND column_name = 'day_of_week'
    `);
    
    if (columnCheck.rows.length > 0) {
      console.log('✅ day_of_week column exists:', columnCheck.rows[0]);
    } else {
      console.log('❌ day_of_week column not found!');
    }
    
    const indexCheck = await query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'slot_registrations' 
      AND indexname = 'idx_one_slot_per_day_per_course'
    `);
    
    if (indexCheck.rows.length > 0) {
      console.log('✅ Unique index created:', indexCheck.rows[0].indexname);
    } else {
      console.log('❌ Unique index not found!');
    }
    
    console.log('\n🎉 Migration successful! You can now enforce one slot per day per course.');
    
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
