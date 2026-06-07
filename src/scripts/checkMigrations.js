const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const { pool } = require('../config/database');

const modelsDir = path.join(__dirname, '..', 'models');
const migrationsDir = path.join(modelsDir, 'migrations');

async function checkMigrations() {
  const client = await pool.connect();

  try {
    console.log('🔍 Checking migration status...\n');

    // Check if migration_history table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'migration_history'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('⚠️  Migration history table does not exist!');
      console.log('   Run: npm run migrate:full\n');
      return;
    }

    // Get all applied migrations
    const appliedMigrations = await client.query(`
      SELECT migration_name, applied_at, execution_time_ms
      FROM migration_history
      ORDER BY applied_at
    `);

    console.log('✅ Applied Migrations:');
    if (appliedMigrations.rows.length === 0) {
      console.log('   No migrations applied yet\n');
    } else {
      appliedMigrations.rows.forEach(row => {
        console.log(`   ✓ ${row.migration_name} (${row.applied_at.toISOString()}, ${row.execution_time_ms}ms)`);
      });
      console.log('');
    }

    // Check for pending base migrations
    const baseFiles = fs.readdirSync(modelsDir)
      .filter(f => f.endsWith('.sql') && f.match(/^\d{2}_/))
      .sort();

    const appliedNames = new Set(appliedMigrations.rows.map(r => r.migration_name));
    const pendingBase = baseFiles.filter(f => !appliedNames.has(f));

    if (pendingBase.length > 0) {
      console.log('⏳ Pending Base Migrations:');
      pendingBase.forEach(file => {
        console.log(`   ○ ${file}`);
      });
      console.log('');
    }

    // Check for pending migration files
    if (fs.existsSync(migrationsDir)) {
      const migrationFiles = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort();

      const pendingMigrations = migrationFiles.filter(f => 
        !appliedNames.has(`migrations/${f}`)
      );

      if (pendingMigrations.length > 0) {
        console.log('⏳ Pending Migration Files:');
        pendingMigrations.forEach(file => {
          console.log(`   ○ ${file}`);
        });
        console.log('');
      }
    }

    // Check all tables in database
    console.log('📋 Database Tables:');
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    tables.rows.forEach(row => {
      console.log(`   • ${row.table_name}`);
    });
    console.log('');

    // Summary
    const totalFiles = baseFiles.length + (fs.existsSync(migrationsDir) ? fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).length : 0);
    const totalApplied = appliedMigrations.rows.length;
    const totalPending = totalFiles - totalApplied;

    console.log('📊 Summary:');
    console.log(`   Total migration files: ${totalFiles}`);
    console.log(`   Applied: ${totalApplied}`);
    console.log(`   Pending: ${totalPending}`);

    if (totalPending > 0) {
      console.log('\n💡 To apply pending migrations, run: npm run migrate:full');
    } else {
      console.log('\n✨ All migrations are up to date!');
    }

  } catch (error) {
    console.error('❌ Error checking migrations:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

checkMigrations();
