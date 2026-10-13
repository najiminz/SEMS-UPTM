USE sems_uptm;

ALTER TABLE proposals
  ADD COLUMN event_type ENUM('academic', 'sports', 'cultural', 'workshop', 'competition', 'other')
    NOT NULL DEFAULT 'other' AFTER title,
  ADD COLUMN event_time TIME NULL AFTER event_date,
  ADD COLUMN contact_person VARCHAR(150) AFTER budget_amount,
  ADD COLUMN contact_info VARCHAR(150) AFTER contact_person;

CREATE INDEX idx_proposals_event_type ON proposals(event_type);
