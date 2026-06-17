-- ============================================================
-- MediConnect – database/migration_cms.sql
-- Schema updates for Enterprise CMS Module
-- ============================================================

USE mediconnect;

-- 1. Create cms_pages table for managing pages metadata & SEO
CREATE TABLE IF NOT EXISTS cms_pages (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  slug              VARCHAR(100) NOT NULL UNIQUE,
  title             VARCHAR(255) NOT NULL,
  meta_title        VARCHAR(255) DEFAULT NULL,
  meta_description  TEXT DEFAULT NULL,
  meta_keywords     VARCHAR(500) DEFAULT NULL,
  og_title          VARCHAR(255) DEFAULT NULL,
  og_description    TEXT DEFAULT NULL,
  og_image          VARCHAR(500) DEFAULT NULL,
  is_active         TINYINT(1) DEFAULT 1,
  created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_pages_slug (slug),
  INDEX idx_pages_active (is_active)
) ENGINE=InnoDB;

-- 2. Create cms_faqs table for searchable, reorderable public FAQs
CREATE TABLE IF NOT EXISTS cms_faqs (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  question      TEXT NOT NULL,
  answer        TEXT NOT NULL,
  display_order INT DEFAULT 0,
  is_active     TINYINT(1) DEFAULT 1,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_faqs_active (is_active),
  INDEX idx_faqs_order (display_order)
) ENGINE=InnoDB;

-- 3. Create cms_social_links table for site social profiles
CREATE TABLE IF NOT EXISTS cms_social_links (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  platform    VARCHAR(50) NOT NULL UNIQUE,
  url         VARCHAR(500) DEFAULT NULL,
  is_active   TINYINT(1) DEFAULT 1,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_social_active (is_active)
) ENGINE=InnoDB;

-- 4. Create cms_media table for tracking uploaded assets
CREATE TABLE IF NOT EXISTS cms_media (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  filename      VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type     VARCHAR(100) NOT NULL,
  file_size     INT NOT NULL,
  file_path     VARCHAR(500) NOT NULL,
  uploaded_by   INT NOT NULL,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_media_user FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 5. Create a placeholder patient (ID 999) for general/system administrative logs in patient_history
-- Admin user has user_id = 1. We insert a matching patient record.
INSERT IGNORE INTO patients (id, user_id, date_of_birth, gender, blood_group, address, emergency_contact)
VALUES (999, 1, '1970-01-01', 'other', 'O+', 'MediConnect System Log', '9000000001');

-- 6. Seed default pages metadata
INSERT IGNORE INTO cms_pages (slug, title, meta_title, meta_description, meta_keywords, og_title, og_description) VALUES
('homepage', 'Home', 'MediConnect – Digital Clinic & Appointment Management', 'Book appointments, consult with top doctors, manage lab tests, and access your complete medical history online.', 'healthcare, clinic, doctor appointment, lab test, medical record', 'MediConnect Homepage', 'Your Health, Connected & Simplified.'),
('about', 'About Us', 'About Us – MediConnect', 'Learn about our mission to make healthcare accessible, digital, and seamless for everyone.', 'about us, clinic history, team, healthcare objectives', 'About Us – MediConnect', 'Our Mission to digitalize healthcare.'),
('contact', 'Contact Us', 'Contact Us – MediConnect', 'Get in touch with our team for appointments, inquiries, or emergency services.', 'contact details, working hours, phone number, clinic address', 'Contact Us – MediConnect', 'We are here to help. Reach out to us.'),
('services', 'Our Services', 'Our Services – MediConnect', 'Explore our healthcare services including doctor scheduling, telehealth consultations, and diagnostics.', 'telehealth, lab booking, home care services', 'Our Services – MediConnect', 'Complete healthcare management services.'),
('faq', 'Frequently Asked Questions', 'FAQ – MediConnect Support', 'Find answers to common questions about booking, payments, medical records, and reports.', 'faq, support, help center, questions', 'FAQ – MediConnect Support', 'Help and support guides.');

-- 7. Seed social links placeholders
INSERT IGNORE INTO cms_social_links (platform, url, is_active) VALUES
('facebook', 'https://facebook.com/mediconnect', 1),
('instagram', 'https://instagram.com/mediconnect', 1),
('linkedin', 'https://linkedin.com/company/mediconnect', 1),
('twitter', 'https://twitter.com/mediconnect', 1),
('youtube', 'https://youtube.com/mediconnect', 1);

-- 8. Seed About & Contact sections inside cms_content
INSERT IGNORE INTO cms_content (section_key, section_data, is_active, updated_by) VALUES
('about', JSON_OBJECT(
  'title', 'About MediConnect',
  'subtitle', 'We\'re on a mission to make healthcare accessible, digital, and seamless for everyone — patients, doctors, and clinics alike.',
  'description', 'MediConnect is a comprehensive digital clinic and appointment management platform built to modernize the healthcare experience. We believe that managing your health should be as easy as managing your daily tasks.',
  'description_secondary', 'From booking appointments with top doctors to tracking lab results and maintaining complete medical records, MediConnect brings every aspect of clinic management into one unified, secure platform.',
  'mission_title', 'Our Mission',
  'mission_desc', 'To bridge the gap between clinics, doctors, and patients through a fast, transparent, and unified digital platform.',
  'vision_title', 'Our Vision',
  'vision_desc', 'To build a global network of connected clinics where medical services are accessible at everyone\'s fingertips.',
  'values', JSON_ARRAY(
    JSON_OBJECT('icon', 'hospital', 'title', 'Patient First', 'description', 'Every feature is designed with the patient experience at the center.'),
    JSON_OBJECT('icon', 'lock', 'title', 'Security', 'description', 'Your medical data is encrypted and protected with industry-standard security.'),
    JSON_OBJECT('icon', 'zap', 'title', 'Innovation', 'description', 'We leverage the latest technology to continuously improve healthcare delivery.'),
    JSON_OBJECT('icon', 'users', 'title', 'Accessibility', 'description', 'Healthcare management that\'s available to everyone, everywhere, anytime.')
  )
), 1, 1),
('contact', JSON_OBJECT(
  'title', 'Get in Touch',
  'subtitle', 'We\'d love to hear from you. Reach out with any questions or feedback.',
  'address_title', 'Address',
  'address_value', '100 Health Avenue, Bengaluru 560001, India',
  'phone_title', 'Phone',
  'phone_value', '+91-80-1234-5678',
  'email_title', 'Email',
  'email_value', 'contact@mediconnect.com',
  'hours_title', 'Working Hours',
  'hours_value', 'Mon – Sat: 8:00 AM – 8:00 PM\nSunday: 9:00 AM – 2:00 PM',
  'emergency_title', 'Emergency Contacts',
  'emergency_value', '+91-80-9999-9999'
), 1, 1);

-- 9. Seed default FAQs to populate FAQ module
INSERT IGNORE INTO cms_faqs (question, answer, display_order, is_active) VALUES
('How do I book an appointment?', 'Go to the Patient Dashboard, select the Appointments tab, search for your preferred doctor, select an available date/slot, and click Book Appointment.', 1, 1),
('What is the refund policy for cancellations?', 'Cancellations made up to 24 hours before the scheduled time slot receive a full refund. Same-day cancellations may incur a processing fee.', 2, 1),
('How do I access my lab reports?', 'Once your sample is processed and the report is uploaded, you will receive an in-app notification. You can view and securely download the PDF from the Medical Reports section of your dashboard.', 3, 1),
('Is home sample collection available for all tests?', 'Yes, home sample collection can be scheduled for most blood and urine tests during booking. A phlebotomist will visit your specified address.', 4, 1),
('Can I share my medical reports with other doctors?', 'Absolutely. You can edit report sharing permissions to securely grant visibility to any registered doctor on MediConnect.', 5, 1);
