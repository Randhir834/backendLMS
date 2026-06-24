#!/usr/bin/env node

/**
 * Fix NULL slot_date values in instructor_availability_slots
 * 
 * This script calculates proper dates for slots that have NULL slot_date
 * by finding the next occurrence of their day_of_week.
 */

const { query } = require('../src/config/database');

async function fixNullSlotDates() {
  console.log('🔍 Checking for slots with NULL slot_date...\n');

  try {
    // Get all slots with NULL slot_date
    const nullSlotsResult = await query(
      `SELECT id, instructor_id, course_id, day_of_week, hour, created_at
       FROM instructor_availability_slots
       WHERE slot_date IS NULL
       ORDER BY id`
    );

    const nullSlots = nullSlotsResult.rows;
    console.log(`Found ${nullSlots.length} slot(s) with NULL slot_date\n`);

    if (nullSlots.length === 0) {
      console.log('✅ No slots need updating. All slots have valid dates.');
      return;
    }

    console.log('📅 Calculating next occurrence dates...\n');

    let updatedCount = 0;
    let errors = 0;

    for (const slot of nullSlots) {
      try {
        // Calculate the next occurrence of this day_of_week
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const targetDayOfWeek = slot.day_of_week;
        const currentDayOfWeek = today.getDay();
        
        // Calculate days to add
        let daysToAdd = targetDayOfWeek - currentDayOfWeek;
        if (daysToAdd <= 0) {
          daysToAdd += 7; // Next week if today or already passed this week
        }
        
        const nextOccurrence = new Date(today);
        nextOccurrence.setDate(today.getDate() + daysToAdd);
        
        // Format as YYYY-MM-DD
        const slotDate = nextOccurrence.toISOString().split('T')[0];
        
        // Update the slot
        await query(
          `UPDATE instructor_availability_slots
           SET slot_date = $1, updated_at = NOW()
           WHERE id = $2`,
          [slotDate, slot.id]
        );

        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        console.log(`✅ Slot ${slot.id}: ${dayNames[slot.day_of_week]} at ${slot.hour}:00 → ${slotDate}`);
        updatedCount++;

      } catch (error) {
        console.error(`❌ Failed to update slot ${slot.id}:`, error.message);
        errors++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✅ Successfully updated: ${updatedCount} slot(s)`);
    if (errors > 0) {
      console.log(`❌ Failed to update: ${errors} slot(s)`);
    }
    console.log('='.repeat(60) + '\n');

    // Verify the fix
    console.log('🔍 Verifying the fix...\n');
    const verifyResult = await query(
      `SELECT 
        COUNT(*) as total_slots,
        COUNT(*) FILTER (WHERE slot_date IS NULL) as null_dates,
        COUNT(*) FILTER (WHERE slot_date IS NOT NULL) as with_dates
       FROM instructor_availability_slots`
    );

    const stats = verifyResult.rows[0];
    console.log(`Total slots: ${stats.total_slots}`);
    console.log(`With dates: ${stats.with_dates}`);
    console.log(`Still NULL: ${stats.null_dates}`);

    if (parseInt(stats.null_dates) === 0) {
      console.log('\n✅ All slots now have valid dates!');
    } else {
      console.log(`\n⚠️  Warning: ${stats.null_dates} slot(s) still have NULL dates`);
    }

  } catch (error) {
    console.error('❌ Error during migration:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Run the script
fixNullSlotDates();
