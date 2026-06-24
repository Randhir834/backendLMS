/**
 * Quick Slot Check Script
 * 
 * Quickly verify slot visibility setup for all courses.
 * Shows summary of slot availability across the system.
 * 
 * Usage: node scripts/quick_slot_check.js
 */

require('dotenv').config();
const { query } = require('../src/config/database');

async function quickCheck() {
  console.log('\n' + '='.repeat(80));
  console.log('QUICK SLOT CHECK - SYSTEM OVERVIEW');
  console.log('='.repeat(80) + '\n');

  try {
    // 1. Course Summary
    console.log('📚 COURSES WITH SLOTS:\n');
    const courseSummary = await query(`
      SELECT 
        c.id,
        c.title,
        COUNT(s.id) as total_slots,
        COUNT(s.id) FILTER (WHERE s.is_available = TRUE) as available_slots,
        COUNT(s.id) FILTER (WHERE s.slot_date IS NULL) as null_date_slots,
        COUNT(DISTINCT s.instructor_id) as instructor_count
      FROM courses c
      LEFT JOIN instructor_availability_slots s ON c.id = s.course_id
      GROUP BY c.id, c.title
      HAVING COUNT(s.id) > 0
      ORDER BY c.id
    `);

    if (courseSummary.rows.length === 0) {
      console.log('⚠️  No courses have slots created yet.\n');
    } else {
      courseSummary.rows.forEach(course => {
        const hasIssues = course.null_date_slots > 0 || course.available_slots === 0;
        const status = hasIssues ? '⚠️ ' : '✅';
        
        console.log(`${status} Course ${course.id}: ${course.title}`);
        console.log(`   Total Slots: ${course.total_slots}`);
        console.log(`   Available: ${course.available_slots}`);
        console.log(`   Instructors: ${course.instructor_count}`);
        
        if (course.null_date_slots > 0) {
          console.log(`   ⚠️  WARNING: ${course.null_date_slots} slot(s) with NULL date`);
        }
        if (course.available_slots === 0 && course.total_slots > 0) {
          console.log(`   ⚠️  WARNING: All slots are unavailable`);
        }
        console.log('');
      });
    }

    // 2. Enrollment Summary
    console.log('👥 ENROLLMENTS:\n');
    const enrollmentSummary = await query(`
      SELECT 
        c.id as course_id,
        c.title,
        COUNT(e.id) as student_count,
        COUNT(s.id) FILTER (WHERE s.is_available = TRUE AND s.slot_date IS NOT NULL) as visible_slots
      FROM courses c
      LEFT JOIN enrollments e ON c.id = e.course_id AND e.status = 'active'
      LEFT JOIN instructor_availability_slots s ON c.id = s.course_id
      GROUP BY c.id, c.title
      HAVING COUNT(e.id) > 0
      ORDER BY c.id
    `);

    if (enrollmentSummary.rows.length === 0) {
      console.log('⚠️  No active enrollments found.\n');
    } else {
      enrollmentSummary.rows.forEach(course => {
        const hasSlots = course.visible_slots > 0;
        const status = hasSlots ? '✅' : '⚠️ ';
        
        console.log(`${status} Course ${course.course_id}: ${course.title}`);
        console.log(`   Enrolled Students: ${course.student_count}`);
        console.log(`   Visible Slots: ${course.visible_slots}`);
        
        if (!hasSlots && course.student_count > 0) {
          console.log(`   ⚠️  Students enrolled but no slots available!`);
        }
        console.log('');
      });
    }

    // 3. Problem Detection
    console.log('🔍 POTENTIAL ISSUES:\n');
    
    const issues = [];

    // Check for slots with NULL dates
    const nullDateCount = await query(`
      SELECT COUNT(*) as count FROM instructor_availability_slots WHERE slot_date IS NULL
    `);
    if (parseInt(nullDateCount.rows[0].count) > 0) {
      issues.push(`❌ ${nullDateCount.rows[0].count} slot(s) have NULL date - will not be visible to students`);
    }

    // Check for unavailable slots
    const unavailableCount = await query(`
      SELECT COUNT(*) as count FROM instructor_availability_slots WHERE is_available = FALSE
    `);
    if (parseInt(unavailableCount.rows[0].count) > 0) {
      issues.push(`⚠️  ${unavailableCount.rows[0].count} slot(s) marked as unavailable`);
    }

    // Check for courses with enrollments but no slots
    const noSlotsCourses = await query(`
      SELECT c.id, c.title, COUNT(e.id) as enrollment_count
      FROM courses c
      JOIN enrollments e ON c.id = e.course_id AND e.status = 'active'
      LEFT JOIN instructor_availability_slots s ON c.id = s.course_id AND s.is_available = TRUE AND s.slot_date IS NOT NULL
      WHERE s.id IS NULL
      GROUP BY c.id, c.title
    `);
    if (noSlotsCourses.rows.length > 0) {
      noSlotsCourses.rows.forEach(course => {
        issues.push(`⚠️  Course "${course.title}" has ${course.enrollment_count} student(s) but no visible slots`);
      });
    }

    if (issues.length === 0) {
      console.log('✅ No issues detected!\n');
    } else {
      issues.forEach(issue => console.log(issue));
      console.log('');
    }

    // 4. Recent Activity
    console.log('📊 RECENT ACTIVITY (Last 24 Hours):\n');
    const recentSlots = await query(`
      SELECT COUNT(*) as count FROM instructor_availability_slots 
      WHERE created_at > NOW() - INTERVAL '24 hours'
    `);
    const recentRegistrations = await query(`
      SELECT COUNT(*) as count FROM slot_registrations 
      WHERE created_at > NOW() - INTERVAL '24 hours'
    `);
    const recentEnrollments = await query(`
      SELECT COUNT(*) as count FROM enrollments 
      WHERE enrolled_at > NOW() - INTERVAL '24 hours'
    `);

    console.log(`   Slots Created: ${recentSlots.rows[0].count}`);
    console.log(`   Slot Registrations: ${recentRegistrations.rows[0].count}`);
    console.log(`   New Enrollments: ${recentEnrollments.rows[0].count}`);
    console.log('');

    console.log('='.repeat(80));
    console.log('For detailed analysis of a specific course, run:');
    console.log('node scripts/debug_slots.js <course_id> <student_id>');
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('Error running quick check:', error);
  } finally {
    process.exit(0);
  }
}

quickCheck();
