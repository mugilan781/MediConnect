-- ============================================================
-- MediConnect – TiDB Compatible Migrations (All-in-One)
-- Run AFTER tidb_setup.sql
-- ============================================================

USE mediconnect;

-- ============================================================
-- 1. Patient Dashboard Migration (MUST run first - adds status to consultations)
-- ============================================================
ALTER TABLE consultations
  ADD COLUMN status ENUM('requested', 'accepted', 'completed', 'rejected')
  DEFAULT 'completed'
  AFTER notes;

ALTER TABLE sample_collection_requests
  MODIFY COLUMN status ENUM('requested', 'assigned', 'in_progress', 'collected', 'cancelled')
  DEFAULT 'requested';

-- ============================================================
-- 2. Online Consultations Migration
-- ============================================================
ALTER TABLE consultations MODIFY COLUMN appointment_id INT NULL;

ALTER TABLE consultations MODIFY COLUMN status ENUM('requested', 'accepted', 'rejected', 'scheduled', 'in_progress', 'completed', 'cancelled') DEFAULT 'requested';

ALTER TABLE consultations ADD COLUMN preferred_date DATE DEFAULT NULL;
ALTER TABLE consultations ADD COLUMN health_concerns TEXT DEFAULT NULL;
ALTER TABLE consultations ADD COLUMN additional_notes TEXT DEFAULT NULL;
ALTER TABLE consultations ADD COLUMN consultation_date DATE DEFAULT NULL;
ALTER TABLE consultations ADD COLUMN consultation_time TIME DEFAULT NULL;
ALTER TABLE consultations ADD COLUMN duration INT DEFAULT 30;
ALTER TABLE consultations ADD COLUMN scheduled_notes TEXT DEFAULT NULL;

CREATE TABLE IF NOT EXISTS consultation_notes (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  consultation_id INT NOT NULL,
  diagnosis       TEXT DEFAULT NULL,
  recommendations TEXT DEFAULT NULL,
  follow_up_advice TEXT DEFAULT NULL,
  prescription_notes TEXT DEFAULT NULL,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notes_consultation (consultation_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS consultation_status_logs (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  consultation_id INT NOT NULL,
  previous_status VARCHAR(50) DEFAULT NULL,
  new_status      VARCHAR(50) NOT NULL,
  changed_by      ENUM('patient', 'doctor', 'admin', 'system') NOT NULL,
  reason          TEXT DEFAULT NULL,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_logs_consultation (consultation_id)
) ENGINE=InnoDB;

-- ============================================================
-- 3. Appointment Management Migration
-- ============================================================
ALTER TABLE appointments MODIFY COLUMN status ENUM('pending', 'scheduled', 'confirmed', 'completed', 'cancelled', 'rescheduled', 'no_show') DEFAULT 'pending';

UPDATE appointments SET status = 'pending' WHERE status = 'scheduled';

CREATE TABLE IF NOT EXISTS appointment_status_logs (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  appointment_id  INT NOT NULL,
  previous_status VARCHAR(50) DEFAULT NULL,
  new_status      VARCHAR(50) NOT NULL,
  changed_by      ENUM('patient', 'doctor', 'admin', 'system') NOT NULL,
  reason          TEXT DEFAULT NULL,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_status_logs_appt (appointment_id)
) ENGINE=InnoDB;

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
  INDEX idx_reschedules_appt (appointment_id)
) ENGINE=InnoDB;

-- ============================================================
-- 4. Doctor Dashboard Migration
-- ============================================================
ALTER TABLE doctor_schedules
  ADD COLUMN break_start_time TIME DEFAULT NULL,
  ADD COLUMN break_end_time TIME DEFAULT NULL;

CREATE TABLE IF NOT EXISTS doctor_leaves (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  doctor_id   INT NOT NULL,
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  reason      TEXT DEFAULT NULL,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_leaves_doctor (doctor_id),
  INDEX idx_leaves_dates (start_date, end_date)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS doctor_availability_slots (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  doctor_id    INT NOT NULL,
  slot_date    DATE NOT NULL,
  start_time   TIME NOT NULL,
  end_time     TIME NOT NULL,
  is_available TINYINT(1) DEFAULT 1,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_doctor_slot_time (doctor_id, slot_date, start_time),
  INDEX idx_slots_doctor (doctor_id),
  INDEX idx_slots_date (slot_date)
) ENGINE=InnoDB;

-- ============================================================
-- 5. Lab Bookings Status Migration
-- ============================================================
ALTER TABLE lab_bookings MODIFY COLUMN status ENUM('booked', 'sample_collected', 'processing', 'completed', 'cancelled', 'pending', 'confirmed', 'sample_scheduled') DEFAULT 'booked';

UPDATE lab_bookings SET status = 'pending' WHERE status = 'booked';

ALTER TABLE lab_bookings MODIFY COLUMN status ENUM('pending', 'confirmed', 'sample_scheduled', 'sample_collected', 'processing', 'completed', 'cancelled') DEFAULT 'pending';

CREATE TABLE IF NOT EXISTS lab_booking_status_logs (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  lab_booking_id  INT NOT NULL,
  previous_status VARCHAR(50) DEFAULT NULL,
  new_status      VARCHAR(50) NOT NULL,
  changed_by      ENUM('patient', 'doctor', 'admin', 'system') NOT NULL,
  reason          TEXT DEFAULT NULL,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_logs_lab_booking (lab_booking_id)
) ENGINE=InnoDB;

-- ============================================================
-- 6. Medical Reports Migration
-- ============================================================
ALTER TABLE medical_reports
  ADD COLUMN original_filename VARCHAR(255) DEFAULT NULL,
  ADD COLUMN file_size INT DEFAULT NULL,
  ADD COLUMN category VARCHAR(100) DEFAULT NULL,
  ADD COLUMN appointment_id INT DEFAULT NULL,
  ADD COLUMN consultation_id INT DEFAULT NULL;

CREATE INDEX idx_reports_category ON medical_reports(category);

CREATE TABLE IF NOT EXISTS report_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_name VARCHAR(100) NOT NULL UNIQUE,
  is_active TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO report_categories (category_name) VALUES
  ('Consultation Report'),
  ('Diagnosis Report'),
  ('Prescription Report'),
  ('General Medical Report'),
  ('Blood Test Report'),
  ('Thyroid Report'),
  ('Liver Function Report'),
  ('Vitamin Report'),
  ('CBC Report'),
  ('Custom Lab Report'),
  ('X-Ray Report'),
  ('Scan Report'),
  ('MRI Report'),
  ('Ultrasound Report')
ON DUPLICATE KEY UPDATE category_name = VALUES(category_name);

CREATE TABLE IF NOT EXISTS report_activity_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  report_id INT NOT NULL,
  user_id INT NOT NULL,
  activity_type ENUM('upload', 'view', 'edit', 'download', 'delete') NOT NULL,
  ip_address VARCHAR(45) DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_activity_report (report_id)
) ENGINE=InnoDB;

-- ============================================================
-- 7. Notifications Migration
-- ============================================================
ALTER TABLE notifications
  ADD COLUMN related_module VARCHAR(100) DEFAULT NULL,
  ADD COLUMN related_record_id INT DEFAULT NULL;

CREATE INDEX idx_notifications_related ON notifications(related_module, related_record_id);

CREATE TABLE IF NOT EXISTS scheduled_notifications (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  sender_id       INT NOT NULL,
  target_group    ENUM('all', 'all_patients', 'all_doctors', 'individual') NOT NULL,
  target_user_id  INT DEFAULT NULL,
  title           VARCHAR(255) NOT NULL,
  message         TEXT NOT NULL,
  type            ENUM('appointment', 'lab', 'report', 'system', 'reminder') NOT NULL DEFAULT 'system',
  link            VARCHAR(500) DEFAULT NULL,
  scheduled_for   DATETIME NOT NULL,
  status          ENUM('pending', 'sent', 'failed') DEFAULT 'pending',
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_scheduled_status (status),
  INDEX idx_scheduled_time (scheduled_for)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS notification_preferences (
  id                            INT AUTO_INCREMENT PRIMARY KEY,
  user_id                       INT NOT NULL UNIQUE,
  enable_appointment_reminders  TINYINT(1) DEFAULT 1,
  enable_consultation_reminders TINYINT(1) DEFAULT 1,
  enable_lab_reminders          TINYINT(1) DEFAULT 1,
  enable_collection_reminders   TINYINT(1) DEFAULT 1,
  enable_report_notifications   TINYINT(1) DEFAULT 1,
  enable_system_notifications   TINYINT(1) DEFAULT 1,
  updated_at                    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT IGNORE INTO notification_preferences (user_id)
SELECT id FROM users;

-- ============================================================
-- 8. Patient History Migration
-- ============================================================
ALTER TABLE patient_history
  MODIFY COLUMN event_type VARCHAR(100) NOT NULL,
  ADD COLUMN source_module VARCHAR(100) DEFAULT NULL,
  ADD COLUMN source_record_id INT DEFAULT NULL,
  ADD COLUMN metadata JSON DEFAULT NULL;

CREATE INDEX idx_history_source ON patient_history(source_module, source_record_id);

-- ============================================================
-- 9. Sample Collection Migration
-- ============================================================
ALTER TABLE sample_collection_requests MODIFY COLUMN status ENUM('requested', 'assigned', 'in_progress', 'collected', 'cancelled', 'scheduled', 'in_transit', 'testing', 'report_ready', 'delivered') DEFAULT 'requested';

UPDATE sample_collection_requests SET status = 'in_transit' WHERE status = 'in_progress';

ALTER TABLE sample_collection_requests MODIFY COLUMN status ENUM('requested', 'assigned', 'scheduled', 'in_transit', 'collected', 'testing', 'report_ready', 'delivered', 'cancelled') DEFAULT 'requested';

ALTER TABLE sample_collection_requests
  ADD COLUMN collection_date DATE DEFAULT NULL,
  ADD COLUMN collection_time TIME DEFAULT NULL;

CREATE TABLE IF NOT EXISTS sample_collection_status_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sample_collection_request_id INT NOT NULL,
  previous_status VARCHAR(50) DEFAULT NULL,
  new_status VARCHAR(50) NOT NULL,
  changed_by ENUM('patient', 'doctor', 'admin', 'system') NOT NULL,
  reason TEXT DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_logs_sample_collection (sample_collection_request_id)
) ENGINE=InnoDB;
