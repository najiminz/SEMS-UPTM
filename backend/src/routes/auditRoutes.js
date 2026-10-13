const express = require('express');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');
const { listAuditLogs, getAuditFacets, exportAuditLogs } = require('../controllers/auditController');

const router = express.Router();

router.use(authenticate, authorize('admin'));

router.get('/', listAuditLogs);
router.get('/facets', getAuditFacets);
router.get('/export', exportAuditLogs);

module.exports = router;
