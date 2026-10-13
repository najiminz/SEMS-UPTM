const pool = require('../config/db');
const { logAction } = require('../utils/auditLogger');
const { canManageProposal } = require('../utils/proposalAccess');

async function submitReport(req, res) {
  const { id } = req.params;
  const { attendance_count, actual_spending, summary } = req.body;

  const [proposals] = await pool.query('SELECT * FROM proposals WHERE id = ?', [id]);
  const proposal = proposals[0];
  if (!proposal) return res.status(404).json({ message: 'Proposal not found' });
  if (!canManageProposal(req.user, proposal)) {
    return res.status(403).json({ message: "You can only report on your club's events" });
  }
  if (proposal.status !== 'approved') {
    return res.status(400).json({ message: 'Only approved events can have a post-event report' });
  }

  await pool.query(
    `INSERT INTO post_event_reports (proposal_id, attendance_count, actual_spending, summary, submitted_by)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE attendance_count = VALUES(attendance_count),
       actual_spending = VALUES(actual_spending), summary = VALUES(summary)`,
    [id, attendance_count || 0, actual_spending || 0, summary || null, req.user.id]
  );

  await logAction({ userId: req.user.id, action: 'POST_EVENT_REPORT_SUBMITTED', targetType: 'proposal', targetId: id });
  res.status(201).json({ message: 'Post-event report submitted' });
}

async function getReport(req, res) {
  const { id } = req.params;
  const [proposals] = await pool.query('SELECT id, submitted_by, club_id FROM proposals WHERE id = ?', [id]);
  const proposal = proposals[0];
  if (!proposal || !(['hepa_officer', 'admin'].includes(req.user.role) || canManageProposal(req.user, proposal))) {
    return res.status(404).json({ message: 'No report found for this event' });
  }
  const [rows] = await pool.query('SELECT * FROM post_event_reports WHERE proposal_id = ?', [id]);
  if (!rows[0]) return res.status(404).json({ message: 'No report found for this event' });
  res.json({ report: rows[0] });
}

module.exports = { submitReport, getReport };
