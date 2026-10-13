const bcrypt = require('bcrypt');
const pool = require('../config/db');
const { logAction } = require('../utils/auditLogger');
const { STATUS_MESSAGE } = require('../middleware/authMiddleware');
const { createOtp, verifyOtp, otpFailureBody } = require('../utils/otp');
const { sendOtpEmail } = require('../utils/mailer');
const { LOCK_MINUTES, recordFailedLogin, clearLoginFailures, lockedMessage } = require('../utils/loginLockout');
const { issueToken } = require('../utils/token');

const SALT_ROUNDS = 12;
const REGISTERABLE_ROLES = ['club_committee'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-zA-Z0-9._-]{3,50}$/;

async function register(req, res) {
  const {
    name, id_number, email, username, contact_number, password, confirm_password,
    role, claimed_club_name, department,
  } = req.body;

  if (!name || !id_number || !email || !username || !password || !confirm_password || !role) {
    return res.status(400).json({ message: 'Please fill in all required fields.' });
  }
  if (!REGISTERABLE_ROLES.includes(role)) {
    return res.status(400).json({ message: 'Invalid role' });
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ message: 'Please enter a valid email address.' });
  }
  if (!USERNAME_RE.test(username)) {
    return res.status(400).json({ message: 'Username must be 3-50 characters (letters, numbers, dots, underscores, hyphens only).' });
  }
  if (password !== confirm_password) {
    return res.status(400).json({ message: 'Passwords do not match.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters.' });
  }
  if (role === 'club_committee' && !claimed_club_name) {
    return res.status(400).json({ message: 'Club / Organisation name is required for Club Committee registration.' });
  }
  if (role === 'hepa_officer' && !department) {
    return res.status(400).json({ message: 'Department / Unit is required for HEPA Officer registration.' });
  }

  const [existing] = await pool.query(
    'SELECT email, username, id_number FROM users WHERE email = ? OR username = ? OR id_number = ?',
    [email, username, id_number]
  );
  if (existing.length > 0) {
    const clash = existing[0];
    if (clash.email === email) return res.status(409).json({ message: 'An account with this email already exists.' });
    if (clash.username === username) return res.status(409).json({ message: 'This username is already taken.' });
    return res.status(409).json({ message: 'This ID number is already registered.' });
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const { code } = await createOtp({
    purpose: 'signup',
    email,
    payload: {
      name, id_number, email, username, contact_number: contact_number || null,
      password_hash: passwordHash, role,
      claimed_club_name: role === 'club_committee' ? claimed_club_name : null,
      department: role === 'hepa_officer' ? department : null,
    },
  });
  await sendOtpEmail(email, code, 'signup');

  res.json({ message: `We've sent a 6-digit code to ${email}. Enter it to activate your account.`, email });
}

async function verifySignup(req, res) {
  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ message: 'Email and code are required.' });
  }

  const result = await verifyOtp({ purpose: 'signup', email, code });
  if (!result.ok) {
    return res.status(400).json(otpFailureBody(result));
  }

  const data = JSON.parse(result.record.payload);
  const [existing] = await pool.query(
    'SELECT email, username, id_number FROM users WHERE email = ? OR username = ? OR id_number = ?',
    [data.email, data.username, data.id_number]
  );
  if (existing.length > 0) {
    return res.status(409).json({ message: 'An account with these details already exists. Please log in instead.' });
  }

  const [result2] = await pool.query(
    `INSERT INTO users (name, id_number, username, email, contact_number, password_hash, role,
       claimed_club_name, department, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
    [data.name, data.id_number, data.username, data.email, data.contact_number, data.password_hash,
     data.role, data.claimed_club_name, data.department]
  );
  const userId = result2.insertId;

  await logAction({ userId, action: 'REGISTRATION_SUBMITTED', targetType: 'user', targetId: userId, details: { role: data.role } });
  await logAction({ userId, action: 'EMAIL_VERIFIED', targetType: 'user', targetId: userId });
  await logAction({ userId, action: 'LOGIN_SUCCESS', targetType: 'user', targetId: userId });

  const token = issueToken({ id: userId, name: data.name, email: data.email, role: data.role });
  res.status(201).json({ token, user: { id: userId, name: data.name, email: data.email, role: data.role, club_name: null } });
}

async function login(req, res) {
  const { identifier, password } = req.body;
  if (!identifier || !password) {
    return res.status(400).json({ message: 'Username/email and password are required' });
  }

  const [rows] = await pool.query(
    `SELECT *,
            (locked_until IS NOT NULL AND locked_until > NOW()) AS is_locked,
            GREATEST(1, CEIL(TIMESTAMPDIFF(SECOND, NOW(), locked_until) / 60)) AS lock_minutes_left
     FROM users WHERE email = ? OR username = ?`,
    [identifier, identifier]
  );
  const user = rows[0];

  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  if (user.is_locked) {
    await logAction({ userId: user.id, action: 'LOGIN_BLOCKED', targetType: 'user', targetId: user.id, details: { reason: 'locked' } });
    return res.status(429).json({ message: lockedMessage(Number(user.lock_minutes_left)) });
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatches) {
    await logAction({ userId: user.id, action: 'LOGIN_FAILED', targetType: 'user', targetId: user.id });
    if (await recordFailedLogin(user.id)) {
      await logAction({ userId: user.id, action: 'ACCOUNT_LOCKED', targetType: 'user', targetId: user.id, details: { minutes: LOCK_MINUTES } });
      return res.status(429).json({ message: lockedMessage(LOCK_MINUTES) });
    }
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  if (user.status !== 'active') {
    await logAction({ userId: user.id, action: 'LOGIN_BLOCKED', targetType: 'user', targetId: user.id, details: { status: user.status } });
    return res.status(403).json({ message: STATUS_MESSAGE[user.status] || 'This account is not active' });
  }

  if (user.failed_login_attempts > 0 || user.locked_until) await clearLoginFailures(user.id);
  await logAction({ userId: user.id, action: 'LOGIN_SUCCESS', targetType: 'user', targetId: user.id });

  const [[clubRow]] = user.club_id
    ? await pool.query('SELECT name FROM clubs WHERE id = ?', [user.club_id])
    : [[null]];

  res.json({
    token: issueToken(user),
    user: { id: user.id, name: user.name, email: user.email, role: user.role, club_name: clubRow?.name || null },
  });
}

async function me(req, res) {
  res.json({ user: req.user });
}

async function forgotPassword(req, res) {
  const { identifier } = req.body;
  if (!identifier) {
    return res.status(400).json({ message: 'Please enter your username or email.' });
  }

  const [rows] = await pool.query('SELECT * FROM users WHERE email = ? OR username = ?', [identifier, identifier]);
  const user = rows[0];
  if (user) {
    const { code } = await createOtp({ purpose: 'password_reset', email: user.email, userId: user.id });
    await sendOtpEmail(user.email, code, 'password_reset');
    await logAction({ userId: user.id, action: 'PASSWORD_RESET_REQUESTED', targetType: 'user', targetId: user.id });
  }

  res.json({ message: 'If an account matches, a 6-digit code has been sent to its email address.' });
}

async function verifyResetCode(req, res) {
  const { identifier, code } = req.body;
  if (!identifier || !code) {
    return res.status(400).json({ message: 'Please enter the 6-digit code.' });
  }

  const [rows] = await pool.query('SELECT email FROM users WHERE email = ? OR username = ?', [identifier, identifier]);
  if (!rows[0]) {
    return res.status(400).json({ message: 'Incorrect code. Please try again.', reason: 'invalid' });
  }

  const result = await verifyOtp({ purpose: 'password_reset', email: rows[0].email, code, consume: false });
  if (!result.ok) {
    return res.status(400).json(otpFailureBody(result));
  }
  res.json({ message: 'Code verified.' });
}

async function resetPassword(req, res) {
  const { identifier, code, new_password, confirm_password } = req.body;
  if (!identifier || !code || !new_password || !confirm_password) {
    return res.status(400).json({ message: 'Please fill in all fields.' });
  }
  if (new_password !== confirm_password) {
    return res.status(400).json({ message: 'Passwords do not match.' });
  }
  if (new_password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters.' });
  }

  const [rows] = await pool.query('SELECT * FROM users WHERE email = ? OR username = ?', [identifier, identifier]);
  const user = rows[0];
  if (!user) {
    return res.status(400).json({ message: 'Incorrect code. Please try again.', reason: 'invalid' });
  }

  const result = await verifyOtp({ purpose: 'password_reset', email: user.email, code });
  if (!result.ok) {
    return res.status(400).json(otpFailureBody(result));
  }

  const passwordHash = await bcrypt.hash(new_password, SALT_ROUNDS);
  await pool.query('UPDATE users SET password_hash = ?, password_changed_at = NOW() WHERE id = ?', [passwordHash, user.id]);
  await clearLoginFailures(user.id);
  await logAction({ userId: user.id, action: 'PASSWORD_RESET_COMPLETED', targetType: 'user', targetId: user.id });

  res.json({ message: 'Password reset successful. You can now log in.' });
}

module.exports = { register, verifySignup, login, me, forgotPassword, verifyResetCode, resetPassword };
