SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- MediConnect – database/migration_online_consultations.sql
-- Schema updates for Online Consultation Module
-- ============================================================

USE mediconnect;

-- 1. Alter consultations table: make appointment_id NULLable, modify status enum, and add fields
ALTER TABLE consultations MODIFY COLUMN appointment_id INT NULL;

ALTER TABLE consultations MODIFY COLUMN status ENUM('requested', 'accepted', 'rejected', 'scheduled', 'in_progress', 'completed', 'cancelled') DEFAULT 'requested';

-- Add columns if they do not exist
ALTER TABLE consultations ADD COLUMN preferred_date DATE DEFAULT NULL;
ALTER TABLE consultations ADD COLUMN health_concerns TEXT DEFAULT NULL;
ALTER TABLE consultations ADD COLUMN additional_notes TEXT DEFAULT NULL;
ALTER TABLE consultations ADD COLUMN consultation_date DATE DEFAULT NULL;
ALTER TABLE consultations ADD COLUMN consultation_time TIME DEFAULT NULL;
ALTER TABLE consultations ADD COLUMN duration INT DEFAULT 30;
ALTER TABLE consultations ADD COLUMN scheduled_notes TEXT DEFAULT NULL;

-- 2. Create consultation_notes table
CREATE TABLE IF NOT EXISTS consultation_notes (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  consultation_id INT NOT NULL,
  diagnosis       TEXT DEFAULT NULL,
  recommendations TEXT DEFAULT NULL,
  follow_up_advice TEXT DEFAULT NULL,
  prescription_notes TEXT DEFAULT NULL,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notes_consultation FOREIGN KEY (consultation_id) REFERENCES consultations(id) ON DELETE CASCADE,
  INDEX idx_notes_consultation (consultation_id)
) ENGINE=InnoDB;

-- 3. Create consultation_status_logs table
CREATE TABLE IF NOT EXISTS consultation_status_logs (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  consultation_id INT NOT NULL,
  previous_status VARCHAR(50) DEFAULT NULL,
  new_status      VARCHAR(50) NOT NULL,
  changed_by      ENUM('patient', 'doctor', 'admin', 'system') NOT NULL,
  reason          TEXT DEFAULT NULL,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_logs_consultation FOREIGN KEY (consultation_id) REFERENCES consultations(id) ON DELETE CASCADE,
  INDEX idx_logs_consultation (consultation_id)
) ENGINE=InnoDB;


SET FOREIGN_KEY_CHECKS = 1;
