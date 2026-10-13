const pool = require('../config/db');

const WINDOW_DAYS = 30;

const COMMITTEE_ACTIONS = {
  PROPOSAL_REVIEW_STARTED: { title: 'Review started', verb: 'HEPA started reviewing' },
  PROPOSAL_QUERIED: { title: 'Action required', verb: 'HEPA requested changes to' },
  PROPOSAL_APPROVED: { title: 'Proposal approved', verb: 'HEPA approved' },
  PROPOSAL_REJECTED: { title: 'Proposal rejected', verb: 'HEPA rejected' },
  PROPOSAL_CANCELLED_BY_ADMIN: { title: 'Event cancelled', verb: 'An administrator cancelled' },
};

async function listNotifications(req, res) {
  const { role, id: userId } = req.user;
  let notifications = [];

  if (role === 'club_committee') {
    const [rows] = await pool.query(
      `SELECT a.id, a.action, a.created_at, p.id AS proposal_id, p.title
       FROM audit_logs a JOIN proposals p ON p.id = a.target_id
       WHERE a.target_type = 'proposal' AND (p.submitted_by = ? OR (p.club_id IS NOT NULL AND p.club_id = ?)) AND a.action IN (?)
         AND a.created_at >= NOW() - INTERVAL ? DAY
       ORDER BY a.created_at DESC LIMIT 15`,
      [userId, req.user.club_id ?? null, Object.keys(COMMITTEE_ACTIONS), WINDOW_DAYS]
    );
    notifications = rows.map((r) => ({
      id: `audit-${r.id}`,
      title: COMMITTEE_ACTIONS[r.action].title,
      body: `${COMMITTEE_ACTIONS[r.action].verb} “${r.title}”`,
      link: `/club/proposals/${r.proposal_id}`,
      created_at: r.created_at,
    }));
  } else if (role === 'hepa_officer') {
    const [rows] = await pool.query(
      `SELECT a.id, a.action, a.created_at, p.id AS proposal_id, p.title
       FROM audit_logs a JOIN proposals p ON p.id = a.target_id
       WHERE a.target_type = 'proposal' AND a.action IN ('PROPOSAL_SUBMITTED', 'PROPOSAL_RESUBMITTED')
         AND p.status IN ('submitted', 'under_review', 'resubmitted')
         AND a.created_at >= NOW() - INTERVAL ? DAY
       ORDER BY a.created_at DESC LIMIT 15`,
      [WINDOW_DAYS]
    );
    notifications = rows.map((r) => ({
      id: `audit-${r.id}`,
      title: r.action === 'PROPOSAL_RESUBMITTED' ? 'Proposal resubmitted' : 'New proposal to review',
      body: r.title,
      link: `/hepa/proposals/${r.proposal_id}`,
      created_at: r.created_at,
    }));
  }

  res.json({ notifications });
}

module.exports = { listNotifications };
