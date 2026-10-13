ALTER TABLE proposals
  ADD COLUMN applicant_id_number VARCHAR(30) NULL AFTER contact_info,
  ADD COLUMN applicant_ic_number VARCHAR(20) NULL AFTER applicant_id_number,
  ADD COLUMN applicant_position VARCHAR(100) NULL AFTER applicant_ic_number,
  ADD COLUMN estimated_participants INT NULL AFTER applicant_position;
