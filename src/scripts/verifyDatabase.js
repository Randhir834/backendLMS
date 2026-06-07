const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const { pool } = require('../config/database');

async function verifyDatabase() {
  const client = await pool.connect();

  try {
    console.log('🔍 Verifying Database Schema...\n');

    // Check all expected tables
    const expectedTables = [
      'migration_history',
      'categories',
      'users',
      'courses',
      'sections',
      'lessons',
      'enrollments',
      'payments',
      'assignments',
      'assignment_submissions',
      'quizzes',
      'quiz_questions',
      'quiz_answers',
      'quiz_attempts',
      'live_classes',
      'notifications',
      'lesson_progress',
      'system_settings',
      'password_reset_tokens',
      'course_instructors'
    ];

    console.log('📋 Checking Tables:');
    for (const tableName of expectedTables) {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `, [tableName]);

      const exists = result.rows[0].exists;
      console.log(`   ${exists ? '✅' : '❌'} ${tableName}`);
    }

    // Check user profile fields
    console.log('\n👤 Checking User Profile Fields:');
    const userColumns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN (
        'qualifications', 'specialization', 
        'date_of_birth', 'school', 'grade', 
        'parent_guardian_name', 'phone', 'location'
      )
      ORDER BY column_name;
    `);

    const expectedUserFields = [
      'qualifications',
      'specialization',
      'date_of_birth',
      'school',
      'grade',
      'parent_guardian_name',
      'phone',
      'location'
    ];

    const foundFields = new Set(userColumns.rows.map(r => r.column_name));
    
    for (const field of expectedUserFields) {
      const exists = foundFields.has(field);
      console.log(`   ${exists ? '✅' : '❌'} ${field}`);
    }

    // Check search indexes
    console.log('\n🔍 Checking Search Indexes:');
    const indexes = await client.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND indexname LIKE 'idx_%'
      ORDER BY indexname;
    `);

    console.log(`   Found ${indexes.rows.length} search indexes:`);
    indexes.rows.forEach(row => {
      console.log(`   ✅ ${row.indexname}`);
    });

    // Check migration history
    console.log('\n📊 Migration Statistics:');
    const stats = await client.query(`
      SELECT 
        COUNT(*) as total_migrations,
        MIN(applied_at) as first_migration,
        MAX(applied_at) as last_migration,
        SUM(execution_time_ms) as total_execution_time_ms
      FROM migration_history;
    `);

    const stat = stats.rows[0];
    console.log(`   Total migrations: ${stat.total_migrations}`);
    console.log(`   First migration: ${stat.first_migration}`);
    console.log(`   Last migration: ${stat.last_migration}`);
    console.log(`   Total execution time: ${stat.total_execution_time_ms}ms`);

    // Check for any missing migrations
    console.log('\n🎯 Migration Coverage:');
    const migrationFiles = await client.query(`
      SELECT migration_name 
      FROM migration_history 
      WHERE migration_name LIKE 'migrations/%'
      ORDER BY migration_name;
    `);

    console.log(`   Migration files applied: ${migrationFiles.rows.length}`);
    migrationFiles.rows.forEach(row => {
      console.log(`   ✅ ${row.migration_name}`);
    });

    console.log('\n✨ Database verification complete!');

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

verifyDatabase();
