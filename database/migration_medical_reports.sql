SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- MediConnect – database/migration_medical_reports.sql
-- Schema updates for Medical Report Management Module
-- ============================================================

USE mediconnect;

-- 1. Alter medical_reports table to add the missing columns
ALTER TABLE medical_reports
  ADD COLUMN original_filename VARCHAR(255) DEFAULT NULL AFTER file_url,
  ADD COLUMN file_size INT DEFAULT NULL AFTER original_filename,
  ADD COLUMN category VARCHAR(100) DEFAULT NULL AFTER file_type,
  ADD COLUMN appointment_id INT DEFAULT NULL AFTER lab_booking_id,
  ADD COLUMN consultation_id INT DEFAULT NULL AFTER appointment_id;

-- 2. Add foreign keys and constraints to medical_reports
ALTER TABLE medical_reports
  ADD CONSTRAINT fk_reports_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_reports_consultation FOREIGN KEY (consultation_id) REFERENCES consultations(id) ON DELETE SET NULL;

-- 3. Create indexes
CREATE INDEX idx_reports_appointment ON medical_reports(appointment_id);
CREATE INDEX idx_reports_consultation ON medical_reports(consultation_id);
CREATE INDEX idx_reports_category ON medical_reports(category);

-- 4. Create report_categories table
CREATE TABLE IF NOT EXISTS report_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_name VARCHAR(100) NOT NULL UNIQUE,
  is_active TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 5. Seed report_categories
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

-- 6. Create report_activity_logs table
CREATE TABLE IF NOT EXISTS report_activity_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  report_id INT NOT NULL,
  user_id INT NOT NULL,
  activity_type ENUM('upload', 'view', 'edit', 'download', 'delete') NOT NULL,
  ip_address VARCHAR(45) DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_activity_report FOREIGN KEY (report_id) REFERENCES medical_reports(id) ON DELETE CASCADE,
  CONSTRAINT fk_activity_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_activity_report (report_id)
) ENGINE=InnoDB;


SET FOREIGN_KEY_CHECKS = 1;
