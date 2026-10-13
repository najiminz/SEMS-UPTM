USE sems_uptm;

ALTER TABLE users
  ADD COLUMN id_number         VARCHAR(50) NULL AFTER name,
  ADD COLUMN username          VARCHAR(50) NULL AFTER id_number,
  ADD COLUMN contact_number    VARCHAR(30) NULL AFTER email,
  ADD COLUMN claimed_club_name VARCHAR(150) NULL AFTER club_id,
  ADD COLUMN department        VARCHAR(150) NULL AFTER claimed_club_name,
  ADD COLUMN avatar_filename   VARCHAR(255) NULL AFTER department,
  ADD COLUMN status            ENUM('pending', 'active', 'rejected', 'deactivated') NOT NULL DEFAULT 'active' AFTER role,
  ADD COLUMN approved_by       INT NULL,
  ADD COLUMN approved_at       TIMESTAMP NULL,
  ADD COLUMN rejected_by       INT NULL,
  ADD COLUMN rejected_at       TIMESTAMP NULL,
  ADD COLUMN rejection_reason  TEXT NULL,
  ADD UNIQUE KEY uniq_username (username),
  ADD UNIQUE KEY uniq_id_number (id_number),
  ADD FOREIGN KEY (approved_by) REFERENCES users(id),
  ADD FOREIGN KEY (rejected_by) REFERENCES users(id);

UPDATE users SET status = 'deactivated' WHERE is_active = 0;

ALTER TABLE users DROP COLUMN is_active;

CREATE TABLE password_reset_requests (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  user_id          INT NOT NULL,
  token            VARCHAR(255) NULL,
  status           ENUM('pending', 'approved', 'rejected', 'used') NOT NULL DEFAULT 'pending',
  requested_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_by      INT NULL,
  reviewed_at      TIMESTAMP NULL,
  rejection_reason TEXT NULL,
  expires_at       TIMESTAMP NULL,
  used_at          TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by) REFERENCES users(id)
);

CREATE TABLE email_change_requests (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  user_id          INT NOT NULL,
  current_email    VARCHAR(150) NOT NULL,
  requested_email  VARCHAR(150) NOT NULL,
  status           ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  requested_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_by      INT NULL,
  reviewed_at      TIMESTAMP NULL,
  rejection_reason TEXT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by) REFERENCES users(id)
);

CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_password_reset_user ON password_reset_requests(user_id);
CREATE INDEX idx_email_change_user ON email_change_requests(user_id);
