-- ============================================================
-- MediConnect – database/seed.sql
-- Complete re-runnable sample development data
-- ============================================================

USE mediconnect;

-- Disable foreign key checks to allow truncating/deleting tables cleanly
SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE doctor_schedules;
TRUNCATE TABLE password_reset_tokens;
TRUNCATE TABLE admin_settings;
TRUNCATE TABLE notifications;
TRUNCATE TABLE patient_history;
TRUNCATE TABLE medical_reports;
TRUNCATE TABLE sample_collection_requests;
TRUNCATE TABLE lab_bookings;
TRUNCATE TABLE lab_tests;
TRUNCATE TABLE consultations;
TRUNCATE TABLE appointments;
TRUNCATE TABLE doctors;
TRUNCATE TABLE patients;
TRUNCATE TABLE users;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- 1. Seed Users (passwords are bcrypt hash of 'password123')
-- ============================================================
INSERT INTO users (id, email, password_hash, role, full_name, phone) VALUES
  -- 1 Admin
  (1, 'admin@mediconnect.com', '$2a$10$gXDLsHN9nTWydEKQ8mzUs.E4CHKwDP/ax7eAYCmzO5uh5ifK.0SHS', 'admin', 'Admin MediConnect', '9000000001'),
  -- 5 Doctors (User IDs 2 to 6)
  (2, 'dr.sharma@mediconnect.com', '$2a$10$gXDLsHN9nTWydEKQ8mzUs.E4CHKwDP/ax7eAYCmzO5uh5ifK.0SHS', 'doctor', 'Dr. Priya Sharma', '9000000002'),
  (3, 'dr.mehta@mediconnect.com', '$2a$10$gXDLsHN9nTWydEKQ8mzUs.E4CHKwDP/ax7eAYCmzO5uh5ifK.0SHS', 'doctor', 'Dr. Arjun Mehta', '9000000003'),
  (4, 'dr.patel@mediconnect.com', '$2a$10$gXDLsHN9nTWydEKQ8mzUs.E4CHKwDP/ax7eAYCmzO5uh5ifK.0SHS', 'doctor', 'Dr. Sneha Patel', '9000000004'),
  (5, 'dr.verma@mediconnect.com', '$2a$10$gXDLsHN9nTWydEKQ8mzUs.E4CHKwDP/ax7eAYCmzO5uh5ifK.0SHS', 'doctor', 'Dr. Rajesh Verma', '9000000005'),
  (6, 'dr.reddy@mediconnect.com', '$2a$10$gXDLsHN9nTWydEKQ8mzUs.E4CHKwDP/ax7eAYCmzO5uh5ifK.0SHS', 'doctor', 'Dr. K. S. Reddy', '9000000006'),
  -- 10 Patients (User IDs 7 to 16)
  (7, 'rahul@example.com', '$2a$10$gXDLsHN9nTWydEKQ8mzUs.E4CHKwDP/ax7eAYCmzO5uh5ifK.0SHS', 'patient', 'Rahul Kumar', '9000000007'),
  (8, 'anita@example.com', '$2a$10$gXDLsHN9nTWydEKQ8mzUs.E4CHKwDP/ax7eAYCmzO5uh5ifK.0SHS', 'patient', 'Anita Desai', '9000000008'),
  (9, 'vikram@example.com', '$2a$10$gXDLsHN9nTWydEKQ8mzUs.E4CHKwDP/ax7eAYCmzO5uh5ifK.0SHS', 'patient', 'Vikram Singh', '9000000009'),
  (10, 'priya@example.com', '$2a$10$gXDLsHN9nTWydEKQ8mzUs.E4CHKwDP/ax7eAYCmzO5uh5ifK.0SHS', 'patient', 'Priya Iyer', '9000000010'),
  (11, 'amit@example.com', '$2a$10$gXDLsHN9nTWydEKQ8mzUs.E4CHKwDP/ax7eAYCmzO5uh5ifK.0SHS', 'patient', 'Amit Patel', '9000000011'),
  (12, 'sneha@example.com', '$2a$10$gXDLsHN9nTWydEKQ8mzUs.E4CHKwDP/ax7eAYCmzO5uh5ifK.0SHS', 'patient', 'Sneha Rao', '9000000012'),
  (13, 'rohit@example.com', '$2a$10$gXDLsHN9nTWydEKQ8mzUs.E4CHKwDP/ax7eAYCmzO5uh5ifK.0SHS', 'patient', 'Rohit Sharma', '9000000013'),
  (14, 'pooja@example.com', '$2a$10$gXDLsHN9nTWydEKQ8mzUs.E4CHKwDP/ax7eAYCmzO5uh5ifK.0SHS', 'patient', 'Pooja Hegde', '9000000014'),
  (15, 'sanjay@example.com', '$2a$10$gXDLsHN9nTWydEKQ8mzUs.E4CHKwDP/ax7eAYCmzO5uh5ifK.0SHS', 'patient', 'Sanjay Dutt', '9000000015'),
  (16, 'neha@example.com', '$2a$10$gXDLsHN9nTWydEKQ8mzUs.E4CHKwDP/ax7eAYCmzO5uh5ifK.0SHS', 'patient', 'Neha Gupta', '9000000016');

-- ============================================================
-- 2. Seed Doctors (Doctor IDs 1 to 5)
-- ============================================================
INSERT INTO doctors (id, user_id, specialization, qualification, experience_years, license_number, consultation_fee, available_days, slot_duration_min, bio, department) VALUES
  (1, 2, 'Cardiology', 'MBBS, MD Cardiology', 12, 'MCI-2024-001', 800.00, 'Mon,Tue,Wed,Thu,Fri', 30, 'Senior Cardiologist with 12 years of experience in interventional cardiology.', 'Cardiology'),
  (2, 3, 'Dermatology', 'MBBS, MD Dermatology', 8, 'MCI-2024-002', 600.00, 'Mon,Wed,Fri', 30, 'Dermatologist specializing in cosmetic and clinical dermatology.', 'Dermatology'),
  (3, 4, 'Pediatrics', 'MBBS, MD Pediatrics', 10, 'MCI-2024-003', 500.00, 'Mon,Tue,Thu,Fri', 30, 'Consultant Pediatrician with a focus on neonatology and child development.', 'Pediatrics'),
  (4, 5, 'Neurology', 'MBBS, DM Neurology', 15, 'MCI-2024-004', 1000.00, 'Tue,Wed,Thu', 30, 'Professor and Head of Neurology Department, specializing in neurodegenerative diseases.', 'Neurology'),
  (5, 6, 'Orthopedics', 'MBBS, MS Orthopedics', 9, 'MCI-2024-005', 700.00, 'Mon,Thu,Sat', 30, 'Orthopedic surgeon specializing in sports medicine and arthroscopic surgeries.', 'Orthopedics');

-- ============================================================
-- 3. Seed Patients (Patient IDs 1 to 10)
-- ============================================================
INSERT INTO patients (id, user_id, date_of_birth, gender, blood_group, address, emergency_contact, allergies, insurance_id) VALUES
  (1, 7, '1995-03-15', 'male', 'O+', '123 MG Road, Bengaluru 560001', '9000000010', 'Penicillin', 'INS-P-001'),
  (2, 8, '1990-08-22', 'female', 'B+', '456 Anna Nagar, Chennai 600040', '9000000011', NULL, 'INS-P-002'),
  (3, 9, '1988-11-05', 'male', 'A+', '789 Link Road, Andheri West, Mumbai 400053', '9000000012', 'Sulfonamides', 'INS-P-003'),
  (4, 10, '1993-04-12', 'female', 'AB+', '321 Park Avenue, Salt Lake, Kolkata 700091', '9000000013', NULL, NULL),
  (5, 11, '1985-07-30', 'male', 'O-', '555 Ring Road, Gachibowli, Hyderabad 500032', '9000000014', 'Peanuts', 'INS-P-005'),
  (6, 12, '1997-01-25', 'female', 'B-', '888 Hill View, Baner, Pune 411045', '9000000015', NULL, NULL),
  (7, 13, '1992-09-18', 'male', 'A-', '111 Sector 15, Noida 201301', '9000000016', 'Lactose', 'INS-P-007'),
  (8, 14, '1994-06-14', 'female', 'O+', '222 Lake View Road, Kochi 682016', '9000000017', NULL, 'INS-P-008'),
  (9, 15, '1975-02-10', 'male', 'B+', '333 Pine Avenue, Sector 17, Chandigarh 160017', '9000000018', 'Aspirin', NULL),
  (10, 16, '1999-10-05', 'female', 'AB-', '444 Civil Lines, Jaipur 302006', '9000000019', NULL, 'INS-P-010');

-- ============================================================
-- 4. Seed Lab Tests (15 Tests)
-- ============================================================
INSERT INTO lab_tests (id, test_name, test_code, category, description, price, preparation_instructions, turnaround_hours) VALUES
  (1, 'Complete Blood Count', 'CBC-001', 'Blood', 'Measures red blood cells, white blood cells, and platelets.', 500.00, 'No special preparation required.', 6),
  (2, 'Lipid Profile', 'LPD-001', 'Blood', 'Checks cholesterol and triglyceride levels.', 800.00, 'Fasting for 12 hours required.', 12),
  (3, 'Thyroid Function Test', 'THY-001', 'Blood', 'Measures TSH, T3, and T4 hormone levels.', 900.00, 'No special preparation required.', 24),
  (4, 'Urine Routine Examination', 'URE-001', 'Urine', 'Checks for infections, kidney problems, and other conditions.', 300.00, 'Collect midstream urine sample.', 4),
  (5, 'Chest X-Ray', 'XRY-001', 'Imaging', 'Standard chest radiograph for lung and heart evaluation.', 1200.00, 'Remove metal accessories.', 2),
  (6, 'Blood Sugar Fasting', 'BSF-001', 'Blood', 'Measures glucose levels in blood after fasting.', 150.00, 'Fasting for 8-10 hours required.', 6),
  (7, 'HbA1c (Glycated Hemoglobin)', 'HBA-001', 'Blood', 'Measures average blood sugar levels over the past 3 months.', 400.00, 'No special preparation required.', 8),
  (8, 'Liver Function Test', 'LFT-001', 'Blood', 'Assesses proteins, liver enzymes, and bilirubin levels in blood.', 750.00, 'No special preparation required.', 12),
  (9, 'Kidney Function Test', 'KFT-001', 'Blood', 'Evaluates urea, creatinine, and electrolytes in blood.', 700.00, 'No special preparation required.', 12),
  (10, 'Vitamin D3 Test', 'VITD-001', 'Blood', 'Measures level of 25-hydroxyvitamin D in blood.', 1500.00, 'No special preparation required.', 24),
  (11, 'Vitamin B12 Test', 'VITB-001', 'Blood', 'Measures active Vitamin B12 levels in blood.', 1200.00, 'Fasting recommended but not mandatory.', 24),
  (12, 'Electrocardiogram', 'ECG-001', 'Cardiology', 'Records electrical signals from the heart to check for conditions.', 600.00, 'No special preparation required.', 2),
  (13, 'Ultrasound Abdomen', 'USG-001', 'Imaging', 'Evaluates internal organs like liver, kidneys, gallbladder, etc.', 1800.00, 'Fasting for 6 hours required.', 4),
  (14, 'Covid-19 RT-PCR Test', 'COV-001', 'Molecular', 'Detects SARS-CoV-2 viral RNA via nasal/throat swabs.', 1000.00, 'Do not eat or drink 30 minutes before test.', 24),
  (15, 'Hemoglobin Test', 'HB-001', 'Blood', 'Measures amount of hemoglobin protein in red blood cells.', 200.00, 'No special preparation required.', 4);

-- ============================================================
-- 5. Seed Admin Settings (CMS Settings)
-- ============================================================
INSERT INTO admin_settings (setting_key, setting_value, setting_group, description, updated_by) VALUES
  ('clinic_name', 'MediConnect Digital Clinic', 'clinic', 'Display name of the clinic', 1),
  ('clinic_phone', '+91-80-1234-5678', 'clinic', 'Clinic contact phone number', 1),
  ('clinic_email', 'contact@mediconnect.com', 'clinic', 'Clinic contact email', 1),
  ('clinic_address', '100 Health Avenue, Bengaluru 560001', 'clinic', 'Clinic physical address', 1),
  ('appointment_lead_days', '30', 'appointments', 'How many days ahead patients can book', 1),
  ('max_daily_appointments', '20', 'appointments', 'Max appointments per doctor per day', 1),
  ('enable_email_notifications', 'true', 'notifications', 'Whether to send email notifications', 1),
  ('sample_collection_available', 'true', 'lab', 'Whether home sample collection is available', 1);

-- ============================================================
-- 6. Seed Notifications Samples
-- ============================================================
INSERT INTO notifications (user_id, type, title, message, link, is_read) VALUES
  (7, 'system', 'Welcome to MediConnect', 'Thank you for registering at MediConnect. You can now book appointments and lab tests online.', '/dashboard', 0),
  (7, 'appointment', 'Appointment Scheduled', 'Your appointment with Dr. Priya Sharma is booked for tomorrow at 10:00 AM.', '/appointments', 0),
  (2, 'appointment', 'New Booking Received', 'Rahul Kumar has booked an appointment with you for tomorrow at 10:00 AM.', '/appointments', 0),
  (8, 'lab', 'Lab Test Sample Collected', 'Your sample for Lipid Profile has been collected. You will receive reports in 12 hours.', '/lab-bookings', 1),
  (8, 'report', 'Medical Report Released', 'Your medical report for Lipid Profile has been uploaded and is ready to view.', '/reports', 0),
  (1, 'system', 'System Backup Complete', 'Daily database backup completed successfully at 02:00 AM.', '/admin', 1);

-- ============================================================
-- 7. Seed Doctor Schedules
-- ============================================================
INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time, is_active) VALUES
  -- Doctor 1 (Dr. Priya Sharma) - Mon to Fri (9 AM - 5 PM)
  (1, 'Mon', '09:00:00', '17:00:00', 1),
  (1, 'Tue', '09:00:00', '17:00:00', 1),
  (1, 'Wed', '09:00:00', '17:00:00', 1),
  (1, 'Thu', '09:00:00', '17:00:00', 1),
  (1, 'Fri', '09:00:00', '17:00:00', 1),
  -- Doctor 2 (Dr. Arjun Mehta) - Mon, Wed, Fri (9 AM - 5 PM)
  (2, 'Mon', '09:00:00', '17:00:00', 1),
  (2, 'Wed', '09:00:00', '17:00:00', 1),
  (2, 'Fri', '09:00:00', '17:00:00', 1),
  -- Doctor 3 (Dr. Sneha Patel) - Mon, Tue, Thu, Fri (10 AM - 4 PM)
  (3, 'Mon', '10:00:00', '16:00:00', 1),
  (3, 'Tue', '10:00:00', '16:00:00', 1),
  (3, 'Thu', '10:00:00', '16:00:00', 1),
  (3, 'Fri', '10:00:00', '16:00:00', 1),
  -- Doctor 4 (Dr. Rajesh Verma) - Tue, Wed, Thu (9 AM - 5 PM)
  (4, 'Tue', '09:00:00', '17:00:00', 1),
  (4, 'Wed', '09:00:00', '17:00:00', 1),
  (4, 'Thu', '09:00:00', '17:00:00', 1),
  -- Doctor 5 (Dr. K. S. Reddy) - Mon, Thu, Sat (9 AM - 5 PM)
  (5, 'Mon', '09:00:00', '17:00:00', 1),
  (5, 'Thu', '09:00:00', '17:00:00', 1),
  (5, 'Sat', '09:00:00', '17:00:00', 1);
