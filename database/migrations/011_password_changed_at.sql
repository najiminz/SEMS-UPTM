USE sems_uptm;

ALTER TABLE users
  ADD COLUMN password_changed_at TIMESTAMP NULL DEFAULT NULL AFTER password_hash;
