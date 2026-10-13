const express = require('express');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');
const { submitReport, getReport } = require('../controllers/reportController');

const router = express.Router();

router.use(authenticate);

router.post('/:id', authorize('club_committee'), submitReport);
router.get('/:id', getReport);

module.exports = router;
