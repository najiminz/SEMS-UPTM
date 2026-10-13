const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  register, verifySignup, login, me, forgotPassword, verifyResetCode, resetPassword,
} = require('../controllers/authController');
const { googleAuth, googleRegister } = require('../controllers/googleAuthController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.LOGIN_RATE_MAX) || 10,
  message: { message: 'Too many login attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.OTP_RATE_MAX) || 10,
  message: { message: 'Too many attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/register', otpLimiter, register);
router.post('/register/verify', otpLimiter, verifySignup);
router.post('/login', loginLimiter, login);
router.get('/me', authenticate, me);

router.post('/google', loginLimiter, googleAuth);
router.post('/google/register', loginLimiter, googleRegister);

router.post('/forgot-password', otpLimiter, forgotPassword);
router.post('/forgot-password/verify', otpLimiter, verifyResetCode);
router.post('/reset-password', otpLimiter, resetPassword);

module.exports = router;
