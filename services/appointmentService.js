// ============================================================
// MediConnect – services/appointmentService.js
// Slot availability, leaves, custom slots, and breaks helpers
// ============================================================

const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const pool = require('../config/db');

/**
 * Generate all available time slots for a doctor on a given date.
 * @param {number} doctorId
 * @param {string} date - ISO date string (YYYY-MM-DD)
 * @returns {Array<string>} Available time slots like ["09:00", "09:30", ...]
 */
async function getAvailableSlots(doctorId, date) {
  const doctor = await Doctor.findById(doctorId);
  if (!doctor || !doctor.is_available) return [];

  // 1. Check if the doctor is on leave on this date
  const [leaves] = await pool.execute(
    `SELECT id FROM doctor_leaves WHERE doctor_id = ? AND ? BETWEEN start_date AND end_date`,
    [doctorId, date]
  );
  if (leaves.length > 0) return []; // On leave — no slots available

  // 2. Check if the doctor has custom availability slots for this date
  const [customSlots] = await pool.execute(
    `SELECT start_time, end_time, is_available FROM doctor_availability_slots WHERE doctor_id = ? AND slot_date = ?`,
    [doctorId, date]
  );

  let slotsToFilter = [];

  if (customSlots.length > 0) {
    // If they have custom slots, use those (filtering by is_available = 1)
    slotsToFilter = customSlots
      .filter(s => s.is_available)
      .map(s => {
        const t = s.start_time || '';
        return typeof t === 'string' ? t.substring(0, 5) : t;
      });
  } else {
    // 3. Fallback to weekly doctor schedule for this day of the week
    const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'short' }); // e.g. Mon, Tue...
    const [scheduleRows] = await pool.execute(
      `SELECT * FROM doctor_schedules WHERE doctor_id = ? AND day_of_week = ? AND is_active = 1`,
      [doctorId, dayOfWeek]
    );

    if (scheduleRows.length === 0) return []; // No working schedule on this day

    const sched = scheduleRows[0];
    const startStr = sched.start_time; // e.g. '09:00:00'
    const endStr = sched.end_time; // e.g. '17:00:00'
    const breakStart = sched.break_start_time; // e.g. '13:00:00'
    const breakEnd = sched.break_end_time; // e.g. '14:00:00'

    const slotDuration = doctor.slot_duration_min || 30;

    const [startH, startM] = startStr.split(':').map(Number);
    const [endH, endM] = endStr.split(':').map(Number);

    let currentMin = startH * 60 + startM;
    const endMin = endH * 60 + endM;

    let breakStartMin = null;
    let breakEndMin = null;
    if (breakStart && breakEnd) {
      const [bsH, bsM] = breakStart.split(':').map(Number);
      const [beH, beM] = breakEnd.split(':').map(Number);
      breakStartMin = bsH * 60 + bsM;
      breakEndMin = beH * 60 + beM;
    }

    while (currentMin + slotDuration <= endMin) {
      // Skip break times
      if (breakStartMin !== null && breakEndMin !== null) {
        if (currentMin >= breakStartMin && currentMin < breakEndMin) {
          currentMin += slotDuration;
          continue;
        }
      }

      const h = Math.floor(currentMin / 60);
      const m = currentMin % 60;
      const slotTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      slotsToFilter.push(slotTime);
      currentMin += slotDuration;
    }
  }

  // 4. Retrieve actually booked slots
  const [bookedRows] = await pool.execute(
    `SELECT appointment_time FROM appointments
     WHERE doctor_id = ? AND appointment_date = ? AND status NOT IN ('cancelled', 'rejected')`,
    [doctorId, date]
  );
  const bookedTimes = bookedRows.map(r => {
    const t = r.appointment_time || '';
    return typeof t === 'string' ? t.substring(0, 5) : t;
  });

  // Filter out booked times
  const available = slotsToFilter.filter(slot => !bookedTimes.includes(slot));

  return available;
}

/**
 * Get available and booked slots for a doctor on a given date.
 * Returns both list to keep the Patient dashboard fully backward compatible.
 * @param {number} doctorId
 * @param {string} date
 * @returns {Object} { bookedSlots, availableSlots }
 */
async function getAvailableSlotsInfo(doctorId, date) {
  const available = await getAvailableSlots(doctorId, date);

  // Generate standard demo slot list (09:00 - 17:00 at 30 min interval) to calculate booked/unavailable ones
  const allSlots = [];
  for (let h = 9; h < 17; h++) {
    for (let m = 0; m < 60; m += 30) {
      allSlots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }

  // Any slot not in the available list is marked as "booked" or "unavailable"
  const booked = allSlots.filter(s => !available.includes(s));

  return {
    bookedSlots: booked,
    availableSlots: available,
  };
}

/**
 * Check if a specific slot is available
 */
async function isSlotAvailable(doctorId, date, time) {
  const available = await getAvailableSlots(doctorId, date);
  const formattedTime = time.substring(0, 5); // Ensure hh:mm format
  return available.includes(formattedTime);
}

module.exports = {
  getAvailableSlots,
  getAvailableSlotsInfo,
  isSlotAvailable,
};
