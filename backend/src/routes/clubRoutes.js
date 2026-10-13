const express = require('express');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/rbacMiddleware');
const ctrl = require('../controllers/clubController');

const router = express.Router();

router.use(authenticate, authorize('admin'));

router.get('/', ctrl.listClubs);
router.post('/', ctrl.createClub);
router.get('/:id', ctrl.getClub);
router.patch('/:id', ctrl.updateClub);
router.patch('/:id/status', ctrl.setClubStatus);
router.post('/:id/members', ctrl.assignMember);
router.delete('/:id/members/:userId', ctrl.removeMember);
router.delete('/:id', ctrl.deleteClub);

module.exports = router;
