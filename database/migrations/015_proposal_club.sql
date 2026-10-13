USE sems_uptm;

ALTER TABLE proposals
  ADD COLUMN club_id INT NULL AFTER submitted_by,
  ADD CONSTRAINT fk_proposals_club FOREIGN KEY (club_id) REFERENCES clubs(id);

UPDATE proposals p JOIN users u ON u.id = p.submitted_by
SET p.club_id = u.club_id
WHERE p.club_id IS NULL;
