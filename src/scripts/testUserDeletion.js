const userDeletionService = require('../services/userDeletionService');
const { pool } = require('../config/database');

async function testUserDeletion() {
  try {
    console.log('=== User Deletion Service Test ===\n');

    // Get a list of users to test with
    const usersQuery = 'SELECT id, name, email, role FROM users ORDER BY created_at DESC LIMIT 5';
    const usersResult = await pool.query(usersQuery);
    
    if (usersResult.rows.length === 0) {
      console.log('No users found in database for testing');
      return;
    }

    console.log('Available users for testing:');
    usersResult.rows.forEach(user => {
      console.log(`- ID: ${user.id}, Name: ${user.name}, Email: ${user.email}, Role: ${user.role}`);
    });

    // Test with the first user
    const testUserId = usersResult.rows[0].id;
    console.log(`\n=== Testing with User ID: ${testUserId} ===\n`);

    // 1. Test getting user info
    console.log('1. Getting user info...');
    const userInfo = await userDeletionService.getUserInfo(testUserId);
    console.log('User info:', userInfo);

    // 2. Test getting deletion impact
    console.log('\n2. Getting deletion impact...');
    const impact = await userDeletionService.getUserDeletionImpact(testUserId);
    console.log('Deletion impact:');
    impact.forEach(item => {
      console.log(`- ${item.table_name}: ${item.record_count} records (${item.action})`);
    });

    const totalRecords = impact.reduce((sum, item) => sum + parseInt(item.record_count), 0);
    console.log(`Total affected records: ${totalRecords}`);

    // 3. Test dry run deletion
    console.log('\n3. Testing dry run deletion...');
    const dryRunResult = await userDeletionService.deleteUser(testUserId, { dryRun: true });
    console.log('Dry run result:', {
      success: dryRunResult.success,
      dryRun: dryRunResult.dryRun,
      message: dryRunResult.message,
      impactCount: dryRunResult.impact.length
    });

    // 4. Test actual deletion (only if user has minimal impact)
    if (totalRecords <= 5) {
      console.log('\n4. Testing actual deletion (user has minimal impact)...');
      const deleteResult = await userDeletionService.deleteUser(testUserId, { force: true });
      console.log('Deletion result:', {
        success: deleteResult.success,
        message: deleteResult.message,
        deletedUser: deleteResult.user?.name
      });
    } else {
      console.log('\n4. Skipping actual deletion (user has significant impact)');
      console.log('To force deletion, you would need to use { force: true }');
    }

    console.log('\n=== Test completed successfully ===');

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await pool.end();
  }
}

// Run the test
testUserDeletion();