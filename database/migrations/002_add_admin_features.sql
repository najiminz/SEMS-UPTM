USE sems_uptm;

CREATE TABLE clubs (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(150) NOT NULL UNIQUE,
  description TEXT,
  status      ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

ALTER TABLE users
  ADD COLUMN club_id INT NULL AFTER role,
  ADD FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE SET NULL;

ALTER TABLE proposals
  MODIFY COLUMN status ENUM('draft', 'submitted', 'under_review', 'queries', 'resubmitted',
                             'approved', 'rejected', 'cancelled') NOT NULL DEFAULT 'draft',
  ADD COLUMN cancelled_by     INT NULL AFTER reviewed_by,
  ADD COLUMN cancel_reason    TEXT NULL AFTER cancelled_by,
  ADD COLUMN cancelled_at     TIMESTAMP NULL AFTER cancel_reason,
  ADD FOREIGN KEY (cancelled_by) REFERENCES users(id);

CREATE TABLE system_settings (
  id                  INT PRIMARY KEY DEFAULT 1,
  max_upload_size_mb  INT NOT NULL DEFAULT 10,
  allowed_extensions  VARCHAR(255) NOT NULL DEFAULT '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png',
  updated_by          INT NULL,
  updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (updated_by) REFERENCES users(id),
  CONSTRAINT single_row CHECK (id = 1)
);
INSERT INTO system_settings (id) VALUES (1);

CREATE INDEX idx_users_club ON users(club_id);
