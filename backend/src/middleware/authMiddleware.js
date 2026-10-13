const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const STATUS_MESSAGE = {
  pending: 'Your account is currently waiting for Admin approval.',
  rejected: 'Your registration request was rejected.',
  deactivated: 'Your account has been deactivated. Please contact the administrator.',
};

async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication token missing' });
  }

  const token = header.split(' ')[1];
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }

  const [rows] = await pool.query(
    `SELECT u.id, u.name, u.email, u.role, u.status, u.club_id, u.avatar_filename, c.name AS club_name,
            UNIX_TIMESTAMP(u.password_changed_at) AS pwd_changed_at
     FROM users u LEFT JOIN clubs c ON c.id = u.club_id WHERE u.id = ?`,
    [payload.id]
  );
  const user = rows[0];
  if (!user) {
    return res.status(401).json({ message: 'Account no longer exists' });
  }
  if (user.status !== 'active') {
    return res.status(403).json({ message: STATUS_MESSAGE[user.status] || 'This account is not active' });
  }

  const { pwd_changed_at: passwordChangedAt, ...publicUser } = user;
  if (passwordChangedAt && payload.iat < passwordChangedAt) {
    return res.status(401).json({ message: 'Your password was changed. Please sign in again.' });
  }

  req.user = publicUser;
  next();
}

module.exports = { authenticate, STATUS_MESSAGE };
