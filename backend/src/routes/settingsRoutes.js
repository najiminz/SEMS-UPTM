const express = require('express');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');
const { getSystemSettings, updateSystemSettings } = require('../controllers/settingsController');

const router = express.Router();

router.use(authenticate, authorize('admin'));

router.get('/', getSystemSettings);
router.patch('/', updateSystemSettings);

module.exports = router;
