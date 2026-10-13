const pool = require('../config/db');
const { currentContext } = require('./requestContext');

const FAILURE_ACTIONS = ['LOGIN_FAILED', 'PASSWORD_CHANGE_FAILED'];
const BLOCKED_ACTIONS = ['LOGIN_BLOCKED', 'ACCOUNT_LOCKED'];

function resultFor(action) {
  if (FAILURE_ACTIONS.includes(action)) return 'failure';
  if (BLOCKED_ACTIONS.includes(action)) return 'blocked';
  return 'success';
}

async function logAction({ userId, action, targetType = null, targetId = null, details = null }) {
  try {
    const { ip = null, userAgent = null } = currentContext();
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, target_type, target_id, details, ip_address, user_agent, result, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [userId, action, targetType, targetId, details ? JSON.stringify(details) : null, ip, userAgent, resultFor(action)]
    );
  } catch (err) {
    console.error('Audit log write failed:', err.message);
  }
}

module.exports = { logAction };
