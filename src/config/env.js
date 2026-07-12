/**
 * Validates required environment variables before the HTTP server starts.
 * Optional integrations (Supabase Storage) are checked at runtime when used.
 */
function validateEnv() {
  const errors = [];

  // Check JWT_SECRET
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    errors.push('JWT_SECRET is required but not set in environment variables');
  } else if (String(jwtSecret).length < 8) {
    errors.push(`JWT_SECRET must be at least 8 characters (current: ${jwtSecret.length} chars)`);
  }

  // Check Database URL
  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
  const hasDiscrete =
    process.env.DB_HOST &&
    process.env.DB_NAME &&
    process.env.DB_USER &&
    process.env.DB_PASSWORD !== undefined;

  if (!hasDatabaseUrl && !hasDiscrete) {
    errors.push('DATABASE_URL is required (PostgreSQL connection string)');
  }

  // Check SMTP configuration (not required but important for password reset)
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const emailFrom = process.env.EMAIL_FROM;
  const smtpConfigured = smtpHost && smtpUser && smtpPass && emailFrom;

  // Log configuration status
  console.log('[env] Configuration Check:');
  console.log(`  - JWT_SECRET: ${jwtSecret ? '✓ Set' : '✗ Missing'}`);
  console.log(`  - DATABASE_URL: ${hasDatabaseUrl ? '✓ Set' : '✗ Missing'}`);
  console.log(`  - NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
  console.log(`  - RAZORPAY_KEY_ID: ${process.env.RAZORPAY_KEY_ID ? '✓ Set' : '✗ Missing'}`);
  console.log(`  - RAZORPAY_KEY_SECRET: ${process.env.RAZORPAY_KEY_SECRET ? '✓ Set' : '✗ Missing'}`);
  console.log(`  - SMTP Configuration: ${smtpConfigured ? '✓ Complete' : '⚠️  Incomplete'}`);
  
  if (!smtpConfigured) {
    console.warn('\n⚠️  [env] WARNING: SMTP credentials not fully configured!');
    console.warn('   Email features (forgot password, notifications) will NOT work!');
    console.warn('   Missing variables:');
    if (!smtpHost) console.warn('   - SMTP_HOST');
    if (!smtpUser) console.warn('   - SMTP_USER');
    if (!smtpPass) console.warn('   - SMTP_PASS');
    if (!emailFrom) console.warn('   - EMAIL_FROM');
    console.warn('   Please set these in your environment variables.\n');
  } else {
    console.log(`    ✓ Host: ${smtpHost}`);
    console.log(`    ✓ Port: ${process.env.SMTP_PORT || 587}`);
    console.log(`    ✓ User: ${smtpUser}`);
    console.log(`    ✓ From: ${emailFrom}`);
  }

  if (errors.length) {
    console.error('\n[env] ❌ CONFIGURATION ERRORS:');
    errors.forEach(err => console.error(`  • ${err}`));
    console.error('\n[env] Please set the following environment variables on Render:');
    console.error('  1. JWT_SECRET (any string, 32+ characters recommended)');
    console.error('  2. DATABASE_URL (PostgreSQL connection string)');
    console.error('  3. CORS_ORIGIN (comma-separated list of allowed origins)');
    process.exit(1);
  }

  console.log('[env] ✓ All required environment variables are set');
}

module.exports = { validateEnv };
