const express = require('express');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');
const { dynamicUpload } = require('../middleware/uploadMiddleware');
const ctrl = require('../controllers/proposalController');

const router = express.Router();

const documentUpload = dynamicUpload((upload) =>
  upload.fields([
    { name: 'proposal_document', maxCount: 1 },
    { name: 'budget_document', maxCount: 1 },
    { name: 'supporting_documents', maxCount: 5 },
  ])
);

router.use(authenticate);

router.get('/calendar', ctrl.listCalendarEvents);
router.get('/stats', authorize('hepa_officer', 'admin'), ctrl.getReviewStats);

router.get('/', authorize('hepa_officer', 'admin'), ctrl.listAllProposals);

router.post('/', authorize('club_committee'), documentUpload, ctrl.createProposal);
router.get('/mine', authorize('club_committee'), ctrl.listMyProposals);
router.put('/:id', authorize('club_committee'), documentUpload, ctrl.updateProposal);
router.delete('/:id/documents/:documentId', authorize('club_committee'), ctrl.deleteDocument);
router.delete('/:id', authorize('club_committee'), ctrl.deleteDraft);

router.get('/pending', authorize('hepa_officer'), ctrl.listPendingProposals);
router.post('/:id/start-review', authorize('hepa_officer'), ctrl.startReview);
router.post('/:id/approve', authorize('hepa_officer'), ctrl.approveProposal);
router.post('/:id/reject', authorize('hepa_officer'), ctrl.rejectProposal);
router.post('/:id/query', authorize('hepa_officer'), ctrl.queryProposal);

router.post('/:id/cancel', authorize('admin'), ctrl.cancelProposal);

router.delete('/:id/archive', authorize('admin'), ctrl.deleteArchivedProposal);

router.get('/documents/:documentId', ctrl.downloadDocument);

router.get('/:id', ctrl.getProposal);

module.exports = router;
