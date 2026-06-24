/**
 * Debug script to check slot visibility issue
 * 
 * This script helps identify why students cannot see instructor-created slots.
 * It checks:
 * 1. What slots exist in the database
 * 2. Which students are enrolled in which courses
 * 3. What the API would return for each enrolled student
 * 
 * Usage: node scripts/debug_slots.js [course_id] [student_id]
 */

require('dotenv').config();
const { query } = require('../src/config/database');

async function debugSlots(courseId, studentId) {
  console.log('\n' + '='.repeat(80));
  console.log('SLOT VISIBILITY DEBUG REPORT');
  console.log('='.repeat(80) + '\n');

  try {
    // 1. Check if course exists
    console.log('1. COURSE INFORMATION:');
    console.log('-'.repeat(80));
    const courseResult = await query(
      'SELECT id, title, instructor_id FROM courses WHERE id = $1',
      [courseId]
    );
    if (courseResult.rows.length === 0) {
      console.log(`❌ Course ${courseId} not found`);
      return;
    }
    console.log(`✅ Course found: "${courseResult.rows[0].title}" (ID: ${courseId})`);
    console.log(`   Primary Instructor ID: ${courseResult.rows[0].instructor_id}\n`);

    // 2. Check enrollment
    if (studentId) {
      console.log('2. ENROLLMENT CHECK:');
      console.log('-'.repeat(80));
      const enrollmentResult = await query(
        'SELECT id, status FROM enrollments WHERE user_id = $1 AND course_id = $2',
        [studentId, courseId]
      );
      if (enrollmentResult.rows.length === 0) {
        console.log(`❌ Student ${studentId} is NOT enrolled in course ${courseId}`);
        console.log('   Students must be enrolled to view slots\n');
      } else {
        console.log(`✅ Student ${studentId} is enrolled (Status: ${enrollmentResult.rows[0].status})\n`);
      }
    }

    // 3. Check all instructors for this course
    console.log('3. COURSE INSTRUCTORS:');
    console.log('-'.repeat(80));
    const instructorsResult = await query(
      `SELECT u.id, u.name, u.email, ci.is_primary
       FROM course_instructors ci
       JOIN users u ON ci.instructor_id = u.id
       WHERE ci.course_id = $1`,
      [courseId]
    );
    if (instructorsResult.rows.length === 0) {
      console.log('⚠️  No instructors assigned to this course\n');
    } else {
      instructorsResult.rows.forEach(instructor => {
        console.log(`   - ${instructor.name} (ID: ${instructor.id}) ${instructor.is_primary ? '[PRIMARY]' : ''}`);
        console.log(`     Email: ${instructor.email}`);
      });
      console.log('');
    }

    // 4. Check raw slots in database
    console.log('4. RAW SLOTS IN DATABASE:');
    console.log('-'.repeat(80));
    const rawSlotsResult = await query(
      `SELECT id, instructor_id, day_of_week, hour, slot_date::text, is_available, max_capacity
       FROM instructor_availability_slots
       WHERE course_id = $1
       ORDER BY slot_date, hour`,
      [courseId]
    );
    
    if (rawSlotsResult.rows.length === 0) {
      console.log('❌ NO SLOTS found in database for this course');
      console.log('   Instructors need to create slots first\n');
    } else {
      console.log(`✅ Found ${rawSlotsResult.rows.length} slot(s):\n`);
      rawSlotsResult.rows.forEach(slot => {
        const status = slot.is_available ? '✅ Available' : '❌ Unavailable';
        const dateStatus = slot.slot_date ? `📅 ${slot.slot_date}` : '⚠️  NULL DATE';
        console.log(`   Slot ID ${slot.id}:`);
        console.log(`     Instructor: ${slot.instructor_id}`);
        console.log(`     Date: ${dateStatus}`);
        console.log(`     Hour: ${slot.hour}:00`);
        console.log(`     Day of Week: ${slot.day_of_week}`);
        console.log(`     Status: ${status}`);
        console.log(`     Capacity: ${slot.max_capacity}`);
        console.log('');
      });
    }

    // 5. Check what API would return
    console.log('5. API QUERY RESULTS (What students would see):');
    console.log('-'.repeat(80));
    const apiSlotsResult = await query(
      `SELECT 
        s.id,
        s.instructor_id,
        s.day_of_week,
        s.hour,
        s.slot_date,
        s.is_available,
        COALESCE(COUNT(r.id) FILTER (WHERE r.status = 'registered'), 0)::INTEGER as registered_count,
        u.name as instructor_name
       FROM instructor_availability_slots s
       LEFT JOIN slot_registrations r ON s.id = r.slot_id AND r.status = 'registered'
       LEFT JOIN users u ON s.instructor_id = u.id
       WHERE s.course_id = $1 AND s.is_available = TRUE AND s.slot_date IS NOT NULL
       GROUP BY s.id, u.name
       ORDER BY s.slot_date, s.hour`,
      [courseId]
    );

    if (apiSlotsResult.rows.length === 0) {
      console.log('❌ API would return 0 slots');
      console.log('\nPossible reasons:');
      console.log('   1. No slots created for this course');
      console.log('   2. All slots have is_available = FALSE');
      console.log('   3. All slots have slot_date = NULL');
      console.log('\nTroubleshooting:');
      console.log('   - Check raw slots above (section 4)');
      console.log('   - Ensure instructor created slots with valid dates');
      console.log('   - Verify slots are marked as available\n');
    } else {
      console.log(`✅ API would return ${apiSlotsResult.rows.length} slot(s):\n`);
      apiSlotsResult.rows.forEach(slot => {
        const formatDate = (dateStr) => {
          const date = new Date(dateStr + 'T00:00:00');
          return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
        };
        const formatTime = (hour) => {
          const startHour = hour % 12 === 0 ? 12 : hour % 12;
          const endHour = (hour + 1) % 12 === 0 ? 12 : (hour + 1) % 12;
          const startPeriod = hour < 12 ? 'AM' : 'PM';
          const endPeriod = hour < 11 ? 'AM' : hour < 23 ? 'PM' : 'AM';
          return `${startHour}:00 ${startPeriod} – ${endHour}:00 ${endPeriod}`;
        };
        
        console.log(`   Slot ID ${slot.id}:`);
        console.log(`     Instructor: ${slot.instructor_name} (ID: ${slot.instructor_id})`);
        console.log(`     Date: ${formatDate(slot.slot_date)}`);
        console.log(`     Time: ${formatTime(slot.hour)}`);
        console.log(`     Bookings: ${slot.registered_count}/1`);
        console.log('');
      });
    }

    // 6. Check registrations
    console.log('6. SLOT REGISTRATIONS:');
    console.log('-'.repeat(80));
    const registrationsResult = await query(
      `SELECT 
        r.id, r.slot_id, r.student_id, r.status, r.registration_date,
        u.name as student_name,
        s.slot_date::text, s.hour
       FROM slot_registrations r
       JOIN users u ON r.student_id = u.id
       JOIN instructor_availability_slots s ON r.slot_id = s.id
       WHERE r.course_id = $1
       ORDER BY r.registration_date DESC`,
      [courseId]
    );

    if (registrationsResult.rows.length === 0) {
      console.log('ℹ️  No registrations for this course yet\n');
    } else {
      console.log(`Found ${registrationsResult.rows.length} registration(s):\n`);
      registrationsResult.rows.forEach(reg => {
        console.log(`   Registration ID ${reg.id}:`);
        console.log(`     Student: ${reg.student_name} (ID: ${reg.student_id})`);
        console.log(`     Slot: ${reg.slot_date} at ${reg.hour}:00`);
        console.log(`     Status: ${reg.status}`);
        console.log(`     Registered: ${new Date(reg.registration_date).toLocaleString()}`);
        console.log('');
      });
    }

    console.log('='.repeat(80));
    console.log('END OF REPORT');
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('Error running debug script:', error);
  } finally {
    process.exit(0);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const courseId = args[0] ? parseInt(args[0]) : null;
const studentId = args[1] ? parseInt(args[1]) : null;

if (!courseId) {
  console.log('Usage: node scripts/debug_slots.js <course_id> [student_id]');
  console.log('\nExample: node scripts/debug_slots.js 1 5');
  console.log('  course_id: Required - The ID of the course to debug');
  console.log('  student_id: Optional - The ID of the student to check enrollment');
  process.exit(1);
}

debugSlots(courseId, studentId);
