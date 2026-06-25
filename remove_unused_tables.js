const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function removeUnusedTables() {
  console.log('🗑️  Starting removal of unused database tables...\n');

  try {
    // Step 1: Show current state
    console.log('📊 Current database state:');
    const beforeResult = await pool.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `);
    console.log(`   Total tables: ${beforeResult.rows.length}`);
    console.log('   Tables:', beforeResult.rows.map(r => r.tablename).join(', '));

    // Step 2: List tables to be removed
    const tablesToRemove = [
      'assignment_files',
      'assignment_assignments',
      'attendance',
      'quiz_responses',
      'quiz_options',
      'slot_registrations',
      'instructor_availability_slots',
      'certificates',
      'instructor_registrations',
      'lesson_progress',
      'lessons',
      'sections'
    ];

    console.log('\n❌ Tables marked for removal:');
    for (const table of tablesToRemove) {
      const exists = beforeResult.rows.find(r => r.tablename === table);
      if (exists) {
        const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
        const count = parseInt(countResult.rows[0].count);
        console.log(`   - ${table} (${count} rows)`);
      }
    }

    // Step 3: Ask for confirmation
    console.log('\n⚠️  WARNING: This will permanently delete the above tables!');
    console.log('⚠️  Make sure you have a database backup before proceeding.');
    console.log('\nPress Ctrl+C to cancel, or wait 5 seconds to continue...\n');
    
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Step 4: Read and execute migration
    console.log('🚀 Executing migration...\n');
    const migrationPath = path.join(__dirname, 'src/models/migrations/remove_all_unused_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    await pool.query(migrationSQL);

    // Step 5: Show result
    console.log('\n✅ Migration executed successfully!\n');
    
    const afterResult = await pool.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `);
    
    console.log('📊 Final database state:');
    console.log(`   Total tables: ${afterResult.rows.length}`);
    console.log('   Removed: ' + (beforeResult.rows.length - afterResult.rows.length) + ' tables');
    console.log('\n   Remaining tables:');
    afterResult.rows.forEach(r => console.log(`   - ${r.tablename}`));

    console.log('\n✅ All unused tables have been removed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Remove corresponding SQL schema files');
    console.log('   2. Remove any migration files for these features');
    console.log('   3. Clean up any unused service/controller code');

  } catch (error) {
    console.error('❌ Error during migration:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

removeUnusedTables();
