SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- MediConnect – database/migration_patient_history.sql
-- Schema updates for Patient History Tracking Module
-- ============================================================

USE mediconnect;

-- Alter patient_history table structure to support dynamic event types, source references, and JSON metadata
ALTER TABLE patient_history
  MODIFY COLUMN event_type VARCHAR(100) NOT NULL,
  ADD COLUMN source_module VARCHAR(100) DEFAULT NULL AFTER event_type,
  ADD COLUMN source_record_id INT DEFAULT NULL AFTER source_module,
  ADD COLUMN metadata JSON DEFAULT NULL AFTER description;

-- Add optimization indexes
CREATE INDEX idx_history_source ON patient_history(source_module, source_record_id);


SET FOREIGN_KEY_CHECKS = 1;
