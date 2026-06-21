/**
 * Session Cleanup Script
 * Removes expired and revoked sessions from the database
 * 
 * Run this script periodically via cron job:
 * 0 2 * * * node /path/to/scripts/cleanup_sessions.js
 */

require('dotenv').config();
const { cleanupExpiredSessions } = require('../src/services/sessionService');

async function runCleanup() {
  console.log('Starting session cleanup...');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  
  try {
    const deletedCount = await cleanupExpiredSessions();
    
    console.log(`✓ Session cleanup completed successfully`);
    console.log(`  - Removed ${deletedCount} expired/revoked session(s)`);
    
    process.exit(0);
  } catch (error) {
    console.error('✗ Session cleanup failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

runCleanup();
