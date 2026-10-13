const express = require('express');
const rateLimit = require('express-rate-limit');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');
const { avatarUpload } = require('../middleware/uploadMiddleware');
const ctrl = require('../controllers/userController');

const router = express.Router();

const passwordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.LOGIN_RATE_MAX) || 10,
  message: { message: 'Too many attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/me/avatar', authenticate, avatarUpload, ctrl.uploadAvatar);
router.post('/me/password', authenticate, passwordLimiter, ctrl.changePassword);
router.post('/me/email-change/request', authenticate, ctrl.requestEmailChange);
router.post('/me/email-change/verify', authenticate, ctrl.verifyEmailChange);

router.use(authenticate, authorize('admin'));

router.get('/', ctrl.listUsers);
router.post('/', ctrl.createUser);
router.patch('/:id', ctrl.updateUser);
router.patch('/:id/role', ctrl.updateUserRole);
router.patch('/:id/active', ctrl.setUserActive);
router.patch('/:id/reset-password', ctrl.resetPassword);
router.delete('/:id', ctrl.deleteUser);

module.exports = router;
