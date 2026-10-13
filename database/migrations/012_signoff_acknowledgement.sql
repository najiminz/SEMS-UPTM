USE sems_uptm;

ALTER TABLE proposals
  ADD COLUMN signoff_by INT NULL AFTER reviewed_by,
  ADD COLUMN signoff_at TIMESTAMP NULL DEFAULT NULL AFTER signoff_by,
  ADD CONSTRAINT fk_proposals_signoff_by FOREIGN KEY (signoff_by) REFERENCES users(id);
