SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- MediConnect – Patient Dashboard Module Migration
-- Prompt 4 — Minor schema additions
-- ============================================================

-- 1. Add 'status' column to consultations table
--    Currently consultations have no status tracking.
--    Adding status to support: requested, accepted, completed, rejected
ALTER TABLE consultations
  ADD COLUMN status ENUM('requested', 'accepted', 'completed', 'rejected')
  DEFAULT 'completed'
  AFTER notes;

-- 2. Add 'in_progress' to sample_collection_requests status enum
--    Current: requested, assigned, collected, cancelled
--    Adding: in_progress (between assigned and collected)
ALTER TABLE sample_collection_requests
  MODIFY COLUMN status ENUM('requested', 'assigned', 'in_progress', 'collected', 'cancelled')
  DEFAULT 'requested';

-- 3. Verify changes
SELECT 'consultations.status added' AS migration_step;
SELECT 'sample_collection_requests.status updated' AS migration_step;


SET FOREIGN_KEY_CHECKS = 1;
