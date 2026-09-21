const fs = require('fs');
const path = require('path');
const db = require('../src/config/database');

async function runMigration() {
  const client = await db.pool.connect();
  
  try {
    console.log('Starting migration: Add status and notes to instructor_registrations...');
    
    const migrationPath = path.join(__dirname, '../src/models/migrations/add_status_notes_to_instructor_registrations.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    await client.query(sql);
    
    console.log('✓ Migration completed successfully!');
    console.log('✓ Added status and notes columns to instructor_registrations table');
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await db.pool.end();
  }
}

runMigration()
  .then(() => {
    console.log('\nAll migrations completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nMigration failed:', error);
    process.exit(1);
  });
