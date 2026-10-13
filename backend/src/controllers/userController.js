const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const pool = require('../config/db');
const { logAction } = require('../utils/auditLogger');
const { createOtp, verifyOtp, otpFailureBody } = require('../utils/otp');
const { sendOtpEmail } = require('../utils/mailer');
const { LOCK_MINUTES, recordFailedLogin, clearLoginFailures, lockedMessage } = require('../utils/loginLockout');
const { issueToken } = require('../utils/token');

const VALID_ROLES = ['club_committee', 'hepa_officer', 'admin'];
const SALT_ROUNDS = 12;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function listUsers(req, res) {
  const { search, role, status } = req.query;
  const where = [];
  const params = [];
  if (search) {
    where.push('(u.name LIKE ? OR u.email LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  if (role) {
    where.push('u.role = ?');
    params.push(role);
  }
  if (status) {
    where.push('u.status = ?');
    params.push(status);
  }
  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [rows] = await pool.query(
    `SELECT u.id, u.name, u.email, u.username, u.role, u.status, u.club_id, c.name AS club_name,
            u.avatar_filename, u.created_at
     FROM users u LEFT JOIN clubs c ON c.id = u.club_id
     ${whereClause}
     ORDER BY (u.id = ?) DESC, u.created_at DESC`,
    [...params, req.user.id]
  );
  res.json({ users: rows });
}

async function createUser(req, res) {
  const { name, email, password, role, club_id } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: 'name, email, password and role are required' });
  }
  if (!VALID_ROLES.includes(role)) return res.status(400).json({ message: 'Invalid role' });
  if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });

  const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
  if (existing.length > 0) return res.status(409).json({ message: 'An account with this email already exists' });

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const [result] = await pool.query(
    "INSERT INTO users (name, email, password_hash, role, club_id, status) VALUES (?, ?, ?, ?, ?, 'active')",
    [name, email, passwordHash, role, role === 'club_committee' ? club_id || null : null]
  );

  await logAction({ userId: req.user.id, action: 'USER_CREATED', targetType: 'user', targetId: result.insertId, details: { role } });
  res.status(201).json({ message: 'User created', userId: result.insertId });
}

async function updateUser(req, res) {
  const { id } = req.params;
  const { name, email, club_id } = req.body;
  if (!name || !email) return res.status(400).json({ message: 'name and email are required' });

  const [existing] = await pool.query('SELECT id FROM users WHERE email = ? AND id != ?', [email, id]);
  if (existing.length > 0) return res.status(409).json({ message: 'Another account already uses this email' });

  await pool.query('UPDATE users SET name = ?, email = ?, club_id = ? WHERE id = ?', [name, email, club_id || null, id]);
  await logAction({ userId: req.user.id, action: 'USER_UPDATED', targetType: 'user', targetId: id });
  res.json({ message: 'User updated' });
}

async function updateUserRole(req, res) {
  const { id } = req.params;
  const { role } = req.body;
  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ message: 'Invalid role' });
  }
  if (Number(id) === req.user.id) {
    return res.status(400).json({ message: 'You cannot change your own role' });
  }

  await pool.query('UPDATE users SET role = ? WHERE id = ?', [role, id]);
  await logAction({ userId: req.user.id, action: 'USER_ROLE_UPDATED', targetType: 'user', targetId: id, details: { role } });
  res.json({ message: 'User role updated' });
}

async function setUserActive(req, res) {
  const { id } = req.params;
  const { is_active } = req.body;
  if (Number(id) === req.user.id) {
    return res.status(400).json({ message: 'You cannot deactivate your own account' });
  }

  const [rows] = await pool.query('SELECT status FROM users WHERE id = ?', [id]);
  if (!rows[0]) return res.status(404).json({ message: 'User not found' });
  if (rows[0].status === 'pending' || rows[0].status === 'rejected') {
    return res.status(400).json({ message: 'This registration must be approved or rejected first' });
  }

  const newStatus = is_active ? 'active' : 'deactivated';
  await pool.query('UPDATE users SET status = ? WHERE id = ?', [newStatus, id]);
  await logAction({
    userId: req.user.id,
    action: is_active ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
    targetType: 'user',
    targetId: id,
  });
  res.json({ message: 'User status updated' });
}

async function resetPassword(req, res) {
  const { id } = req.params;
  const { new_password } = req.body;
  if (!new_password || new_password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters' });
  }

  const passwordHash = await bcrypt.hash(new_password, SALT_ROUNDS);
  await pool.query(
    'UPDATE users SET password_hash = ?, password_changed_at = NOW(), failed_login_attempts = 0, last_failed_login_at = NULL, locked_until = NULL WHERE id = ?',
    [passwordHash, id]
  );
  await logAction({ userId: req.user.id, action: 'USER_PASSWORD_RESET', targetType: 'user', targetId: id });
  res.json({ message: 'Password reset' });
}

async function deleteUser(req, res) {
  const { id } = req.params;
  if (Number(id) === req.user.id) {
    return res.status(400).json({ message: 'You cannot delete your own account' });
  }

  const [users] = await pool.query('SELECT id, name FROM users WHERE id = ?', [id]);
  if (!users[0]) return res.status(404).json({ message: 'User not found' });

  const [[counts]] = await pool.query(
    `SELECT
       (SELECT COUNT(*) FROM proposals WHERE submitted_by = ? OR reviewed_by = ? OR cancelled_by = ?) AS proposal_count,
       (SELECT COUNT(*) FROM proposal_remarks WHERE hepa_officer_id = ?) AS remark_count,
       (SELECT COUNT(*) FROM post_event_reports WHERE submitted_by = ?) AS report_count`,
    [id, id, id, id, id]
  );
  const hasHistory = counts.proposal_count > 0 || counts.remark_count > 0 || counts.report_count > 0;
  if (hasHistory) {
    return res.status(400).json({
      message: 'This account has proposal history and cannot be deleted. Deactivate it instead.',
    });
  }

  await pool.query('DELETE FROM users WHERE id = ?', [id]);
  await logAction({ userId: req.user.id, action: 'USER_DELETED', targetType: 'user', targetId: id, details: { name: users[0].name } });
  res.json({ message: 'User deleted' });
}

async function uploadAvatar(req, res) {
  if (!req.file) return res.status(400).json({ message: 'No image uploaded' });

  const [rows] = await pool.query('SELECT avatar_filename FROM users WHERE id = ?', [req.user.id]);
  const previous = rows[0]?.avatar_filename;

  await pool.query('UPDATE users SET avatar_filename = ? WHERE id = ?', [req.file.filename, req.user.id]);

  if (previous) {
    fs.unlink(path.join(__dirname, '..', '..', 'uploads', 'avatars', previous), () => {});
  }

  res.json({ message: 'Profile photo updated', avatar_filename: req.file.filename });
}

async function requestEmailChange(req, res) {
  const { new_email } = req.body;
  if (!new_email) return res.status(400).json({ message: 'New email is required.' });
  if (!EMAIL_RE.test(new_email)) return res.status(400).json({ message: 'Please enter a valid email address.' });

  const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [new_email]);
  if (existing.length > 0) return res.status(409).json({ message: 'This email is already in use.' });

  const { code } = await createOtp({ purpose: 'email_change', email: new_email, userId: req.user.id });
  await sendOtpEmail(new_email, code, 'email_change');
  await logAction({ userId: req.user.id, action: 'EMAIL_CHANGE_REQUESTED', targetType: 'user', targetId: req.user.id, details: { new_email } });

  res.json({ message: `We've sent a 6-digit code to ${new_email}.` });
}

async function verifyEmailChange(req, res) {
  const { new_email, code } = req.body;
  if (!new_email || !code) return res.status(400).json({ message: 'Email and code are required.' });

  const result = await verifyOtp({ purpose: 'email_change', email: new_email, code });
  if (!result.ok) return res.status(400).json(otpFailureBody(result));
  if (result.record.user_id !== req.user.id) {
    return res.status(403).json({ message: 'This code was not issued for your account.' });
  }

  const [existing] = await pool.query('SELECT id FROM users WHERE email = ? AND id != ?', [new_email, req.user.id]);
  if (existing.length > 0) return res.status(409).json({ message: 'This email is already in use.' });

  await pool.query('UPDATE users SET email = ? WHERE id = ?', [new_email, req.user.id]);
  await logAction({ userId: req.user.id, action: 'EMAIL_CHANGED', targetType: 'user', targetId: req.user.id, details: { new_email } });

  res.json({ message: 'Email updated successfully.' });
}

async function changePassword(req, res) {
  const { current_password: current, new_password: next, confirm_password: confirm } = req.body;
  const bad = (field, message) => res.status(400).json({ message, field });

  if (!current) return bad('current_password', 'Enter your current password.');
  if (!next) return bad('new_password', 'Enter a new password.');
  if (next.length < 8) return bad('new_password', 'Use at least 8 characters.');
  if (next === current) return bad('new_password', 'Your new password must be different from the current one.');
  if (next !== confirm) return bad('confirm_password', 'The two new passwords do not match.');

  const [[user]] = await pool.query(
    `SELECT id, name, email, role, password_hash,
            (locked_until IS NOT NULL AND locked_until > NOW()) AS is_locked,
            GREATEST(CEIL(TIMESTAMPDIFF(SECOND, NOW(), locked_until) / 60), 1) AS lock_minutes_left
     FROM users WHERE id = ?`,
    [req.user.id]
  );
  if (user.is_locked) {
    return res.status(429).json({ message: lockedMessage(Number(user.lock_minutes_left)) });
  }

  const matches = await bcrypt.compare(current, user.password_hash);
  if (!matches) {
    await logAction({ userId: user.id, action: 'PASSWORD_CHANGE_FAILED', targetType: 'user', targetId: user.id });
    if (await recordFailedLogin(user.id)) {
      await logAction({ userId: user.id, action: 'ACCOUNT_LOCKED', targetType: 'user', targetId: user.id, details: { minutes: LOCK_MINUTES } });
      return res.status(429).json({ message: lockedMessage(LOCK_MINUTES) });
    }
    return bad('current_password', 'Your current password is incorrect.');
  }

  const passwordHash = await bcrypt.hash(next, SALT_ROUNDS);
  await pool.query('UPDATE users SET password_hash = ?, password_changed_at = NOW() WHERE id = ?', [passwordHash, user.id]);
  await clearLoginFailures(user.id);
  await logAction({ userId: user.id, action: 'PASSWORD_CHANGED', targetType: 'user', targetId: user.id });

  res.json({ message: 'Password changed.', token: issueToken(user) });
}

module.exports = {
  listUsers, createUser, updateUser, updateUserRole, setUserActive, resetPassword, deleteUser, uploadAvatar,
  requestEmailChange, verifyEmailChange, changePassword,
};
