const express = require('express');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');
const { getDashboardStats, getRecentActivity, getReports } = require('../controllers/adminController');

const router = express.Router();

router.use(authenticate, authorize('admin'));

router.get('/stats', getDashboardStats);
router.get('/recent-activity', getRecentActivity);
router.get('/reports', getReports);

module.exports = router;
