-- ============================================================
-- MediConnect – database/migration_notifications.sql
-- Schema updates for Notifications & Reminders Module
-- ============================================================

USE mediconnect;

-- 1. Alter notifications table to support linkages to appointments, consultations, labs, collections, and reports
ALTER TABLE notifications
  ADD COLUMN related_module VARCHAR(100) DEFAULT NULL AFTER link,
  ADD COLUMN related_record_id INT DEFAULT NULL AFTER related_module;

-- Add optimization index for linked notifications
CREATE INDEX idx_notifications_related ON notifications(related_module, related_record_id);

-- 2. Create scheduled_notifications table for background delivery / broadcasting
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
  
  CONSTRAINT fk_scheduled_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_scheduled_target FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_scheduled_status (status),
  INDEX idx_scheduled_time (scheduled_for)
) ENGINE=InnoDB;

-- 3. Create notification_preferences table for user configurable reminders/notifications
CREATE TABLE IF NOT EXISTS notification_preferences (
  id                            INT AUTO_INCREMENT PRIMARY KEY,
  user_id                       INT NOT NULL UNIQUE,
  enable_appointment_reminders  TINYINT(1) DEFAULT 1,
  enable_consultation_reminders TINYINT(1) DEFAULT 1,
  enable_lab_reminders          TINYINT(1) DEFAULT 1,
  enable_collection_reminders   TINYINT(1) DEFAULT 1,
  enable_report_notifications   TINYINT(1) DEFAULT 1,
  enable_system_notifications   TINYINT(1) DEFAULT 1,
  updated_at                    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_preferences_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 4. Seed default preferences for existing users
INSERT IGNORE INTO notification_preferences (user_id)
SELECT id FROM users;
