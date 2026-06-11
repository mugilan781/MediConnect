-- ============================================================
-- MediConnect – database/schema.sql
-- Complete MySQL Database Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS mediconnect
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE mediconnect;

-- ============================================================
-- 1. users
-- Central authentication table
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  email           VARCHAR(255) NOT NULL UNIQUE,
  password_hash   VARCHAR(255) NOT NULL,
  role            ENUM('patient', 'doctor', 'admin') NOT NULL DEFAULT 'patient',
  full_name       VARCHAR(150) NOT NULL,
  phone           VARCHAR(20) DEFAULT NULL,
  avatar_url      VARCHAR(500) DEFAULT NULL,
  is_active       TINYINT(1) DEFAULT 1,
  last_login      DATETIME DEFAULT NULL,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_users_email (email),
  INDEX idx_users_role (role),
  INDEX idx_users_active (is_active)
) ENGINE=InnoDB;

-- ============================================================
-- 2. patients
-- Extended profile for patient users
-- ============================================================
CREATE TABLE IF NOT EXISTS patients (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  user_id           INT NOT NULL UNIQUE,
  date_of_birth     DATE DEFAULT NULL,
  gender            ENUM('male', 'female', 'other') DEFAULT NULL,
  blood_group       VARCHAR(5) DEFAULT NULL,
  address           TEXT DEFAULT NULL,
  emergency_contact VARCHAR(20) DEFAULT NULL,
  insurance_id      VARCHAR(100) DEFAULT NULL,
  allergies         TEXT DEFAULT NULL,
  created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_patients_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 3. doctors
-- Extended profile for doctor users
-- ============================================================
CREATE TABLE IF NOT EXISTS doctors (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  user_id           INT NOT NULL UNIQUE,
  specialization    VARCHAR(150) NOT NULL,
  qualification     VARCHAR(255) NOT NULL,
  experience_years  INT DEFAULT 0,
  license_number    VARCHAR(100) UNIQUE,
  consultation_fee  DECIMAL(10, 2) DEFAULT 0.00,
  available_days    VARCHAR(100) DEFAULT NULL,
  slot_duration_min INT DEFAULT 30,
  bio               TEXT DEFAULT NULL,
  department        VARCHAR(100) DEFAULT NULL,
  is_available      TINYINT(1) DEFAULT 1,
  created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_doctors_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_doctors_specialization (specialization),
  INDEX idx_doctors_department (department),
  INDEX idx_doctors_available (is_available)
) ENGINE=InnoDB;

-- ============================================================
-- 4. appointments
-- Core booking table
-- ============================================================
CREATE TABLE IF NOT EXISTS appointments (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  patient_id        INT NOT NULL,
  doctor_id         INT NOT NULL,
  appointment_date  DATE NOT NULL,
  appointment_time  TIME NOT NULL,
  end_time          TIME DEFAULT NULL,
  status            ENUM('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show') DEFAULT 'scheduled',
  type              ENUM('in_person', 'teleconsult') DEFAULT 'in_person',
  reason            TEXT DEFAULT NULL,
  notes             TEXT DEFAULT NULL,
  cancelled_by      ENUM('patient', 'doctor', 'admin') DEFAULT NULL,
  cancel_reason     TEXT DEFAULT NULL,
  created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_appointments_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  CONSTRAINT fk_appointments_doctor  FOREIGN KEY (doctor_id)  REFERENCES doctors(id)  ON DELETE CASCADE,
  UNIQUE KEY uq_doctor_slot (doctor_id, appointment_date, appointment_time),
  INDEX idx_appointments_date (appointment_date),
  INDEX idx_appointments_status (status),
  INDEX idx_appointments_patient (patient_id),
  INDEX idx_appointments_doctor (doctor_id)
) ENGINE=InnoDB;

-- ============================================================
-- 5. consultations
-- Records created by doctors after appointments
-- ============================================================
CREATE TABLE IF NOT EXISTS consultations (
  id                    INT AUTO_INCREMENT PRIMARY KEY,
  appointment_id        INT NOT NULL UNIQUE,
  doctor_id             INT NOT NULL,
  patient_id            INT NOT NULL,
  diagnosis             TEXT DEFAULT NULL,
  symptoms              TEXT DEFAULT NULL,
  prescription          TEXT DEFAULT NULL,
  prescription_file_url VARCHAR(500) DEFAULT NULL,
  follow_up_date        DATE DEFAULT NULL,
  notes                 TEXT DEFAULT NULL,
  created_at            DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_consultations_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
  CONSTRAINT fk_consultations_doctor      FOREIGN KEY (doctor_id)      REFERENCES doctors(id),
  CONSTRAINT fk_consultations_patient     FOREIGN KEY (patient_id)     REFERENCES patients(id),
  INDEX idx_consultations_doctor (doctor_id),
  INDEX idx_consultations_patient (patient_id)
) ENGINE=InnoDB;

-- ============================================================
-- 6. lab_tests
-- Master catalog of available lab tests
-- ============================================================
CREATE TABLE IF NOT EXISTS lab_tests (
  id                       INT AUTO_INCREMENT PRIMARY KEY,
  test_name                VARCHAR(200) NOT NULL,
  test_code                VARCHAR(50) NOT NULL UNIQUE,
  category                 VARCHAR(100) DEFAULT NULL,
  description              TEXT DEFAULT NULL,
  price                    DECIMAL(10, 2) NOT NULL,
  preparation_instructions TEXT DEFAULT NULL,
  turnaround_hours         INT DEFAULT 24,
  is_active                TINYINT(1) DEFAULT 1,
  created_at               DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at               DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_lab_tests_category (category),
  INDEX idx_lab_tests_active (is_active)
) ENGINE=InnoDB;

-- ============================================================
-- 7. lab_bookings
-- Patient bookings for lab tests
-- ============================================================
CREATE TABLE IF NOT EXISTS lab_bookings (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  patient_id      INT NOT NULL,
  lab_test_id     INT NOT NULL,
  doctor_id       INT DEFAULT NULL,
  booking_date    DATE NOT NULL,
  preferred_time  TIME DEFAULT NULL,
  status          ENUM('booked', 'sample_collected', 'processing', 'completed', 'cancelled') DEFAULT 'booked',
  result_file_url VARCHAR(500) DEFAULT NULL,
  result_summary  TEXT DEFAULT NULL,
  notes           TEXT DEFAULT NULL,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_lab_bookings_patient  FOREIGN KEY (patient_id)  REFERENCES patients(id)  ON DELETE CASCADE,
  CONSTRAINT fk_lab_bookings_lab_test FOREIGN KEY (lab_test_id) REFERENCES lab_tests(id),
  CONSTRAINT fk_lab_bookings_doctor   FOREIGN KEY (doctor_id)   REFERENCES doctors(id),
  INDEX idx_lab_bookings_status (status),
  INDEX idx_lab_bookings_patient (patient_id),
  INDEX idx_lab_bookings_date (booking_date)
) ENGINE=InnoDB;

-- ============================================================
-- 8. sample_collection_requests
-- Home / on-site sample collection
-- ============================================================
CREATE TABLE IF NOT EXISTS sample_collection_requests (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  lab_booking_id      INT NOT NULL,
  patient_id          INT NOT NULL,
  collection_address  TEXT NOT NULL,
  preferred_date      DATE NOT NULL,
  preferred_time_slot VARCHAR(50) DEFAULT NULL,
  status              ENUM('requested', 'assigned', 'collected', 'cancelled') DEFAULT 'requested',
  collector_name      VARCHAR(150) DEFAULT NULL,
  collector_phone     VARCHAR(20) DEFAULT NULL,
  collected_at        DATETIME DEFAULT NULL,
  notes               TEXT DEFAULT NULL,
  created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_sample_lab_booking FOREIGN KEY (lab_booking_id) REFERENCES lab_bookings(id) ON DELETE CASCADE,
  CONSTRAINT fk_sample_patient     FOREIGN KEY (patient_id)     REFERENCES patients(id),
  INDEX idx_sample_status (status),
  INDEX idx_sample_date (preferred_date)
) ENGINE=InnoDB;

-- ============================================================
-- 9. medical_reports
-- Uploaded reports (lab results, imaging, prescriptions)
-- ============================================================
CREATE TABLE IF NOT EXISTS medical_reports (
  id                     INT AUTO_INCREMENT PRIMARY KEY,
  patient_id             INT NOT NULL,
  doctor_id              INT DEFAULT NULL,
  lab_booking_id         INT DEFAULT NULL,
  report_type            ENUM('lab_result', 'prescription', 'imaging', 'discharge_summary', 'other') NOT NULL,
  title                  VARCHAR(255) NOT NULL,
  file_url               VARCHAR(500) NOT NULL,
  file_type              VARCHAR(20) DEFAULT NULL,
  notes                  TEXT DEFAULT NULL,
  is_shared_with_patient TINYINT(1) DEFAULT 1,
  created_at             DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at             DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_reports_patient     FOREIGN KEY (patient_id)     REFERENCES patients(id)     ON DELETE CASCADE,
  CONSTRAINT fk_reports_doctor      FOREIGN KEY (doctor_id)      REFERENCES doctors(id),
  CONSTRAINT fk_reports_lab_booking FOREIGN KEY (lab_booking_id)  REFERENCES lab_bookings(id),
  INDEX idx_reports_patient (patient_id),
  INDEX idx_reports_type (report_type)
) ENGINE=InnoDB;

-- ============================================================
-- 10. patient_history
-- Aggregated timeline of a patient's medical journey
-- ============================================================
CREATE TABLE IF NOT EXISTS patient_history (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  patient_id   INT NOT NULL,
  event_type   ENUM('appointment', 'consultation', 'lab_test', 'report', 'prescription', 'note') NOT NULL,
  event_id     INT DEFAULT NULL,
  title        VARCHAR(255) NOT NULL,
  description  TEXT DEFAULT NULL,
  event_date   DATETIME NOT NULL,
  recorded_by  INT DEFAULT NULL,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_history_patient  FOREIGN KEY (patient_id)  REFERENCES patients(id) ON DELETE CASCADE,
  CONSTRAINT fk_history_recorder FOREIGN KEY (recorded_by) REFERENCES users(id),
  INDEX idx_history_patient (patient_id),
  INDEX idx_history_event_date (event_date),
  INDEX idx_history_event_type (event_type)
) ENGINE=InnoDB;

-- ============================================================
-- 11. notifications
-- In-app notification system
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL,
  type       ENUM('appointment', 'lab', 'report', 'system', 'reminder') NOT NULL,
  title      VARCHAR(255) NOT NULL,
  message    TEXT NOT NULL,
  link       VARCHAR(500) DEFAULT NULL,
  is_read    TINYINT(1) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_notifications_user (user_id),
  INDEX idx_notifications_read (is_read),
  INDEX idx_notifications_created (created_at)
) ENGINE=InnoDB;

-- ============================================================
-- 12. admin_settings
-- Key-value configuration store
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_settings (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  setting_key    VARCHAR(100) NOT NULL UNIQUE,
  setting_value  TEXT DEFAULT NULL,
  setting_group  VARCHAR(100) DEFAULT 'general',
  description    TEXT DEFAULT NULL,
  updated_by     INT DEFAULT NULL,
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_settings_user FOREIGN KEY (updated_by) REFERENCES users(id),
  INDEX idx_settings_group (setting_group)
) ENGINE=InnoDB;

-- ============================================================
-- 13. password_reset_tokens
-- Secure token store for password recovery
-- ============================================================
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL,
  token      VARCHAR(255) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  used       TINYINT(1) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_reset_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_reset_token (token),
  INDEX idx_reset_expires (expires_at)
) ENGINE=InnoDB;

-- ============================================================
-- 14. doctor_schedules
-- Per-day time-range scheduling for doctors
-- ============================================================
CREATE TABLE IF NOT EXISTS doctor_schedules (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  doctor_id   INT NOT NULL,
  day_of_week ENUM('Mon','Tue','Wed','Thu','Fri','Sat','Sun') NOT NULL,
  start_time  TIME NOT NULL DEFAULT '09:00:00',
  end_time    TIME NOT NULL DEFAULT '17:00:00',
  is_active   TINYINT(1) DEFAULT 1,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_schedules_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
  UNIQUE KEY uq_doctor_day (doctor_id, day_of_week),
  INDEX idx_schedules_doctor (doctor_id)
) ENGINE=InnoDB;
