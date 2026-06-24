SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- MediConnect – Doctor Dashboard Module Migration
-- Schema updates for leaves, slots, and break times
-- ============================================================

-- 1. Add break times to doctor_schedules table
ALTER TABLE doctor_schedules
  ADD COLUMN break_start_time TIME DEFAULT NULL AFTER end_time,
  ADD COLUMN break_end_time TIME DEFAULT NULL AFTER break_start_time;

-- 2. Create doctor_leaves table
CREATE TABLE IF NOT EXISTS doctor_leaves (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  doctor_id   INT NOT NULL,
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  reason      TEXT DEFAULT NULL,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_leaves_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
  INDEX idx_leaves_doctor (doctor_id),
  INDEX idx_leaves_dates (start_date, end_date)
) ENGINE=InnoDB;

-- 3. Create doctor_availability_slots table
CREATE TABLE IF NOT EXISTS doctor_availability_slots (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  doctor_id    INT NOT NULL,
  slot_date    DATE NOT NULL,
  start_time   TIME NOT NULL,
  end_time     TIME NOT NULL,
  is_available TINYINT(1) DEFAULT 1,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_slots_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
  UNIQUE KEY uq_doctor_slot_time (doctor_id, slot_date, start_time),
  INDEX idx_slots_doctor (doctor_id),
  INDEX idx_slots_date (slot_date)
) ENGINE=InnoDB;


SET FOREIGN_KEY_CHECKS = 1;
