const bcrypt = require('bcrypt');
const crypto = require('crypto');
const pool = require('../config/db');

const OTP_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const HASH_ROUNDS = 10;

const OTP_ERROR_MESSAGE = {
  not_found: 'No active code found for this request. Please request a new one.',
  expired: 'This code has expired. Please request a new one.',
  too_many_attempts: 'Too many incorrect attempts. Please request a new code.',
  invalid: 'Incorrect code. Please try again.',
};

function generateCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

async function createOtp({ purpose, email, payload = null, userId = null }) {
  const code = generateCode();
  const codeHash = await bcrypt.hash(code, HASH_ROUNDS);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await pool.query(
    `UPDATE otp_codes SET used_at = NOW() WHERE purpose = ? AND email = ? AND used_at IS NULL`,
    [purpose, email]
  );
  const [result] = await pool.query(
    `INSERT INTO otp_codes (purpose, email, code_hash, payload, user_id, expires_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [purpose, email, codeHash, payload ? JSON.stringify(payload) : null, userId, expiresAt]
  );
  return { id: result.insertId, code };
}

async function verifyOtp({ purpose, email, code, consume = true }) {
  const [rows] = await pool.query(
    `SELECT * FROM otp_codes WHERE purpose = ? AND email = ? AND used_at IS NULL ORDER BY id DESC LIMIT 1`,
    [purpose, email]
  );
  const record = rows[0];
  if (!record) return { ok: false, reason: 'not_found' };
  if (new Date(record.expires_at) < new Date()) return { ok: false, reason: 'expired' };
  if (record.attempts >= MAX_ATTEMPTS) return { ok: false, reason: 'too_many_attempts' };

  const matches = await bcrypt.compare(code, record.code_hash);
  if (!matches) {
    await pool.query('UPDATE otp_codes SET attempts = attempts + 1 WHERE id = ?', [record.id]);
    return { ok: false, reason: 'invalid', attemptsLeft: MAX_ATTEMPTS - (record.attempts + 1) };
  }

  if (consume) await pool.query('UPDATE otp_codes SET used_at = NOW() WHERE id = ?', [record.id]);
  return { ok: true, record };
}

function otpFailureBody(result) {
  const body = { message: OTP_ERROR_MESSAGE[result.reason], reason: result.reason };
  if (result.attemptsLeft !== undefined) body.attemptsLeft = result.attemptsLeft;
  return body;
}

module.exports = { createOtp, verifyOtp, otpFailureBody, OTP_ERROR_MESSAGE, OTP_TTL_MINUTES };
