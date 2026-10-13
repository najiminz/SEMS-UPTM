USE sems_uptm;

ALTER TABLE proposals
  MODIFY event_date DATE NULL,
  ADD COLUMN objective            TEXT         NULL AFTER description,
  ADD COLUMN target_participants  VARCHAR(255) NULL AFTER objective,
  ADD COLUMN end_time             TIME         NULL AFTER event_time;

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
