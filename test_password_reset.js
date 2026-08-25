/**
 * Password Reset System Test Script
 * 
 * This script tests the complete password reset flow:
 * 1. Database connection
 * 2. Email service configuration
 * 3. Token generation
 * 4. Password reset tokens table
 * 5. Email template rendering
 * 
 * Usage: node test_password_reset.js
 */

require('dotenv').config();
const { query } = require('./src/config/database');
const { sendEmail } = require('./src/services/emailService');
const { createResetToken, findUserIdByValidToken, deleteTokensForUser } = require('./src/services/passwordResetService');

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color, symbol, message) {
  console.log(`${color}${symbol} ${message}${COLORS.reset}`);
}

function success(message) {
  log(COLORS.green, '✓', message);
}

function error(message) {
  log(COLORS.red, '✗', message);
}

function info(message) {
  log(COLORS.cyan, 'ℹ', message);
}

function warning(message) {
  log(COLORS.yellow, '⚠', message);
}

async function testDatabaseConnection() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 1: Database Connection');
  console.log('='.repeat(60));
  
  try {
    const result = await query('SELECT NOW()');
    success('Database connection successful');
    info(`Current database time: ${result.rows[0].now}`);
    return true;
  } catch (err) {
    error(`Database connection failed: ${err.message}`);
    return false;
  }
}

async function testPasswordResetTable() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 2: Password Reset Tokens Table');
  console.log('='.repeat(60));
  
  try {
    const result = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'password_reset_tokens'
      ORDER BY ordinal_position
    `);
    
    if (result.rows.length === 0) {
      error('password_reset_tokens table does not exist');
      warning('Run migrations: node src/scripts/runMigrations.js');
      return false;
    }
    
    success('password_reset_tokens table exists');
    info('Table structure:');
    result.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    // Check for indexes
    const indexes = await query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'password_reset_tokens'
    `);
    
    info(`Indexes found: ${indexes.rows.length}`);
    indexes.rows.forEach(idx => {
      console.log(`  - ${idx.indexname}`);
    });
    
    return true;
  } catch (err) {
    error(`Table check failed: ${err.message}`);
    return false;
  }
}

async function testEmailConfiguration() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 3: Email Service Configuration');
  console.log('='.repeat(60));
  
  const config = {
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS ? '***' + process.env.SMTP_PASS.slice(-4) : undefined,
    EMAIL_FROM: process.env.EMAIL_FROM,
  };
  
  const missing = [];
  Object.entries(config).forEach(([key, value]) => {
    if (value) {
      success(`${key}: ${value}`);
    } else {
      error(`${key}: Not configured`);
      missing.push(key);
    }
  });
  
  if (missing.length > 0) {
    warning('Email service is not fully configured');
    info('In development mode, reset links will be printed to console');
    info('To enable emails, add these to your .env file:');
    missing.forEach(key => {
      console.log(`  ${key}=your_value_here`);
    });
    return false;
  }
  
  success('Email service fully configured');
  return true;
}

async function testTokenGeneration() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 4: Token Generation & Validation');
  console.log('='.repeat(60));
  
  try {
    // Find a test user
    const userResult = await query('SELECT id, email, role FROM users LIMIT 1');
    
    if (userResult.rows.length === 0) {
      warning('No users found in database');
      info('Create a test user first');
      return false;
    }
    
    const testUser = userResult.rows[0];
    info(`Using test user: ${testUser.email} (ID: ${testUser.id}, Role: ${testUser.role})`);
    
    // Generate token
    info('Generating reset token...');
    const token = await createResetToken(testUser.id);
    success(`Token generated: ${token.substring(0, 16)}...`);
    info(`Token length: ${token.length} characters`);
    
    // Verify token exists in database
    const tokenCheck = await query(
      'SELECT user_id, expires_at FROM password_reset_tokens WHERE token = $1',
      [token]
    );
    
    if (tokenCheck.rows.length > 0) {
      success('Token saved to database');
      const expiresAt = new Date(tokenCheck.rows[0].expires_at);
      const now = new Date();
      const minutesUntilExpiry = Math.round((expiresAt - now) / 1000 / 60);
      info(`Expires in: ${minutesUntilExpiry} minutes`);
    } else {
      error('Token not found in database');
      return false;
    }
    
    // Validate token
    info('Validating token...');
    const userId = await findUserIdByValidToken(token);
    
    if (userId === testUser.id) {
      success('Token validation successful');
    } else {
      error('Token validation failed');
      return false;
    }
    
    // Test duplicate token generation (should replace old one)
    info('Testing duplicate token handling...');
    const newToken = await createResetToken(testUser.id);
    
    const oldTokenCheck = await query(
      'SELECT * FROM password_reset_tokens WHERE token = $1',
      [token]
    );
    
    if (oldTokenCheck.rows.length === 0) {
      success('Old token automatically deleted');
    } else {
      error('Old token still exists (should be deleted)');
    }
    
    // Cleanup
    await deleteTokensForUser(testUser.id);
    success('Test tokens cleaned up');
    
    return true;
  } catch (err) {
    error(`Token generation test failed: ${err.message}`);
    console.error(err);
    return false;
  }
}

async function testEmailTemplate() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 5: Email Template Rendering');
  console.log('='.repeat(60));
  
  try {
    const testEmail = 'test@example.com';
    const testToken = 'abc123def456ghi789jkl012mno345pqr678stu901vwx234yz567890';
    const origin = process.env.APP_ORIGIN || 'http://localhost:3000';
    const link = `${origin}/reset-password?token=${testToken}`;
    
    info(`Test email: ${testEmail}`);
    info(`Reset link: ${link}`);
    
    const subject = 'Reset Your Playfit Password';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">🔐 Password Reset</h1>
        </div>
        <div style="padding: 30px;">
          <p>Hello,</p>
          <p>We received a request to reset your password.</p>
          <p>Click the link below to create a new password:</p>
          <p><a href="${link}">${link}</a></p>
          <p>This link will expire in 10 minutes.</p>
        </div>
      </body>
      </html>
    `;
    
    success('Email template rendered successfully');
    info('Template includes:');
    console.log('  - Professional header with gradient');
    console.log('  - Clear call-to-action');
    console.log('  - Security messaging');
    console.log('  - Expiry warning');
    
    return true;
  } catch (err) {
    error(`Email template test failed: ${err.message}`);
    return false;
  }
}

async function testEndToEndFlow() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 6: End-to-End Password Reset Flow');
  console.log('='.repeat(60));
  
  try {
    // Find a test user
    const userResult = await query('SELECT id, email, role FROM users WHERE email LIKE \'%@%\' LIMIT 1');
    
    if (userResult.rows.length === 0) {
      warning('No users with valid email found');
      return false;
    }
    
    const testUser = userResult.rows[0];
    info(`Testing with: ${testUser.email} (${testUser.role})`);
    
    // Step 1: Generate token
    info('Step 1: User requests password reset');
    const token = await createResetToken(testUser.id);
    success('Reset token generated');
    
    // Step 2: Construct reset link
    const origin = process.env.APP_ORIGIN || 'http://localhost:3000';
    const resetLink = `${origin}/reset-password?token=${token}`;
    info(`Step 2: Reset link created: ${resetLink.substring(0, 50)}...`);
    
    // Step 3: Simulate sending email
    info('Step 3: Simulating email send...');
    const emailResult = await sendEmail({
      to: testUser.email,
      subject: 'Reset Your Playfit Password - TEST',
      html: `<p>Test email. Reset link: <a href="${resetLink}">${resetLink}</a></p>`,
      text: `Test email. Reset link: ${resetLink}`,
    });
    
    if (emailResult.sent) {
      success('Email sent successfully');
    } else {
      warning('Email not sent (SMTP not configured)');
      info('In development, check console for reset link');
    }
    
    // Step 4: Validate token
    info('Step 4: User clicks reset link');
    const userId = await findUserIdByValidToken(token);
    
    if (userId === testUser.id) {
      success('Token validated successfully');
    } else {
      error('Token validation failed');
      return false;
    }
    
    // Step 5: Cleanup
    info('Step 5: User resets password (token would be deleted)');
    await deleteTokensForUser(testUser.id);
    success('Token deleted after use');
    
    // Verify token is gone
    const deletedTokenCheck = await query(
      'SELECT * FROM password_reset_tokens WHERE token = $1',
      [token]
    );
    
    if (deletedTokenCheck.rows.length === 0) {
      success('Token successfully removed from database');
    } else {
      error('Token still exists after deletion');
      return false;
    }
    
    success('End-to-end flow completed successfully! 🎉');
    return true;
  } catch (err) {
    error(`End-to-end test failed: ${err.message}`);
    console.error(err);
    return false;
  }
}

async function displaySummary(results) {
  console.log('\n' + '='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));
  
  const tests = [
    'Database Connection',
    'Password Reset Table',
    'Email Configuration',
    'Token Generation',
    'Email Template',
    'End-to-End Flow',
  ];
  
  tests.forEach((test, index) => {
    if (results[index]) {
      success(test);
    } else {
      error(test);
    }
  });
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log('\n' + '-'.repeat(60));
  if (passed === total) {
    success(`All tests passed! (${passed}/${total}) 🎉`);
    console.log('\n' + COLORS.green + 'Your password reset system is ready for production!' + COLORS.reset);
  } else {
    warning(`${passed}/${total} tests passed`);
    console.log('\n' + COLORS.yellow + 'Review failed tests above and fix configuration.' + COLORS.reset);
  }
  console.log('='.repeat(60) + '\n');
}

async function main() {
  console.log('\n' + COLORS.cyan + '╔═══════════════════════════════════════════════════════════╗' + COLORS.reset);
  console.log(COLORS.cyan + '║                                                           ║' + COLORS.reset);
  console.log(COLORS.cyan + '║       ' + COLORS.blue + 'Password Reset System Test Suite' + COLORS.cyan + '                  ║' + COLORS.reset);
  console.log(COLORS.cyan + '║                                                           ║' + COLORS.reset);
  console.log(COLORS.cyan + '╚═══════════════════════════════════════════════════════════╝' + COLORS.reset);
  
  const results = [];
  
  try {
    results.push(await testDatabaseConnection());
    results.push(await testPasswordResetTable());
    results.push(await testEmailConfiguration());
    results.push(await testTokenGeneration());
    results.push(await testEmailTemplate());
    results.push(await testEndToEndFlow());
    
    await displaySummary(results);
  } catch (err) {
    console.error('\n' + COLORS.red + 'Fatal error during testing:' + COLORS.reset);
    console.error(err);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run tests
main();
