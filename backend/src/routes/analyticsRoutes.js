const express = require('express');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');
const { getAnalytics, listPostEventReports } = require('../controllers/analyticsController');

const router = express.Router();

router.use(authenticate, authorize('hepa_officer', 'admin'));

router.get('/', getAnalytics);
router.get('/post-event-reports', listPostEventReports);

module.exports = router;
