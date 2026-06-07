const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const { pool } = require('../config/database');

const modelsDir = path.join(__dirname, '..', 'models');
const migrationsDir = path.join(modelsDir, 'migrations');

// Calculate checksum for a file
function calculateChecksum(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

// Check if a migration has been applied
async function isMigrationApplied(client, migrationName) {
  const result = await client.query(
    'SELECT migration_name FROM migration_history WHERE migration_name = $1',
    [migrationName]
  );
  return result.rows.length > 0;
}

// Record migration in history
async function recordMigration(client, migrationName, checksum, executionTime) {
  await client.query(
    'INSERT INTO migration_history (migration_name, checksum, execution_time_ms) VALUES ($1, $2, $3)',
    [migrationName, checksum, executionTime]
  );
}

async function runMigrations() {
  const client = await pool.connect();

  try {
    console.log('🚀 Starting database migrations...\n');

    // Step 1: Ensure migration_history table exists
    console.log('📋 Checking migration history table...');
    const migrationHistoryPath = path.join(modelsDir, '00_migration_history.sql');
    if (fs.existsSync(migrationHistoryPath)) {
      const sql = fs.readFileSync(migrationHistoryPath, 'utf8');
      await client.query(sql);
      console.log('✅ Migration history table ready\n');
    }

    // Step 2: Run base model files (01-17)
    console.log('📦 Running base schema files...');
    const baseFiles = fs.readdirSync(modelsDir)
      .filter(f => f.endsWith('.sql') && f.match(/^\d{2}_/))
      .sort();

    for (const file of baseFiles) {
      const filePath = path.join(modelsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      const checksum = calculateChecksum(sql);

      const isApplied = await isMigrationApplied(client, file);

      if (!isApplied) {
        console.log(`  ⏳ Running: ${file}`);
        const startTime = Date.now();
        
        try {
          await client.query(sql);
          const executionTime = Date.now() - startTime;
          await recordMigration(client, file, checksum, executionTime);
          console.log(`  ✅ Completed: ${file} (${executionTime}ms)`);
        } catch (error) {
          // If table/object already exists, mark as applied and continue
          if (error.message.includes('already exists')) {
            console.log(`  ⚠️  Already exists: ${file} (marking as applied)`);
            const executionTime = Date.now() - startTime;
            await recordMigration(client, file, checksum, executionTime);
          } else {
            console.error(`  ❌ Failed: ${file}`);
            throw error;
          }
        }
      } else {
        console.log(`  ⏭️  Skipped: ${file} (already applied)`);
      }
    }

    console.log('\n📝 Running migration files...');
    
    // Step 3: Run migration files in migrations/ directory
    if (fs.existsSync(migrationsDir)) {
      const migrationFiles = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort();

      if (migrationFiles.length === 0) {
        console.log('  ℹ️  No migration files found');
      }

      for (const file of migrationFiles) {
        const filePath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(filePath, 'utf8');
        const checksum = calculateChecksum(sql);
        const migrationName = `migrations/${file}`;

        const isApplied = await isMigrationApplied(client, migrationName);

        if (!isApplied) {
          console.log(`  ⏳ Running: ${file}`);
          const startTime = Date.now();
          
          try {
            await client.query(sql);
            const executionTime = Date.now() - startTime;
            await recordMigration(client, migrationName, checksum, executionTime);
            console.log(`  ✅ Completed: ${file} (${executionTime}ms)`);
          } catch (error) {
            // If object already exists, mark as applied and continue
            if (error.message.includes('already exists')) {
              console.log(`  ⚠️  Already exists: ${file} (marking as applied)`);
              const executionTime = Date.now() - startTime;
              await recordMigration(client, migrationName, checksum, executionTime);
            } else {
              console.error(`  ❌ Failed: ${file}`);
              throw error;
            }
          }
        } else {
          console.log(`  ⏭️  Skipped: ${file} (already applied)`);
        }
      }
    }

    // Step 4: Show migration summary
    console.log('\n📊 Migration Summary:');
    const summary = await client.query(`
      SELECT 
        COUNT(*) as total_migrations,
        MAX(applied_at) as last_migration_date
      FROM migration_history
    `);
    
    console.log(`  Total migrations applied: ${summary.rows[0].total_migrations}`);
    console.log(`  Last migration: ${summary.rows[0].last_migration_date}`);

    console.log('\n✨ All migrations completed successfully!');
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };
