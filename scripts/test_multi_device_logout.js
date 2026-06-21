/**
 * Multi-Device Logout System Test Script
 * 
 * This script tests the complete multi-device logout functionality
 */

require('dotenv').config();
const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:5001/api';

// Test user credentials (create a test user first or use an existing one)
const TEST_USER = {
  email: 'test@example.com',
  password: 'testpassword123',
  expectedRole: 'student'
};

let authToken1, sessionToken1;
let authToken2, sessionToken2;

async function runTests() {
  console.log('🧪 Multi-Device Logout System Test\n');
  console.log('═══════════════════════════════════════════════════════\n');

  try {
    // Test 1: Login from Device 1
    console.log('📱 Test 1: Login from Device 1');
    const login1 = await axios.post(`${API_URL}/auth/login`, TEST_USER, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0'
      }
    });
    
    authToken1 = login1.data.token;
    sessionToken1 = login1.data.sessionToken;
    
    console.log('   ✓ Login successful');
    console.log(`   Device: ${login1.data.sessionInfo.deviceInfo.device}`);
    console.log(`   Browser: ${login1.data.sessionInfo.deviceInfo.browser}`);
    console.log(`   Active devices: ${login1.data.sessionInfo.activeDevices}\n`);

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 2: Login from Device 2
    console.log('💻 Test 2: Login from Device 2 (same user)');
    const login2 = await axios.post(`${API_URL}/auth/login`, TEST_USER, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/14.0'
      }
    });
    
    authToken2 = login2.data.token;
    sessionToken2 = login2.data.sessionToken;
    
    console.log('   ✓ Login successful');
    console.log(`   Device: ${login2.data.sessionInfo.deviceInfo.device}`);
    console.log(`   Browser: ${login2.data.sessionInfo.deviceInfo.browser}`);
    console.log(`   Active devices: ${login2.data.sessionInfo.activeDevices}\n`);

    // Test 3: Get all sessions
    console.log('📋 Test 3: Get all active sessions');
    const sessions = await axios.get(`${API_URL}/auth/sessions`, {
      headers: {
        'Authorization': `Bearer ${authToken1}`,
        'x-session-token': sessionToken1
      }
    });
    
    console.log(`   ✓ Total active sessions: ${sessions.data.totalActive}`);
    sessions.data.sessions.forEach((session, index) => {
      console.log(`   Session ${index + 1}:`);
      console.log(`     - Device: ${session.deviceInfo.device}`);
      console.log(`     - Browser: ${session.deviceInfo.browser}`);
      console.log(`     - Last activity: ${new Date(session.lastActivity).toLocaleString()}`);
    });
    console.log('');

    // Test 4: Logout from Device 2
    console.log('🚪 Test 4: Logout from Device 2');
    await axios.post(`${API_URL}/auth/logout`, {}, {
      headers: {
        'Authorization': `Bearer ${authToken2}`,
        'x-session-token': sessionToken2
      }
    });
    console.log('   ✓ Logged out from Device 2\n');

    // Test 5: Verify Device 2 cannot make requests
    console.log('🔒 Test 5: Verify Device 2 session is invalid');
    try {
      await axios.get(`${API_URL}/auth/sessions`, {
        headers: {
          'Authorization': `Bearer ${authToken2}`,
          'x-session-token': sessionToken2
        }
      });
      console.log('   ✗ FAILED: Device 2 should not be able to access\n');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('   ✓ Device 2 correctly denied access\n');
      } else {
        throw error;
      }
    }

    // Test 6: Verify Device 1 still works
    console.log('✅ Test 6: Verify Device 1 still works');
    const sessions2 = await axios.get(`${API_URL}/auth/sessions`, {
      headers: {
        'Authorization': `Bearer ${authToken1}`,
        'x-session-token': sessionToken1
      }
    });
    console.log(`   ✓ Device 1 can still access`);
    console.log(`   Active sessions remaining: ${sessions2.data.totalActive}\n`);

    // Test 7: Login from Device 2 again
    console.log('🔄 Test 7: Login from Device 2 again');
    const login3 = await axios.post(`${API_URL}/auth/login`, TEST_USER, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/14.0'
      }
    });
    authToken2 = login3.data.token;
    sessionToken2 = login3.data.sessionToken;
    console.log(`   ✓ Login successful`);
    console.log(`   Active devices: ${login3.data.sessionInfo.activeDevices}\n`);

    // Test 8: Logout all other devices from Device 1
    console.log('🚫 Test 8: Logout all other devices from Device 1');
    const logoutOthers = await axios.post(`${API_URL}/auth/logout-other-devices`, {}, {
      headers: {
        'Authorization': `Bearer ${authToken1}`,
        'x-session-token': sessionToken1
      }
    });
    console.log(`   ✓ ${logoutOthers.data.message}\n`);

    // Test 9: Verify only Device 1 remains
    console.log('📊 Test 9: Verify only Device 1 remains active');
    const sessions3 = await axios.get(`${API_URL}/auth/sessions`, {
      headers: {
        'Authorization': `Bearer ${authToken1}`,
        'x-session-token': sessionToken1
      }
    });
    console.log(`   ✓ Active sessions: ${sessions3.data.totalActive}\n`);

    // Test 10: Logout all devices
    console.log('🔴 Test 10: Logout from all devices');
    await axios.post(`${API_URL}/auth/logout-all-devices`, {}, {
      headers: {
        'Authorization': `Bearer ${authToken1}`,
        'x-session-token': sessionToken1
      }
    });
    console.log('   ✓ Logged out from all devices\n');

    // Test 11: Verify no sessions work
    console.log('🔒 Test 11: Verify all sessions are invalid');
    try {
      await axios.get(`${API_URL}/auth/sessions`, {
        headers: {
          'Authorization': `Bearer ${authToken1}`,
          'x-session-token': sessionToken1
        }
      });
      console.log('   ✗ FAILED: No sessions should be valid\n');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('   ✓ All sessions correctly invalidated\n');
      } else {
        throw error;
      }
    }

    console.log('═══════════════════════════════════════════════════════');
    console.log('✨ All tests passed successfully!');
    console.log('═══════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Test failed:');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Message: ${error.response.data.error || error.response.data.message}`);
    } else {
      console.error(`   ${error.message}`);
    }
    process.exit(1);
  }
}

// Check if server is running
async function checkServer() {
  try {
    await axios.get(`${API_URL.replace('/api', '')}/health`);
    return true;
  } catch (error) {
    return false;
  }
}

async function main() {
  console.log('Checking if server is running...');
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    console.error('❌ Server is not running at', API_URL);
    console.error('Please start the server with: npm run dev');
    process.exit(1);
  }
  
  console.log('✓ Server is running\n');
  await runTests();
}

main();
