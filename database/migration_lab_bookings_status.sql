SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- MediConnect – database/migration_lab_bookings_status.sql
-- Schema updates for Lab Booking & Management Module
-- ============================================================

USE mediconnect;

-- 1. Alter lab_bookings status column to include both old and new enum values temporarily
ALTER TABLE lab_bookings MODIFY COLUMN status ENUM('booked', 'sample_collected', 'processing', 'completed', 'cancelled', 'pending', 'confirmed', 'sample_scheduled') DEFAULT 'booked';

-- 2. Update any existing 'booked' statuses to 'pending'
UPDATE lab_bookings SET status = 'pending' WHERE status = 'booked';

-- 3. Modify the status column again to restrict it to only the new enum values, setting default to 'pending'
ALTER TABLE lab_bookings MODIFY COLUMN status ENUM('pending', 'confirmed', 'sample_scheduled', 'sample_collected', 'processing', 'completed', 'cancelled') DEFAULT 'pending';

-- 4. Create lab_booking_status_logs table
CREATE TABLE IF NOT EXISTS lab_booking_status_logs (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  lab_booking_id  INT NOT NULL,
  previous_status VARCHAR(50) DEFAULT NULL,
  new_status      VARCHAR(50) NOT NULL,
  changed_by      ENUM('patient', 'doctor', 'admin', 'system') NOT NULL,
  reason          TEXT DEFAULT NULL,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_logs_lab_booking FOREIGN KEY (lab_booking_id) REFERENCES lab_bookings(id) ON DELETE CASCADE,
  INDEX idx_logs_lab_booking (lab_booking_id)
) ENGINE=InnoDB;


SET FOREIGN_KEY_CHECKS = 1;
