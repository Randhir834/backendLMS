require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? {
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false'
  } : false
});

const removeTables = async () => {
  const client = await pool.connect();
  
  try {
    console.log('Starting migration: Removing quiz and assignment tables...\n');

    // Drop quiz-related tables
    console.log('Dropping quiz_answers table...');
    await client.query('DROP TABLE IF EXISTS quiz_answers CASCADE');
    
    console.log('Dropping quiz_attempts table...');
    await client.query('DROP TABLE IF EXISTS quiz_attempts CASCADE');
    
    console.log('Dropping quiz_assignments table...');
    await client.query('DROP TABLE IF EXISTS quiz_assignments CASCADE');
    
    console.log('Dropping quiz_questions table...');
    await client.query('DROP TABLE IF EXISTS quiz_questions CASCADE');
    
    console.log('Dropping quizzes table...');
    await client.query('DROP TABLE IF EXISTS quizzes CASCADE');

    // Drop assignment-related tables
    console.log('Dropping assignment_submissions table...');
    await client.query('DROP TABLE IF EXISTS assignment_submissions CASCADE');
    
    console.log('Dropping assignments table...');
    await client.query('DROP TABLE IF EXISTS assignments CASCADE');

    // Log the migration
    console.log('\nLogging migration to migration_history...');
    await client.query(`
      INSERT INTO migration_history (migration_name, applied_at)
      VALUES ('remove_quizzes_and_assignments', NOW())
      ON CONFLICT (migration_name) DO NOTHING
    `);

    console.log('\n✅ Migration completed successfully!');
    console.log('All quiz and assignment tables have been removed from the database.');
    
  } catch (error) {
    console.error('\n❌ Error during migration:', error.message);
    console.error(error);
  } finally {
    client.release();
    await pool.end();
  }
};

removeTables();
