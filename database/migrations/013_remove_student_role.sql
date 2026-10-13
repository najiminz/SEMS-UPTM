USE sems_uptm;

DELETE FROM otp_codes
WHERE purpose = 'signup' AND JSON_UNQUOTE(JSON_EXTRACT(payload, '$.role')) = 'student';

DELETE FROM users WHERE role = 'student';

ALTER TABLE users
  MODIFY role ENUM('club_committee', 'hepa_officer', 'admin') NOT NULL;
