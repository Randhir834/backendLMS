/**
 * Migration script to add folder_path column to course_materials table
 * Run with: node run_folder_migration.js
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? {
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false'
  } : false
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('========================================');
    console.log('Running folder_path migration...');
    console.log('========================================\n');

    // Read migration SQL file
    const migrationPath = path.join(__dirname, 'src/models/migrations/add_folder_path_to_materials.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('Migration SQL:');
    console.log(migrationSQL);
    console.log('\n========================================\n');

    // Check if column already exists
    const checkResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'course_materials' 
      AND column_name = 'folder_path'
    `);

    if (checkResult.rows.length > 0) {
      console.log('✅ Column "folder_path" already exists in course_materials table');
      console.log('Migration skipped - no changes needed\n');
      return;
    }

    // Run migration
    await client.query(migrationSQL);

    console.log('✅ Migration completed successfully!');
    console.log('✅ Column "folder_path" added to course_materials table');
    console.log('✅ Index created for better performance\n');

    console.log('========================================');
    console.log('Next steps:');
    console.log('1. Restart your backend server');
    console.log('2. Test uploading materials with folder structure');
    console.log('3. Check instructor view for folder grouping');
    console.log('========================================\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration
runMigration()
  .then(() => {
    console.log('Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration script error:', error);
    process.exit(1);
  });
