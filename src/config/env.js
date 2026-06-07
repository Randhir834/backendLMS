/**
 * Validates required environment variables before the HTTP server starts.
 * Optional integrations (Supabase Storage) are checked at runtime when used.
 */
function validateEnv() {
  const errors = [];

  if (!process.env.JWT_SECRET || String(process.env.JWT_SECRET).length < 8) {
    errors.push('JWT_SECRET must be set (use at least 8 characters; 32+ recommended for production)');
  }

  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
  const hasDiscrete =
    process.env.DB_HOST &&
    process.env.DB_NAME &&
    process.env.DB_USER &&
    process.env.DB_PASSWORD !== undefined;

  if (!hasDatabaseUrl && !hasDiscrete) {
    errors.push('Set DATABASE_URL (recommended) or DB_HOST, DB_NAME, DB_USER, and DB_PASSWORD');
  }

  if (errors.length) {
    console.error('[env] Configuration errors:\n', errors.map((e) => `  - ${e}`).join('\n'));
    process.exit(1);
  }
}

module.exports = { validateEnv };
