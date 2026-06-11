-- ============================================================
-- MediConnect – database/migration_sample_collection.sql
-- Schema updates for Home Sample Collection Module
-- ============================================================

USE mediconnect;

-- 1. Alter status column enum on sample_collection_requests to include both old and new enum values temporarily to prevent truncation
ALTER TABLE sample_collection_requests MODIFY COLUMN status ENUM('requested', 'assigned', 'in_progress', 'collected', 'cancelled', 'scheduled', 'in_transit', 'testing', 'report_ready', 'delivered') DEFAULT 'requested';

-- 2. Update any existing 'in_progress' statuses to 'in_transit'
UPDATE sample_collection_requests SET status = 'in_transit' WHERE status = 'in_progress';

-- 3. Modify the status column again to restrict it to only the final enum values
ALTER TABLE sample_collection_requests MODIFY COLUMN status ENUM('requested', 'assigned', 'scheduled', 'in_transit', 'collected', 'testing', 'report_ready', 'delivered', 'cancelled') DEFAULT 'requested';

-- 4. Add collection_date and collection_time columns if they don't exist
ALTER TABLE sample_collection_requests
  ADD COLUMN collection_date DATE DEFAULT NULL AFTER preferred_time_slot,
  ADD COLUMN collection_time TIME DEFAULT NULL AFTER collection_date;

-- 5. Create sample_collection_status_logs table
CREATE TABLE IF NOT EXISTS sample_collection_status_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sample_collection_request_id INT NOT NULL,
  previous_status VARCHAR(50) DEFAULT NULL,
  new_status VARCHAR(50) NOT NULL,
  changed_by ENUM('patient', 'doctor', 'admin', 'system') NOT NULL,
  reason TEXT DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_logs_sample_collection FOREIGN KEY (sample_collection_request_id) REFERENCES sample_collection_requests(id) ON DELETE CASCADE,
  INDEX idx_logs_sample_collection (sample_collection_request_id)
) ENGINE=InnoDB;
