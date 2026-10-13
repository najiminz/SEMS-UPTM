const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const pool = require('../config/db');
const { logAction } = require('../utils/auditLogger');
const { STATUS_MESSAGE } = require('../middleware/authMiddleware');

const SALT_ROUNDS = 12;
const REGISTERABLE_ROLES = ['club_committee'];

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

async function verifyGoogleToken(credential) {
  const ticket = await googleClient.verifyIdToken({
    idToken: credential,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  return ticket.getPayload();
}

function issueSessionFor(user, res) {
  const token = jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
  return res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
}

async function googleAuth(req, res) {
  const { credential } = req.body;
  if (!credential) return res.status(400).json({ message: 'Missing Google credential' });

  let payload;
  try {
    payload = await verifyGoogleToken(credential);
  } catch {
    return res.status(401).json({ message: 'Invalid Google credential' });
  }
  if (!payload.email_verified) {
    return res.status(401).json({ message: 'Google account email is not verified' });
  }

  const [rows] = await pool.query('SELECT * FROM users WHERE google_id = ? OR email = ?', [payload.sub, payload.email]);
  let user = rows[0];

  if (!user) {
    return res.json({ needsRegistration: true, profile: { name: payload.name, email: payload.email } });
  }

  if (!user.google_id) {
    await pool.query('UPDATE users SET google_id = ? WHERE id = ?', [payload.sub, user.id]);
    user.google_id = payload.sub;
  }

  if (user.status !== 'active') {
    await logAction({ userId: user.id, action: 'LOGIN_BLOCKED', targetType: 'user', targetId: user.id, details: { status: user.status, via: 'google' } });
    return res.status(403).json({ message: STATUS_MESSAGE[user.status] || 'This account is not active' });
  }

  await logAction({ userId: user.id, action: 'LOGIN_SUCCESS', targetType: 'user', targetId: user.id, details: { via: 'google' } });
  return issueSessionFor(user, res);
}

async function googleRegister(req, res) {
  const { credential, role, id_number, contact_number, claimed_club_name, department } = req.body;
  if (!credential || !role || !id_number) {
    return res.status(400).json({ message: 'Please fill in all required fields.' });
  }
  if (!REGISTERABLE_ROLES.includes(role)) {
    return res.status(400).json({ message: 'Invalid role' });
  }
  if (role === 'club_committee' && !claimed_club_name) {
    return res.status(400).json({ message: 'Club / Organisation name is required for Club Committee registration.' });
  }
  if (role === 'hepa_officer' && !department) {
    return res.status(400).json({ message: 'Department / Unit is required for HEPA Officer registration.' });
  }

  let payload;
  try {
    payload = await verifyGoogleToken(credential);
  } catch {
    return res.status(401).json({ message: 'Invalid Google credential' });
  }
  if (!payload.email_verified) {
    return res.status(401).json({ message: 'Google account email is not verified' });
  }

  const [existing] = await pool.query(
    'SELECT email, id_number FROM users WHERE email = ? OR google_id = ? OR id_number = ?',
    [payload.email, payload.sub, id_number]
  );
  if (existing.length > 0) {
    const clash = existing[0];
    if (clash.email === payload.email) return res.status(409).json({ message: 'An account with this email already exists.' });
    return res.status(409).json({ message: 'This ID number is already registered.' });
  }

  const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), SALT_ROUNDS);

  const [result] = await pool.query(
    `INSERT INTO users
       (name, id_number, email, google_id, contact_number, password_hash, role,
        claimed_club_name, department, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
    [payload.name, id_number, payload.email, payload.sub, contact_number || null, passwordHash, role,
     role === 'club_committee' ? claimed_club_name : null, role === 'hepa_officer' ? department : null]
  );
  const userId = result.insertId;

  await logAction({ userId, action: 'REGISTRATION_SUBMITTED', targetType: 'user', targetId: userId, details: { role, via: 'google' } });
  await logAction({ userId, action: 'LOGIN_SUCCESS', targetType: 'user', targetId: userId, details: { via: 'google' } });

  const user = { id: userId, name: payload.name, email: payload.email, role };
  return issueSessionFor(user, res);
}

module.exports = { googleAuth, googleRegister };
