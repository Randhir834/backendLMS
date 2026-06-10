require('dotenv').config();

const { Pool } = require('pg');

/**
 * Supports local PostgreSQL (discrete env vars) or a single connection string
 * (recommended for Supabase, Neon, RDS): DATABASE_URL
 *
 * Supabase dashboard → Project Settings → Database:
 * - "URI" (direct, port 5432) — good for migrations and sessions
 * - "Pooler" / Transaction mode (port 6543) — good for serverless/high concurrency
 */
function buildPoolConfig() {
  if (process.env.DATABASE_URL) {
    const config = {
      connectionString: process.env.DATABASE_URL,
      max: Number(process.env.DB_POOL_MAX || 20),
      idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS || 30000),
      connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT_MS || 15000),
    };

    if (process.env.DB_SSL !== 'false') {
      config.ssl =
        process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true'
          ? { rejectUnauthorized: true }
          : { rejectUnauthorized: false };
    }

    return config;
  }

  const config = {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    max: Number(process.env.DB_POOL_MAX || 20),
    idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS || 30000),
    connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT_MS || 15000),
  };

  if (process.env.DB_SSL === 'true') {
    config.ssl = { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true' };
  }

  return config;
}

const pool = new Pool(buildPoolConfig());

pool.on('error', (err) => {
  console.error('[database] Pool error:', err);
});

const query = async (text, params) => {
  const start = Date.now();
  const result = await pool.query(text, params);
  if (process.env.LOG_SQL === 'true') {
    const ms = Date.now() - start;
    console.log(`[sql] ${ms}ms ${text.replace(/\s+/g, ' ').slice(0, 120)}`);
  }
  return result;
};

module.exports = { query, pool };
