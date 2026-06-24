SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- MediConnect – database/migration_appointment_management.sql
-- Schema updates for appointment status logs and reschedule history
-- ============================================================

USE mediconnect;

-- 1. Alter appointments table: Expand status column enum options
ALTER TABLE appointments MODIFY COLUMN status ENUM('pending', 'scheduled', 'confirmed', 'completed', 'cancelled', 'rescheduled', 'no_show') DEFAULT 'pending';

-- Update any existing 'scheduled' rows to 'pending' to match standard starting state
UPDATE appointments SET status = 'pending' WHERE status = 'scheduled';

-- 2. Create appointment_status_logs table
CREATE TABLE IF NOT EXISTS appointment_status_logs (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  appointment_id  INT NOT NULL,
  previous_status VARCHAR(50) DEFAULT NULL,
  new_status      VARCHAR(50) NOT NULL,
  changed_by      ENUM('patient', 'doctor', 'admin', 'system') NOT NULL,
  reason          TEXT DEFAULT NULL,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_status_logs_appt FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
  INDEX idx_status_logs_appt (appointment_id)
) ENGINE=InnoDB;

-- 3. Create appointment_reschedules table
CREATE TABLE IF NOT EXISTS appointment_reschedules (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  appointment_id  INT NOT NULL,
  previous_date   DATE NOT NULL,
  previous_time   TIME NOT NULL,
  new_date        DATE NOT NULL,
  new_time        TIME NOT NULL,
  rescheduled_by  ENUM('patient', 'doctor', 'admin') NOT NULL,
  reason          TEXT DEFAULT NULL,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_reschedules_appt FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
  INDEX idx_reschedules_appt (appointment_id)
) ENGINE=InnoDB;


SET FOREIGN_KEY_CHECKS = 1;
