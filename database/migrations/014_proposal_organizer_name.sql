USE sems_uptm;

ALTER TABLE proposals
  ADD COLUMN organizer_name VARCHAR(150) NULL AFTER contact_info;
