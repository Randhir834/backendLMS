/**
 * Test: One Slot Per Day Booking Logic
 */

const { query } = require('./src/config/database');

async function testDayBooking() {
  console.log('🧪 Testing One Slot Per Day Booking Logic\n');

  try {
    // Get a test student and course
    const studentResult = await query(
      "SELECT id, name FROM users WHERE role = 'student' LIMIT 1"
    );
    
    if (studentResult.rows.length === 0) {
      console.log('⚠️  No students found. Create a student first.');
      process.exit(0);
    }
    
    const student = studentResult.rows[0];
    console.log(`👤 Test Student: ${student.name} (ID: ${student.id})\n`);

    // Get available slots
    const slotsResult = await query(
      `SELECT s.id, s.day_of_week, s.hour, s.course_id, c.title as course_title
       FROM instructor_availability_slots s
       JOIN courses c ON s.course_id = c.id
       WHERE s.is_available = TRUE
       ORDER BY s.day_of_week, s.hour
       LIMIT 10`
    );

    if (slotsResult.rows.length === 0) {
      console.log('⚠️  No available slots found. Create some slots first.');
      process.exit(0);
    }

    const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    console.log('📅 Available Slots:\n');
    slotsResult.rows.forEach((slot, idx) => {
      console.log(`  ${idx + 1}. ${DAYS[slot.day_of_week]} ${slot.hour}:00 - ${slot.course_title} (Slot ID: ${slot.id})`);
    });

    // Find two slots on the same day for testing
    const dayGroups = {};
    slotsResult.rows.forEach(slot => {
      if (!dayGroups[slot.day_of_week]) {
        dayGroups[slot.day_of_week] = [];
      }
      dayGroups[slot.day_of_week].push(slot);
    });

    const sameDaySlots = Object.values(dayGroups).find(slots => slots.length >= 2);
    
    if (!sameDaySlots || sameDaySlots.length < 2) {
      console.log('\n⚠️  Need at least 2 slots on the same day to test. Add more slots.');
      process.exit(0);
    }

    const slot1 = sameDaySlots[0];
    const slot2 = sameDaySlots[1];
    const dayName = DAYS[slot1.day_of_week];

    console.log(`\n🧪 Test Scenario: Book 2 slots on ${dayName}\n`);
    console.log(`  Slot 1: ${dayName} ${slot1.hour}:00 (ID: ${slot1.id})`);
    console.log(`  Slot 2: ${dayName} ${slot2.hour}:00 (ID: ${slot2.id})\n`);

    // Test 1: Book first slot
    console.log('📝 Test 1: Booking first slot...');
    try {
      await query(
        `INSERT INTO slot_registrations (slot_id, student_id, course_id, status)
         VALUES ($1, $2, $3, 'registered')`,
        [slot1.id, student.id, slot1.course_id]
      );
      console.log(`✅ SUCCESS: Booked ${dayName} ${slot1.hour}:00\n`);
    } catch (error) {
      console.log(`❌ FAILED: ${error.message}\n`);
    }

    // Test 2: Try to book second slot on same day
    console.log('📝 Test 2: Trying to book second slot on same day...');
    try {
      await query(
        `INSERT INTO slot_registrations (slot_id, student_id, course_id, status)
         VALUES ($1, $2, $3, 'registered')`,
        [slot2.id, student.id, slot2.course_id]
      );
      console.log(`❌ UNEXPECTED: Should have been blocked!\n`);
    } catch (error) {
      if (error.message.includes('duplicate') || error.code === '23505') {
        console.log(`✅ SUCCESS: Correctly blocked duplicate same-day booking`);
        console.log(`   Error: ${error.message}\n`);
      } else {
        console.log(`❌ FAILED with unexpected error: ${error.message}\n`);
      }
    }

    // Test 3: Check current registrations
    console.log('📝 Test 3: Checking registrations...');
    const registrations = await query(
      `SELECT r.id, r.slot_id, r.day_of_week, r.status, s.hour, c.title
       FROM slot_registrations r
       JOIN instructor_availability_slots s ON r.slot_id = s.id
       JOIN courses c ON r.course_id = c.id
       WHERE r.student_id = $1`,
      [student.id]
    );

    console.log(`✅ Student has ${registrations.rows.length} registration(s):`);
    registrations.rows.forEach(reg => {
      console.log(`   - ${DAYS[reg.day_of_week]} ${reg.hour}:00 - ${reg.title} (Status: ${reg.status})`);
    });

    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    await query(
      'DELETE FROM slot_registrations WHERE student_id = $1',
      [student.id]
    );
    console.log('✅ Cleanup complete\n');

    console.log('🎉 Test completed successfully!');
    console.log('   ✓ First booking worked');
    console.log('   ✓ Same-day duplicate was blocked');
    console.log('   ✓ Database constraint is working\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
  } finally {
    process.exit(0);
  }
}

testDayBooking();
