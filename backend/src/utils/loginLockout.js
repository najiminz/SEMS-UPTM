const pool = require('../config/db');

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
const FAILURE_WINDOW_MINUTES = 15;

async function recordFailedLogin(userId) {
  await pool.query(
    `UPDATE users SET failed_login_attempts = 0
     WHERE id = ? AND (last_failed_login_at IS NULL
                       OR last_failed_login_at <= NOW() - INTERVAL ? MINUTE)`,
    [userId, FAILURE_WINDOW_MINUTES]
  );
  await pool.query(
    'UPDATE users SET failed_login_attempts = failed_login_attempts + 1, last_failed_login_at = NOW() WHERE id = ?',
    [userId]
  );
  const [[row]] = await pool.query('SELECT failed_login_attempts FROM users WHERE id = ?', [userId]);
  if (row.failed_login_attempts < MAX_FAILED_ATTEMPTS) return false;

  await pool.query(
    'UPDATE users SET failed_login_attempts = 0, locked_until = NOW() + INTERVAL ? MINUTE WHERE id = ?',
    [LOCK_MINUTES, userId]
  );
  return true;
}

function clearLoginFailures(userId) {
  return pool.query(
    'UPDATE users SET failed_login_attempts = 0, last_failed_login_at = NULL, locked_until = NULL WHERE id = ?',
    [userId]
  );
}

function lockedMessage(minutes) {
  return `Too many failed attempts. This account is locked for ${minutes} more minute${minutes === 1 ? '' : 's'}. ` +
    'You can also unlock it right away with "Forgot password".';
}

module.exports = { MAX_FAILED_ATTEMPTS, LOCK_MINUTES, recordFailedLogin, clearLoginFailures, lockedMessage };
