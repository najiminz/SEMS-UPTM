CREATE TABLE otp_codes (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  purpose     ENUM('signup', 'password_reset', 'email_change') NOT NULL,
  email       VARCHAR(150) NOT NULL,
  code_hash   VARCHAR(255) NOT NULL,
  payload     JSON NULL,
  user_id     INT NULL,
  attempts    INT NOT NULL DEFAULT 0,
  expires_at  TIMESTAMP NOT NULL,
  used_at     TIMESTAMP NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_otp_lookup (purpose, email, used_at)
);

UPDATE users SET status = 'active' WHERE status = 'pending';

DROP TABLE IF EXISTS password_reset_requests;
DROP TABLE IF EXISTS email_change_requests;

ALTER TABLE users
  DROP FOREIGN KEY users_ibfk_2,
  DROP FOREIGN KEY users_ibfk_3,
  DROP COLUMN approved_by,
  DROP COLUMN approved_at,
  DROP COLUMN rejected_by,
  DROP COLUMN rejected_at,
  DROP COLUMN rejection_reason;
