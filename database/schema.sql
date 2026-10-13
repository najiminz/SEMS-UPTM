CREATE DATABASE IF NOT EXISTS sems_uptm CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sems_uptm;

CREATE TABLE clubs (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(150) NOT NULL UNIQUE,
  description TEXT,
  status      ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE users (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  name              VARCHAR(150) NOT NULL,
  id_number         VARCHAR(50) NULL,
  username          VARCHAR(50) NULL UNIQUE,
  email             VARCHAR(150) NOT NULL UNIQUE,
  google_id         VARCHAR(255) NULL UNIQUE,
  contact_number    VARCHAR(30) NULL,
  password_hash     VARCHAR(255) NOT NULL,
  password_changed_at TIMESTAMP NULL DEFAULT NULL,
  role              ENUM('club_committee', 'hepa_officer', 'admin') NOT NULL,
  club_id           INT NULL,
  claimed_club_name VARCHAR(150) NULL,
  department        VARCHAR(150) NULL,
  avatar_filename   VARCHAR(255) NULL,
  status            ENUM('pending', 'active', 'rejected', 'deactivated') NOT NULL DEFAULT 'active',
  failed_login_attempts INT NOT NULL DEFAULT 0,
  last_failed_login_at  TIMESTAMP NULL DEFAULT NULL,
  locked_until          TIMESTAMP NULL DEFAULT NULL,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE SET NULL,
  UNIQUE KEY uniq_id_number (id_number)
);

CREATE TABLE otp_codes (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  purpose     ENUM('signup', 'password_reset', 'email_change') NOT NULL,
  email       VARCHAR(150) NOT NULL,
  code_hash   VARCHAR(255) NOT NULL,
  payload     JSON NULL,
  user_id     INT NULL,
  attempts    INT NOT NULL DEFAULT 0,
  expires_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  used_at     TIMESTAMP NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_otp_lookup (purpose, email, used_at)
);

CREATE TABLE proposals (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  submitted_by   INT NOT NULL,
  club_id        INT NULL,
  title          VARCHAR(200) NOT NULL,
  event_type     ENUM('academic', 'sports', 'cultural', 'workshop', 'competition', 'other')
                 NOT NULL DEFAULT 'other',
  description    TEXT,
  objective      TEXT NULL,
  target_participants VARCHAR(255) NULL,
  event_date     DATE NULL,
  event_time     TIME NULL,
  end_time       TIME NULL,
  venue          VARCHAR(200),
  budget_amount  DECIMAL(10, 2) NOT NULL DEFAULT 0,
  contact_person VARCHAR(150),
  contact_info   VARCHAR(150),
  organizer_name VARCHAR(150) NULL,
  applicant_id_number     VARCHAR(30),
  applicant_ic_number     VARCHAR(20),
  applicant_position      VARCHAR(100),
  estimated_participants  INT,
  status         ENUM('draft', 'submitted', 'under_review', 'queries', 'resubmitted',
                       'approved', 'rejected', 'cancelled') NOT NULL DEFAULT 'draft',
  version        INT NOT NULL DEFAULT 1,
  reviewed_by    INT NULL,
  signoff_by     INT NULL,
  signoff_at     TIMESTAMP NULL DEFAULT NULL,
  cancelled_by   INT NULL,
  cancel_reason  TEXT NULL,
  cancelled_at   TIMESTAMP NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (submitted_by) REFERENCES users(id),
  FOREIGN KEY (club_id) REFERENCES clubs(id),
  FOREIGN KEY (reviewed_by) REFERENCES users(id),
  FOREIGN KEY (signoff_by) REFERENCES users(id),
  FOREIGN KEY (cancelled_by) REFERENCES users(id)
);

CREATE TABLE proposal_documents (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  proposal_id    INT NOT NULL,
  stored_name    VARCHAR(255) NOT NULL,
  original_name  VARCHAR(255) NOT NULL,
  mime_type      VARCHAR(150) NOT NULL,
  file_size      INT NOT NULL,
  document_type  ENUM('proposal', 'budget', 'supporting', 'post_event_report') NOT NULL DEFAULT 'supporting',
  uploaded_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON DELETE CASCADE
);

CREATE TABLE proposal_budget_items (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  proposal_id INT NOT NULL,
  item        VARCHAR(200)  NOT NULL,
  description VARCHAR(500)  NULL,
  quantity    DECIMAL(10, 2) NOT NULL DEFAULT 1,
  unit_price  DECIMAL(10, 2) NOT NULL DEFAULT 0,
  sort_order  INT NOT NULL DEFAULT 0,
  FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON DELETE CASCADE,
  INDEX idx_budget_items_proposal (proposal_id)
);

CREATE TABLE proposal_remarks (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  proposal_id     INT NOT NULL,
  hepa_officer_id INT NOT NULL,
  remark          TEXT NOT NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON DELETE CASCADE,
  FOREIGN KEY (hepa_officer_id) REFERENCES users(id)
);

CREATE TABLE post_event_reports (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  proposal_id      INT NOT NULL UNIQUE,
  attendance_count INT NOT NULL DEFAULT 0,
  actual_spending  DECIMAL(10, 2) NOT NULL DEFAULT 0,
  summary          TEXT,
  submitted_by     INT NOT NULL,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON DELETE CASCADE,
  FOREIGN KEY (submitted_by) REFERENCES users(id)
);

CREATE TABLE audit_logs (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NULL,
  action      VARCHAR(100) NOT NULL,
  target_type VARCHAR(50)  NULL,
  target_id   INT NULL,
  details     JSON NULL,
  ip_address  VARCHAR(45)  NULL,
  user_agent  VARCHAR(255) NULL,
  result      ENUM('success', 'failure', 'blocked') NOT NULL DEFAULT 'success',
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

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

CREATE INDEX idx_proposals_status ON proposals(status);
CREATE INDEX idx_proposals_submitted_by ON proposals(submitted_by);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX idx_users_club ON users(club_id);
CREATE INDEX idx_users_status ON users(status);
