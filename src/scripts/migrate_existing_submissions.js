const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const { pool } = require('../config/database');

async function migrateExistingSubmissions() {
  const client = await pool.connect();

  try {
    console.log('Starting migration of existing submissions...');
    
    // Get all unique assignment_id and student_id combinations
    const submissionsQuery = await client.query(`
      SELECT DISTINCT assignment_id, student_id 
      FROM assignment_submissions
      ORDER BY assignment_id, student_id
    `);

    console.log(`Found ${submissionsQuery.rows.length} unique student-assignment combinations`);

    for (const row of submissionsQuery.rows) {
      const { assignment_id, student_id } = row;

      // Get all submissions for this combination, ordered by submission time
      const submissions = await client.query(
        `SELECT id, submitted_at 
         FROM assignment_submissions 
         WHERE assignment_id = $1 AND student_id = $2 
         ORDER BY submitted_at ASC`,
        [assignment_id, student_id]
      );

      // Update each submission with version number
      for (let i = 0; i < submissions.rows.length; i++) {
        const version = i + 1;
        const isLatest = i === submissions.rows.length - 1;

        await client.query(
          `UPDATE assignment_submissions 
           SET version = $1, is_latest = $2 
           WHERE id = $3`,
          [version, isLatest, submissions.rows[i].id]
        );
      }
    }

    console.log('✓ Migration completed successfully');
    console.log(`Updated ${submissionsQuery.rows.length} submission groups`);
    
  } catch (error) {
    console.error('Migration failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrateExistingSubmissions();
