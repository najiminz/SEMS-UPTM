USE sems_uptm;

ALTER TABLE audit_logs
  ADD COLUMN ip_address VARCHAR(45)  NULL AFTER details,
  ADD COLUMN user_agent VARCHAR(255) NULL AFTER ip_address,
  ADD COLUMN result ENUM('success', 'failure', 'blocked') NOT NULL DEFAULT 'success' AFTER user_agent;

UPDATE audit_logs SET result = 'failure' WHERE action = 'LOGIN_FAILED';
UPDATE audit_logs SET result = 'blocked' WHERE action IN ('LOGIN_BLOCKED', 'ACCOUNT_LOCKED');

CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
