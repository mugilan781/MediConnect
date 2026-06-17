-- ============================================================
-- MediConnect – database/cms_content.sql
-- CMS Content table for dynamic homepage sections
-- ============================================================

USE mediconnect;

-- ============================================================
-- cms_content – Stores editable homepage sections as JSON
-- ============================================================
CREATE TABLE IF NOT EXISTS cms_content (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  section_key  VARCHAR(100) NOT NULL UNIQUE,
  section_data JSON NOT NULL,
  is_active    TINYINT(1) DEFAULT 1,
  updated_by   INT DEFAULT NULL,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_cms_user FOREIGN KEY (updated_by) REFERENCES users(id),
  INDEX idx_cms_section (section_key),
  INDEX idx_cms_active (is_active)
) ENGINE=InnoDB;

-- ============================================================
-- Seed CMS Content
-- ============================================================

INSERT INTO cms_content (section_key, section_data, is_active, updated_by) VALUES

-- Hero Section
('hero', JSON_OBJECT(
  'title', 'Your Health,',
  'highlight', 'Connected',
  'title_suffix', '& Simplified',
  'subtitle', 'Book appointments, consult with top doctors, manage lab tests, and access your complete medical history - all in one secure platform.',
  'cta_primary_text', 'Get Started Free',
  'cta_primary_link', '/signup.html',
  'cta_secondary_text', 'Learn More',
  'cta_secondary_link', '/about.html'
), 1, 1),

-- Features Section
('features', JSON_OBJECT(
  'title', 'Everything You Need',
  'subtitle', 'A complete digital clinic management solution for patients, doctors, and administrators.',
  'cards', JSON_ARRAY(
    JSON_OBJECT('icon', 'calendar', 'title', 'Smart Appointments', 'description', 'Book, reschedule, or cancel appointments with real-time doctor availability and slot management.'),
    JSON_OBJECT('icon', 'stethoscope', 'title', 'Digital Consultations', 'description', 'Complete consultation records with diagnosis, prescriptions, and follow-up tracking in one place.'),
    JSON_OBJECT('icon', 'microscope', 'title', 'Lab Test Booking', 'description', 'Browse, book lab tests, and get results delivered digitally. Home sample collection available.'),
    JSON_OBJECT('icon', 'file', 'title', 'Medical Reports', 'description', 'Securely upload, store, and access all your medical reports and documents anytime.'),
    JSON_OBJECT('icon', 'clipboard', 'title', 'Health History', 'description', 'Complete timeline of your medical journey - appointments, tests, prescriptions, and notes.'),
    JSON_OBJECT('icon', 'bell', 'title', 'Smart Notifications', 'description', 'Never miss an appointment or lab result with real-time in-app and email notifications.')
  )
), 1, 1),

-- CTA Section
('cta', JSON_OBJECT(
  'title', 'Ready to Transform Your Healthcare Experience?',
  'subtitle', 'Join thousands of patients and doctors using MediConnect for seamless clinic management.',
  'button_text', 'Create Free Account',
  'button_link', '/signup.html'
), 1, 1),

-- Footer Section
('footer', JSON_OBJECT(
  'brand_name', 'MediConnect',
  'brand_description', 'Your trusted digital clinic and appointment management platform.',
  'copyright_year', '2026'
), 1, 1),

-- Stats Section (flag to show live stats)
('stats', JSON_OBJECT(
  'show_live', true,
  'title', 'Trusted by Healthcare Professionals',
  'subtitle', 'Our platform powers clinics and hospitals across the country.'
), 1, 1);
