const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function analyzeUnusedTables() {
  console.log('🔍 Analyzing database tables for unused/redundant ones...\n');

  try {
    // Get all tables
    const tablesResult = await pool.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `);

    const tables = tablesResult.rows.map(r => r.tablename);
    console.log(`📊 Total tables found: ${tables.length}\n`);

    const unusedTables = [];
    const emptyTables = [];
    const deprecatedTables = [];

    // Check each table
    for (const table of tables) {
      // Skip migration_history - it's a system table
      if (table === 'migration_history') continue;

      // Check if table is empty
      const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
      const count = parseInt(countResult.rows[0].count);

      // Get table structure
      const columnsResult = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [table]);

      console.log(`\n📋 Table: ${table}`);
      console.log(`   Rows: ${count}`);
      console.log(`   Columns: ${columnsResult.rows.length}`);

      if (count === 0) {
        emptyTables.push({ table, columns: columnsResult.rows.length });
      }

      // Check for known deprecated/unused tables based on migrations
      const deprecatedKeywords = ['assignment_', 'attendance', 'quiz_', 'slot_'];
      if (deprecatedKeywords.some(keyword => table.includes(keyword))) {
        deprecatedTables.push({ 
          table, 
          count, 
          reason: 'Related to deprecated feature (assignments/quizzes/slots/attendance)' 
        });
      }
    }

    // Print summary
    console.log('\n\n' + '='.repeat(80));
    console.log('📊 ANALYSIS SUMMARY');
    console.log('='.repeat(80));

    if (emptyTables.length > 0) {
      console.log('\n🗑️  EMPTY TABLES (0 rows):');
      emptyTables.forEach(({ table, columns }) => {
        console.log(`   - ${table} (${columns} columns)`);
      });
    }

    if (deprecatedTables.length > 0) {
      console.log('\n⚠️  DEPRECATED/UNUSED TABLES:');
      deprecatedTables.forEach(({ table, count, reason }) => {
        console.log(`   - ${table} (${count} rows) - ${reason}`);
      });
    }

    // Specific recommendations
    console.log('\n\n' + '='.repeat(80));
    console.log('💡 RECOMMENDATIONS FOR REMOVAL');
    console.log('='.repeat(80));

    const toRemove = [
      {
        table: 'assignment_assignments',
        reason: 'Assignment feature was removed (migration: remove_quizzes_and_assignments.sql)',
        hasData: deprecatedTables.find(t => t.table === 'assignment_assignments')?.count > 0
      },
      {
        table: 'assignment_files',
        reason: 'Assignment feature was removed (migration: remove_quizzes_and_assignments.sql)',
        hasData: deprecatedTables.find(t => t.table === 'assignment_files')?.count > 0
      },
      {
        table: 'attendance',
        reason: 'Attendance feature was removed (migration: drop_attendance_table.sql)',
        hasData: deprecatedTables.find(t => t.table === 'attendance')?.count > 0
      },
      {
        table: 'quiz_options',
        reason: 'Quiz feature was removed (migration: remove_quizzes_and_assignments.sql)',
        hasData: deprecatedTables.find(t => t.table === 'quiz_options')?.count > 0
      },
      {
        table: 'quiz_responses',
        reason: 'Quiz feature was removed (migration: remove_quizzes_and_assignments.sql)',
        hasData: deprecatedTables.find(t => t.table === 'quiz_responses')?.count > 0
      },
      {
        table: 'instructor_availability_slots',
        reason: 'Slot booking system was removed (migration: remove_slot_system.sql)',
        hasData: deprecatedTables.find(t => t.table === 'instructor_availability_slots')?.count > 0
      },
      {
        table: 'slot_registrations',
        reason: 'Slot booking system was removed (migration: remove_slot_system.sql)',
        hasData: deprecatedTables.find(t => t.table === 'slot_registrations')?.count > 0
      }
    ];

    toRemove.forEach(({ table, reason, hasData }) => {
      const exists = tables.includes(table);
      if (exists) {
        console.log(`\n❌ ${table}`);
        console.log(`   Reason: ${reason}`);
        console.log(`   Has data: ${hasData ? 'YES ⚠️' : 'NO ✅'}`);
        console.log(`   Safe to remove: ${hasData ? 'NO - Contains data' : 'YES'}`);
      }
    });

    console.log('\n\n' + '='.repeat(80));
    console.log('✅ Analysis complete!');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Error during analysis:', error);
  } finally {
    await pool.end();
  }
}

analyzeUnusedTables();
