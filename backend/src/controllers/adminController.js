const pool = require('../config/db');
const { PENDING_STATUSES } = require('../utils/proposalStatus');
const { AUDIT_SELECT, AUDIT_JOINS, buildAuditRow, buildAuditFilters } = require('../utils/auditQuery');

async function getDashboardStats(req, res) {
  const [[userCounts]] = await pool.query(
    `SELECT
       SUM(status IN ('active', 'deactivated')) AS total_users,
       SUM(status = 'active') AS active_users
     FROM users`
  );
  const [[clubCounts]] = await pool.query(`SELECT COUNT(*) AS total_clubs FROM clubs`);
  const [[proposalCounts]] = await pool.query(
    `SELECT
       COUNT(*) AS total_proposals,
       SUM(status IN (?)) AS pending_proposals,
       SUM(status = 'approved') AS approved_proposals,
       SUM(status = 'rejected') AS rejected_proposals,
       SUM(status IN ('approved', 'cancelled')) AS total_events,
       SUM(status = 'approved' AND event_date >= CURDATE()) AS active_events
     FROM proposals WHERE status <> 'draft'`,
    [PENDING_STATUSES]
  );

  res.json({
    totalUsers: Number(userCounts.total_users),
    activeUsers: Number(userCounts.active_users),
    totalClubs: Number(clubCounts.total_clubs),
    totalProposals: Number(proposalCounts.total_proposals),
    pendingProposals: Number(proposalCounts.pending_proposals),
    approvedProposals: Number(proposalCounts.approved_proposals),
    rejectedProposals: Number(proposalCounts.rejected_proposals),
    totalEvents: Number(proposalCounts.total_events),
    activeEvents: Number(proposalCounts.active_events),
  });
}

async function getRecentActivity(req, res) {
  const limit = Math.min(parseInt(req.query.limit) || 8, 200);
  const { whereClause, params } = buildAuditFilters({ from: req.query.from, to: req.query.to });
  const [rows] = await pool.query(
    `SELECT ${AUDIT_SELECT} ${AUDIT_JOINS} ${whereClause}
     ORDER BY a.created_at DESC, a.id DESC LIMIT ?`,
    [...params, limit]
  );
  res.json({ activity: rows.map(buildAuditRow) });
}

async function getReports(req, res) {
  const [byStatus] = await pool.query(
    `SELECT
       CASE
         WHEN status IN ('submitted', 'under_review', 'resubmitted') THEN 'pending'
         ELSE status
       END AS bucket,
       COUNT(*) AS count
     FROM proposals WHERE status <> 'draft'
     GROUP BY bucket`
  );

  const [byClub] = await pool.query(
    `SELECT COALESCE(c.name, u.name) AS club_name, COUNT(*) AS total,
            SUM(p.status = 'approved') AS approved, SUM(p.status = 'rejected') AS rejected
     FROM proposals p
     JOIN users u ON u.id = p.submitted_by
     LEFT JOIN clubs c ON c.id = COALESCE(p.club_id, u.club_id)
     WHERE p.status <> 'draft'
     GROUP BY club_name ORDER BY total DESC LIMIT 10`
  );

  const [byCategory] = await pool.query(
    `SELECT event_type, COUNT(*) AS count FROM proposals
     WHERE status IN ('approved', 'cancelled') GROUP BY event_type`
  );

  const [monthlyTrend] = await pool.query(
    `SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) AS count
     FROM proposals
     WHERE status <> 'draft' AND created_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
     GROUP BY month ORDER BY month ASC`
  );

  res.json({
    proposalsByStatus: byStatus.map((r) => ({ status: r.bucket, count: Number(r.count) })),
    proposalsByClub: byClub.map((r) => ({
      clubName: r.club_name, total: Number(r.total), approved: Number(r.approved), rejected: Number(r.rejected),
    })),
    eventsByCategory: byCategory.map((r) => ({ eventType: r.event_type, count: Number(r.count) })),
    monthlyTrend: monthlyTrend.map((r) => ({ month: r.month, count: Number(r.count) })),
  });
}

module.exports = { getDashboardStats, getRecentActivity, getReports };
