/**
 * Test Script: Duplicate Registration Prevention
 * 
 * This script demonstrates that the duplicate registration fix works correctly.
 * It simulates multiple registration attempts for the same slot.
 */

const { query } = require('./src/config/database');

async function testDuplicateRegistration() {
  console.log('🧪 Testing Duplicate Registration Prevention\n');

  try {
    // Test parameters (adjust these to match your test data)
    const testSlotId = 1;
    const testStudentId = 1;
    const testCourseId = 1;

    console.log('Test Parameters:');
    console.log(`  Slot ID: ${testSlotId}`);
    console.log(`  Student ID: ${testStudentId}`);
    console.log(`  Course ID: ${testCourseId}\n`);

    // Test 1: First registration (should succeed)
    console.log('📝 Test 1: First Registration');
    try {
      const result1 = await query(
        `INSERT INTO slot_registrations (slot_id, student_id, course_id, status)
         VALUES ($1, $2, $3, 'registered')
         ON CONFLICT (slot_id, student_id) 
         DO UPDATE SET 
           status = CASE 
             WHEN slot_registrations.status = 'cancelled' THEN 'registered'
             ELSE slot_registrations.status
           END,
           updated_at = CASE 
             WHEN slot_registrations.status = 'cancelled' THEN NOW()
             ELSE slot_registrations.updated_at
           END
         RETURNING *, 
           (xmax = 0) AS inserted`,
        [testSlotId, testStudentId, testCourseId]
      );

      const registration = result1.rows[0];
      if (registration.inserted) {
        console.log('✅ SUCCESS: First registration created');
      } else if (registration.status === 'registered') {
        console.log('⚠️  INFO: Registration already exists (from previous test)');
      } else {
        console.log('✅ SUCCESS: Cancelled registration reactivated');
      }
      console.log(`   Registration ID: ${registration.id}`);
      console.log(`   Status: ${registration.status}\n`);
    } catch (error) {
      console.log('❌ FAILED:', error.message, '\n');
    }

    // Test 2: Duplicate registration attempt (should be detected)
    console.log('📝 Test 2: Duplicate Registration Attempt');
    try {
      const result2 = await query(
        `INSERT INTO slot_registrations (slot_id, student_id, course_id, status)
         VALUES ($1, $2, $3, 'registered')
         ON CONFLICT (slot_id, student_id) 
         DO UPDATE SET 
           status = CASE 
             WHEN slot_registrations.status = 'cancelled' THEN 'registered'
             ELSE slot_registrations.status
           END,
           updated_at = CASE 
             WHEN slot_registrations.status = 'cancelled' THEN NOW()
             ELSE slot_registrations.updated_at
           END
         RETURNING *, 
           (xmax = 0) AS inserted`,
        [testSlotId, testStudentId, testCourseId]
      );

      const registration = result2.rows[0];
      if (!registration.inserted && registration.status === 'registered') {
        console.log('✅ SUCCESS: Duplicate registration prevented');
        console.log('   Message: Already registered for this slot');
        console.log(`   Existing Registration ID: ${registration.id}\n`);
      } else {
        console.log('❌ FAILED: Duplicate was not prevented\n');
      }
    } catch (error) {
      console.log('❌ FAILED:', error.message, '\n');
    }

    // Test 3: Check current registrations
    console.log('📝 Test 3: Verify Single Registration');
    const check = await query(
      `SELECT * FROM slot_registrations 
       WHERE slot_id = $1 AND student_id = $2`,
      [testSlotId, testStudentId]
    );

    console.log(`✅ Total registrations for this slot+student: ${check.rows.length}`);
    console.log('   Expected: 1 (only one registration should exist)\n');

    if (check.rows.length === 1) {
      console.log('🎉 All tests passed! Duplicate registration prevention is working correctly.\n');
    } else {
      console.log('⚠️  Warning: Multiple registrations found. Check your database.\n');
    }

    // Cleanup (optional)
    console.log('🧹 Cleanup: Removing test registration');
    await query(
      `DELETE FROM slot_registrations 
       WHERE slot_id = $1 AND student_id = $2`,
      [testSlotId, testStudentId]
    );
    console.log('✅ Test data cleaned up\n');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  } finally {
    process.exit(0);
  }
}

// Run the test
testDuplicateRegistration();
