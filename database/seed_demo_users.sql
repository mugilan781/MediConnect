-- ============================================================
-- MediConnect – database/seed_demo_users.sql
-- Manual SQL for seeding demo users (optional — demoSeed.js handles this automatically)
-- ============================================================

USE mediconnect;

-- Demo Patient
INSERT IGNORE INTO users (email, password_hash, role, full_name, phone, is_active)
VALUES ('demo.patient@mediconnect.com', '$2a$10$DEMO_UNUSABLE_HASH_PLACEHOLDER', 'patient', 'Demo Patient', '9999900001', 1);

SET @demo_patient_uid = (SELECT id FROM users WHERE email = 'demo.patient@mediconnect.com');
INSERT IGNORE INTO patients (user_id, date_of_birth, gender, blood_group, address)
VALUES (@demo_patient_uid, '1995-01-01', 'male', 'O+', 'Demo Address, MediConnect City');

-- Demo Doctor
INSERT IGNORE INTO users (email, password_hash, role, full_name, phone, is_active)
VALUES ('demo.doctor@mediconnect.com', '$2a$10$DEMO_UNUSABLE_HASH_PLACEHOLDER', 'doctor', 'Dr. Demo Doctor', '9999900002', 1);

SET @demo_doctor_uid = (SELECT id FROM users WHERE email = 'demo.doctor@mediconnect.com');
INSERT IGNORE INTO doctors (user_id, specialization, qualification, experience_years, license_number, consultation_fee, available_days, slot_duration_min, bio, department, is_available)
VALUES (@demo_doctor_uid, 'General Medicine', 'MBBS, MD', 10, 'DEMO-LIC-001', 500.00, 'Mon,Tue,Wed,Thu,Fri', 30, 'Demo doctor profile for demonstration purposes.', 'General Medicine', 1);

-- Demo Admin
INSERT IGNORE INTO users (email, password_hash, role, full_name, phone, is_active)
VALUES ('demo.admin@mediconnect.com', '$2a$10$DEMO_UNUSABLE_HASH_PLACEHOLDER', 'admin', 'Demo Admin', '9999900003', 1);
