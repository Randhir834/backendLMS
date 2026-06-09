const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const { pool } = require('../config/database');

async function runSubmissionHistoryMigration() {
  const client = await pool.connect();

  try {
    console.log('Starting submission history migration...');
    
    const migrationPath = path.join(__dirname, '..', 'models', 'migrations', 'add_submission_history.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    await client.query(sql);
    
    console.log('✓ Submission history migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runSubmissionHistoryMigration();
